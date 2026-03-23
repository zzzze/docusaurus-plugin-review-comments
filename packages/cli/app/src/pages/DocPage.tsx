import { useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { DocViewer } from "../components/DocViewer";
import { DocReviewWrapper } from "../components/DocReviewWrapper";
import { TableOfContents } from "../components/TableOfContents";
import { useToc } from "../hooks/useToc";

export function DocPage() {
  const location = useLocation();
  const docPath = location.pathname.replace(/^\//, "") || "index";

  // State-backed ref: contentEl (state) drives useHighlights reactivity,
  // contentRef (ref object) is still needed by FloatingToolbar / GutterButton.
  const [contentEl, setContentEl] = useState<HTMLElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const contentRefCallback = useCallback((node: HTMLElement | null) => {
    contentRef.current = node;
    setContentEl(node);
  }, []);

  const { items, activeId, tocContentRef } = useToc();

  return (
    <DocReviewWrapper docPath={docPath} contentEl={contentEl} contentRef={contentRef}>
      <div className="mx-auto max-w-[1200px] flex">
        <div className="min-w-0 flex-1">
          <DocViewer
            docPath={docPath + ".md"}
            contentRef={contentRefCallback}
            tocContentRef={tocContentRef}
          />
        </div>
        <TableOfContents items={items} activeId={activeId} />
      </div>
    </DocReviewWrapper>
  );
}
