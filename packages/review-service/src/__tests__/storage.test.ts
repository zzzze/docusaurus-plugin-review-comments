import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  resolveReviewFilePath,
  readReviewFile,
  writeReviewFile,
} from "../api/storage";
import type { ReviewFile } from "../types";

describe("resolveReviewFilePath", () => {
  it("joins reviewsDir with docPath and appends .reviews.json", () => {
    const result = resolveReviewFilePath("/site/.reviews", "guide/intro");
    expect(result).toBe(path.join("/site/.reviews", "guide/intro.reviews.json"));
  });

  it("strips leading slash from docPath", () => {
    const result = resolveReviewFilePath("/site/.reviews", "/guide/intro");
    expect(result).toBe(path.join("/site/.reviews", "guide/intro.reviews.json"));
  });

  it("handles root-level doc path", () => {
    const result = resolveReviewFilePath("/site/.reviews", "index");
    expect(result).toBe(path.join("/site/.reviews", "index.reviews.json"));
  });

  it("preserves route prefix in path", () => {
    const result = resolveReviewFilePath("/site/.reviews", "proposals/my-doc");
    expect(result).toBe(
      path.join("/site/.reviews", "proposals/my-doc.reviews.json"),
    );
  });
});

describe("readReviewFile / writeReviewFile", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "review-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns empty ReviewFile when file does not exist", async () => {
    const result = await readReviewFile(path.join(tmpDir, "missing.json"));
    expect(result).toEqual({ documentPath: "", comments: [] });
  });

  it("reads a previously written ReviewFile", async () => {
    const filePath = path.join(tmpDir, "test.reviews.json");
    const data: ReviewFile = {
      documentPath: "guide/intro",
      comments: [
        {
          id: "c1",
          anchor: {
            scope: "text",
            exact: "hello",
            prefix: "",
            suffix: "",
            heading: "",
            blockIndex: null,
          },
          author: "alice",
          type: "question",
          status: "open",
          content: "What does this mean?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    };

    await writeReviewFile(filePath, data);
    const result = await readReviewFile(filePath);
    expect(result).toEqual(data);
  });

  it("creates intermediate directories when writing", async () => {
    const filePath = path.join(tmpDir, "nested", "deep", "test.reviews.json");
    const data: ReviewFile = { documentPath: "nested/doc", comments: [] };

    await writeReviewFile(filePath, data);
    const result = await readReviewFile(filePath);
    expect(result).toEqual(data);
  });

  it("overwrites existing file", async () => {
    const filePath = path.join(tmpDir, "overwrite.reviews.json");
    const first: ReviewFile = { documentPath: "doc1", comments: [] };
    const second: ReviewFile = {
      documentPath: "doc1",
      comments: [
        {
          id: "c2",
          anchor: {
            scope: "block",
            exact: "paragraph",
            prefix: "",
            suffix: "",
            heading: "intro",
            blockIndex: 0,
          },
          author: "bob",
          type: "issue",
          status: "open",
          content: "Fix this",
          createdAt: "2025-01-02T00:00:00.000Z",
          replies: [],
        },
      ],
    };

    await writeReviewFile(filePath, first);
    await writeReviewFile(filePath, second);
    const result = await readReviewFile(filePath);
    expect(result).toEqual(second);
  });

  it("writes pretty-printed JSON with trailing newline", async () => {
    const filePath = path.join(tmpDir, "pretty.reviews.json");
    await writeReviewFile(filePath, { documentPath: "doc", comments: [] });

    const raw = await fs.readFile(filePath, "utf-8");
    expect(raw).toContain("\n");
    expect(raw.endsWith("\n")).toBe(true);
    expect(JSON.parse(raw)).toEqual({ documentPath: "doc", comments: [] });
  });
});
