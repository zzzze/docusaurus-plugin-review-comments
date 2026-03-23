import { useState, useCallback, useRef } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { useTheme } from "../hooks/useTheme";
import type { DocTreeEntry } from "../hooks/useDocs";

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 480;
const SIDEBAR_DEFAULT = 260;

export function Layout({
  tree,
  hideSidebar,
  children,
}: {
  tree: DocTreeEntry[];
  hideSidebar?: boolean;
  children: React.ReactNode;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const dragging = useRef(false);
  const { mode, setMode } = useTheme();

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const startX = e.clientX;
    const startW = sidebarWidth;

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const newW = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startW + ev.clientX - startX));
      setSidebarWidth(newW);
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [sidebarWidth]);

  if (hideSidebar) {
    return (
      <div className="flex min-h-screen">
        <div className="fixed left-4 top-4 z-50">
          <ThemeToggle mode={mode} onChange={setMode} />
        </div>
        <main className="flex-1 min-w-0 px-12 py-6">{children}</main>
      </div>
    );
  }

  return (
    <>
      {/* Mobile navbar + Sheet drawer */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-12 items-center gap-3 border-b bg-background px-4 lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[260px] p-0">
            <Sidebar tree={tree} onNavigate={closeSheet} />
          </SheetContent>
        </Sheet>
        <span className="flex-1 text-base font-bold">Document Review</span>
        <ThemeToggle mode={mode} onChange={setMode} />
      </header>

      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block shrink-0 overflow-hidden border-r border-border/60" style={{ width: sidebarWidth }}>
          <Sidebar tree={tree} headerExtra={<ThemeToggle mode={mode} onChange={setMode} />} />
        </aside>
        <div
          className="hidden lg:block shrink-0 w-1 cursor-col-resize bg-transparent hover:bg-primary-light active:bg-primary-light transition-colors duration-150"
          onMouseDown={onMouseDown}
        />
        {/* Single content area — padding adapts for mobile header */}
        <main className="min-w-0 flex-1 px-4 pt-14 pb-6 lg:px-12 lg:pt-6">{children}</main>
      </div>
    </>
  );
}
