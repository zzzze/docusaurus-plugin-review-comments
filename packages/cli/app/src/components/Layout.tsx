import { useState, useCallback } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./ui/resizable";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import type { DocTreeEntry } from "../hooks/useDocs";

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

  if (hideSidebar) {
    return (
      <div className="flex min-h-screen">
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
        <span className="text-base font-bold">Document Review</span>
      </header>

      {/* Desktop layout */}
      <div className="hidden lg:flex min-h-screen">
        <ResizablePanelGroup orientation="horizontal" className="min-h-screen">
          <ResizablePanel defaultSize={20} minSize={12} maxSize={35} className="border-r">
            <Sidebar tree={tree} />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={80}>
            <main className="min-w-0 px-12 py-6">{children}</main>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile content */}
      <main className="min-w-0 px-4 pt-14 pb-6 lg:hidden">{children}</main>
    </>
  );
}
