import type { Express } from "express";
import express from "express";
import logger from "@docusaurus/logger";
import { v4 as uuidv4 } from "uuid";
import type { ReviewComment, ReviewReply } from "../types";
import {
  readReviewFile,
  resolveReviewFilePath,
  writeReviewFile,
  globReviewFiles,
} from "./storage";
import type { SseNotifier } from "./sseNotifier";

export function createReviewsMiddleware(
  app: Express,
  opts: {
    reviewsDir: string;
    reviewerName: string;
    onTrigger?: () => Promise<void>;
    notifier?: SseNotifier;
    // When provided, registers GET /api/reviews/prompt for manual AI agent use.
    getPrompt?: (docPath: string) => Promise<string>;
    // When provided, registers GET /api/reviews/global-prompt covering all pending docs.
    getGlobalPrompt?: () => Promise<string>;
    /** Polling interval in ms — exposed via capabilities when hasTrigger is true */
    intervalMs?: number;
  },
): void {
  const { reviewsDir, reviewerName, onTrigger, notifier, getPrompt, getGlobalPrompt, intervalMs } = opts;
  app.use("/api/reviews", express.json());

  app.get("/api/reviews/capabilities", (_req, res) => {
    res.json({
      hasTrigger: !!onTrigger,
      hasPrompt: !!getPrompt,
      hasGlobalPrompt: !!getGlobalPrompt,
      ...(onTrigger && intervalMs !== undefined ? { intervalMs } : {}),
    });
  });

  if (onTrigger) {
    app.post("/api/reviews/trigger", (_req, res) => {
      onTrigger().catch((err: unknown) => {
        logger.error`[review-service] trigger failed: ${err instanceof Error ? err.message : String(err)}`;
      });
      res.json({ started: true });
    });
  }

  if (getPrompt) {
    app.get("/api/reviews/prompt", async (req, res) => {
      const doc = req.query.doc as string | undefined;
      if (!doc) {
        res.status(400).json({ error: "Missing 'doc' query parameter" });
        return;
      }
      const prompt = await getPrompt(doc);
      res.json({ prompt });
    });
  }

  if (getGlobalPrompt) {
    app.get("/api/reviews/global-prompt", async (_req, res) => {
      const prompt = await getGlobalPrompt();
      res.json({ prompt });
    });
  }

  app.get("/api/reviews/events", (_req, res) => {
    if (notifier) {
      notifier.connect(res);
    } else {
      res.status(404).json({ error: "SSE not available" });
    }
  });

  app.get("/api/reviews/pending", async (_req, res) => {
    const pendingDocs: string[] = [];

    let entries: string[];
    try {
      entries = await globReviewFiles(reviewsDir);
    } catch {
      res.json({ docs: [] });
      return;
    }

    for (const filePath of entries) {
      const reviewFile = await readReviewFile(filePath);
      const hasPending = reviewFile.comments.some((comment) => {
        if (comment.status !== "open") return false;
        if (comment.replies.length === 0) return true;
        const lastReply = comment.replies[comment.replies.length - 1]!;
        return lastReply.author !== "ai";
      });
      if (hasPending && reviewFile.documentPath) {
        pendingDocs.push(reviewFile.documentPath);
      }
    }

    res.json({ docs: pendingDocs });
  });

  app.get("/api/reviews", async (req, res) => {
    const doc = req.query.doc as string | undefined;
    if (!doc) {
      res.status(400).json({ error: "Missing 'doc' query parameter" });
      return;
    }

    const filePath = resolveReviewFilePath(reviewsDir, doc);
    const reviewFile = await readReviewFile(filePath);

    if (!reviewFile.documentPath) {
      reviewFile.documentPath = doc;
    }

    res.json(reviewFile);
  });

  app.post("/api/reviews", async (req, res) => {
    const { doc, anchor, content, type } = req.body as {
      doc?: string;
      anchor?: ReviewComment["anchor"];
      content?: string;
      type?: ReviewComment["type"];
    };

    if (!doc || !anchor || !content || !type) {
      res
        .status(400)
        .json({ error: "Missing required fields: doc, anchor, content, type" });
      return;
    }

    const filePath = resolveReviewFilePath(reviewsDir, doc);
    const reviewFile = await readReviewFile(filePath);

    if (!reviewFile.documentPath) {
      reviewFile.documentPath = doc;
    }

    const comment: ReviewComment = {
      id: uuidv4(),
      anchor,
      author: reviewerName,
      type,
      status: "open",
      content,
      createdAt: new Date().toISOString(),
      replies: [],
    };

    reviewFile.comments.push(comment);
    await writeReviewFile(filePath, reviewFile);

    res.status(201).json(comment);
  });

  app.patch("/api/reviews/:commentId", async (req, res) => {
    const { commentId } = req.params;
    const { doc, status, content, reply, editReply, deleteReply } = req.body as {
      doc?: string;
      status?: ReviewComment["status"];
      content?: string;
      reply?: { author: string; content: string };
      editReply?: { replyId: string; content: string };
      deleteReply?: { replyId: string };
    };

    if (!doc) {
      res.status(400).json({ error: "Missing 'doc' in request body" });
      return;
    }

    const filePath = resolveReviewFilePath(reviewsDir, doc);
    const reviewFile = await readReviewFile(filePath);
    const comment = reviewFile.comments.find((c) => c.id === commentId);

    if (!comment) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    if (status) {
      comment.status = status;
    }

    if (content !== undefined) {
      comment.content = content;
    }

    if (reply) {
      const newReply: ReviewReply = {
        id: uuidv4(),
        author: reply.author || reviewerName,
        content: reply.content,
        createdAt: new Date().toISOString(),
      };
      comment.replies.push(newReply);
    }

    if (editReply) {
      const existing = comment.replies.find((r) => r.id === editReply.replyId);
      if (existing) {
        existing.content = editReply.content;
      }
    }

    if (deleteReply) {
      const idx = comment.replies.findIndex((r) => r.id === deleteReply.replyId);
      if (idx !== -1) {
        comment.replies.splice(idx, 1);
      }
    }

    await writeReviewFile(filePath, reviewFile);

    res.json(comment);
  });

  app.delete("/api/reviews/:commentId", async (req, res) => {
    const { commentId } = req.params;
    const doc = req.query.doc as string | undefined;

    if (!doc) {
      res.status(400).json({ error: "Missing 'doc' query parameter" });
      return;
    }

    const filePath = resolveReviewFilePath(reviewsDir, doc);
    const reviewFile = await readReviewFile(filePath);
    const commentIndex = reviewFile.comments.findIndex(
      (c) => c.id === commentId,
    );

    if (commentIndex === -1) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    reviewFile.comments.splice(commentIndex, 1);
    await writeReviewFile(filePath, reviewFile);

    res.status(204).send();
  });
}
