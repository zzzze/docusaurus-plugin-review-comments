import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import type { DocusaurusConfig } from "@docusaurus/types";
import { globReviewFiles, readReviewFile } from "../api/storage";
import { buildDocsPathMap } from "./pathMap";
import type { AgentCommandFn } from "../types";

const DEFAULT_INTERVAL_MS = 300_000; // 5 minutes — gives agent time to finish before next tick
const LOG_PREFIX = "[review-service]";

function log(msg: string): void {
  console.log(`${LOG_PREFIX} ${msg}`);
}

function warn(msg: string): void {
  console.warn(`${LOG_PREFIX} ${msg}`);
}

function error(msg: string): void {
  console.error(`${LOG_PREFIX} ${msg}`);
}

// Claude Code treats /path as project-relative; //path as a true filesystem absolute path.
// To express an absolute path like /Users/foo, write //Users/foo (replace leading / with //).
function absEdit(dir: string): string {
  const withoutLeadingSlash = dir.startsWith("/") ? dir.slice(1) : dir;
  return "Edit(//" + withoutLeadingSlash + "/**)";
}

function defaultAgentCommand({ reviewsDir, docsDirs }: { reviewsDir: string; docsDirs: string[] }): string {
  // --allowedTools grants edit permission scoped to reviewsDir and docsDirs
  const allowedTools = [absEdit(reviewsDir), ...docsDirs.map(absEdit), "Read"].join(",");
  return `claude --allowedTools "${allowedTools}" -p`;
}

export interface ReviewServiceConfig {
  siteDir: string;
  reviewsDir: string;
  siteConfig: DocusaurusConfig;
  intervalMs?: number;
  agentCommand?: string | AgentCommandFn;
  agentPromptFile?: string;
}

export interface ReviewServiceHandle {
  stop: () => void;
  /** Run one tick immediately — useful for testing */
  tick: () => Promise<void>;
}

/**
 * Starts the periodic review service. Returns a handle with stop() and tick().
 */
export function startReviewService(config: ReviewServiceConfig): () => void {
  const handle = createReviewService(config);
  return handle.stop;
}

export function createReviewService(config: ReviewServiceConfig): ReviewServiceHandle {
  const {
    siteDir,
    reviewsDir,
    siteConfig,
    intervalMs = DEFAULT_INTERVAL_MS,
    agentCommand = defaultAgentCommand,
    agentPromptFile,
  } = config;

  const docsPathMap = buildDocsPathMap(siteConfig);
  // Compute docsDirs once: absolute paths of all docs content directories
  const docsDirs = Array.from(docsPathMap.values()).map((fsPath) =>
    path.join(siteDir, fsPath),
  );

  // Track docs currently being processed to prevent concurrent writes to the same file
  const inProgress = new Set<string>();

  log(`Started (interval=${intervalMs / 1000}s, reviewsDir=${reviewsDir})`);

  const tick = () =>
    runTick(siteDir, reviewsDir, docsPathMap, docsDirs, agentCommand, agentPromptFile, inProgress);

  const intervalId = setInterval(() => { void tick(); }, intervalMs);

  return {
    stop: () => clearInterval(intervalId),
    tick,
  };
}

async function runTick(
  siteDir: string,
  reviewsDir: string,
  docsPathMap: Map<string, string>,
  docsDirs: string[],
  agentCommand: string | AgentCommandFn,
  agentPromptFile: string | undefined,
  inProgress: Set<string>,
): Promise<void> {
  const pendingDocs = await collectPendingDocs(reviewsDir);
  if (pendingDocs.length === 0) return;

  log(`Found ${pendingDocs.length} pending doc(s): ${pendingDocs.join(", ")}`);

  // Resolve agentCommand to a string once per tick
  const resolvedCommand =
    typeof agentCommand === "function"
      ? agentCommand({ reviewsDir, docsDirs })
      : agentCommand;

  const promptTemplate = await loadPromptTemplate(agentPromptFile);

  for (const documentPath of pendingDocs) {
    // Skip docs already being processed by a previous tick's agent
    if (inProgress.has(documentPath)) {
      log(`Skipping ${documentPath} (agent already running)`);
      continue;
    }

    const prompt = buildPrompt(
      promptTemplate,
      siteDir,
      reviewsDir,
      docsPathMap,
      documentPath,
    );
    inProgress.add(documentPath);
    spawnAgent(resolvedCommand, prompt, siteDir, documentPath, () => inProgress.delete(documentPath));
  }
}

async function collectPendingDocs(reviewsDir: string): Promise<string[]> {
  const pendingDocs: string[] = [];
  let files: string[];
  try {
    files = await globReviewFiles(reviewsDir);
  } catch {
    return [];
  }

  for (const filePath of files) {
    const reviewFile = await readReviewFile(filePath);
    const hasPending = reviewFile.comments.some((comment) => {
      if (comment.status !== "open") return false;
      if (comment.replies.length === 0) return true;
      const lastReply = comment.replies[comment.replies.length - 1]!;
      return lastReply.author !== "ai";
    });
    if (hasPending && reviewFile.documentPath) {
      pendingDocs.push(reviewFile.documentPath);
    }
  }

  return pendingDocs;
}

async function loadPromptTemplate(
  agentPromptFile: string | undefined,
): Promise<string> {
  const filePath =
    agentPromptFile ?? path.join(__dirname, "AGENTS.md");
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

function buildPrompt(
  template: string,
  siteDir: string,
  reviewsDir: string,
  docsPathMap: Map<string, string>,
  documentPath: string,
): string {
  const pathMapEntries =
    docsPathMap.size === 0
      ? "  (none configured — using documentPath prefix as-is)"
      : Array.from(docsPathMap.entries())
          .map(([route, fsPath]) => `  ${route} → ${fsPath}`)
          .join("\n");

  // Compute allowed paths automatically from reviewsDir + docsPathMap
  const allowedPaths = [
    `${reviewsDir}/**/*.reviews.json`,
    ...Array.from(docsPathMap.values()).map((fsPath) => `${siteDir}/${fsPath}/**/*.md`),
  ];
  const allowedPathsText = allowedPaths.map((p) => `- ${p}`).join("\n");

  return template
    .replace(/\{reviewsDir\}/g, reviewsDir)
    .replace(/\{siteDir\}/g, siteDir)
    .replace(/\{pathMapEntries\}/g, pathMapEntries)
    .replace(/\{documentPath\}/g, documentPath)
    .replace(/\{allowedPaths\}/g, allowedPathsText);
}

function spawnAgent(
  agentCommand: string,
  prompt: string,
  cwd: string,
  documentPath: string,
  onDone: () => void,
): void {
  // If agentCommand contains {prompt}, substitute it inline (e.g. "opencode run {prompt}").
  // Otherwise pipe prompt via stdin (e.g. "claude -p", "gemini", "amp -x").
  if (agentCommand.includes("{prompt}")) {
    const cmd = agentCommand.replace(
      /\{prompt\}/g,
      prompt.replace(/'/g, "'\\''"),
    );
    log(`Spawning agent for ${documentPath}: ${cmd.slice(0, 80)}${cmd.length > 80 ? "…" : ""}`);
    const child = spawn("sh", ["-c", cmd], {
      cwd,
      stdio: "inherit",
    });
    child?.on("error", (err) => {
      error(`Failed to spawn agent for ${documentPath}: ${err.message}`);
    });
    child?.on("close", (code) => {
      if (code === 0) {
        log(`Agent finished for ${documentPath} (exit 0)`);
      } else {
        warn(`Agent exited with code ${code ?? "null"} for ${documentPath}`);
      }
      onDone();
    });
  } else {
    log(`Spawning agent for ${documentPath}: ${agentCommand}`);
    const child = spawn("sh", ["-c", agentCommand], {
      cwd,
      stdio: ["pipe", "inherit", "inherit"],
    });
    child?.stdin?.write(prompt);
    child?.stdin?.end();
    child?.on("error", (err) => {
      error(`Failed to spawn agent for ${documentPath}: ${err.message}`);
    });
    child?.on("close", (code) => {
      if (code === 0) {
        log(`Agent finished for ${documentPath} (exit 0)`);
      } else {
        warn(`Agent exited with code ${code ?? "null"} for ${documentPath}`);
      }
      onDone();
    });
  }
}
