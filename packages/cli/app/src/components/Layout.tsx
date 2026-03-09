import { useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import type { DocTreeEntry } from "../hooks/useDocs";

export function Layout({
  tree,
  children,
}: {
  tree: DocTreeEntry[];
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="layout">
      {/* Mobile navbar */}
      <header className="mobile-navbar">
        <button
          className="menu-button"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Toggle sidebar"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="mobile-navbar-title">Document Review</span>
      </header>

      {/* Backdrop */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={closeSidebar} />
      )}

      <div className={`sidebar-container${sidebarOpen ? " open" : ""}`}>
        <Sidebar tree={tree} onNavigate={closeSidebar} />
      </div>
      <main className="main-content">{children}</main>
    </div>
  );
}
