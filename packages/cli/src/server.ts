import express from "express";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { execFileSync } from "node:child_process";
import { createReviewsMiddleware, createSseNotifier } from "@review-comments/plugin/api";

export interface ServerOptions {
  docsPath: string;
  reviewsDir: string;
  userName: string;
  agent: boolean;
  port: number;
  noOpen: boolean;
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
  const { docsPath, reviewsDir, userName, port, noOpen } = opts;
  const app = express();

  // Serve pre-built SPA static files
  const distDir = path.join(__dirname, "../dist");
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
  }

  // Docs API — list file tree
  app.get("/api/docs", (_req, res) => {
    const tree = buildDocTree(docsPath);
    res.json({ tree, basePath: docsPath });
  });

  // Docs API — read file content
  app.get("/api/docs/*", (req, res) => {
    const wildcardSegments = req.params[""];
    const docRelPath = Array.isArray(wildcardSegments) ? wildcardSegments.join("/") : undefined;
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
  createReviewsMiddleware(app, {
    reviewsDir,
    userName,
    notifier,
  });

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
    const url = `http://localhost:${port}`;
    try {
      if (process.platform === "darwin") {
        execFileSync("open", [url]);
      } else if (process.platform === "win32") {
        execFileSync("cmd", ["/c", "start", url]);
      } else {
        execFileSync("xdg-open", [url]);
      }
    } catch {
      // Browser open failed — not critical
    }
  }

  return server;
}
