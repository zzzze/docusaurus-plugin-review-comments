import React, { useState, useRef, useLayoutEffect } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Reply, Pencil, Check, Trash2, RotateCcw, X, ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import type { ReviewComment } from "../../types";
import { useReview } from "../../client/ReviewContext";
import { scrollToHighlight } from "../../client/highlightRenderer";
import { CommentForm } from "../CommentForm";
import styles from "./styles.module.css";

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const BADGE_CLASS: Record<ReviewComment["type"], string> = {
  question: styles.badgeQuestion!,
  suggestion: styles.badgeSuggestion!,
  issue: styles.badgeIssue!,
};

interface CommentCardProps {
  comment: ReviewComment;
  onResolved?: (comment: ReviewComment) => void;
}

export function CommentCard({
  comment,
  onResolved,
}: CommentCardProps): React.ReactElement {
  const {
    resolveComment,
    unresolveComment,
    deleteComment,
    editReply,
    deleteReply,
    setHoveredCommentId,
  } = useReview();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyContent, setEditingReplyContent] = useState("");
  const [isResolvedExpanded, setIsResolvedExpanded] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [isRepliesExpanded, setIsRepliesExpanded] = useState(false);
  const [isContentClamped, setIsContentClamped] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingDeleteReplyId, setConfirmingDeleteReplyId] = useState<string | null>(null);
  const [confirmingResolve, setConfirmingResolve] = useState(false);
  const [confirmingReopen, setConfirmingReopen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (el) {
      setIsContentClamped(el.scrollHeight > el.clientHeight);
    }
  }, [comment.content]);

  const isResolved = comment.status === "resolved";

  if (isResolved && !isResolvedExpanded) {
    const contentPreview =
      comment.content.length > 50
        ? comment.content.slice(0, 50).trim() + "…"
        : comment.content;

    return (
      <div
        className={`${styles.card} ${styles.cardResolved} ${styles.cardResolvedCollapsed}`}
        data-card-comment-id={comment.id}
        onClick={() => setIsResolvedExpanded(true)}
        onMouseEnter={() => setHoveredCommentId(comment.id)}
        onMouseLeave={() => setHoveredCommentId(null)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setIsResolvedExpanded(true);
        }}
      >
        <div className={styles.resolvedSummary}>
          <span className={styles.author}>{comment.author}</span>
          <span className={`${styles.typeBadge} ${BADGE_CLASS[comment.type]}`}>
            {comment.type}
          </span>
          <span className={styles.time}>resolved</span>
        </div>
        <div className={styles.resolvedPreview}>{contentPreview}</div>
      </div>
    );
  }

  const anchorExact = comment.anchor.scope !== "document" ? comment.anchor.exact : null;

  const textExcerpt = anchorExact
    ? anchorExact.length > 60
      ? `"${anchorExact.slice(0, 60)}..."`
      : `"${anchorExact}"`
    : null;

  const blockPreview = anchorExact
    ? anchorExact.split("\n")[0]!.trim().slice(0, 50) +
      (anchorExact.length > 50 ? "…" : "")
    : null;

  return (
    <div
      className={`${styles.card} ${isResolved ? styles.cardResolved : ""}`}
      data-card-comment-id={comment.id}
      onMouseEnter={() => setHoveredCommentId(comment.id)}
      onMouseLeave={() => setHoveredCommentId(null)}
      tabIndex={0}
    >
      <div
        className={`${styles.cardHeader} ${isResolved && isResolvedExpanded ? styles.cardHeaderClickable : ""}`}
        onClick={isResolved && isResolvedExpanded ? () => setIsResolvedExpanded(false) : undefined}
        role={isResolved && isResolvedExpanded ? "button" : undefined}
        tabIndex={isResolved && isResolvedExpanded ? 0 : undefined}
        aria-label={isResolved && isResolvedExpanded ? "Collapse resolved comment" : undefined}
        onKeyDown={
          isResolved && isResolvedExpanded
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") setIsResolvedExpanded(false);
              }
            : undefined
        }
      >
        <span className={styles.author}>{comment.author}</span>
        <span className={`${styles.typeBadge} ${BADGE_CLASS[comment.type]}`}>
          {comment.type}
        </span>
        <span className={styles.time}>
          {formatRelativeTime(comment.createdAt)}
        </span>
        {isResolved && isResolvedExpanded && (
          <ChevronUp size={14} className={styles.collapseIcon} />
        )}
      </div>

      {comment.anchor.scope === "document" && (
        <div className={`${styles.anchorExcerpt} ${styles.anchorDocument}`}>
          Entire document
        </div>
      )}

      {comment.anchor.scope === "block" && blockPreview && (
        <div
          className={styles.anchorExcerpt}
          onClick={() => scrollToHighlight(comment.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") scrollToHighlight(comment.id);
          }}
        >
          <span className={styles.anchorScopeIcon}>¶</span> {blockPreview}
        </div>
      )}

      {comment.anchor.scope === "text" && textExcerpt && (
        <div
          className={styles.anchorExcerpt}
          onClick={() => scrollToHighlight(comment.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") scrollToHighlight(comment.id);
          }}
        >
          {textExcerpt}
        </div>
      )}

      {isEditing ? (
        <CommentForm
          mode="edit"
          commentId={comment.id}
          initialContent={comment.content}
          onSubmit={() => setIsEditing(false)}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          <div
            ref={contentRef}
            className={`${styles.commentBody} ${!isContentExpanded ? styles.commentBodyTruncated : ""}`}
          >
            <Markdown remarkPlugins={[remarkGfm]}>{comment.content}</Markdown>
          </div>
          {isContentClamped && !isContentExpanded && (
            <button
              type="button"
              className={styles.showMoreButton}
              onClick={() => setIsContentExpanded(true)}
            >
              Show more
            </button>
          )}
          {isContentExpanded && isContentClamped && (
            <button
              type="button"
              className={styles.showMoreButton}
              onClick={() => setIsContentExpanded(false)}
            >
              Show less
            </button>
          )}
        </>
      )}

      {comment.replies.length > 0 && (
        <div className={styles.repliesSection}>
          <button
            type="button"
            className={styles.repliesToggle}
            onClick={() => setIsRepliesExpanded(!isRepliesExpanded)}
          >
            {isRepliesExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
          </button>
          {isRepliesExpanded && (
            <div className={styles.replies}>
          {comment.replies.map((reply) => (
            <div key={reply.id} className={styles.reply}>
              <div className={styles.replyHeader}>
                <span className={styles.author}>{reply.author}</span>
                <span className={styles.time}>
                  {formatRelativeTime(reply.createdAt)}
                </span>
                {!isResolved && editingReplyId !== reply.id && confirmingDeleteReplyId !== reply.id && (
                  <span className={styles.replyActions}>
                    <button
                      type="button"
                      className={styles.replyEditButton}
                      onClick={() => {
                        setEditingReplyId(reply.id);
                        setEditingReplyContent(reply.content);
                      }}
                      aria-label="Edit reply"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className={styles.replyEditButton}
                      onClick={() => setConfirmingDeleteReplyId(reply.id)}
                      aria-label="Delete reply"
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                )}
                {!isResolved && confirmingDeleteReplyId === reply.id && (
                  <span className={styles.replyDeleteConfirm}>
                    <span className={styles.confirmText}>Delete reply?</span>
                    <button
                      type="button"
                      className={styles.replyEditButton}
                      onClick={() => {
                        void deleteReply(comment.id, reply.id).then(() => setConfirmingDeleteReplyId(null));
                      }}
                      aria-label="Confirm delete reply"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      className={styles.replyEditButton}
                      onClick={() => setConfirmingDeleteReplyId(null)}
                      aria-label="Cancel delete reply"
                    >
                      <X size={14} />
                    </button>
                  </span>
                )}
              </div>
              {editingReplyId === reply.id ? (
                <div className={styles.replyEditForm}>
                  <textarea
                    className={styles.replyTextarea}
                    value={editingReplyContent}
                    onChange={(e) => setEditingReplyContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        void editReply(comment.id, reply.id, editingReplyContent.trim()).then(() => setEditingReplyId(null));
                      }
                      if (e.key === "Escape") setEditingReplyId(null);
                    }}
                    autoFocus
                  />
                  <div className={styles.replyFormActions}>
                    <button
                      type="button"
                      className={styles.cancelButton}
                      onClick={() => setEditingReplyId(null)}
                    >
                      <X size={14} />
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={styles.submitButton}
                      disabled={!editingReplyContent.trim()}
                      onClick={() => void editReply(comment.id, reply.id, editingReplyContent.trim()).then(() => setEditingReplyId(null))}
                    >
                      <Check size={14} />
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.replyBody}>
                  <Markdown remarkPlugins={[remarkGfm]}>{reply.content}</Markdown>
                </div>
              )}
            </div>
          ))}
            </div>
          )}
        </div>
      )}

      {showReplyForm && (
        <CommentForm
          mode="reply"
          commentId={comment.id}
          onSubmit={() => setShowReplyForm(false)}
          onCancel={() => setShowReplyForm(false)}
        />
      )}

      {!isEditing && (
      <div className={styles.cardFooter}>
        {confirmingDelete ? (
          <>
            <span className={styles.confirmText}>Delete?</span>
            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => void deleteComment(comment.id)}
            >
              <Trash2 size={14} />
              Yes
            </button>
            <button
              type="button"
              className={styles.footerButton}
              onClick={() => setConfirmingDelete(false)}
            >
              <X size={14} />
              No
            </button>
          </>
        ) : confirmingResolve ? (
          <>
            <span className={styles.confirmText}>Resolve?</span>
            <button
              type="button"
              className={styles.footerButton}
              onClick={() => {
                void resolveComment(comment.id).then(() => onResolved?.(comment));
                setConfirmingResolve(false);
              }}
            >
              <Check size={14} />
              Yes
            </button>
            <button
              type="button"
              className={styles.footerButton}
              onClick={() => setConfirmingResolve(false)}
            >
              <X size={14} />
              No
            </button>
          </>
        ) : confirmingReopen ? (
          <>
            <span className={styles.confirmText}>Reopen?</span>
            <button
              type="button"
              className={styles.footerButton}
              onClick={() => {
                void unresolveComment(comment.id);
                setConfirmingReopen(false);
              }}
            >
              <Check size={14} />
              Yes
            </button>
            <button
              type="button"
              className={styles.footerButton}
              onClick={() => setConfirmingReopen(false)}
            >
              <X size={14} />
              No
            </button>
          </>
        ) : (
          <>
            {!isResolved && (
              <>
                <button
                  type="button"
                  className={styles.footerButton}
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  aria-label="Reply"
                  title="Reply"
                >
                  <Reply size={14} />
                </button>
                <button
                  type="button"
                  className={styles.footerButton}
                  onClick={() => {
                    setIsEditing(true);
                    setShowReplyForm(false);
                  }}
                  aria-label="Edit"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
              </>
            )}
            <button
              type="button"
              className={styles.footerButton}
              onClick={() => {
                if (isResolved) {
                  setConfirmingReopen(true);
                } else {
                  setConfirmingResolve(true);
                }
              }}
              aria-label={isResolved ? "Reopen" : "Resolve"}
              title={isResolved ? "Reopen" : "Resolve"}
            >
              {isResolved ? <RotateCcw size={14} /> : <Check size={14} />}
            </button>
            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => setConfirmingDelete(true)}
              aria-label="Delete comment"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
      )}
    </div>
  );
}
