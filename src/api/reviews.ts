import type { Express } from "express";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import type { ReviewComment, ReviewReply } from "../types";
import {
  readReviewFile,
  resolveReviewFilePath,
  writeReviewFile,
} from "./storage";

export function createReviewsMiddleware(
  app: Express,
  reviewsDir: string,
  defaultAuthor: string,
): void {
  app.use("/api/reviews", express.json());

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
      author: defaultAuthor,
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
    const { doc, status, content, reply, editReply } = req.body as {
      doc?: string;
      status?: ReviewComment["status"];
      content?: string;
      reply?: { author: string; content: string };
      editReply?: { replyId: string; content: string };
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
        author: reply.author || defaultAuthor,
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
