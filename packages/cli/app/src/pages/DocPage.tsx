import { useRef } from "react";
import { useLocation } from "react-router-dom";
import { DocViewer } from "../components/DocViewer";
import { DocReviewWrapper } from "../components/DocReviewWrapper";

export function DocPage() {
  const location = useLocation();
  const docPath = location.pathname.replace(/^\//, "") || "index";
  const contentRef = useRef<HTMLElement | null>(null);

  return (
    <DocReviewWrapper docPath={docPath} contentRef={contentRef}>
      <DocViewer docPath={docPath + ".md"} contentRef={contentRef} />
    </DocReviewWrapper>
  );
}
