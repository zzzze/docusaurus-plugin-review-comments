import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import type { ReviewAnchor } from "../../types";
import { useTextSelection } from "../../client/useTextSelection";
import {
  highlightRangePerNode,
  removeHighlight,
  applyBlockHighlight,
  removeBlockHighlight,
} from "../../client/highlightRenderer";
import {
  findParentBlock,
  buildAnchorFromBlock,
} from "../../client/anchorUtils";
import { CommentForm } from "../CommentForm";
import styles from "./styles.module.css";

const PENDING_COMMENT_ID = "__pending__";

interface FloatingToolbarProps {
  contentRef: React.RefObject<HTMLElement | null>;
}

interface FormState {
  anchor: ReviewAnchor;
  blockAnchor: ReviewAnchor | null;
  range: Range;
  type: "question" | "suggestion" | "issue";
  selectionTop: number;
  selectionBottom: number;
  left: number;
}

type HighlightMode = "text" | "block" | "none";

function clearPendingHighlights(): void {
  removeHighlight(PENDING_COMMENT_ID);
  removeBlockHighlight(PENDING_COMMENT_ID);
}

export function FloatingToolbar({
  contentRef,
}: FloatingToolbarProps): React.ReactElement | null {
  const {
    isSelecting,
    toolbarPosition,
    selectedAnchor,
    selectedRange,
    clearSelection,
  } = useTextSelection(contentRef);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [highlightMode, setHighlightMode] = useState<HighlightMode>("text");
  const [adjustedPos, setAdjustedPos] = useState<{ top: number; left: number } | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const formStateRef = useRef(formState);
  formStateRef.current = formState;

  const closeForm = useCallback(() => {
    clearPendingHighlights();
    setFormState(null);
    setAdjustedPos(null);
    clearSelection();
  }, [clearSelection]);

  // Apply/remove pending highlight when form or highlight mode changes
  useEffect(() => {
    if (!formState) return;
    clearPendingHighlights();
    if (highlightMode === "text") {
      highlightRangePerNode(formState.range, PENDING_COMMENT_ID);
    } else if (highlightMode === "block" && contentRef.current) {
      applyBlockHighlight(formState.anchor, PENDING_COMMENT_ID, contentRef.current);
    }
    return () => {
      clearPendingHighlights();
    };
  }, [formState, highlightMode, contentRef]);

  const isFormOpen = formState !== null;

  // Compute position after render so we know the toolbar's real dimensions.
  // Runs whenever the anchor coordinates change (new selection or form open/close).
  const rawSelectionTop = isFormOpen
    ? formState!.selectionTop
    : toolbarPosition?.selectionTop ?? null;
  const rawSelectionBottom = isFormOpen
    ? formState!.selectionBottom
    : toolbarPosition?.selectionBottom ?? null;
  const rawLeft = isFormOpen ? formState!.left : toolbarPosition?.left ?? null;

  useLayoutEffect(() => {
    const el = toolbarRef.current;
    if (!el || rawSelectionTop === null || rawSelectionBottom === null || rawLeft === null) return;

    const GAP = 8;
    const { offsetWidth: w, offsetHeight: h } = el;
    const vpWidth = window.innerWidth;
    const vpHeight = window.innerHeight;
    const scrollY = window.scrollY;

    // Prefer above the selection; flip below if not enough room
    let top: number;
    const spaceAbove = rawSelectionTop - scrollY; // viewport pixels above selection top
    if (spaceAbove >= h + GAP) {
      top = rawSelectionTop - h - GAP;
    } else {
      top = rawSelectionBottom + GAP;
    }

    // Clamp left so toolbar stays within viewport
    const halfW = w / 2;
    let left = rawLeft;
    left = Math.max(halfW + GAP, left);
    left = Math.min(vpWidth - halfW - GAP, left);

    // Clamp top so toolbar stays within visible document area
    const maxTop = scrollY + vpHeight - h - GAP;
    const minTop = scrollY + GAP;
    top = Math.max(minTop, Math.min(maxTop, top));

    setAdjustedPos({ top, left });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawSelectionTop, rawSelectionBottom, rawLeft, isFormOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        closeForm();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeForm]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent): void => {
      // Don't dismiss the form on outside click — only the toolbar buttons.
      // The form should only close via Cancel, Escape, or Submit.
      if (formStateRef.current !== null) return;
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node)
      ) {
        clearSelection();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [clearSelection]);

  const handleAddComment = (
    type: "question" | "suggestion" | "issue",
  ): void => {
    if (!selectedAnchor || !toolbarPosition || !selectedRange) return;
    const startBlock = findParentBlock(selectedRange.startContainer);
    const endBlock = findParentBlock(selectedRange.endContainer);
    const isSingleBlock =
      startBlock instanceof HTMLElement &&
      endBlock instanceof HTMLElement &&
      startBlock === endBlock;
    const blockAnchor = isSingleBlock
      ? buildAnchorFromBlock(startBlock)
      : null;
    setHighlightMode("text");
    setFormState({
      anchor: selectedAnchor,
      blockAnchor,
      range: selectedRange,
      type,
      selectionTop: toolbarPosition.selectionTop,
      selectionBottom: toolbarPosition.selectionBottom,
      left: toolbarPosition.left,
    });
  };

  const handleScopeChange = useCallback(
    (scope: "text" | "block" | "document") => {
      if (scope === "text") setHighlightMode("text");
      else if (scope === "block") setHighlightMode("block");
      else setHighlightMode("none");
    },
    [],
  );

  const handleFormSubmit = (): void => {
    closeForm();
  };

  const handleFormCancel = (): void => {
    clearPendingHighlights();
    setFormState(null);
  };

  const showToolbarButtons = isSelecting && toolbarPosition && selectedAnchor && !isFormOpen;

  if (!showToolbarButtons && !isFormOpen) return null;

  return (
    <div
      ref={toolbarRef}
      className={`${styles.toolbar} ${isFormOpen ? styles.toolbarWithForm : ""}`}
      style={{
        position: "absolute",
        top: adjustedPos?.top ?? -9999,
        left: adjustedPos?.left ?? -9999,
        transform: "translateX(-50%)",
        visibility: adjustedPos ? "visible" : "hidden",
      }}
    >
      {showToolbarButtons ? (
        <div className={styles.buttons}>
          <button
            className={styles.typeButton}
            onClick={() => handleAddComment("question")}
            title="Add Question"
          >
            Question
          </button>
          <button
            className={styles.typeButton}
            onClick={() => handleAddComment("suggestion")}
            title="Add Suggestion"
          >
            Suggestion
          </button>
          <button
            className={styles.typeButton}
            onClick={() => handleAddComment("issue")}
            title="Add Issue"
          >
            Issue
          </button>
        </div>
      ) : (
        <CommentForm
          mode="create"
          initialAnchor={formState!.anchor}
          blockAnchor={formState!.blockAnchor ?? undefined}
          initialType={formState!.type}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          onScopeChange={handleScopeChange}
        />
      )}
    </div>
  );
}