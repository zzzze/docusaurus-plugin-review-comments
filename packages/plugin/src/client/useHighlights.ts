import { useEffect, useRef } from "react";
import type { ReviewComment } from "../types";
import {
  findTextInDocument,
  highlightRangePerNode,
  removeAllHighlights,
  setHighlightHover,
  applyBlockHighlight,
  removeAllBlockHighlights,
} from "./highlightRenderer";

interface UseHighlightsOptions {
  comments: ReviewComment[];
  hoveredCommentId: string | null;
  contentRef: React.RefObject<HTMLElement | null>;
  onOrphanedFound: (orphanedIds: string[]) => void;
  onHighlightClick: (commentId: string) => void;
}

export function useHighlights({
  comments,
  hoveredCommentId,
  contentRef,
  onOrphanedFound,
  onHighlightClick,
}: UseHighlightsOptions): void {
  const prevHoveredRef = useRef<string | null>(null);

  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;

    removeAllHighlights();
    removeAllBlockHighlights();

    const orphanedIds: string[] = [];
    const openComments = comments.filter((c) => c.status === "open");

    for (const comment of openComments) {
      if (comment.anchor.scope === "document") continue;

      if (comment.anchor.scope === "block") {
        const range = findTextInDocument(comment.anchor, contentEl);
        if (range) {
          applyBlockHighlight({ anchor: comment.anchor, commentId: comment.id, contentElement: contentEl });
        } else {
          orphanedIds.push(comment.id);
        }
        continue;
      }

      const range = findTextInDocument(comment.anchor, contentEl);
      if (range) {
        highlightRangePerNode(range, comment.id);
      } else {
        orphanedIds.push(comment.id);
      }
    }

    onOrphanedFound(orphanedIds);

    return () => {
      removeAllHighlights();
      removeAllBlockHighlights();
    };
  }, [comments, contentRef, onOrphanedFound]);

  useEffect(() => {
    if (prevHoveredRef.current) {
      setHighlightHover(prevHoveredRef.current, false);
    }
    if (hoveredCommentId) {
      setHighlightHover(hoveredCommentId, true);
    }
    prevHoveredRef.current = hoveredCommentId;
  }, [hoveredCommentId]);

  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      const target = e.target as HTMLElement;
      const mark = target.closest("mark[data-comment-id]");
      if (mark) {
        const commentId = mark.getAttribute("data-comment-id");
        if (commentId) onHighlightClick(commentId);
        return;
      }
      const blockEl = target.closest("[data-block-highlight-id]");
      if (blockEl) {
        const commentId = blockEl.getAttribute("data-block-highlight-id");
        if (commentId) onHighlightClick(commentId);
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [onHighlightClick]);
}
