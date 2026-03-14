import SimpleBar from "simplebar-react";
import type { TocItem } from "../hooks/useToc";

export function TableOfContents({
  items,
  activeId,
}: {
  items: TocItem[];
  activeId: string | null;
}) {
  if (items.length === 0) return null;

  return (
    <SimpleBar className="toc">
      <div className="toc-title">On this page</div>
      <ul className="toc-list">
        {items.map((item) => (
          <li key={item.id} className={`toc-item toc-level-${item.level}`}>
            <a
              href={`#${item.id}`}
              className={`toc-link${activeId === item.id ? " active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </SimpleBar>
  );
}
