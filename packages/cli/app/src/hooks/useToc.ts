import { useState, useEffect } from "react";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

/**
 * Observes headings inside a container and tracks the active one on scroll.
 */
export function useToc(contentRef: React.RefObject<HTMLElement | null>) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Extract headings whenever content changes
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const extract = () => {
      const headings = el.querySelectorAll<HTMLHeadingElement>("h2, h3");
      const result: TocItem[] = [];
      headings.forEach((h) => {
        if (!h.id) {
          h.id = h.textContent?.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "") || "";
        }
        if (h.id) {
          result.push({
            id: h.id,
            text: h.textContent?.trim() || "",
            level: parseInt(h.tagName[1], 10),
          });
        }
      });
      setItems(result);
    };

    // Wait for ReactMarkdown to render
    const timer = setTimeout(extract, 100);
    // Re-extract on DOM changes (e.g. content swap)
    const observer = new MutationObserver(extract);
    observer.observe(el, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [contentRef]);

  // Track active heading via IntersectionObserver
  useEffect(() => {
    const el = contentRef.current;
    if (!el || items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0.1 },
    );

    items.forEach((item) => {
      const heading = document.getElementById(item.id);
      if (heading) observer.observe(heading);
    });

    return () => observer.disconnect();
  }, [contentRef, items]);

  return { items, activeId };
}
