import type React from "react";
import { useState, useEffect, useCallback } from "react";
import type { ReviewAnchor } from "../types";
import { buildAnchorFromSelection } from "./anchorUtils";

interface ToolbarPosition {
  /** Document Y coordinate of the selection top edge */
  selectionTop: number;
  /** Document Y coordinate of the selection bottom edge */
  selectionBottom: number;
  /** Viewport X coordinate of the selection horizontal center */
  left: number;
}

interface TextSelectionState {
  isSelecting: boolean;
  toolbarPosition: ToolbarPosition | null;
  selectedAnchor: ReviewAnchor | null;
  selectedRange: Range | null;
  clearSelection: () => void;
}

export function useTextSelection(
  contentRef: React.RefObject<HTMLElement | null>,
): TextSelectionState {
  const [isSelecting, setIsSelecting] = useState(false);
  const [toolbarPosition, setToolbarPosition] =
    useState<ToolbarPosition | null>(null);
  const [selectedAnchor, setSelectedAnchor] =
    useState<ReviewAnchor | null>(null);
  const [selectedRange, setSelectedRange] = useState<Range | null>(null);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setIsSelecting(false);
    setToolbarPosition(null);
    setSelectedAnchor(null);
    setSelectedRange(null);
  }, []);

  useEffect(() => {
    const handleSelectionChange = (): void => {
      requestAnimationFrame(() => {
        const selection = window.getSelection();
        if (
          !selection ||
          selection.isCollapsed ||
          !selection.toString().trim()
        ) {
          setIsSelecting(false);
          setToolbarPosition(null);
          setSelectedAnchor(null);
          setSelectedRange(null);
          return;
        }

        const contentEl = contentRef.current;
        if (!contentEl) return;

        const anchorNode = selection.anchorNode;
        if (!anchorNode || !contentEl.contains(anchorNode)) return;

        const anchor = buildAnchorFromSelection(selection);
        if (!anchor) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const selectionTop = rect.top + window.scrollY;
        const selectionBottom = rect.bottom + window.scrollY;
        const left = rect.left + rect.width / 2;

        setIsSelecting(true);
        setToolbarPosition({ selectionTop, selectionBottom, left });
        setSelectedAnchor(anchor);
        setSelectedRange(range.cloneRange());
      });
    };

    document.addEventListener("mouseup", handleSelectionChange);
    document.addEventListener("keyup", handleSelectionChange);
    return () => {
      document.removeEventListener("mouseup", handleSelectionChange);
      document.removeEventListener("keyup", handleSelectionChange);
    };
  }, [contentRef]);

  return { isSelecting, toolbarPosition, selectedAnchor, selectedRange, clearSelection };
}