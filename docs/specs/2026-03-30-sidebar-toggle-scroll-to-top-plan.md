# Sidebar Toggle & Scroll-to-Top Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a desktop sidebar collapse toggle and a floating scroll-to-top button to the CLI review app.

**Architecture:** Two self-contained changes — a new `ScrollToTop` component that monitors `window.scrollY`, and updates to `Layout.tsx` that add a `sidebarCollapsed` state controlling sidebar visibility with a fixed expand-strip on the left edge.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, lucide-react

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/cli/app/src/components/ScrollToTop.tsx` | Create | Floating scroll-to-top button |
| `packages/cli/app/src/components/Layout.tsx` | Modify | Sidebar collapse state + render ScrollToTop |

---

### Task 1: Create `ScrollToTop` component

**Files:**
- Create: `packages/cli/app/src/components/ScrollToTop.tsx`

No automated test infrastructure exists for React components in this project. Verify manually via dev server.

- [ ] **Step 1: Create the component file**

```tsx
// packages/cli/app/src/components/ScrollToTop.tsx
import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      className={`fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background shadow-md transition-opacity duration-200 hover:bg-muted ${
        visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
}
```

- [ ] **Step 2: Start dev server and verify**

```bash
cd packages/cli && pnpm dev:app
```

Open the app, navigate to a long document, scroll down more than 300px — button should appear in the bottom-right. Click it — page should scroll smoothly to top. Scroll back up to the top — button should disappear.

- [ ] **Step 3: Commit**

```bash
git add packages/cli/app/src/components/ScrollToTop.tsx
git commit -m "feat(cli): add scroll-to-top floating button"
```

---

### Task 2: Add sidebar collapse toggle in `Layout.tsx`

**Files:**
- Modify: `packages/cli/app/src/components/Layout.tsx`

- [ ] **Step 1: Update imports and add `sidebarCollapsed` state**

Replace the existing import block and the start of `Layout`:

```tsx
import { useState, useCallback, useRef } from "react";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { ScrollToTop } from "./ScrollToTop";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const dragging = useRef(false);
  const { mode, setMode } = useTheme();
```

- [ ] **Step 2: Replace the desktop layout JSX**

Replace the `return (...)` block starting at `<>` (the non-`hideSidebar` branch) with:

```tsx
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
        {/* Desktop sidebar — hidden when collapsed */}
        {!sidebarCollapsed && (
          <>
            <aside
              className="hidden lg:block shrink-0 overflow-hidden border-r border-border/60"
              style={{ width: sidebarWidth }}
            >
              <Sidebar
                tree={tree}
                headerExtra={
                  <>
                    <ThemeToggle mode={mode} onChange={setMode} />
                    <button
                      onClick={() => setSidebarCollapsed(true)}
                      className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted"
                      aria-label="Collapse sidebar"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </>
                }
              />
            </aside>
            <div
              className="hidden lg:block shrink-0 w-1 cursor-col-resize bg-transparent hover:bg-primary-light active:bg-primary-light transition-colors duration-150"
              onMouseDown={onMouseDown}
            />
          </>
        )}

        {/* Expand strip — visible on desktop when sidebar is collapsed */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-40 h-12 w-5 items-center justify-center rounded-r-md border border-l-0 border-border bg-background shadow-sm hover:bg-muted"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Content */}
        <main className="min-w-0 flex-1 px-4 pt-14 pb-6 lg:px-12 lg:pt-6">{children}</main>
      </div>

      <ScrollToTop />
    </>
  );
}
```

- [ ] **Step 3: Verify in dev server**

```bash
cd packages/cli && pnpm dev:app
```

Check on desktop (`lg` breakpoint, ≥1024px):
- Sidebar shows `ChevronLeft` button in the header — click it — sidebar + drag handle disappear, a narrow `ChevronRight` strip appears on the left edge
- Click the strip — sidebar reappears
- Drag handle still works for resizing when sidebar is expanded
- Mobile (< 1024px): no visible change, hamburger sheet still works

- [ ] **Step 4: Commit**

```bash
git add packages/cli/app/src/components/Layout.tsx
git commit -m "feat(cli): add sidebar collapse toggle"
```
