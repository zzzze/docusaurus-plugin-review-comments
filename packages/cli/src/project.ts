import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

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
