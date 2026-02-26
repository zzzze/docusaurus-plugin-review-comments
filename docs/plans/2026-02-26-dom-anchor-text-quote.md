# dom-anchor-text-quote Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the custom text anchor build/locate logic with `dom-anchor-text-quote`, and reshape `ReviewAnchor` into a discriminated union aligned with W3C TextQuoteSelector.

**Architecture:** `ReviewAnchor` becomes a `TextAnchor | BlockAnchor | DocumentAnchor` union. `buildAnchorFromSelection` delegates to `fromRange`; `findTextRange` delegates to `toRange`. Block scope and all highlight rendering code are unchanged. Existing example JSON files are rewritten from scratch.

**Tech Stack:** TypeScript, `dom-anchor-text-quote` (diff-match-patch fuzzy matching), Vitest

---

### Task 1: Install dependency and add type shim

**Files:**
- Modify: `package.json`
- Create: `src/dom-anchor-text-quote.d.ts`

**Step 1: Install the package**

```bash
npm install dom-anchor-text-quote
```

Expected: `dom-anchor-text-quote` appears in `dependencies` in `package.json`.

**Step 2: Create the type declaration shim**

The package ships no TypeScript types and no `@types` package exists. Create `src/dom-anchor-text-quote.d.ts`:

```ts
declare module "dom-anchor-text-quote" {
  export interface TextQuoteSelector {
    exact: string;
    prefix?: string;
    suffix?: string;
  }

  export interface TextPositionSelector {
    start: number;
    end: number;
  }

  export interface ToRangeOptions {
    hint?: number;
  }

  export function fromRange(root: Node, range: Range): TextQuoteSelector;
  export function fromTextPosition(
    root: Node,
    selector: TextPositionSelector,
  ): TextQuoteSelector;
  export function toRange(
    root: Node,
    selector: TextQuoteSelector,
    options?: ToRangeOptions,
  ): Range | null;
  export function toTextPosition(
    root: Node,
    selector: TextQuoteSelector,
    options?: ToRangeOptions,
  ): TextPositionSelector | null;
}
```

**Step 3: Verify TypeScript is happy**

```bash
npm run typecheck
```

Expected: No errors.

**Step 4: Commit**

```bash
git add package.json package-lock.json src/dom-anchor-text-quote.d.ts
git commit -m "chore: add dom-anchor-text-quote dependency and type shim"
```

---

### Task 2: Reshape ReviewAnchor into discriminated union

**Files:**
- Modify: `src/types.ts`

**Step 1: Replace the type**

Replace the entire contents of `src/types.ts` with:

```ts
export interface TextAnchor {
  scope: "text";
  exact: string;
  prefix?: string;
  suffix?: string;
}

export interface BlockAnchor {
  scope: "block";
  exact: string;
  heading: string;
  blockIndex: number | null;
}

export interface DocumentAnchor {
  scope: "document";
}

export type ReviewAnchor = TextAnchor | BlockAnchor | DocumentAnchor;

export interface ReviewReply {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface ReviewComment {
  id: string;
  anchor: ReviewAnchor;
  author: string;
  type: "question" | "suggestion" | "issue";
  status: "open" | "resolved";
  content: string;
  createdAt: string;
  replies: ReviewReply[];
}

export interface ReviewFile {
  documentPath: string;
  comments: ReviewComment[];
}

export interface PluginOptions {
  reviewsDir: string;
  defaultAuthor: string;
}
```

**Step 2: Check how many type errors this creates**

```bash
npm run typecheck 2>&1 | grep "error TS" | wc -l
```

Expected: A non-zero number of errors — that's correct, they'll be fixed in subsequent tasks. The goal here is just to confirm the type change itself compiles.

**Step 3: Commit the type change alone**

```bash
git add src/types.ts
git commit -m "feat: reshape ReviewAnchor into discriminated union"
```

---

### Task 3: Update anchorUtils.ts

**Files:**
- Modify: `src/client/anchorUtils.ts`
- Modify: `src/__tests__/anchorUtils.test.ts`

**Context:** `buildAnchorFromSelection` currently hand-rolls prefix/suffix extraction. It will now delegate to `fromRange`. `buildAnchorFromBlock` now returns `BlockAnchor` (no `prefix`/`suffix`). The functions `extractPrefix`, `extractSuffix`, `iterTextWithBr`, `collectTextBefore`, `collectTextAfter`, `findNearestBlockAncestor` are all deleted.

**Step 1: Rewrite `anchorUtils.ts`**

Replace the entire file:

```ts
import { fromRange } from "dom-anchor-text-quote";
import type { BlockAnchor, TextAnchor } from "../types";

const HEADING_PATTERN = /^H[1-6]$/;

export function findNearestHeading(node: Node): string {
  let current: Node | null = node;
  while (current && current !== document.body) {
    if (current instanceof HTMLElement && HEADING_PATTERN.test(current.tagName)) {
      return current.id || "";
    }

    let sibling =
      current instanceof HTMLElement ? current : current.parentElement;
    while (sibling) {
      if (
        sibling instanceof HTMLElement &&
        HEADING_PATTERN.test(sibling.tagName)
      ) {
        return sibling.id || "";
      }
      const prev = sibling.previousElementSibling;
      if (prev instanceof HTMLElement && HEADING_PATTERN.test(prev.tagName)) {
        return prev.id || "";
      }
      if (!prev) break;
      sibling = prev;
    }
    current = current.parentNode;
  }
  return "";
}

const BLOCK_TAGS = new Set([
  "P", "UL", "OL", "BLOCKQUOTE", "PRE", "TABLE", "DIV",
  "H1", "H2", "H3", "H4", "H5", "H6",
]);

function isBlockElement(el: Element): boolean {
  return BLOCK_TAGS.has(el.tagName);
}

export function findParentBlock(node: Node): Element | null {
  let current: Node | null = node;
  while (current) {
    if (current instanceof HTMLElement && isBlockElement(current)) return current;
    current = current.parentNode;
  }
  return null;
}

export function countBlockIndex(
  node: Node,
  headingId: string,
): number | null {
  if (!headingId) return null;
  const heading = document.getElementById(headingId);
  if (!heading) return null;

  let count = 0;
  let sibling = heading.nextElementSibling;
  const targetBlock = findParentBlock(node);

  while (sibling) {
    if (sibling === targetBlock) return count;
    if (isBlockElement(sibling)) count++;
    sibling = sibling.nextElementSibling;
  }
  return count;
}

export function buildAnchorFromSelection(
  selection: Selection,
  root: HTMLElement,
): TextAnchor | null {
  if (selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!selection.toString().trim()) return null;

  const selector = fromRange(root, range);
  return { scope: "text", ...selector };
}

function extractBlockText(element: HTMLElement): string {
  if (element.tagName === "UL" || element.tagName === "OL") {
    return Array.from(element.children)
      .filter((child) => child.tagName === "LI")
      .map((li) => (li.textContent ?? "").trim())
      .filter(Boolean)
      .join("\n");
  }
  return (element.textContent ?? "").trim();
}

export function buildAnchorFromBlock(
  blockElement: HTMLElement,
): BlockAnchor {
  const heading = findNearestHeading(blockElement);
  return {
    scope: "block",
    exact: extractBlockText(blockElement),
    heading,
    blockIndex: countBlockIndex(blockElement, heading),
  };
}
```

**Step 2: Update `anchorUtils.test.ts`**

The tests for `extractPrefix` and `extractSuffix` are deleted entirely. The `buildAnchorFromSelection` tests must be updated to pass a `root` element and match the new return shape. The `buildAnchorFromBlock` tests must remove `prefix`/`suffix` from expected shapes.

Replace the entire test file:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  findNearestHeading,
  findParentBlock,
  countBlockIndex,
  buildAnchorFromBlock,
} from "../client/anchorUtils";

function el(tag: string, attrs: Record<string, string>, ...children: (Node | string)[]): HTMLElement {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value);
  }
  for (const child of children) {
    if (typeof child === "string") {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  }
  return element;
}

function setupDocument(...children: Node[]): HTMLElement {
  const container = document.createElement("div");
  for (const child of children) {
    container.appendChild(child);
  }
  document.body.appendChild(container);
  return container;
}

function cleanup(): void {
  document.body.replaceChildren();
}

describe("anchorUtils", () => {
  beforeEach(() => {
    cleanup();
  });

  describe("findNearestHeading", () => {
    it("finds heading that is a previous sibling", () => {
      const container = setupDocument(
        el("h2", { id: "intro" }, "Introduction"),
        el("p", {}, "Some content"),
      );
      const p = container.querySelector("p")!;

      expect(findNearestHeading(p.firstChild!)).toBe("intro");
    });

    it("returns empty string when no heading found", () => {
      const container = setupDocument(
        el("p", {}, "No heading above"),
      );
      const p = container.querySelector("p")!;

      expect(findNearestHeading(p.firstChild!)).toBe("");
    });

    it("finds heading when node is inside the heading", () => {
      const heading = el("h3", { id: "nested" }, "Nested heading");
      setupDocument(heading);

      expect(findNearestHeading(heading.firstChild!)).toBe("nested");
    });
  });

  describe("findParentBlock", () => {
    it("finds parent paragraph", () => {
      const p = el("p", {}, "text");
      setupDocument(p);

      expect(findParentBlock(p.firstChild!)).toBe(p);
    });

    it("finds parent list", () => {
      const ul = el("ul", {}, el("li", {}, "item"));
      setupDocument(ul);

      const li = ul.querySelector("li")!;
      expect(findParentBlock(li.firstChild!)).toBe(ul);
    });

    it("returns null when no block parent", () => {
      const span = el("span", {}, "inline");
      document.body.appendChild(span);

      expect(findParentBlock(span.firstChild!)).toBeNull();
    });
  });

  describe("countBlockIndex", () => {
    it("returns index of block after heading", () => {
      setupDocument(
        el("h2", { id: "section" }, "Section"),
        el("p", {}, "First"),
        el("p", {}, "Second"),
        el("p", {}, "Third"),
      );

      const paragraphs = document.querySelectorAll("p");
      expect(countBlockIndex(paragraphs[0]!, "section")).toBe(0);
      expect(countBlockIndex(paragraphs[1]!, "section")).toBe(1);
      expect(countBlockIndex(paragraphs[2]!, "section")).toBe(2);
    });

    it("returns null when headingId is empty", () => {
      setupDocument(el("p", {}, "text"));
      const p = document.querySelector("p")!;
      expect(countBlockIndex(p, "")).toBeNull();
    });

    it("returns null when heading not found", () => {
      setupDocument(el("p", {}, "text"));
      const p = document.querySelector("p")!;
      expect(countBlockIndex(p, "nonexistent")).toBeNull();
    });
  });

  describe("buildAnchorFromBlock", () => {
    it("builds anchor from paragraph element", () => {
      setupDocument(
        el("h2", { id: "section" }, "Section"),
        el("p", {}, "Block content here"),
      );
      const p = document.querySelector("p")!;

      const anchor = buildAnchorFromBlock(p);

      expect(anchor.scope).toBe("block");
      expect(anchor.exact).toBe("Block content here");
      expect(anchor.heading).toBe("section");
      expect(anchor.blockIndex).toBe(0);
    });

    it("extracts list items as newline-separated text", () => {
      setupDocument(
        el("h2", { id: "section" }, "Section"),
        el("ul", {},
          el("li", {}, "First item"),
          el("li", {}, "Second item"),
          el("li", {}, "Third item"),
        ),
      );
      const ul = document.querySelector("ul") as HTMLElement;

      const anchor = buildAnchorFromBlock(ul);

      expect(anchor.scope).toBe("block");
      expect(anchor.exact).toBe("First item\nSecond item\nThird item");
      expect(anchor.heading).toBe("section");
      expect(anchor.blockIndex).toBe(0);
    });

    it("extracts ordered list items as newline-separated text", () => {
      setupDocument(
        el("h2", { id: "section" }, "Section"),
        el("ol", {},
          el("li", {}, "Step one"),
          el("li", {}, "Step two"),
        ),
      );
      const ol = document.querySelector("ol") as HTMLElement;

      const anchor = buildAnchorFromBlock(ol);

      expect(anchor.scope).toBe("block");
      expect(anchor.exact).toBe("Step one\nStep two");
      expect(anchor.heading).toBe("section");
      expect(anchor.blockIndex).toBe(0);
    });
  });
});
```

**Step 3: Run tests**

```bash
npm test -- anchorUtils
```

Expected: All tests pass.

**Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: Errors only in files not yet updated (`highlightRenderer.ts`, `useTextSelection.ts`, `highlightRenderer.test.ts`).

**Step 5: Commit**

```bash
git add src/client/anchorUtils.ts src/__tests__/anchorUtils.test.ts
git commit -m "feat: replace buildAnchorFromSelection with fromRange, update BlockAnchor shape"
```

---

### Task 4: Update highlightRenderer.ts

**Files:**
- Modify: `src/client/highlightRenderer.ts`
- Modify: `src/__tests__/highlightRenderer.test.ts`

**Context:** `findTextRange` is replaced by `toRange`. The helpers `relocateByContext`, `createRangeFromPosition`, and the TreeWalker text-collection loop are deleted. All other functions (`applyHighlight`, `highlightRangePerNode`, `removeHighlight`, `applyBlockHighlight`, etc.) are unchanged.

**Step 1: Replace `findTextRange` and remove dead helpers**

In `src/client/highlightRenderer.ts`, replace the import section and the `findTextInDocument`/`findTextRange`/`relocateByContext`/`createRangeFromPosition` functions. Keep everything from `rangeFromElement` onward unchanged.

The new top of the file:

```ts
import { toRange } from "dom-anchor-text-quote";
import type { ReviewAnchor } from "../types";

export function findTextInDocument(
  anchor: ReviewAnchor,
  contentElement: HTMLElement,
): Range | null {
  if (anchor.scope === "document") return null;

  if (anchor.scope === "block") {
    return findBlockElement(anchor, contentElement);
  }

  return toRange(contentElement, {
    exact: anchor.exact,
    prefix: anchor.prefix,
    suffix: anchor.suffix,
  });
}
```

Delete `findTextRange`, `relocateByContext`, and `createRangeFromPosition` entirely.

**Step 2: Update `highlightRenderer.test.ts`**

All `ReviewAnchor` literals in the test file use the old flat shape. Update every occurrence:

- Text anchors: remove `heading: ""` and `blockIndex: null`
- Block anchors: remove `prefix: ""` and `suffix: ""`
- Document anchor: remove all fields except `scope: "document"`

The test logic itself does not change — only the anchor literal shapes. Go through the file top to bottom and apply these changes systematically.

After updating, the `relocateByContext` content-drift tests (lines 441–538 in the original) must still pass — they now test the library's fuzzy matching behaviour rather than the custom fallback. The test assertions are unchanged; only the anchor literal shape changes.

**Step 3: Run all tests**

```bash
npm test
```

Expected: All tests pass.

**Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: Errors only in `useTextSelection.ts` (one call site to fix).

**Step 5: Commit**

```bash
git add src/client/highlightRenderer.ts src/__tests__/highlightRenderer.test.ts
git commit -m "feat: replace findTextRange with toRange from dom-anchor-text-quote"
```

---

### Task 5: Update useTextSelection.ts call site

**Files:**
- Modify: `src/client/useTextSelection.ts`

**Step 1: Pass `contentEl` to `buildAnchorFromSelection`**

On the line that calls `buildAnchorFromSelection(selection)`, add `contentEl` as the second argument:

```ts
const anchor = buildAnchorFromSelection(selection, contentEl);
```

`contentEl` is already available in scope at that point (`const contentEl = contentRef.current`).

**Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors.

**Step 3: Run all tests**

```bash
npm test
```

Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/client/useTextSelection.ts
git commit -m "fix: pass contentEl root to buildAnchorFromSelection"
```

---

### Task 6: Rewrite example reviews JSON

**Files:**
- Modify: `example/reviews/docs/getting-started/installation.reviews.json`

**Context:** The existing JSON file has text anchors with `heading`/`blockIndex` fields and block anchors with `prefix`/`suffix` fields. These no longer match the new type shape. Since these are example/demo data that get regenerated from the running site, replace them with minimal valid examples of the new format.

**Step 1: Rewrite the file**

Replace the contents of `example/reviews/docs/getting-started/installation.reviews.json` with valid examples using the new anchor shapes. Ensure at least one of each scope is represented:

```json
{
  "documentPath": "docs/getting-started/installation",
  "comments": [
    {
      "id": "95091f30-09eb-4f58-906c-fd90db43ef27",
      "anchor": {
        "scope": "text",
        "exact": "recommended approach",
        "prefix": "the ",
        "suffix": " for"
      },
      "author": "Frank",
      "type": "suggestion",
      "status": "resolved",
      "content": "This section could benefit from more examples.",
      "createdAt": "2026-02-04T20:05:00.000Z",
      "replies": [
        {
          "id": "79d7dc96-935b-4d4b-affa-4a110e05fc31",
          "author": "Charlie",
          "content": "You're absolutely right, fixing now.",
          "createdAt": "2026-02-05T09:56:00.000Z"
        }
      ]
    },
    {
      "id": "e69415bd-64fc-460d-975b-0da24a4e12ff",
      "anchor": {
        "scope": "block",
        "exact": "",
        "heading": "",
        "blockIndex": 3
      },
      "author": "Eve",
      "type": "suggestion",
      "status": "open",
      "content": "Consider adding a diagram to visualize this feature.",
      "createdAt": "2026-02-09T22:30:00.000Z",
      "replies": []
    }
  ]
}
```

**Step 2: Verify the JSON parses correctly**

```bash
node -e "JSON.parse(require('fs').readFileSync('example/reviews/docs/getting-started/installation.reviews.json', 'utf8')); console.log('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add example/reviews/
git commit -m "chore: rewrite example reviews JSON to new anchor format"
```

---

### Task 7: Final verification

**Step 1: Run the full test suite**

```bash
npm test
```

Expected: All tests pass, zero failures.

**Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: Zero errors.

**Step 3: Build**

```bash
npm run build
```

Expected: Compiles without errors to `lib/`.
