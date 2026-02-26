import React, { useState, useRef, useCallback } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, Check, Reply, MessageSquare, Pencil } from "lucide-react";
import type { ReviewAnchor, ReviewComment } from "../../types";
import { useReview } from "../../client/ReviewContext";
import styles from "./styles.module.css";

type CommentType = ReviewComment["type"];
type AnchorScope = ReviewAnchor["scope"];

interface CommentFormProps {
  mode: "create" | "reply" | "edit";
  initialAnchor?: ReviewAnchor;
  blockAnchor?: ReviewAnchor;
  initialType?: CommentType;
  commentId?: string;
  initialContent?: string;
  variant?: "floating" | "inline";
  onSubmit: () => void;
  onCancel: () => void;
  onScopeChange?: (scope: AnchorScope) => void;
}

function upgradeAnchor(
  anchor: ReviewAnchor,
  newScope: AnchorScope,
  cachedTextAnchor: ReviewAnchor | null,
  blockAnchor: ReviewAnchor | undefined,
): ReviewAnchor {
  if (newScope === "text" && cachedTextAnchor) {
    return cachedTextAnchor;
  }
  if (newScope === "document") {
    return {
      scope: "document",
      exact: "",
      prefix: "",
      suffix: "",
      heading: "",
      blockIndex: null,
    };
  }
  if (newScope === "block") {
    if (blockAnchor) {
      return blockAnchor;
    }
    return { ...anchor, scope: "block", prefix: "", suffix: "" };
  }
  return anchor;
}

export function CommentForm({
  mode,
  initialAnchor,
  blockAnchor,
  initialType = "question",
  commentId,
  initialContent = "",
  variant = "floating",
  onSubmit,
  onCancel,
  onScopeChange,
}: CommentFormProps): React.ReactElement {
  const { addComment, addReply, editComment } = useReview();
  const [content, setContent] = useState(initialContent);
  const [commentType, setCommentType] = useState<CommentType>(initialType);
  const [anchor, setAnchor] = useState<ReviewAnchor | undefined>(
    initialAnchor,
  );
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cache the original text anchor so we can restore it
  const cachedTextAnchor = useRef<ReviewAnchor | null>(
    initialAnchor?.scope === "text" ? initialAnchor : null,
  );

  const initialScope = initialAnchor?.scope ?? "document";
  const SCOPE_ORDER: AnchorScope[] = ["text", "block", "document"];

  const handleScopeChange = useCallback(
    (newScope: AnchorScope) => {
      if (!anchor || anchor.scope === newScope) return;
      // Only allow switching back to text if we started from text
      if (newScope === "text" && initialScope !== "text") return;
      const newAnchor = upgradeAnchor(anchor, newScope, cachedTextAnchor.current, blockAnchor);
      setAnchor(newAnchor);
      onScopeChange?.(newScope);
    },
    [anchor, blockAnchor, initialScope, onScopeChange],
  );

  const handleSubmit = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (mode === "edit" && commentId) {
        await editComment(commentId, trimmed);
      } else if (mode === "create" && anchor) {
        await addComment(anchor, trimmed, commentType);
      } else if (mode === "reply" && commentId) {
        await addReply(commentId, trimmed);
      }
      setContent("");
      onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    content, isSubmitting, mode, anchor,
    commentType, commentId, addComment, addReply, editComment, onSubmit,
  ]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        void handleSubmit();
      }
      if (event.key === "Escape") {
        onCancel();
      }
    },
    [handleSubmit, onCancel],
  );

  const autoGrow = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const textarea = e.target;
      setContent(textarea.value);
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`;
    },
    [],
  );

  return (
    <div className={`${styles.form} ${variant === "inline" ? styles.formInline : ""}`}>
      {mode === "create" && (
        <>
          <div className={styles.segmentedControl}>
            {(["question", "suggestion", "issue"] as const).map((t) => (
              <button
                key={t}
                className={`${styles.segment} ${commentType === t ? styles.segmentActive : ""}`}
                onClick={() => setCommentType(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {anchor && (
            <div className={styles.scopeSelector}>
              {SCOPE_ORDER.map((s) => (
                <button
                  key={s}
                  className={`${styles.scopeButton} ${anchor.scope === s ? styles.scopeActive : ""}`}
                  disabled={
                    (s === "text" && initialScope !== "text") ||
                    (s === "block" && !blockAnchor)
                  }
                  onClick={() => handleScopeChange(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "write" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("write")}
        >
          Write
        </button>
        <button
          className={`${styles.tab} ${activeTab === "preview" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("preview")}
        >
          Preview
        </button>
      </div>

      {activeTab === "write" ? (
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          rows={3}
          placeholder={
            mode === "reply" ? "Write a reply..." : "Write a comment..."
          }
          value={content}
          onChange={autoGrow}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <div className={styles.preview}>
          {content.trim() ? (
            <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
          ) : (
            <span className={styles.previewEmpty}>Nothing to preview</span>
          )}
        </div>
      )}

      <div className={styles.actions}>
        <span className={styles.hint}>Ctrl+Enter to submit</span>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onCancel}
        >
          <X size={14} />
          Cancel
        </button>
        <button
          type="button"
          className={styles.submitButton}
          disabled={!content.trim() || isSubmitting}
          onClick={() => void handleSubmit()}
        >
          {mode === "reply" ? (
            <><Reply size={14} /> Reply</>
          ) : mode === "edit" ? (
            <><Check size={14} /> Save</>
          ) : (
            <><MessageSquare size={14} /> Comment</>
          )}
        </button>
      </div>
    </div>
  );
}