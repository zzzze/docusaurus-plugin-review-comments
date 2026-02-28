import path from "node:path";
import { spawn } from "node:child_process";
import type { DocusaurusConfig } from "@docusaurus/types";
import { globReviewFiles, readReviewFile } from "../api/storage";
import { buildDocsPathMap } from "./pathMap";
import type { AgentCommandFn, ContextDir } from "../types";
import { buildPrompt, loadPromptTemplate } from "./prompt";
import type { SseNotifier } from "../api/sseNotifier";

export const DEFAULT_INTERVAL_MS = 300_000; // 5 minutes — gives agent time to finish before next tick
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

function defaultAgentCommand({ reviewsDir, docsDirs, contextDirs }: { reviewsDir: string; docsDirs: string[]; contextDirs: ContextDir[] }): string {
  // --allowedTools grants edit permission scoped to reviewsDir and docsDirs
  const allowedTools = [absEdit(reviewsDir), ...docsDirs.map(absEdit), "Read"].join(",");
  // --add-dir expands the MCP filesystem context to extra read-only directories (e.g. source repos)
  const addDirs = contextDirs.map((d) => `--add-dir ${d.dir}`).join(" ");
  return `claude --allowedTools "${allowedTools}"${addDirs ? " " + addDirs : ""} -p`;
}

export interface ReviewServiceConfig {
  siteDir: string;
  reviewsDir: string;
  siteConfig: DocusaurusConfig;
  intervalMs?: number;
  agentCommand?: string | AgentCommandFn;
  agentPromptFile?: string;
  // Extra directories for read-only MCP context (--add-dir). siteDir is always included.
  contextDirs?: Array<string | ContextDir>;
  // Extra environment variables to pass to the agent process (merged with process.env).
  env?: Record<string, string>;
  notifier?: SseNotifier;
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
    contextDirs: extraContextDirs = [],
    env,
    notifier,
  } = config;

  const docsPathMap = buildDocsPathMap(siteConfig);
  // Compute docsDirs once: absolute paths of all docs content directories
  const docsDirs = Array.from(docsPathMap.values()).map((fsPath) =>
    path.join(siteDir, fsPath),
  );
  // Resolve extra contextDirs relative to siteDir; normalize string entries to ContextDir
  const resolvedContextDirs: ContextDir[] = extraContextDirs.map((entry) => {
    const { dir, desc } = typeof entry === "string" ? { dir: entry, desc: undefined } : entry;
    return { dir: path.resolve(siteDir, dir), desc };
  });
  const contextDirs: ContextDir[] = resolvedContextDirs;

  // Track docs currently being processed to prevent concurrent writes to the same file
  const inProgress = new Set<string>();

  log(`Started (interval=${intervalMs / 1000}s, reviewsDir=${reviewsDir})`);

  const tick = () =>
    runTick({ siteDir, reviewsDir, docsPathMap, docsDirs, contextDirs, agentCommand, agentPromptFile, env, inProgress, notifier });

  const intervalId = setInterval(() => { void tick(); }, intervalMs);

  return {
    stop: () => clearInterval(intervalId),
    tick,
  };
}

async function runTick(opts: {
  siteDir: string;
  reviewsDir: string;
  docsPathMap: Map<string, string>;
  docsDirs: string[];
  contextDirs: ContextDir[];
  agentCommand: string | AgentCommandFn;
  agentPromptFile: string | undefined;
  env: Record<string, string> | undefined;
  inProgress: Set<string>;
  notifier?: SseNotifier;
}): Promise<void> {
  const { siteDir, reviewsDir, docsPathMap, docsDirs, contextDirs, agentCommand, agentPromptFile, env, inProgress, notifier } = opts;

  const pendingDocs = await collectPendingDocs(reviewsDir);
  if (pendingDocs.length === 0) return;

  log(`Found ${pendingDocs.length} pending doc(s): ${pendingDocs.join(", ")}`);

  // Resolve agentCommand to a string once per tick
  const resolvedCommand =
    typeof agentCommand === "function"
      ? agentCommand({ reviewsDir, docsDirs, contextDirs })
      : agentCommand;

  const promptTemplate = await loadPromptTemplate(agentPromptFile);

  for (const documentPath of pendingDocs) {
    // Skip docs already being processed by a previous tick's agent
    if (inProgress.has(documentPath)) {
      log(`Skipping ${documentPath} (agent already running)`);
      continue;
    }

    const prompt = buildPrompt({ template: promptTemplate, siteDir, reviewsDir, docsPathMap, documentPath, contextDirs });
    inProgress.add(documentPath);
    spawnAgent({ agentCommand: resolvedCommand, prompt, cwd: siteDir, documentPath, env, onDone: () => inProgress.delete(documentPath), notifier });
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


function spawnAgent(opts: {
  agentCommand: string;
  prompt: string;
  cwd: string;
  documentPath: string;
  env: Record<string, string> | undefined;
  onDone: () => void;
  notifier?: SseNotifier;
}): void {
  const { agentCommand, prompt, cwd, documentPath, env, onDone, notifier } = opts;
  const spawnEnv = env ? { ...process.env, ...env } : process.env;

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
      env: spawnEnv,
      stdio: "inherit",
    });
    child?.on("error", (err) => {
      error(`Failed to spawn agent for ${documentPath}: ${err.message}`);
    });
    child?.on("close", (code) => {
      if (code === 0) {
        log(`Agent finished for ${documentPath} (exit 0)`);
        notifier?.broadcast(documentPath);
      } else {
        warn(`Agent exited with code ${code ?? "null"} for ${documentPath}`);
      }
      onDone();
    });
  } else {
    log(`Spawning agent for ${documentPath}: ${agentCommand}`);
    const child = spawn("sh", ["-c", agentCommand], {
      cwd,
      env: spawnEnv,
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
        notifier?.broadcast(documentPath);
      } else {
        warn(`Agent exited with code ${code ?? "null"} for ${documentPath}`);
      }
      onDone();
    });
  }
}
