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
