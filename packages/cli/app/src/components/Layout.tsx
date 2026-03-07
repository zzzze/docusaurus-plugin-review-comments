import { Sidebar } from "./Sidebar";
import type { DocTreeEntry } from "../hooks/useDocs";

export function Layout({
  tree,
  children,
}: {
  tree: DocTreeEntry[];
  children: React.ReactNode;
}) {
  return (
    <div className="layout">
      <Sidebar tree={tree} />
      <main className="main-content">{children}</main>
    </div>
  );
}
