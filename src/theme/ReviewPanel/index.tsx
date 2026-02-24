import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReviewComment } from "../../types";
import { useReview } from "../../client/ReviewContext";
import { CommentCard } from "./CommentCard";
import { CommentForm } from "../CommentForm";
import { BottomSheet } from "../BottomSheet";
import styles from "./styles.module.css";

interface UndoState {
  commentId: string;
  author: string;
}

const UNDO_TIMEOUT_MS = 5000;

function useUndoResolve(
  unresolveComment: (id: string) => Promise<void>,
  showResolved: boolean,
): {
  undoState: UndoState | null;
  onResolved: (comment: ReviewComment) => void;
  dismissUndo: () => void;
  handleUndo: () => void;
} {
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const dismissUndo = useCallback(() => {
    clearTimer();
    setUndoState(null);
  }, [clearTimer]);

  const onResolved = useCallback(
    (comment: ReviewComment) => {
      if (showResolved) return;
      clearTimer();
      setUndoState({ commentId: comment.id, author: comment.author });
      timerRef.current = setTimeout(() => setUndoState(null), UNDO_TIMEOUT_MS);
    },
    [showResolved, clearTimer],
  );

  const handleUndo = useCallback(() => {
    if (!undoState) return;
    clearTimer();
    const { commentId } = undoState;
    setUndoState(null);
    void unresolveComment(commentId);
  }, [undoState, unresolveComment, clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return { undoState, onResolved, dismissUndo, handleUndo };
}

interface CommentGroup {
  heading: string;
  comments: ReviewComment[];
}

function groupByHeading(comments: ReviewComment[]): CommentGroup[] {
  const groups = new Map<string, ReviewComment[]>();

  for (const comment of comments) {
    const heading =
      comment.anchor.scope === "document"
        ? "Document"
        : comment.anchor.heading || "Untitled";
    const existing = groups.get(heading);
    if (existing) {
      existing.push(comment);
    } else {
      groups.set(heading, [comment]);
    }
  }

  const result: CommentGroup[] = [];
  const documentGroup = groups.get("Document");
  if (documentGroup) {
    result.push({ heading: "Document", comments: documentGroup });
    groups.delete("Document");
  }
  for (const [heading, groupComments] of groups) {
    result.push({ heading, comments: groupComments });
  }
  return result;
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 768px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent): void => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

export function ReviewPanel(): React.ReactElement | null {
  const {
    comments,
    isLoading,
    isPanelOpen,
    setIsPanelOpen,
    orphanedCommentIds,
    unresolveComment,
  } = useReview();
  const [orphanedExpanded, setOrphanedExpanded] = useState(false);
  const [resolvedExpanded, setResolvedExpanded] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const isMobile = useIsMobile();
  const { undoState, onResolved, dismissUndo, handleUndo } = useUndoResolve(
    unresolveComment,
    !resolvedExpanded,
  );

  const openComments = useMemo(
    () => comments.filter((c) => c.status === "open"),
    [comments],
  );

  const resolvedComments = useMemo(
    () => comments.filter((c) => c.status === "resolved"),
    [comments],
  );

  const groups = useMemo(
    () => groupByHeading(openComments),
    [openComments],
  );

  const orphanedComments = useMemo(
    () => comments.filter((c) => orphanedCommentIds.has(c.id)),
    [comments, orphanedCommentIds],
  );

  const openCount = comments.filter((c) => c.status === "open").length;

  const handleToggle = useCallback(
    () => setIsPanelOpen(!isPanelOpen),
    [isPanelOpen, setIsPanelOpen],
  );

  const documentAnchor = {
    scope: "document" as const,
    exact: "",
    prefix: "",
    suffix: "",
    heading: "",
    blockIndex: null,
  };

  const commentListContent = (
    <>
      {showNewForm && (
        <div className={styles.newCommentForm}>
          <CommentForm
            mode="create"
            initialAnchor={documentAnchor}
            initialType="question"
            onSubmit={() => setShowNewForm(false)}
            onCancel={() => setShowNewForm(false)}
          />
        </div>
      )}

      {!showNewForm && (
        <button
          type="button"
          className={styles.newCommentButton}
          onClick={() => setShowNewForm(true)}
        >
          + New Comment
        </button>
      )}

      {isLoading && (
        <div className={styles.emptyState}>Loading comments...</div>
      )}

      {!isLoading && openComments.length === 0 && orphanedComments.length === 0 && resolvedComments.length === 0 && (
        <div className={styles.emptyState}>
          No comments yet. Select text to start a review.
        </div>
      )}

      {groups.map((group) => (
        <div key={group.heading} className={styles.group}>
          <div className={styles.groupHeading}>{group.heading}</div>
          {group.comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} onResolved={onResolved} />
          ))}
        </div>
      ))}

      {orphanedComments.length > 0 && (
        <div className={styles.orphanedSection}>
          <button
            type="button"
            className={styles.orphanedToggle}
            onClick={() => setOrphanedExpanded(!orphanedExpanded)}
            aria-expanded={orphanedExpanded}
          >
            Unanchored Comments ({orphanedComments.length})
            <span className={styles.orphanedCaret}>
              {orphanedExpanded ? "\u25BC" : "\u25B6"}
            </span>
          </button>
          {orphanedExpanded && (
            <div className={styles.orphanedList}>
              {orphanedComments.map((comment) => (
                <CommentCard key={comment.id} comment={comment} onResolved={onResolved} />
              ))}
            </div>
          )}
        </div>
      )}

      {resolvedComments.length > 0 && (
        <div className={styles.resolvedSection}>
          <button
            type="button"
            className={styles.resolvedToggle}
            onClick={() => setResolvedExpanded(!resolvedExpanded)}
            aria-expanded={resolvedExpanded}
          >
            Resolved ({resolvedComments.length})
            <span className={styles.orphanedCaret}>
              {resolvedExpanded ? "\u25BC" : "\u25B6"}
            </span>
          </button>
          {resolvedExpanded && (
            <div className={styles.resolvedList}>
              {resolvedComments.map((comment) => (
                <CommentCard key={comment.id} comment={comment} onResolved={onResolved} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );

  const undoToast = undoState && (
    <div className={styles.undoToast} role="status">
      <span>Comment resolved</span>
      <button type="button" className={styles.undoButton} onClick={handleUndo}>
        Undo
      </button>
      <button
        type="button"
        className={styles.undoDismiss}
        onClick={dismissUndo}
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isPanelOpen}
        commentCount={openCount}
        onToggle={handleToggle}
      >
        {commentListContent}
        {undoToast}
      </BottomSheet>
    );
  }

  if (!isPanelOpen) {
    return (
      <div
        className={`${styles.panelContainer} ${styles.collapsed}`}
        onClick={() => setIsPanelOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setIsPanelOpen(true);
        }}
        aria-label={`Open review panel. ${openCount} comments.`}
      >
        <div className={styles.collapsedStrip}>
          {openCount > 0 && (
            <span className={styles.badge}>{openCount}</span>
          )}
          <span className={styles.stripIcon}>Reviews</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.panelContainer} ${styles.expanded}`}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>
          Comments ({openCount})
        </span>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => setIsPanelOpen(false)}
            aria-label="Close review panel"
          >
            &times;
          </button>
        </div>
      </div>

      <div className={styles.body}>
        {commentListContent}
        {undoToast}
      </div>
    </div>
  );
}
