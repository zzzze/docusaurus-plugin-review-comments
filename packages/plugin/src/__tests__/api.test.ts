import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchComments, createComment, updateComment, deleteComment } from "../client/api";
import type { ReviewFile, ReviewComment } from "../types";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const sampleAnchor = {
  scope: "text" as const,
  exact: "hello",
  prefix: "",
  suffix: "",
  heading: "",
  blockIndex: null,
};

const sampleComment: ReviewComment = {
  id: "c1",
  anchor: sampleAnchor,
  author: "alice",
  type: "question",
  status: "open",
  content: "What?",
  createdAt: "2025-01-01T00:00:00.000Z",
  replies: [],
};

describe("api", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("fetchComments", () => {
    it("fetches comments for a doc path", async () => {
      const reviewFile: ReviewFile = {
        documentPath: "guide/intro",
        comments: [sampleComment],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(reviewFile),
      });

      const result = await fetchComments("guide/intro");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/reviews?doc=guide%2Fintro",
      );
      expect(result).toEqual(reviewFile);
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      await expect(fetchComments("missing")).rejects.toThrow(
        "Failed to fetch comments: Not Found",
      );
    });
  });

  describe("createComment", () => {
    it("posts a new comment", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleComment),
      });

      const result = await createComment("guide/intro", {
        anchor: sampleAnchor,
        content: "What?",
        type: "question",
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc: "guide/intro",
          anchor: sampleAnchor,
          content: "What?",
          type: "question",
        }),
      });
      expect(result).toEqual(sampleComment);
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
      });

      await expect(
        createComment("doc", {
          anchor: sampleAnchor,
          content: "",
          type: "question",
        }),
      ).rejects.toThrow("Failed to create comment: Bad Request");
    });
  });

  describe("updateComment", () => {
    it("patches comment status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...sampleComment, status: "resolved" }),
      });

      const result = await updateComment("c1", {
        doc: "guide/intro",
        status: "resolved",
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/reviews/c1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc: "guide/intro", status: "resolved" }),
      });
      expect(result.status).toBe("resolved");
    });

    it("patches comment content", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...sampleComment, content: "Updated" }),
      });

      await updateComment("c1", { doc: "guide/intro", content: "Updated" });

      expect(mockFetch).toHaveBeenCalledWith("/api/reviews/c1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc: "guide/intro", content: "Updated" }),
      });
    });

    it("adds a reply", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleComment),
      });

      await updateComment("c1", {
        doc: "guide/intro",
        reply: { author: "bob", content: "Answer" },
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/reviews/c1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc: "guide/intro",
          reply: { author: "bob", content: "Answer" },
        }),
      });
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      await expect(
        updateComment("missing", { doc: "x", status: "resolved" }),
      ).rejects.toThrow("Failed to update comment: Not Found");
    });
  });

  describe("deleteComment", () => {
    it("deletes a comment", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await deleteComment("c1", "guide/intro");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/reviews/c1?doc=guide%2Fintro",
        { method: "DELETE" },
      );
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      await expect(deleteComment("missing", "doc")).rejects.toThrow(
        "Failed to delete comment: Not Found",
      );
    });
  });
});
