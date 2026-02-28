import fs from "node:fs/promises";
import type { ContextDir } from "../types";
import { DEFAULT_PROMPT_TEMPLATE, DEFAULT_GLOBAL_PROMPT_TEMPLATE } from "./defaultPrompt";

export function buildGlobalPrompt(opts: {
  siteDir: string;
  reviewsDir: string;
  docsPathMap: Map<string, string>;
  pendingDocs: string[];
  contextDirs: ContextDir[];
}): string {
  const { siteDir, reviewsDir, docsPathMap, pendingDocs, contextDirs } = opts;

  const pathMapEntries =
    docsPathMap.size === 0
      ? "  (none configured — using documentPath prefix as-is)"
      : Array.from(docsPathMap.entries())
          .map(([route, fsPath]) => `  ${route} → ${fsPath}`)
          .join("\n");

  const allowedPaths = [
    `${reviewsDir}/**/*.reviews.json`,
    ...Array.from(docsPathMap.values()).map((fsPath) => `${siteDir}/${fsPath}/**/*.md`),
  ];
  const allowedPathsText = allowedPaths.map((p) => `- ${p}`).join("\n");

  const contextDirsText =
    contextDirs.length === 0
      ? ""
      : "\nAdditional context directories (read-only):\n" +
        contextDirs
          .map((d) => `- \`${d.dir}\`${d.desc ? ` — ${d.desc}` : ""}`)
          .join("\n") +
        "\n";

  const pendingDocsList =
    pendingDocs.length === 0
      ? "  (none)"
      : pendingDocs.map((d) => `- \`${d}\``).join("\n");

  return DEFAULT_GLOBAL_PROMPT_TEMPLATE
    .replace(/\{reviewsDir\}/g, reviewsDir)
    .replace(/\{siteDir\}/g, siteDir)
    .replace(/\{pathMapEntries\}/g, pathMapEntries)
    .replace(/\{pendingCount\}/g, String(pendingDocs.length))
    .replace(/\{pendingDocsList\}/g, pendingDocsList)
    .replace(/\{allowedPaths\}/g, allowedPathsText)
    .replace(/\{contextDirs\}/g, contextDirsText);
}

export async function loadPromptTemplate(
  agentPromptFile: string | undefined,
): Promise<string> {
  if (agentPromptFile === undefined) {
    return DEFAULT_PROMPT_TEMPLATE;
  }
  try {
    return await fs.readFile(agentPromptFile, "utf-8");
  } catch {
    return "";
  }
}

export function buildPrompt(opts: {
  template: string;
  siteDir: string;
  reviewsDir: string;
  docsPathMap: Map<string, string>;
  documentPath: string;
  contextDirs: ContextDir[];
}): string {
  const { template, siteDir, reviewsDir, docsPathMap, documentPath, contextDirs } = opts;

  const pathMapEntries =
    docsPathMap.size === 0
      ? "  (none configured — using documentPath prefix as-is)"
      : Array.from(docsPathMap.entries())
          .map(([route, fsPath]) => `  ${route} → ${fsPath}`)
          .join("\n");

  const allowedPaths = [
    `${reviewsDir}/**/*.reviews.json`,
    ...Array.from(docsPathMap.values()).map((fsPath) => `${siteDir}/${fsPath}/**/*.md`),
  ];
  const allowedPathsText = allowedPaths.map((p) => `- ${p}`).join("\n");

  const contextDirsText =
    contextDirs.length === 0
      ? ""
      : "\nAdditional context directories (read-only):\n" +
        contextDirs
          .map((d) => `- \`${d.dir}\`${d.desc ? ` — ${d.desc}` : ""}`)
          .join("\n") +
        "\n";

  return template
    .replace(/\{reviewsDir\}/g, reviewsDir)
    .replace(/\{siteDir\}/g, siteDir)
    .replace(/\{pathMapEntries\}/g, pathMapEntries)
    .replace(/\{documentPath\}/g, documentPath)
    .replace(/\{allowedPaths\}/g, allowedPathsText)
    .replace(/\{contextDirs\}/g, contextDirsText);
}
