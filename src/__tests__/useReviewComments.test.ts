import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useReviewComments } from "../client/useReviewComments";
import * as api from "../client/api";
import type { ReviewFile, ReviewComment } from "../types";

vi.mock("../client/api");

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

const emptyReviewFile: ReviewFile = { documentPath: "doc", comments: [] };
const reviewFileWithComment: ReviewFile = {
  documentPath: "doc",
  comments: [sampleComment],
};

describe("useReviewComments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchComments).mockResolvedValue(emptyReviewFile);
  });

  it("fetches comments on mount", async () => {
    vi.mocked(api.fetchComments).mockResolvedValue(reviewFileWithComment);

    const { result } = renderHook(() => useReviewComments("guide/intro"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(api.fetchComments).toHaveBeenCalledWith("guide/intro");
    expect(result.current.comments).toEqual([sampleComment]);
  });

  it("starts with isLoading true", () => {
    const { result } = renderHook(() => useReviewComments("doc"));
    expect(result.current.isLoading).toBe(true);
  });

  it("addComment calls api.createComment and refetches", async () => {
    vi.mocked(api.createComment).mockResolvedValue(sampleComment);
    vi.mocked(api.fetchComments)
      .mockResolvedValueOnce(emptyReviewFile)
      .mockResolvedValueOnce(reviewFileWithComment);

    const { result } = renderHook(() => useReviewComments("doc"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addComment(sampleAnchor, "What?", "question");
    });

    expect(api.createComment).toHaveBeenCalledWith("doc", {
      anchor: sampleAnchor,
      content: "What?",
      type: "question",
    });
    expect(api.fetchComments).toHaveBeenCalledTimes(2);
  });

  it("addReply calls api.updateComment with reply payload", async () => {
    vi.mocked(api.updateComment).mockResolvedValue(sampleComment);

    const { result } = renderHook(() => useReviewComments("doc"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addReply("c1", "My reply");
    });

    expect(api.updateComment).toHaveBeenCalledWith("c1", {
      doc: "doc",
      reply: { author: "", content: "My reply" },
    });
  });

  it("editComment calls api.updateComment with content", async () => {
    vi.mocked(api.updateComment).mockResolvedValue(sampleComment);

    const { result } = renderHook(() => useReviewComments("doc"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.editComment("c1", "Updated");
    });

    expect(api.updateComment).toHaveBeenCalledWith("c1", {
      doc: "doc",
      content: "Updated",
    });
  });

  it("editReply calls api.updateComment with editReply payload", async () => {
    vi.mocked(api.updateComment).mockResolvedValue(sampleComment);

    const { result } = renderHook(() => useReviewComments("doc"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.editReply("c1", "r1", "Edited reply");
    });

    expect(api.updateComment).toHaveBeenCalledWith("c1", {
      doc: "doc",
      editReply: { replyId: "r1", content: "Edited reply" },
    });
  });

  it("resolveComment sets status to resolved", async () => {
    vi.mocked(api.updateComment).mockResolvedValue({
      ...sampleComment,
      status: "resolved",
    });

    const { result } = renderHook(() => useReviewComments("doc"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.resolveComment("c1");
    });

    expect(api.updateComment).toHaveBeenCalledWith("c1", {
      doc: "doc",
      status: "resolved",
    });
  });

  it("unresolveComment sets status to open", async () => {
    vi.mocked(api.updateComment).mockResolvedValue(sampleComment);

    const { result } = renderHook(() => useReviewComments("doc"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.unresolveComment("c1");
    });

    expect(api.updateComment).toHaveBeenCalledWith("c1", {
      doc: "doc",
      status: "open",
    });
  });

  it("deleteComment calls api.deleteComment", async () => {
    vi.mocked(api.deleteComment).mockResolvedValue(undefined);

    const { result } = renderHook(() => useReviewComments("doc"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteComment("c1");
    });

    expect(api.deleteComment).toHaveBeenCalledWith("c1", "doc");
  });

  it("manages hoveredCommentId state", async () => {
    const { result } = renderHook(() => useReviewComments("doc"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hoveredCommentId).toBeNull();

    act(() => {
      result.current.setHoveredCommentId("c1");
    });

    expect(result.current.hoveredCommentId).toBe("c1");

    act(() => {
      result.current.setHoveredCommentId(null);
    });

    expect(result.current.hoveredCommentId).toBeNull();
  });

  it("manages isPanelOpen state", async () => {
    const { result } = renderHook(() => useReviewComments("doc"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isPanelOpen).toBe(false);

    act(() => {
      result.current.setIsPanelOpen(true);
    });

    expect(result.current.isPanelOpen).toBe(true);
  });
});
