import { ScrollArea } from "./ui/scroll-area";
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
    <nav
      className="sticky top-6 ml-6 hidden w-[200px] shrink-0 self-start border-l border-border/60 pl-6 xl:block"
      style={{ height: "calc(100vh - 48px)" }}
    >
      <ScrollArea className="h-full pr-3" type="scroll">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">On this page</div>
        <ul className="list-none space-y-0.5">
          {items.map((item) => (
            <li key={item.id} className={item.level === 3 ? "pl-4" : item.level >= 4 ? "pl-8" : ""}>
              <a
                href={`#${item.id}`}
                className={`block py-0.5 text-sm leading-snug transition-colors ${
                  activeId === item.id
                    ? "font-semibold text-primary"
                    : item.level === 2
                      ? "text-muted-foreground hover:text-primary"
                      : "text-muted-foreground/70 hover:text-primary"
                }`}
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
      </ScrollArea>
    </nav>
  );
}
