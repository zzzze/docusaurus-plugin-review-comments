import { useRef, useEffect, useCallback } from "react";
import { ReviewProvider, useReview } from "@plugin/client/ReviewContext";
import { useHighlights } from "@plugin/client/useHighlights";
import { useKeyboardShortcuts } from "@plugin/client/useKeyboardShortcuts";
import { ReviewPanel } from "@plugin/theme/ReviewPanel";
import { FloatingToolbar } from "@plugin/theme/FloatingToolbar";
import { GutterButton } from "@plugin/theme/GutterButton";

function ReviewOverlay({
  contentRef,
}: {
  contentRef: React.RefObject<HTMLElement | null>;
}) {
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
    (ids: string[]) => setOrphanedCommentIds(new Set(ids)),
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
    contentRef,
    onOrphanedFound: handleOrphanedFound,
    onHighlightClick: handleHighlightClick,
  });

  return (
    <>
      <FloatingToolbar contentRef={contentRef} />
      <GutterButton contentRef={contentRef} />
      <ReviewPanel />
    </>
  );
}

export function DocReviewWrapper({
  docPath,
  children,
}: {
  docPath: string;
  children: React.ReactNode;
}) {
  const contentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".markdown-body");
    if (el) contentRef.current = el;
  });

  return (
    <ReviewProvider docPath={docPath}>
      {children}
      <ReviewOverlay contentRef={contentRef} />
    </ReviewProvider>
  );
}
