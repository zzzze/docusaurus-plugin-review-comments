import { useCallback, useEffect, useState } from "react";
import type { ReviewAnchor, ReviewComment } from "../types";
import * as api from "./api";

interface ReviewCommentsState {
  docPath: string;
  comments: ReviewComment[];
  isLoading: boolean;
  addComment: (
    anchor: ReviewAnchor,
    content: string,
    type: ReviewComment["type"],
  ) => Promise<void>;
  addReply: (commentId: string, content: string) => Promise<void>;
  editComment: (commentId: string, content: string) => Promise<void>;
  editReply: (commentId: string, replyId: string, content: string) => Promise<void>;
  deleteReply: (commentId: string, replyId: string) => Promise<void>;
  resolveComment: (commentId: string) => Promise<void>;
  unresolveComment: (commentId: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  hoveredCommentId: string | null;
  setHoveredCommentId: (id: string | null) => void;
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
  orphanedCommentIds: Set<string>;
  setOrphanedCommentIds: (ids: Set<string>) => void;
  refetch: () => Promise<void>;
}

export function useReviewComments(docPath: string): ReviewCommentsState {
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [orphanedCommentIds, setOrphanedCommentIds] = useState<Set<string>>(
    new Set(),
  );

  const refetch = useCallback(async () => {
    if (!docPath) return;
    const reviewFile = await api.fetchComments(docPath);
    setComments(reviewFile.comments);
  }, [docPath]);

  useEffect(() => {
    if (!docPath) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    refetch().finally(() => setIsLoading(false));
  }, [refetch, docPath]);

  useEffect(() => {
    if (!docPath) return;
    let es: EventSource | null = null;
    let retryMs = 1000;

    function connect() {
      es = new EventSource("/api/reviews/events");
      es.addEventListener("agent:done", (e: MessageEvent) => {
        const { docPath: changedPath } = JSON.parse(e.data as string) as { docPath: string };
        if (changedPath === docPath) void refetch();
      });
      es.onerror = () => {
        es?.close();
        setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 30_000);
      };
    }

    connect();
    return () => { es?.close(); };
  }, [docPath, refetch]);

  const addComment = useCallback(
    async (
      anchor: ReviewAnchor,
      content: string,
      type: ReviewComment["type"],
    ) => {
      await api.createComment(docPath, { anchor, content, type });
      await refetch();
    },
    [docPath, refetch],
  );

  const addReply = useCallback(
    async (commentId: string, content: string) => {
      await api.updateComment(commentId, {
        doc: docPath,
        reply: { author: "", content },
      });
      await refetch();
    },
    [docPath, refetch],
  );

  const editComment = useCallback(
    async (commentId: string, content: string) => {
      await api.updateComment(commentId, { doc: docPath, content });
      await refetch();
    },
    [docPath, refetch],
  );

  const editReply = useCallback(
    async (commentId: string, replyId: string, content: string) => {
      await api.updateComment(commentId, {
        doc: docPath,
        editReply: { replyId, content },
      });
      await refetch();
    },
    [docPath, refetch],
  );

  const deleteReplyFn = useCallback(
    async (commentId: string, replyId: string) => {
      await api.updateComment(commentId, { doc: docPath, deleteReply: { replyId } });
      await refetch();
    },
    [docPath, refetch],
  );

  const resolveComment = useCallback(
    async (commentId: string) => {
      await api.updateComment(commentId, { doc: docPath, status: "resolved" });
      await refetch();
    },
    [docPath, refetch],
  );

  const unresolveComment = useCallback(
    async (commentId: string) => {
      await api.updateComment(commentId, { doc: docPath, status: "open" });
      await refetch();
    },
    [docPath, refetch],
  );

  const deleteCommentFn = useCallback(
    async (commentId: string) => {
      await api.deleteComment(commentId, docPath);
      await refetch();
    },
    [docPath, refetch],
  );

  return {
    docPath,
    comments,
    isLoading,
    addComment,
    addReply,
    editComment,
    editReply,
    deleteReply: deleteReplyFn,
    resolveComment,
    unresolveComment,
    deleteComment: deleteCommentFn,
    hoveredCommentId,
    setHoveredCommentId,
    isPanelOpen,
    setIsPanelOpen,
    orphanedCommentIds,
    setOrphanedCommentIds,
    refetch,
  };
}
