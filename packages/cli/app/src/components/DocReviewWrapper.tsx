import { useCallback } from "react";
import { ReviewProvider, useReview, useHighlights, useKeyboardShortcuts } from "@mdreview/ui/hooks";
import { ReviewPanel, FloatingToolbar, GutterButton } from "@mdreview/ui/components";

function ReviewOverlay({
  contentEl,
  contentRef,
}: {
  contentEl: HTMLElement | null;
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
    contentEl,
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
  contentEl,
  contentRef,
}: {
  docPath: string;
  children: React.ReactNode;
  contentEl: HTMLElement | null;
  contentRef: React.RefObject<HTMLElement | null>;
}) {
  return (
    <ReviewProvider docPath={docPath}>
      {children}
      <ReviewOverlay contentEl={contentEl} contentRef={contentRef} />
    </ReviewProvider>
  );
}
