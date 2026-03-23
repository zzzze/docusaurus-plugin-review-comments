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
    let rafId = 0;

    const processSelection = (): void => {
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

      // Re-query the content element each time so we survive
      // client-side navigations that replace the markdown root.
      let contentEl = contentRef.current;
      if (!contentEl || !contentEl.isConnected) {
        const fresh = document.querySelector<HTMLElement>(".theme-doc-markdown");
        if (fresh) {
          contentRef.current = fresh;
          contentEl = fresh;
        }
      }
      if (!contentEl) return;

      const anchorNode = selection.anchorNode;
      if (!anchorNode || !contentEl.contains(anchorNode)) return;

      let anchor: ReviewAnchor | null = null;
      try {
        anchor = buildAnchorFromSelection(selection, contentEl);
      } catch {
        // fromRange can throw if the range is partially outside the root
        return;
      }
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
    };

    const scheduleUpdate = (): void => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(processSelection);
    };

    document.addEventListener("mouseup", scheduleUpdate);
    document.addEventListener("keyup", scheduleUpdate);
    document.addEventListener("selectionchange", scheduleUpdate);
    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("mouseup", scheduleUpdate);
      document.removeEventListener("keyup", scheduleUpdate);
      document.removeEventListener("selectionchange", scheduleUpdate);
    };
  }, [contentRef]);

  return { isSelecting, toolbarPosition, selectedAnchor, selectedRange, clearSelection };
}