import { useState, useEffect } from "react";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

/**
 * Observes headings inside a container and tracks the active one on scroll.
 * Pass a changing `key` (e.g. docPath) so the effect re-runs after navigation.
 */
export function useToc(
  contentRef: React.RefObject<HTMLElement | null>,
  key?: string,
) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Extract headings whenever content changes
  useEffect(() => {
    const el = contentRef.current;

    const extract = () => {
      if (!contentRef.current) return;
      const headings =
        contentRef.current.querySelectorAll<HTMLHeadingElement>("h2, h3");
      const result: TocItem[] = [];
      headings.forEach((h) => {
        if (!h.id) {
          h.id =
            h.textContent
              ?.trim()
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^\w-]/g, "") || "";
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

    // If element already has content, extract immediately
    if (el && el.childElementCount > 0) {
      extract();
    }

    // Also observe for DOM changes (async render / content swap)
    if (el) {
      const observer = new MutationObserver(extract);
      observer.observe(el, { childList: true, subtree: true });
      return () => observer.disconnect();
    }

    // If ref not yet attached, poll briefly
    const timer = setInterval(() => {
      if (contentRef.current) {
        extract();
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [contentRef, key]);

  // Track active heading via IntersectionObserver
  useEffect(() => {
    if (items.length === 0) return;

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
  }, [items]);

  return { items, activeId };
}
