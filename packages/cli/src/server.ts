import express from "express";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
// @ts-ignore -- no type declarations
import openBrowsers from "open-browsers";
import { createReviewsMiddleware, createSseNotifier, globReviewFiles, readReviewFile } from "@mdreview/plugin/api";
import { buildPrompt, buildGlobalPrompt, loadPromptTemplate } from "@mdreview/plugin/prompt";
import { createReviewService, DEFAULT_INTERVAL_MS, DEFAULT_AGENT_NAME } from "@mdreview/plugin/service";
import type { AgentCommandFn, ContextDir } from "@mdreview/plugin/types";

export interface ServerOptions {
  docsPath: string;
  reviewsDir: string;
  userName: string;
  agent: boolean;
  agentCommand?: string | AgentCommandFn;
  agentName?: string;
  agentPromptFile?: string;
  intervalMs?: number;
  contextDirs?: ContextDir[];
  port: number;
  noOpen: boolean;
  singleFile?: string;
}

interface DocTreeEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: DocTreeEntry[];
}

function buildDocTree(basePath: string, relativePath: string = ""): DocTreeEntry[] {
  const dirPath = relativePath ? path.join(basePath, relativePath) : basePath;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const items: DocTreeEntry[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const children = buildDocTree(basePath, relPath);
      if (children.length > 0) {
        items.push({ name: entry.name, path: relPath, type: "directory", children });
      }
    } else if (/\.(md|mdx)$/i.test(entry.name)) {
      items.push({ name: entry.name, path: relPath, type: "file" });
    }
  }
  return items;
}

export function startServer(opts: ServerOptions): http.Server {
  const { docsPath, reviewsDir, userName, agent, port, noOpen } = opts;
  const app = express();

  // Serve pre-built SPA static files
  const distDir = path.join(__dirname, "../dist");
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
  }

  // Docs API — list file tree
  app.get("/api/docs", (_req, res) => {
    let tree: DocTreeEntry[];
    if (opts.singleFile) {
      tree = [{ name: opts.singleFile, path: opts.singleFile, type: "file" }];
    } else {
      tree = buildDocTree(docsPath);
    }
    res.json({ tree, basePath: docsPath, singleFile: !!opts.singleFile });
  });

  // Docs API — read file content
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.get("/api/docs/*", (req: any, res: any) => {
    // Express 4 uses params[0], Express 5 uses params[""]
    const raw = req.params[0] ?? req.params[""];
    const docRelPath: string | undefined = Array.isArray(raw) ? raw.join("/") : raw;
    if (!docRelPath) {
      res.status(400).json({ error: "Missing document path" });
      return;
    }

    const filePath = path.resolve(docsPath, docRelPath);

    // Security: prevent path traversal
    if (!filePath.startsWith(path.resolve(docsPath))) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      res.json({ content, path: docRelPath });
    } catch {
      res.status(404).json({ error: "File not found" });
    }
  });

  // Reviews API — reuse from plugin
  const notifier = createSseNotifier();
  const agentName = opts.agentName ?? DEFAULT_AGENT_NAME;
  const siteDir = path.dirname(docsPath);
  const docsPathMap = new Map([["", path.basename(docsPath)]]);
  const contextDirs = opts.contextDirs ?? [];

  if (agent) {
    // Agent mode: auto-spawn AI agent to process reviews
    const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS;
    const { tick } = createReviewService({
      siteDir,
      reviewsDir,
      docsPathMap,
      intervalMs,
      agentCommand: opts.agentCommand,
      agentPromptFile: opts.agentPromptFile,
      agentName,
      contextDirs,
      notifier,
    });
    createReviewsMiddleware(app, {
      reviewsDir,
      userName,
      agentName,
      onTrigger: tick,
      notifier,
      intervalMs,
    });
  } else {
    // Manual mode: copy prompt to clipboard
    createReviewsMiddleware(app, {
      reviewsDir,
      userName,
      agentName,
      notifier,
      getPrompt: async (docPath: string) => {
        const template = await loadPromptTemplate(opts.agentPromptFile);
        return buildPrompt({ template, siteDir, reviewsDir, docsPathMap, documentPath: docPath, contextDirs, agentName });
      },
      getGlobalPrompt: async () => {
        const files = await globReviewFiles(reviewsDir).catch(() => [] as string[]);
        const pendingDocs: string[] = [];
        for (const filePath of files) {
          const rf = await readReviewFile(filePath);
          const hasPending = rf.comments.some((c) => {
            if (c.status !== "open") return false;
            if (c.replies.length === 0) return true;
            const lastReply = c.replies[c.replies.length - 1]!;
            const isAgent = lastReply.role === "agent" || lastReply.author === agentName;
            return !isAgent;
          });
          if (hasPending && rf.documentPath) pendingDocs.push(rf.documentPath);
        }
        return buildGlobalPrompt({ siteDir, reviewsDir, docsPathMap, pendingDocs, contextDirs, agentName });
      },
    });
  }

  // SPA fallback — serve index.html for client-side routing
  app.get("*", (_req, res) => {
    const indexPath = path.join(distDir, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("SPA not built. Run 'pnpm build' first.");
    }
  });

  const server = app.listen(port, () => {
    console.log(`Review server running at http://localhost:${port}`);
    console.log(`Reviewing: ${docsPath}`);
    console.log(`Reviews stored in: ${reviewsDir}`);
  });

  if (!noOpen) {
    let url = `http://localhost:${port}`;
    if (opts.singleFile) {
      url += `/${opts.singleFile.replace(/\.(md|mdx)$/i, "")}`;
    }
    openBrowsers(url);
  }

  return server;
}
