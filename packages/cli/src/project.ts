import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";

/**
 * Walk from `startDir` upward looking for a `.git` directory.
 * Returns the directory containing `.git`, or undefined.
 */
export function findProjectRoot(startDir: string): string | undefined {
  let dir = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/**
 * Generate a stable namespace string from an absolute path.
 * Format: `<basename>-<first-8-chars-of-sha256-hex>`
 */
export function getProjectNamespace(absolutePath: string): string {
  const name = path.basename(absolutePath);
  const hash = crypto
    .createHash("sha256")
    .update(absolutePath)
    .digest("hex")
    .slice(0, 8);
  return `${name}-${hash}`;
}

/**
 * Compute the default reviews directory under ~/.mdreview/reviews/.
 * Path: ~/.mdreview/reviews/<namespace>/<docsRelPath>
 * where <namespace> is derived from the project root and <docsRelPath>
 * is the relative path from project root to the docs directory.
 */
export function getDefaultReviewsDir(opts: {
  docsPath: string;
  projectRoot: string;
}): string {
  const namespace = getProjectNamespace(opts.projectRoot);
  const docsRelPath = path.relative(opts.projectRoot, opts.docsPath);
  const base = path.join(os.homedir(), ".mdreview", "reviews", namespace);
  return docsRelPath ? path.join(base, docsRelPath) : base;
}
