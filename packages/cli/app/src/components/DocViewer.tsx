import { useCallback } from "react";
import type React from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { useDocContent } from "../hooks/useDocContent";
import { Skeleton } from "./ui/skeleton";

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
        (contentRef as React.RefObject<HTMLElement | null>).current = node;
      if (typeof tocContentRef === "function") tocContentRef(node);
      else if (tocContentRef && "current" in tocContentRef)
        (tocContentRef as React.RefObject<HTMLElement | null>).current = node;
    },
    [contentRef, tocContentRef],
  );

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-6 h-6 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (content === null) {
    return <div className="py-8 text-center text-muted-foreground">Document not found.</div>;
  }

  // Strip frontmatter (---...---) from markdown before rendering
  const stripped = content.replace(/^---[\s\S]*?---\n*/, "");

  return (
    <div>
      <article className="markdown-body" ref={mergedRef}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{stripped}</ReactMarkdown>
      </article>
    </div>
  );
}
