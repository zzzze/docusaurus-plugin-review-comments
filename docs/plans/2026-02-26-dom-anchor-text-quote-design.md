# Design: Migrate Anchor System to dom-anchor-text-quote

## Background

The plugin has a custom anchor system for locating review comments in the DOM. The current implementation in `anchorUtils.ts` and `highlightRenderer.ts` hand-rolls text search with prefix/suffix disambiguation and a `relocateByContext` fallback for when content drifts.

`dom-anchor-text-quote` provides the same TextQuoteSelector concept backed by `diff-match-patch` for proper fuzzy matching. This design replaces the custom implementation with the library.

## Type Structure

`ReviewAnchor` becomes a discriminated union. Each scope carries only the fields it needs:

```ts
// W3C TextQuoteSelector-aligned (scope replaces type as discriminant)
interface TextAnchor {
  scope: "text";
  exact: string;
  prefix?: string;
  suffix?: string;
}

// Block scope: heading narrows the search region; blockIndex is a positional fallback
interface BlockAnchor {
  scope: "block";
  exact: string;
  heading: string;
  blockIndex: number | null;
}

interface DocumentAnchor {
  scope: "document";
}

type ReviewAnchor = TextAnchor | BlockAnchor | DocumentAnchor;
```

The flat structure is replaced: `text` no longer carries `heading`/`blockIndex`; `block` no longer carries `prefix`/`suffix`. TypeScript narrowing on `scope` eliminates defensive null checks throughout the codebase.

## Dependency

Add `dom-anchor-text-quote` as a runtime dependency (it ships to the client bundle):

```
npm install dom-anchor-text-quote
```

If the package does not include TypeScript types, a `declare module` shim is needed.

## anchorUtils.ts Changes

**`buildAnchorFromSelection(selection, root)`**

Signature gains a `root: HTMLElement` parameter (the content container). Internally replaced by `fromRange(root, range)` which returns `{ exact, prefix, suffix }` directly. The result is wrapped as a `TextAnchor`.

`extractPrefix` and `extractSuffix` are deleted. `findNearestHeading` and `countBlockIndex` are retained for block scope.

Note: `fromRange` uses `rangeToString` (text-node traversal only, no `<br>` conversion) rather than `range.toString()`. In Docusaurus CodeBlock, where lines end with `<br>` instead of `\n`, the stored `exact` will not contain newlines. This is internally consistent because `toRange` uses the same text extraction, so round-trip locate works correctly. The `exact` field will just look different from what `selection.toString()` produces.

**`buildAnchorFromBlock(blockElement)`**

Returns `BlockAnchor`. The `prefix`/`suffix` fields are removed from the return value. Logic is otherwise unchanged.

**`useTextSelection` call site**

Pass `contentEl` as the second argument to `buildAnchorFromSelection`.

## highlightRenderer.ts Changes

**`findTextRange` (text scope)**

Replaced by a single call:

```ts
toRange(contentElement, { exact: anchor.exact, prefix: anchor.prefix, suffix: anchor.suffix })
```

The entire TreeWalker loop, `relocateByContext`, and `createRangeFromPosition` are deleted. `diff-match-patch` fuzzy matching inside the library handles content drift that `relocateByContext` previously covered.

**`findBlockElement` (block scope)**

No change to the core logic. The section element (found via `heading`) is already a narrow root; passing it to `toRange` as an additional fuzzy fallback is out of scope for this change.

**`applyHighlight`, `highlightRangePerNode`, `removeHighlight`, etc.**

No changes.

## JSON Migration

Existing `.reviews.json` files are broken by the type change (text anchors carry `heading`/`blockIndex`; block anchors may have empty `exact`). Since the example files can be regenerated from the running site, they are rewritten directly — no migration script.

## Test Changes

- `anchorUtils.test.ts`: Remove tests for `extractPrefix`/`extractSuffix`. Update `buildAnchorFromSelection` tests to pass a root element. Update snapshot shapes to match new type structure.
- `highlightRenderer.test.ts`: Update `ReviewAnchor` literal construction throughout (remove `heading`/`blockIndex` from text anchors, remove `prefix`/`suffix` from block anchors). The `relocateByContext` content-drift tests become library-behaviour tests — verify the range is found rather than testing internal logic.

## Files Changed

| File | Change |
|------|--------|
| `src/types.ts` | Replace flat `ReviewAnchor` with discriminated union |
| `src/client/anchorUtils.ts` | Replace `buildAnchorFromSelection` with `fromRange`; delete `extractPrefix`/`extractSuffix`; update `buildAnchorFromBlock` return type |
| `src/client/highlightRenderer.ts` | Replace `findTextRange` with `toRange`; delete `relocateByContext` and helpers |
| `src/client/useTextSelection.ts` | Pass `contentEl` to `buildAnchorFromSelection` |
| `src/__tests__/anchorUtils.test.ts` | Update tests to new API and shapes |
| `src/__tests__/highlightRenderer.test.ts` | Update anchor literals throughout |
| `example/reviews/**/*.reviews.json` | Rewrite to new anchor format |
| `package.json` | Add `dom-anchor-text-quote` dependency |
