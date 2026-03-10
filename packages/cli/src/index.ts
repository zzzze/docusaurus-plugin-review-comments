#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { execFileSync } from "node:child_process";
import { startServer } from "./server";
import { findConfigFile, loadConfigFile, mergeConfigWithArgs } from "./config";

const DEFAULT_PORT = 4100;

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}

async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) return port;
  }
  return 0;
}

function getGitUserName(): string {
  try {
    return execFileSync("git", ["config", "user.name"], { encoding: "utf-8" }).trim();
  } catch {
    return "Reviewer";
  }
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  let targetPath = ".";
  let reviewsDir: string | undefined;
  let user: string | undefined;
  let agent = false;
  let agentCommand: string | undefined;
  let agentName: string | undefined;
  let agentPromptFile: string | undefined;
  let interval: number | undefined;
  const contextDirs: string[] = [];
  let port: number | undefined;
  let noOpen = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--reviews-dir" && args[i + 1]) {
      reviewsDir = args[++i];
    } else if (arg === "--user" && args[i + 1]) {
      user = args[++i];
    } else if (arg === "--agent") {
      agent = true;
    } else if (arg === "--agent-command" && args[i + 1]) {
      agentCommand = args[++i];
    } else if (arg === "--agent-name" && args[i + 1]) {
      agentName = args[++i];
    } else if (arg === "--agent-prompt-file" && args[i + 1]) {
      agentPromptFile = args[++i];
    } else if (arg === "--interval" && args[i + 1]) {
      interval = parseInt(args[++i]!, 10);
    } else if (arg === "--context-dir" && args[i + 1]) {
      contextDirs.push(args[++i]!);
    } else if (arg === "--port" && args[i + 1]) {
      port = parseInt(args[++i]!, 10);
    } else if (arg === "--no-open") {
      noOpen = true;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else if (!arg.startsWith("-")) {
      targetPath = arg;
    }
  }

  return { path: targetPath, reviewsDir, user, agent, agentCommand, agentName, agentPromptFile, interval, contextDirs, port, noOpen };
}

function printUsage(): void {
  console.log(`
Usage: mdreview [path] [options]

Arguments:
  path                        Directory or .md file to review (default: ".")

Options:
  --reviews-dir <dir>         Where to store .reviews.json files (default: ".reviews" next to source)
  --user <name>               Reviewer name (default: git user.name or "Reviewer")
  --port <number>             Specify port (default: ${DEFAULT_PORT}, auto-increments if busy)
  --no-open                   Don't auto-open browser
  -h, --help                  Show this help

Agent Options:
  --agent                     Enable AI review service (auto-spawns agent)
  --agent-command <cmd>       Agent shell command (default: "claude -p")
                              Use {prompt} placeholder for inline substitution,
                              otherwise prompt is piped via stdin
  --agent-name <name>         Agent display name (default: "Claude")
  --agent-prompt-file <path>  Custom prompt template file
  --interval <ms>             Auto-review polling interval in ms (default: 300000)
  --context-dir <dir>         Extra read-only context directory (repeatable)

Config File:
  Looks for review.config.mjs or review.config.js from the target directory
  upward. Config file options have lower priority than CLI arguments.
  The agentCommand option in a config file can be a function:

    export default {
      agentCommand: ({ reviewsDir }) => \`claude --allowedTools "Edit(\${reviewsDir}/**)" -p\`
    }
`);
}

async function main(): Promise<void> {
  const cliArgs = parseArgs(process.argv);

  // Load config file (search from the target directory upward)
  const searchDir = path.resolve(cliArgs.path);
  const configPath = findConfigFile(fs.existsSync(searchDir) && fs.statSync(searchDir).isDirectory() ? searchDir : path.dirname(searchDir));
  let fileConfig = {};
  let configDir = process.cwd();
  if (configPath) {
    try {
      const loaded = await loadConfigFile(configPath);
      fileConfig = loaded.config;
      configDir = loaded.configDir;
      console.log(`Loaded config from ${configPath}`);
    } catch (err) {
      console.warn(`Warning: failed to load config file ${configPath}: ${err instanceof Error ? err.message : err}`);
    }
  }
  const merged = mergeConfigWithArgs(fileConfig, configDir, cliArgs);

  const resolvedPath = path.resolve(merged.path);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: path does not exist: ${resolvedPath}`);
    process.exit(1);
  }

  let docsPath: string;
  let singleFile: string | undefined;
  const stat = fs.statSync(resolvedPath);

  if (stat.isFile()) {
    if (!/\.(md|mdx)$/i.test(resolvedPath)) {
      console.error("Error: only .md and .mdx files are supported");
      process.exit(1);
    }
    docsPath = path.dirname(resolvedPath);
    singleFile = path.basename(resolvedPath);
  } else {
    docsPath = resolvedPath;
  }

  const hasMarkdown = fs.readdirSync(docsPath, { recursive: true })
    .some((f) => /\.(md|mdx)$/i.test(String(f)));
  if (!hasMarkdown) {
    console.error("Error: no .md or .mdx files found in the target directory");
    process.exit(1);
  }

  const reviewsDir = merged.reviewsDir
    ? path.resolve(merged.reviewsDir)
    : path.join(docsPath, ".reviews");
  const userName = merged.user || getGitUserName();
  const port = await findAvailablePort(merged.port || DEFAULT_PORT);

  const server = startServer({
    docsPath,
    reviewsDir,
    userName,
    agent: merged.agent,
    agentCommand: merged.agentCommand,
    agentName: merged.agentName,
    agentPromptFile: merged.agentPromptFile,
    intervalMs: merged.interval,
    contextDirs: merged.contextDirs,
    port,
    noOpen: merged.noOpen,
    singleFile,
  });

  function cleanup(): void {
    server.close();
  }

  process.on("SIGINT", () => { cleanup(); process.exit(0); });
  process.on("SIGTERM", () => { cleanup(); process.exit(0); });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
