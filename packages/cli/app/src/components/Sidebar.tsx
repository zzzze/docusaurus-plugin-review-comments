import { NavLink } from "react-router-dom";
import type { DocTreeEntry } from "../hooks/useDocs";

function TreeItem({ entry, onNavigate }: { entry: DocTreeEntry; onNavigate?: () => void }) {
  if (entry.type === "directory") {
    return (
      <div className="sidebar-category">
        <div className="sidebar-category-label">{entry.name}</div>
        <div className="sidebar-category-items">
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
      className={({ isActive }) => `sidebar-item${isActive ? " active" : ""}`}
      onClick={onNavigate}
    >
      {entry.name.replace(/\.(md|mdx)$/i, "")}
    </NavLink>
  );
}

export function Sidebar({ tree, onNavigate }: { tree: DocTreeEntry[]; onNavigate?: () => void }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-title">Document Review</div>
      <div className="sidebar-items">
        {tree.map((entry) => (
          <TreeItem key={entry.path} entry={entry} onNavigate={onNavigate} />
        ))}
      </div>
    </nav>
  );
}
