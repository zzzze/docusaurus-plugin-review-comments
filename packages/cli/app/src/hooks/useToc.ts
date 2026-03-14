import { useState, useEffect, useCallback } from "react";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

/**
 * Extracts h2/h3 headings from a container and tracks the active one on scroll.
 * Returns a callback ref to attach to the content element.
 */
export function useToc() {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [el, setEl] = useState<HTMLElement | null>(null);

  const tocContentRef = useCallback((node: HTMLElement | null) => {
    setEl(node);
  }, []);

  // Extract headings when element mounts or changes
  useEffect(() => {
    if (!el) {
      setItems([]);
      return;
    }

    const extract = () => {
      const headings = el.querySelectorAll<HTMLHeadingElement>("h2, h3");
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

    extract();

    const observer = new MutationObserver(extract);
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [el]);

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

  return { items, activeId, tocContentRef };
}
