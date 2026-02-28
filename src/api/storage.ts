import fs from "node:fs/promises";
import path from "node:path";
import logger from "@docusaurus/logger";
import { jsonrepair } from "jsonrepair";
import type { ReviewFile } from "../types";

export function resolveReviewFilePath(
  reviewsDir: string,
  docPath: string,
): string {
  const normalized = docPath.replace(/^\//, "");
  return path.join(reviewsDir, `${normalized}.reviews.json`);
}

function normalizeReviewFile(data: unknown, filePath: string): ReviewFile {
  if (typeof data !== "object" || data === null) {
    logger.warn`[review-comments] Corrupted review file (not an object), ignoring: ${filePath}`;
    return { documentPath: "", comments: [] };
  }
  const raw = data as Record<string, unknown>;
  const documentPath = typeof raw["documentPath"] === "string" ? raw["documentPath"] : "";
  const rawComments = Array.isArray(raw["comments"]) ? raw["comments"] : [];
  if (!Array.isArray(raw["comments"])) {
    logger.warn`[review-comments] Review file missing or invalid "comments" field, treating as empty: ${filePath}`;
  }
  const comments = rawComments.map((c: unknown) => {
    const comment = c as Record<string, unknown>;
    return {
      ...comment,
      replies: Array.isArray(comment["replies"]) ? comment["replies"] : [],
    };
  });
  return { documentPath, comments } as ReviewFile;
}

export async function readReviewFile(filePath: string): Promise<ReviewFile> {
  let content: string;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch {
    // File does not exist yet — normal case for new docs.
    return { documentPath: "", comments: [] };
  }
  try {
    return normalizeReviewFile(JSON.parse(content), filePath);
  } catch {
    logger.warn`[review-comments] Failed to parse review file, attempting auto-repair: ${filePath}`;
    try {
      const repaired = jsonrepair(content);
      const result = normalizeReviewFile(JSON.parse(repaired), filePath);
      logger.warn`[review-comments] Auto-repair succeeded, writing back: ${filePath}`;
      await writeReviewFile(filePath, result);
      return result;
    } catch {
      logger.warn`[review-comments] Auto-repair failed, ignoring: ${filePath}`;
      return { documentPath: "", comments: [] };
    }
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
    let entries: import("node:fs").Dirent[];
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
