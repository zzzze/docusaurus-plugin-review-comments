import React, { useState } from "react";
import type { ReviewAnchor } from "../../types";
import { useGutterButtons } from "../../client/useGutterButtons";
import { buildAnchorFromBlock } from "../../client/anchorUtils";
import { CommentForm } from "../CommentForm";
import styles from "./styles.module.css";

interface GutterButtonProps {
  contentRef: React.RefObject<HTMLElement | null>;
}

export function GutterButton({
  contentRef,
}: GutterButtonProps): React.ReactElement | null {
  const { activeBlock, gutterPosition } = useGutterButtons(contentRef);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formAnchor, setFormAnchor] = useState<ReviewAnchor | null>(null);
  const [formPosition, setFormPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  if (!activeBlock && !gutterPosition && !isFormOpen) return null;

  const handleClick = (): void => {
    if (!activeBlock || !gutterPosition) return;
    const anchor = buildAnchorFromBlock(activeBlock);
    setFormAnchor(anchor);
    setFormPosition(gutterPosition);
    setIsFormOpen(true);
  };

  const handleFormClose = (): void => {
    setIsFormOpen(false);
    setFormAnchor(null);
    setFormPosition(null);
  };

  return (
    <>
      {gutterPosition && !isFormOpen && (
        <button
          className={styles.gutterButton}
          style={{
            position: "absolute",
            top: gutterPosition.top,
            left: gutterPosition.left,
          }}
          onClick={handleClick}
          title="Comment on this block"
          aria-label="Add comment to this paragraph"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2.5 2A1.5 1.5 0 001 3.5v7A1.5 1.5 0 002.5 12H5l3 3 3-3h2.5a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0013.5 2h-11zM4 5.5a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7a.5.5 0 01-.5-.5zm0 3a.5.5 0 01.5-.5h4a.5.5 0 010 1h-4a.5.5 0 01-.5-.5z" />
          </svg>
        </button>
      )}
      {isFormOpen && formAnchor && formPosition && (
        <div
          className={styles.formContainer}
          style={{
            position: "absolute",
            top: formPosition.top,
            left: formPosition.left,
          }}
        >
          <CommentForm
            mode="create"
            initialAnchor={formAnchor}
            initialType="suggestion"
            onSubmit={handleFormClose}
            onCancel={handleFormClose}
          />
        </div>
      )}
    </>
  );
}