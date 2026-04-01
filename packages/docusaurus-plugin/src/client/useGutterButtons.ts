import { useState, useEffect, type RefObject } from "react";

interface GutterState {
  activeBlock: HTMLElement | null;
  gutterPosition: { top: number; left: number } | null;
}

const BLOCK_TAGS = new Set([
  "P", "UL", "OL", "BLOCKQUOTE", "PRE", "TABLE",
]);

export function useGutterButtons(
  contentRef: RefObject<HTMLElement | null>,
): GutterState {
  const [activeBlock, setActiveBlock] = useState<HTMLElement | null>(null);
  const [gutterPosition, setGutterPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;

    const handleMouseMove = (e: MouseEvent): void => {
      let block: HTMLElement | null = e.target as HTMLElement;
      while (block && block !== contentEl) {
        if (BLOCK_TAGS.has(block.tagName)) break;
        block = block.parentElement;
      }

      if (block && block !== contentEl && BLOCK_TAGS.has(block.tagName)) {
        const rect = block.getBoundingClientRect();
        setActiveBlock(block);
        setGutterPosition({
          top: rect.top + window.scrollY + 2,
          left: rect.left - 32,
        });
      }
    };

    const handleMouseLeave = (): void => {
      setActiveBlock(null);
      setGutterPosition(null);
    };

    contentEl.addEventListener("mousemove", handleMouseMove);
    contentEl.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      contentEl.removeEventListener("mousemove", handleMouseMove);
      contentEl.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [contentRef]);

  return { activeBlock, gutterPosition };
}
