import type React from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { useDocContent } from "../hooks/useDocContent";

export function DocViewer({
  docPath,
  contentRef,
}: {
  docPath: string;
  contentRef?: React.Ref<HTMLElement>;
}) {
  const { content, loading } = useDocContent(docPath);

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
      <article className="markdown-body" ref={contentRef}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{stripped}</ReactMarkdown>
      </article>
    </div>
  );
}
