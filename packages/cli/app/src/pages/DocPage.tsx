import { useRef } from "react";
import { useLocation } from "react-router-dom";
import { DocViewer } from "../components/DocViewer";
import { DocReviewWrapper } from "../components/DocReviewWrapper";
import { TableOfContents } from "../components/TableOfContents";
import { useToc } from "../hooks/useToc";

export function DocPage() {
  const location = useLocation();
  const docPath = location.pathname.replace(/^\//, "") || "index";
  const contentRef = useRef<HTMLElement | null>(null);
  const { items, activeId } = useToc(contentRef);

  return (
    <DocReviewWrapper docPath={docPath} contentRef={contentRef}>
      <div className="doc-with-toc">
        <DocViewer docPath={docPath + ".md"} contentRef={contentRef} />
        <TableOfContents items={items} activeId={activeId} />
      </div>
    </DocReviewWrapper>
  );
}
