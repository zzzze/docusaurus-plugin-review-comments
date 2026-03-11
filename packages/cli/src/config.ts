import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import type { AgentCommandFn } from "@mdreview/plugin/types";

export interface ReviewConfig {
  path?: string;
  reviewsDir?: string;
  user?: string;
  agent?: boolean;
  agentCommand?: string | AgentCommandFn;
  agentName?: string;
  agentPromptFile?: string;
  interval?: number;
  contextDirs?: string[];
  port?: number;
  noOpen?: boolean;
}

const CONFIG_FILENAMES = ["review.config.mjs", "review.config.js"];

/**
 * Walk from `startDir` upward looking for a config file.
 * Returns the absolute path of the first match, or undefined.
 */
export function findConfigFile(startDir: string): string | undefined {
  let dir = path.resolve(startDir);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    for (const name of CONFIG_FILENAMES) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return undefined; // reached root
    dir = parent;
  }
}

/**
 * Dynamically import a config file and return its default export together
 * with the directory the config file lives in (used to resolve relative paths).
 */
export async function loadConfigFile(
  filePath: string,
): Promise<{ config: ReviewConfig; configDir: string }> {
  // `import()` on Windows requires a file:// URL for absolute paths.
  const mod = await import(pathToFileURL(filePath).href);
  const config: ReviewConfig = mod.default ?? mod;
  return { config, configDir: path.dirname(filePath) };
}

/** Path-valued keys that should be resolved relative to configDir. */
const PATH_KEYS: (keyof ReviewConfig)[] = [
  "path",
  "reviewsDir",
  "agentPromptFile",
];

/**
 * Merge a config-file object with CLI-parsed args.
 * CLI args always win over config-file values.
 * Relative paths in the config are resolved against `configDir`.
 */
export function mergeConfigWithArgs(
  config: ReviewConfig,
  configDir: string,
  cliArgs: {
    path: string;
    reviewsDir?: string;
    user?: string;
    agent: boolean;
    agentCommand?: string;
    agentName?: string;
    agentPromptFile?: string;
    interval?: number;
    contextDirs: string[];
    port?: number;
    noOpen: boolean;
  },
): {
  path: string;
  reviewsDir?: string;
  user?: string;
  agent: boolean;
  agentCommand?: string | AgentCommandFn;
  agentName?: string;
  agentPromptFile?: string;
  interval?: number;
  contextDirs: string[];
  port?: number;
  noOpen: boolean;
} {
  // Resolve path-valued config fields relative to configDir
  const resolved: ReviewConfig = { ...config };
  for (const key of PATH_KEYS) {
    const val = resolved[key];
    if (typeof val === "string" && !path.isAbsolute(val)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (resolved as any)[key] = path.resolve(configDir, val);
    }
  }
  if (resolved.contextDirs) {
    resolved.contextDirs = resolved.contextDirs.map((d) =>
      path.isAbsolute(d) ? d : path.resolve(configDir, d),
    );
  }

  // CLI explicit values override config; for boolean flags, CLI true wins
  const pathWasExplicit = cliArgs.path !== ".";
  return {
    path: pathWasExplicit ? cliArgs.path : (resolved.path ?? cliArgs.path),
    reviewsDir: cliArgs.reviewsDir ?? resolved.reviewsDir,
    user: cliArgs.user ?? resolved.user,
    agent: cliArgs.agent || (resolved.agent ?? false),
    agentCommand: cliArgs.agentCommand ?? resolved.agentCommand,
    agentName: cliArgs.agentName ?? resolved.agentName,
    agentPromptFile: cliArgs.agentPromptFile ?? resolved.agentPromptFile,
    interval: cliArgs.interval ?? resolved.interval,
    contextDirs:
      cliArgs.contextDirs.length > 0
        ? cliArgs.contextDirs
        : (resolved.contextDirs ?? []),
    port: cliArgs.port ?? resolved.port,
    noOpen: cliArgs.noOpen || (resolved.noOpen ?? false),
  };
}
