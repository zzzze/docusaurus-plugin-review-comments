import { NavLink } from "react-router-dom";
import type { DocTreeEntry } from "../hooks/useDocs";

function TreeItem({ entry }: { entry: DocTreeEntry }) {
  if (entry.type === "directory") {
    return (
      <div className="sidebar-category">
        <div className="sidebar-category-label">{entry.name}</div>
        <div className="sidebar-category-items">
          {entry.children?.map((child) => (
            <TreeItem key={child.path} entry={child} />
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
    >
      {entry.name.replace(/\.(md|mdx)$/i, "")}
    </NavLink>
  );
}

export function Sidebar({ tree }: { tree: DocTreeEntry[] }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-title">Document Review</div>
      <div className="sidebar-items">
        {tree.map((entry) => (
          <TreeItem key={entry.path} entry={entry} />
        ))}
      </div>
    </nav>
  );
}
