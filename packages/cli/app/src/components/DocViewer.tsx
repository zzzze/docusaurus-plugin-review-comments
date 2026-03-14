import { useCallback } from "react";
import type React from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { useDocContent } from "../hooks/useDocContent";

export function DocViewer({
  docPath,
  contentRef,
  tocContentRef,
}: {
  docPath: string;
  contentRef?: React.Ref<HTMLElement>;
  tocContentRef?: React.Ref<HTMLElement>;
}) {
  const { content, loading } = useDocContent(docPath);

  // Merge both refs onto the same article element
  const mergedRef = useCallback(
    (node: HTMLElement | null) => {
      if (typeof contentRef === "function") contentRef(node);
      else if (contentRef && "current" in contentRef)
        (contentRef as React.MutableRefObject<HTMLElement | null>).current = node;
      if (typeof tocContentRef === "function") tocContentRef(node);
      else if (tocContentRef && "current" in tocContentRef)
        (tocContentRef as React.MutableRefObject<HTMLElement | null>).current = node;
    },
    [contentRef, tocContentRef],
  );

  if (loading) {
    return <div className="doc-viewer loading">Loading...</div>;
  }

  if (content === null) {
    return <div className="doc-viewer empty">Document not found.</div>;
  }

  // Strip frontmatter (---...---) from markdown before rendering
  const stripped = content.replace(/^---[\s\S]*?---\n*/, "");

  return (
    <div className="doc-viewer">
      <article className="markdown-body" ref={mergedRef}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{stripped}</ReactMarkdown>
      </article>
    </div>
  );
}
