# Sidebar Toggle & Scroll-to-Top Design

**Date:** 2026-03-30
**Scope:** `packages/cli/app/src`

## Overview

Add two UI enhancements to the CLI review app:
1. A toggle button to collapse/expand the left sidebar on desktop
2. A floating scroll-to-top button that appears after scrolling down

## Feature 1: Sidebar Collapse Toggle

### Behavior

- **Expanded (default):** Normal sidebar renders. A `ChevronLeft` icon button is shown in the sidebar header (via the existing `headerExtra` prop) to collapse it.
- **Collapsed:** The `aside` element and drag handle are hidden (`hidden` class). A fixed narrow button strip with a `ChevronRight` icon appears on the left edge (`fixed left-0 top-1/2 -translate-y-1/2`) to re-expand. Height ~48px, visually flush against the left edge.

### Implementation

- **File modified:** `packages/cli/app/src/components/Layout.tsx`
- Add `sidebarCollapsed` boolean state (default `false`)
- Conditionally render the `aside` + drag handle based on state
- Pass collapse button into `Sidebar` via `headerExtra`
- Render the "expand strip" when collapsed

### Scope

Desktop only (`lg:` breakpoint). Mobile uses the Sheet drawer — no change.

## Feature 2: Scroll-to-Top Button

### Behavior

- Hidden by default
- Appears when `window.scrollY > 300`
- Fixed position: bottom-right corner (`fixed bottom-6 right-6`)
- Circular button with `ChevronUp` icon
- Click scrolls `window` to `{ top: 0, behavior: 'smooth' }`
- Fade in/out via `transition-opacity`

### Implementation

- **New file:** `packages/cli/app/src/components/ScrollToTop.tsx`
- `useEffect` to attach/detach `window` scroll listener
- `useState` for `visible` boolean
- Rendered in `Layout.tsx` at the end of the fragment, outside `<main>`

## Files Changed

| File | Change |
|------|--------|
| `packages/cli/app/src/components/Layout.tsx` | Add `sidebarCollapsed` state; conditional sidebar rendering; mount `ScrollToTop` |
| `packages/cli/app/src/components/ScrollToTop.tsx` | New component |

## Non-Goals

- No mobile sidebar collapse (already handled by Sheet drawer)
- No persistence of collapsed state across page reloads
- No animation for sidebar collapse (clean show/hide)
