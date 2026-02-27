import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createReviewsMiddleware } from "../api/reviews";
import type { ReviewComment, ReviewFile } from "../types";

function makeApp(reviewsDir: string, author = "tester") {
  const app = express();
  createReviewsMiddleware(app, reviewsDir, author);
  return app;
}

/** Minimal fetch-like helper using app.handle to avoid needing a running server */
async function request(
  app: express.Express,
  method: string,
  url: string,
  body?: unknown,
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const req = new (require("http").IncomingMessage)();
    const { Writable } = require("stream");

    // Build a real request through Express by starting a temporary server
    const server = app.listen(0, () => {
      const addr = server.address() as { port: number };
      const http = require("http");
      const payload = body ? JSON.stringify(body) : undefined;
      const options = {
        hostname: "127.0.0.1",
        port: addr.port,
        path: url,
        method: method.toUpperCase(),
        headers: {
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
        },
      };

      const httpReq = http.request(options, (res: any) => {
        let data = "";
        res.on("data", (chunk: string) => (data += chunk));
        res.on("end", () => {
          server.close();
          let parsed: unknown;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      });
      httpReq.on("error", (err: Error) => {
        server.close();
        reject(err);
      });
      if (payload) httpReq.write(payload);
      httpReq.end();
    });
  });
}

const sampleAnchor = {
  scope: "text" as const,
  exact: "hello world",
  prefix: "say ",
  suffix: " today",
  heading: "intro",
  blockIndex: 0,
};

describe("GET /api/reviews", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "reviews-api-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns 400 when doc query param is missing", async () => {
    const app = makeApp(tmpDir);
    const res = await request(app, "GET", "/api/reviews");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Missing 'doc' query parameter" });
  });

  it("returns empty review file for non-existent doc", async () => {
    const app = makeApp(tmpDir);
    const res = await request(app, "GET", "/api/reviews?doc=guide/intro");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      documentPath: "guide/intro",
      comments: [],
    });
  });

  it("returns existing review file", async () => {
    const data: ReviewFile = {
      documentPath: "guide/intro",
      comments: [
        {
          id: "c1",
          anchor: sampleAnchor,
          author: "alice",
          type: "question",
          status: "open",
          content: "Why?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    };
    const filePath = path.join(tmpDir, "guide/intro.reviews.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data));

    const app = makeApp(tmpDir);
    const res = await request(app, "GET", "/api/reviews?doc=guide/intro");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(data);
  });
});

describe("POST /api/reviews", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "reviews-api-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns 400 when required fields are missing", async () => {
    const app = makeApp(tmpDir);
    const res = await request(app, "POST", "/api/reviews", { doc: "x" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Missing required fields: doc, anchor, content, type",
    });
  });

  it("returns 400 when only type is missing", async () => {
    const app = makeApp(tmpDir);
    const res = await request(app, "POST", "/api/reviews", {
      doc: "guide/intro",
      anchor: sampleAnchor,
      content: "Hello",
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Missing required fields: doc, anchor, content, type",
    });
  });

  it("returns 400 when only content is missing", async () => {
    const app = makeApp(tmpDir);
    const res = await request(app, "POST", "/api/reviews", {
      doc: "guide/intro",
      anchor: sampleAnchor,
      type: "question",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when only anchor is missing", async () => {
    const app = makeApp(tmpDir);
    const res = await request(app, "POST", "/api/reviews", {
      doc: "guide/intro",
      content: "Hello",
      type: "question",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when only doc is missing", async () => {
    const app = makeApp(tmpDir);
    const res = await request(app, "POST", "/api/reviews", {
      anchor: sampleAnchor,
      content: "Hello",
      type: "question",
    });
    expect(res.status).toBe(400);
  });

  it("creates a comment and returns 201", async () => {
    const app = makeApp(tmpDir);
    const res = await request(app, "POST", "/api/reviews", {
      doc: "guide/intro",
      anchor: sampleAnchor,
      content: "Looks good",
      type: "suggestion",
    });
    expect(res.status).toBe(201);
    const comment = res.body as ReviewComment;
    expect(comment.id).toBeTruthy();
    expect(comment.author).toBe("tester");
    expect(comment.content).toBe("Looks good");
    expect(comment.type).toBe("suggestion");
    expect(comment.status).toBe("open");
    expect(comment.replies).toEqual([]);
  });

  it("persists comment to disk", async () => {
    const app = makeApp(tmpDir);
    await request(app, "POST", "/api/reviews", {
      doc: "guide/intro",
      anchor: sampleAnchor,
      content: "Check this",
      type: "issue",
    });

    const filePath = path.join(tmpDir, "guide/intro.reviews.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as ReviewFile;
    expect(data.comments).toHaveLength(1);
    expect(data.comments[0]!.content).toBe("Check this");
  });

  it("sets documentPath on first write", async () => {
    const app = makeApp(tmpDir);
    await request(app, "POST", "/api/reviews", {
      doc: "new/page",
      anchor: sampleAnchor,
      content: "First comment",
      type: "suggestion",
    });

    const filePath = path.join(tmpDir, "new/page.reviews.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as ReviewFile;
    expect(data.documentPath).toBe("new/page");
  });
});

describe("PATCH /api/reviews/:commentId", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "reviews-api-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns 400 when doc is missing", async () => {
    const app = makeApp(tmpDir);
    const res = await request(app, "PATCH", "/api/reviews/c1", {});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Missing 'doc' in request body" });
  });

  it("returns 404 for non-existent comment", async () => {
    const app = makeApp(tmpDir);
    const res = await request(app, "PATCH", "/api/reviews/missing", {
      doc: "guide/intro",
      status: "resolved",
    });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Comment not found" });
  });

  it("updates comment status", async () => {
    const app = makeApp(tmpDir);
    const createRes = await request(app, "POST", "/api/reviews", {
      doc: "guide/intro",
      anchor: sampleAnchor,
      content: "Fix this",
      type: "issue",
    });
    const commentId = (createRes.body as ReviewComment).id;

    const patchRes = await request(app, "PATCH", `/api/reviews/${commentId}`, {
      doc: "guide/intro",
      status: "resolved",
    });
    expect(patchRes.status).toBe(200);
    expect((patchRes.body as ReviewComment).status).toBe("resolved");
  });

  it("updates comment content", async () => {
    const app = makeApp(tmpDir);
    const createRes = await request(app, "POST", "/api/reviews", {
      doc: "guide/intro",
      anchor: sampleAnchor,
      content: "Original",
      type: "question",
    });
    const commentId = (createRes.body as ReviewComment).id;

    const patchRes = await request(app, "PATCH", `/api/reviews/${commentId}`, {
      doc: "guide/intro",
      content: "Updated",
    });
    expect(patchRes.status).toBe(200);
    expect((patchRes.body as ReviewComment).content).toBe("Updated");
  });

  it("adds a reply to a comment", async () => {
    const app = makeApp(tmpDir);
    const createRes = await request(app, "POST", "/api/reviews", {
      doc: "guide/intro",
      anchor: sampleAnchor,
      content: "Question?",
      type: "question",
    });
    const commentId = (createRes.body as ReviewComment).id;

    const patchRes = await request(app, "PATCH", `/api/reviews/${commentId}`, {
      doc: "guide/intro",
      reply: { author: "bob", content: "Answer!" },
    });
    expect(patchRes.status).toBe(200);
    const comment = patchRes.body as ReviewComment;
    expect(comment.replies).toHaveLength(1);
    expect(comment.replies[0]!.author).toBe("bob");
    expect(comment.replies[0]!.content).toBe("Answer!");
    expect(comment.replies[0]!.id).toBeTruthy();
  });

  it("edits an existing reply", async () => {
    const app = makeApp(tmpDir);
    const createRes = await request(app, "POST", "/api/reviews", {
      doc: "guide/intro",
      anchor: sampleAnchor,
      content: "Q",
      type: "question",
    });
    const commentId = (createRes.body as ReviewComment).id;

    const replyRes = await request(app, "PATCH", `/api/reviews/${commentId}`, {
      doc: "guide/intro",
      reply: { author: "bob", content: "First draft" },
    });
    const replyId = (replyRes.body as ReviewComment).replies[0]!.id;

    const editRes = await request(app, "PATCH", `/api/reviews/${commentId}`, {
      doc: "guide/intro",
      editReply: { replyId, content: "Revised answer" },
    });
    expect(editRes.status).toBe(200);
    expect((editRes.body as ReviewComment).replies[0]!.content).toBe(
      "Revised answer",
    );
  });

  it("patches the correct comment when multiple exist", async () => {
    const app = makeApp(tmpDir);
    const res1 = await request(app, "POST", "/api/reviews", {
      doc: "guide/intro",
      anchor: sampleAnchor,
      content: "First",
      type: "question",
    });
    const res2 = await request(app, "POST", "/api/reviews", {
      doc: "guide/intro",
      anchor: sampleAnchor,
      content: "Second",
      type: "issue",
    });
    const id1 = (res1.body as ReviewComment).id;
    const id2 = (res2.body as ReviewComment).id;

    const patchRes = await request(app, "PATCH", `/api/reviews/${id2}`, {
      doc: "guide/intro",
      content: "Updated second",
    });
    expect(patchRes.status).toBe(200);
    expect((patchRes.body as ReviewComment).id).toBe(id2);
    expect((patchRes.body as ReviewComment).content).toBe("Updated second");

    const getRes = await request(app, "GET", "/api/reviews?doc=guide/intro");
    const comments = (getRes.body as ReviewFile).comments;
    expect(comments).toHaveLength(2);
    expect(comments.find((c) => c.id === id1)!.content).toBe("First");
    expect(comments.find((c) => c.id === id2)!.content).toBe("Updated second");
  });
});

describe("DELETE /api/reviews/:commentId", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "reviews-api-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns 400 when doc query param is missing", async () => {
    const app = makeApp(tmpDir);
    const res = await request(app, "DELETE", "/api/reviews/c1");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Missing 'doc' query parameter" });
  });

  it("returns 404 for non-existent comment", async () => {
    const app = makeApp(tmpDir);
    const res = await request(
      app,
      "DELETE",
      "/api/reviews/missing?doc=guide/intro",
    );
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Comment not found" });
  });

  it("deletes a comment and returns 204", async () => {
    const app = makeApp(tmpDir);
    const createRes = await request(app, "POST", "/api/reviews", {
      doc: "guide/intro",
      anchor: sampleAnchor,
      content: "Delete me",
      type: "suggestion",
    });
    const commentId = (createRes.body as ReviewComment).id;

    const deleteRes = await request(
      app,
      "DELETE",
      `/api/reviews/${commentId}?doc=guide/intro`,
    );
    expect(deleteRes.status).toBe(204);

    const getRes = await request(
      app,
      "GET",
      "/api/reviews?doc=guide/intro",
    );
    expect((getRes.body as ReviewFile).comments).toHaveLength(0);
  });

  it("deletes only the targeted comment when multiple exist", async () => {
    const app = makeApp(tmpDir);
    const res1 = await request(app, "POST", "/api/reviews", {
      doc: "guide/intro",
      anchor: sampleAnchor,
      content: "Keep me",
      type: "question",
    });
    const res2 = await request(app, "POST", "/api/reviews", {
      doc: "guide/intro",
      anchor: sampleAnchor,
      content: "Delete me",
      type: "issue",
    });
    const id1 = (res1.body as ReviewComment).id;
    const id2 = (res2.body as ReviewComment).id;

    const deleteRes = await request(
      app,
      "DELETE",
      `/api/reviews/${id2}?doc=guide/intro`,
    );
    expect(deleteRes.status).toBe(204);

    const getRes = await request(app, "GET", "/api/reviews?doc=guide/intro");
    const comments = (getRes.body as ReviewFile).comments;
    expect(comments).toHaveLength(1);
    expect(comments[0]!.id).toBe(id1);
    expect(comments[0]!.content).toBe("Keep me");
  });
});

describe("GET /api/reviews/pending", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "reviews-pending-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function writeReview(
    relPath: string,
    data: ReviewFile,
  ): Promise<void> {
    const full = path.join(tmpDir, relPath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, JSON.stringify(data));
  }

  it("returns empty docs array when no review files exist", async () => {
    const app = makeApp(tmpDir);
    const res = await request(app, "GET", "/api/reviews/pending");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ docs: [] });
  });

  it("returns doc path for comment with no replies", async () => {
    await writeReview("docs/intro.reviews.json", {
      documentPath: "docs/intro",
      comments: [
        {
          id: "c1",
          anchor: sampleAnchor,
          author: "alice",
          type: "question",
          status: "open",
          content: "Why?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    });
    const app = makeApp(tmpDir);
    const res = await request(app, "GET", "/api/reviews/pending");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ docs: ["docs/intro"] });
  });

  it("returns doc path when last reply is not from ai", async () => {
    await writeReview("docs/guide.reviews.json", {
      documentPath: "docs/guide",
      comments: [
        {
          id: "c1",
          anchor: sampleAnchor,
          author: "alice",
          type: "question",
          status: "open",
          content: "How?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [
            {
              id: "r1",
              author: "ai",
              content: "Here is how...",
              createdAt: "2025-01-02T00:00:00.000Z",
            },
            {
              id: "r2",
              author: "alice",
              content: "Thanks, but what about X?",
              createdAt: "2025-01-03T00:00:00.000Z",
            },
          ],
        },
      ],
    });
    const app = makeApp(tmpDir);
    const res = await request(app, "GET", "/api/reviews/pending");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ docs: ["docs/guide"] });
  });

  it("excludes doc when last reply is from ai", async () => {
    await writeReview("docs/done.reviews.json", {
      documentPath: "docs/done",
      comments: [
        {
          id: "c1",
          anchor: sampleAnchor,
          author: "alice",
          type: "question",
          status: "open",
          content: "Done?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [
            {
              id: "r1",
              author: "ai",
              content: "Yes, done.",
              createdAt: "2025-01-02T00:00:00.000Z",
            },
          ],
        },
      ],
    });
    const app = makeApp(tmpDir);
    const res = await request(app, "GET", "/api/reviews/pending");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ docs: [] });
  });

  it("excludes resolved comments", async () => {
    await writeReview("docs/resolved.reviews.json", {
      documentPath: "docs/resolved",
      comments: [
        {
          id: "c1",
          anchor: sampleAnchor,
          author: "alice",
          type: "question",
          status: "resolved",
          content: "Old question",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    });
    const app = makeApp(tmpDir);
    const res = await request(app, "GET", "/api/reviews/pending");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ docs: [] });
  });

  it("returns each doc at most once even with multiple pending comments", async () => {
    await writeReview("docs/multi.reviews.json", {
      documentPath: "docs/multi",
      comments: [
        {
          id: "c1",
          anchor: sampleAnchor,
          author: "alice",
          type: "question",
          status: "open",
          content: "First?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
        {
          id: "c2",
          anchor: sampleAnchor,
          author: "bob",
          type: "issue",
          status: "open",
          content: "Second?",
          createdAt: "2025-01-02T00:00:00.000Z",
          replies: [],
        },
      ],
    });
    const app = makeApp(tmpDir);
    const res = await request(app, "GET", "/api/reviews/pending");
    expect(res.status).toBe(200);
    expect((res.body as { docs: string[] }).docs).toHaveLength(1);
    expect((res.body as { docs: string[] }).docs[0]).toBe("docs/multi");
  });
});

describe("POST /api/reviews/trigger", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "reviews-trigger-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns 404 when no onTrigger callback provided", async () => {
    const app = makeApp(tmpDir);
    const res = await request(app, "POST", "/api/reviews/trigger");
    expect(res.status).toBe(404);
  });

  it("calls onTrigger and returns { started: true }", async () => {
    let called = false;
    const app = express();
    createReviewsMiddleware(app, tmpDir, "tester", async () => {
      called = true;
    });
    const res = await request(app, "POST", "/api/reviews/trigger");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ started: true });
    expect(called).toBe(true);
  });
});
