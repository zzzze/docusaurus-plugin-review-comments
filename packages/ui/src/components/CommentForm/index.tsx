import React, { useState, useRef, useCallback, useEffect } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  X, Check, Reply, MessageSquare, Eye, EyeOff,
  HelpCircle, Lightbulb, AlertTriangle, ChevronDown,
} from "lucide-react";
import type { ReviewAnchor, ReviewComment } from "@mdreview/review-service/types";
import { useReview } from "../../hooks/ReviewContext";
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
    return { scope: "document" };
  }
  if (newScope === "block") {
    if (blockAnchor) {
      return blockAnchor;
    }
    return anchor;
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
  const [scopeOpen, setScopeOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scopeRef = useRef<HTMLDivElement>(null);

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

  // Close scope dropdown on outside click
  useEffect(() => {
    if (!scopeOpen) return;
    const handler = (e: MouseEvent) => {
      if (scopeRef.current && !scopeRef.current.contains(e.target as Node)) {
        setScopeOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [scopeOpen]);

  const autoGrow = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const textarea = e.target;
      setContent(textarea.value);
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`;
    },
    [],
  );

  const typeConfig = {
    question:   { icon: HelpCircle,    colorClass: styles.segmentQuestion },
    suggestion: { icon: Lightbulb,     colorClass: styles.segmentSuggestion },
    issue:      { icon: AlertTriangle, colorClass: styles.segmentIssue },
  } as const;

  return (
    <div className={`${styles.form} ${variant === "inline" ? styles.formInline : ""}`}>
      {mode === "create" && (
        <div className={styles.segmentedControl}>
          {(["question", "suggestion", "issue"] as const).map((t) => {
            const { icon: Icon, colorClass } = typeConfig[t];
            const isActive = commentType === t;
            return (
              <button
                key={t}
                className={`${styles.segment} ${isActive ? `${styles.segmentActive} ${colorClass}` : ""}`}
                onClick={() => setCommentType(t)}
              >
                <Icon size={14} />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            );
          })}
        </div>
      )}

      <div className={styles.textareaHeader}>
        {mode === "create" && anchor && (
          <div className={styles.scopeGroup} ref={scopeRef}>
            <span className={styles.scopeLabel}>Scope:</span>
            <button
              type="button"
              className={styles.scopeTrigger}
              onClick={() => setScopeOpen((v) => !v)}
            >
              {anchor.scope.charAt(0).toUpperCase() + anchor.scope.slice(1)}
              <ChevronDown size={12} className={scopeOpen ? styles.chevronOpen : ""} />
            </button>
            {scopeOpen && (
              <div className={styles.scopeDropdown}>
                {SCOPE_ORDER.map((s) => {
                  const disabled =
                    (s === "text" && initialScope !== "text") ||
                    (s === "block" && !blockAnchor);
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`${styles.scopeItem} ${anchor.scope === s ? styles.scopeItemActive : ""}`}
                      disabled={disabled}
                      onClick={() => {
                        handleScopeChange(s);
                        setScopeOpen(false);
                      }}
                    >
                      {anchor.scope === s && <Check size={12} />}
                      <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <button
          className={`${styles.previewToggle} ${activeTab === "preview" ? styles.previewToggleActive : ""}`}
          onClick={() => setActiveTab(activeTab === "write" ? "preview" : "write")}
          title={activeTab === "write" ? "Preview" : "Back to editing"}
        >
          {activeTab === "write" ? <Eye size={14} /> : <EyeOff size={14} />}
          {activeTab === "write" ? "Preview" : "Write"}
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
