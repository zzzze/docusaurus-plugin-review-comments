import React, { useRef, useState, useEffect, useCallback } from "react";
import OriginalLayout from "@theme-init/DocItem/Layout";
import type { WrapperProps } from "@docusaurus/types";
import { useLocation } from "@docusaurus/router";
import { ReviewProvider } from "../../client/ReviewContext";
import { useReview } from "../../client/ReviewContext";
import { useHighlights } from "../../client/useHighlights";
import { useKeyboardShortcuts } from "../../client/useKeyboardShortcuts";
import { ReviewPanel } from "../ReviewPanel";
import { FloatingToolbar } from "../FloatingToolbar";
import { GutterButton } from "../GutterButton";

type LayoutProps = WrapperProps<typeof OriginalLayout>;

function LayoutContent({
  contentEl,
}: {
  contentEl: HTMLElement | null;
}): null {
  const {
    comments,
    hoveredCommentId,
    setOrphanedCommentIds,
    isPanelOpen,
    setIsPanelOpen,
  } = useReview();

  const handleTogglePanel = useCallback(() => {
    setIsPanelOpen(!isPanelOpen);
  }, [isPanelOpen, setIsPanelOpen]);

  const handleDismiss = useCallback(() => {
    if (isPanelOpen) setIsPanelOpen(false);
  }, [isPanelOpen, setIsPanelOpen]);

  useKeyboardShortcuts({
    onTogglePanel: handleTogglePanel,
    onDismiss: handleDismiss,
  });

  const handleOrphanedFound = useCallback(
    (ids: string[]) => {
      setOrphanedCommentIds(new Set(ids));
    },
    [setOrphanedCommentIds],
  );

  const handleHighlightClick = useCallback(
    (commentId: string) => {
      setIsPanelOpen(true);
      setTimeout(() => {
        const card = document.querySelector<HTMLElement>(
          `[data-card-comment-id="${commentId}"]`,
        );
        if (!card) return;
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.add("review-card-pulse");
        setTimeout(() => card.classList.remove("review-card-pulse"), 1500);
      }, 100);
    },
    [setIsPanelOpen],
  );

  useHighlights({
    comments,
    hoveredCommentId,
    contentEl,
    onOrphanedFound: handleOrphanedFound,
    onHighlightClick: handleHighlightClick,
  });

  return null;
}

export default function LayoutWrapper(
  props: LayoutProps,
): React.ReactElement {
  const location = useLocation();
  const docPath = location.pathname.replace(/^\//, "") || "README";

  // State-backed element for useHighlights reactivity;
  // ref object kept for FloatingToolbar / GutterButton.
  const [contentEl, setContentEl] = useState<HTMLElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".theme-doc-markdown");
    contentRef.current = el;
    setContentEl(el);
  }, [location.pathname]);

  return (
    <ReviewProvider docPath={docPath}>
      <OriginalLayout {...props} />
      <LayoutContent contentEl={contentEl} />
      <FloatingToolbar contentRef={contentRef} />
      <GutterButton contentRef={contentRef} />
      <ReviewPanel />
    </ReviewProvider>
  );
}
