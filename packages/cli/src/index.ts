#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { startServer } from "./server";

function getRandomPort(): number {
  return 3000 + Math.floor(Math.random() * 5000);
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

  return { path: targetPath, reviewsDir, user, agent, port, noOpen };
}

function printUsage(): void {
  console.log(`
Usage: docusaurus-review [path] [options]

Arguments:
  path                  Directory or .md file to review (default: ".")

Options:
  --reviews-dir <dir>   Where to store .reviews.json files (default: ".reviews" next to source)
  --user <name>         Reviewer name (default: git user.name or "Reviewer")
  --agent               Enable AI review service
  --port <number>       Specify port (default: random)
  --no-open             Don't auto-open browser
  -h, --help            Show this help
`);
}

function main(): void {
  const parsed = parseArgs(process.argv);
  const resolvedPath = path.resolve(parsed.path);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: path does not exist: ${resolvedPath}`);
    process.exit(1);
  }

  let docsPath: string;
  const stat = fs.statSync(resolvedPath);

  if (stat.isFile()) {
    if (!/\.(md|mdx)$/i.test(resolvedPath)) {
      console.error("Error: only .md and .mdx files are supported");
      process.exit(1);
    }
    docsPath = path.dirname(resolvedPath);
  } else {
    docsPath = resolvedPath;
  }

  const hasMarkdown = fs.readdirSync(docsPath, { recursive: true })
    .some((f) => /\.(md|mdx)$/i.test(String(f)));
  if (!hasMarkdown) {
    console.error("Error: no .md or .mdx files found in the target directory");
    process.exit(1);
  }

  const reviewsDir = parsed.reviewsDir
    ? path.resolve(parsed.reviewsDir)
    : path.join(docsPath, ".reviews");
  const userName = parsed.user || getGitUserName();
  const port = parsed.port || getRandomPort();

  const server = startServer({
    docsPath,
    reviewsDir,
    userName,
    agent: parsed.agent,
    port,
    noOpen: parsed.noOpen,
  });

  function cleanup(): void {
    server.close();
  }

  process.on("SIGINT", () => { cleanup(); process.exit(0); });
  process.on("SIGTERM", () => { cleanup(); process.exit(0); });
}

main();
