import fs from "node:fs/promises";
import path from "node:path";
import type { ReviewFile } from "../types";

export function resolveReviewFilePath(
  reviewsDir: string,
  docPath: string,
): string {
  const normalized = docPath.replace(/^\//, "");
  return path.join(reviewsDir, `${normalized}.reviews.json`);
}

export async function readReviewFile(filePath: string): Promise<ReviewFile> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as ReviewFile;
  } catch {
    return { documentPath: "", comments: [] };
  }
}

export async function writeReviewFile(
  filePath: string,
  data: ReviewFile,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(
    filePath,
    JSON.stringify(data, null, 2) + "\n",
    "utf-8",
  );
}

export async function globReviewFiles(reviewsDir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries: import("node:fs/promises").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".reviews.json")) {
        results.push(full);
      }
    }
  }

  await walk(reviewsDir);
  return results;
}
