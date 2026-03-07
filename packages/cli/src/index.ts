#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn, execFileSync } from "node:child_process";
import {
  getCacheDir,
  ensureCache,
  linkDocs,
  unlinkDocs,
  generateConfig,
  generateSidebars,
  type SetupOptions,
} from "./setup";

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
  let cleanCache = false;
  let cacheDir: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--cache-dir" && args[i + 1]) {
      cacheDir = args[++i];
    } else if (arg === "--reviews-dir" && args[i + 1]) {
      reviewsDir = args[++i];
    } else if (arg === "--user" && args[i + 1]) {
      user = args[++i];
    } else if (arg === "--agent") {
      agent = true;
    } else if (arg === "--port" && args[i + 1]) {
      port = parseInt(args[++i]!, 10);
    } else if (arg === "--no-open") {
      noOpen = true;
    } else if (arg === "--clean-cache") {
      cleanCache = true;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else if (!arg.startsWith("-")) {
      targetPath = arg;
    }
  }

  return { path: targetPath, reviewsDir, user, agent, port, noOpen, cleanCache, cacheDir };
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
  --cache-dir <dir>     Custom cache directory (default: ~/.cache/docusaurus-review-cli)
  --clean-cache         Force reinstall of cached Docusaurus project
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
  let tempDocsDir: string | null = null;
  const stat = fs.statSync(resolvedPath);

  if (stat.isFile()) {
    if (!/\.(md|mdx)$/i.test(resolvedPath)) {
      console.error("Error: only .md and .mdx files are supported");
      process.exit(1);
    }
    tempDocsDir = fs.mkdtempSync(path.join(os.tmpdir(), "docusaurus-review-docs-"));
    fs.symlinkSync(resolvedPath, path.join(tempDocsDir, path.basename(resolvedPath)));
    docsPath = tempDocsDir;
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

  const opts: SetupOptions = {
    docsPath,
    reviewsDir,
    userName,
    agent: parsed.agent,
    port,
    cleanCache: parsed.cleanCache,
  };

  const cacheDir = parsed.cacheDir ? path.resolve(parsed.cacheDir) : getCacheDir();
  console.log(`Cache directory: ${cacheDir}`);

  ensureCache(cacheDir, opts.cleanCache);
  linkDocs(cacheDir, docsPath);
  generateConfig(cacheDir, opts);
  generateSidebars(cacheDir, docsPath);

  console.log(`Starting review server on port ${port}...`);
  console.log(`Reviewing: ${resolvedPath}`);
  console.log(`Reviews stored in: ${reviewsDir}`);

  const docusaurusArgs = ["docusaurus", "start", "--port", String(port)];
  if (parsed.noOpen) docusaurusArgs.push("--no-open");

  const child = spawn("npx", docusaurusArgs, {
    cwd: cacheDir,
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "development" },
  });

  function cleanup(): void {
    child.kill();
    unlinkDocs(cacheDir);
    if (tempDocsDir) {
      fs.rmSync(tempDocsDir, { recursive: true, force: true });
    }
  }

  process.on("SIGINT", () => { cleanup(); process.exit(0); });
  process.on("SIGTERM", () => { cleanup(); process.exit(0); });

  child.on("exit", (code) => {
    unlinkDocs(cacheDir);
    if (tempDocsDir) {
      fs.rmSync(tempDocsDir, { recursive: true, force: true });
    }
    process.exit(code ?? 0);
  });
}

main();
