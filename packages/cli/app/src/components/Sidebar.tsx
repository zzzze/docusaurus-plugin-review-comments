import { NavLink } from "react-router-dom";
import { ScrollArea } from "./ui/scroll-area";
import type { DocTreeEntry } from "../hooks/useDocs";

function TreeItem({ entry, onNavigate }: { entry: DocTreeEntry; onNavigate?: () => void }) {
  if (entry.type === "directory") {
    return (
      <div className="mt-4 first:mt-0">
        <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {entry.name}
        </div>
        <div className="ml-2">
          {entry.children?.map((child) => (
            <TreeItem key={child.path} entry={child} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    );
  }
  const docRoute = "/" + entry.path.replace(/\.(md|mdx)$/i, "");
  return (
    <NavLink
      to={docRoute}
      className={({ isActive }) =>
        `block rounded-md px-2 py-1 text-sm transition-colors ${
          isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
        }`
      }
      onClick={onNavigate}
    >
      {entry.name.replace(/\.(md|mdx)$/i, "")}
    </NavLink>
  );
}

export function Sidebar({ tree, onNavigate, headerExtra }: { tree: DocTreeEntry[]; onNavigate?: () => void; headerExtra?: React.ReactNode }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2.5 border-b border-border/60 pb-3 text-base font-semibold text-foreground">
          <img src="/logo.svg" alt="Logo" className="h-6 w-6 shrink-0 rounded" />
          <span className="flex-1">Document Review</span>
          {headerExtra}
        </div>
        <nav className="space-y-1">
          {tree.map((entry) => (
            <TreeItem key={entry.path} entry={entry} onNavigate={onNavigate} />
          ))}
        </nav>
      </div>
    </ScrollArea>
  );
}
