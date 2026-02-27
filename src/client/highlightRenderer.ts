import { toRange } from "dom-anchor-text-quote";
import type { BlockAnchor, ReviewAnchor } from "../types";
import { getVisibleText } from "./domUtils";

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

function findBlockElement(
  anchor: BlockAnchor,
  contentElement: HTMLElement,
): Range | null {
  let startSibling: Element | null;

  if (anchor.heading) {
    const heading = contentElement.querySelector(
      `#${CSS.escape(anchor.heading)}`,
    );
    if (!heading) return null;

    // If the anchor text matches the heading itself, return it directly
    if (anchor.exact && getVisibleText(heading) === anchor.exact.trim()) {
      return rangeFromElement(heading);
    }

    startSibling = heading.nextElementSibling;
  } else {
    // No heading: try to match against a direct-child heading without an id (e.g. H1 inside <header>)
    if (anchor.exact) {
      const headingEl = Array.from(
        contentElement.querySelectorAll("h1, h2, h3, h4, h5, h6"),
      ).find(
        (el) => !el.id && el.parentElement === contentElement && getVisibleText(el) === anchor.exact.trim(),
      );
      if (headingEl) return rangeFromElement(headingEl);
    }
    // Search from the first child of contentElement
    startSibling = contentElement.firstElementChild;
  }

  const blocks: Element[] = [];
  let sibling = startSibling;
  while (sibling) {
    // Stop at the first heading when searching from document root (before pushing)
    if (!anchor.heading && /^H[1-6]$/.test(sibling.tagName)) break;
    if (isBlockElement(sibling)) blocks.push(sibling);
    sibling = sibling.nextElementSibling;
  }

  // Primary: match by text content
  if (anchor.exact) {
    const exactMatches = blocks.filter(
      (el) => getVisibleText(el) === anchor.exact.trim(),
    );
    if (exactMatches.length === 1) {
      return rangeFromElement(exactMatches[0]!);
    }
    // Tiebreak with blockIndex when multiple blocks share the same text
    if (exactMatches.length > 1 && anchor.blockIndex !== null) {
      const atIndex = blocks[anchor.blockIndex];
      if (atIndex && exactMatches.includes(atIndex)) {
        return rangeFromElement(atIndex);
      }
      return rangeFromElement(exactMatches[0]!);
    }
  }

  // Secondary: substring match (handles text added to block)
  if (anchor.exact) {
    const substringMatches = blocks.filter(
      (el) => getVisibleText(el).includes(anchor.exact.trim()),
    );
    if (substringMatches.length === 1) {
      return rangeFromElement(substringMatches[0]!);
    }
    if (substringMatches.length > 1 && anchor.blockIndex !== null) {
      const atIndex = blocks[anchor.blockIndex];
      if (atIndex && substringMatches.includes(atIndex)) {
        return rangeFromElement(atIndex);
      }
      return rangeFromElement(substringMatches[0]!);
    }
  }

  // Fallback: positional index
  if (anchor.blockIndex !== null && blocks[anchor.blockIndex]) {
    return rangeFromElement(blocks[anchor.blockIndex]!);
  }

  return null;
}

function rangeFromElement(el: Element): Range {
  const range = document.createRange();
  range.selectNodeContents(el);
  return range;
}


const BLOCK_TAGS = new Set([
  "P",
  "UL",
  "OL",
  "BLOCKQUOTE",
  "PRE",
  "TABLE",
  "DIV",
  "H1", "H2", "H3", "H4", "H5", "H6",
]);

function isBlockElement(el: Element): boolean {
  return BLOCK_TAGS.has(el.tagName);
}

export function applyHighlight(range: Range, commentId: string): void {
  const mark = document.createElement("mark");
  mark.setAttribute("data-comment-id", commentId);
  mark.className = "review-highlight";

  try {
    range.surroundContents(mark);
  } catch {
    const fragment = range.extractContents();
    mark.appendChild(fragment);
    range.insertNode(mark);
  }
}

/**
 * Highlights a range by wrapping each text node individually.
 * Works across paragraph and element boundaries unlike surroundContents.
 */
export function highlightRangePerNode(
  range: Range,
  commentId: string,
): void {
  const ancestor = range.commonAncestorContainer;
  const root =
    ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentElement! : ancestor;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (range.intersectsNode(node)) {
      textNodes.push(node);
    }
  }

  // Process in reverse so earlier splits don't invalidate later offsets
  for (let i = textNodes.length - 1; i >= 0; i--) {
    let textNode = textNodes[i]!;
    const isStart = textNode === range.startContainer;
    const isEnd = textNode === range.endContainer;
    let startOffset = isStart ? range.startOffset : 0;
    let endOffset = isEnd ? range.endOffset : textNode.length;

    if (startOffset >= endOffset) continue;

    if (endOffset < textNode.length) {
      textNode.splitText(endOffset);
    }
    if (startOffset > 0) {
      textNode = textNode.splitText(startOffset);
    }

    const mark = document.createElement("mark");
    mark.setAttribute("data-comment-id", commentId);
    mark.className = "review-highlight";
    textNode.parentNode!.insertBefore(mark, textNode);
    mark.appendChild(textNode);
  }
}

export function removeHighlight(commentId: string): void {
  const marks = document.querySelectorAll(
    `mark[data-comment-id="${CSS.escape(commentId)}"]`,
  );
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  });
}

export function removeAllHighlights(): void {
  const marks = document.querySelectorAll("mark[data-comment-id]");
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  });
}

export function setHighlightHover(
  commentId: string,
  isHovered: boolean,
): void {
  const marks = document.querySelectorAll(
    `mark[data-comment-id="${CSS.escape(commentId)}"]`,
  );
  marks.forEach((mark) => {
    mark.classList.toggle("review-highlight-hover", isHovered);
  });

  const blockEl = document.querySelector(
    `[${BLOCK_HIGHLIGHT_ATTR}="${CSS.escape(commentId)}"]`,
  );
  if (blockEl) {
    blockEl.classList.toggle("review-block-highlight-hover", isHovered);
  }
}

function getNavbarHeight(): number {
  const navbar = document.querySelector(".navbar") as HTMLElement | null;
  return navbar ? navbar.offsetHeight : 60;
}

function scrollIntoViewWithOffset(el: Element): void {
  const rect = el.getBoundingClientRect();
  const offset = getNavbarHeight() + 16;
  const targetScrollY = window.scrollY + rect.top - offset;
  window.scrollTo({ top: targetScrollY, behavior: "smooth" });
}

export function scrollToHighlight(commentId: string): void {
  const mark = document.querySelector(
    `mark[data-comment-id="${CSS.escape(commentId)}"]`,
  );
  if (mark) {
    scrollIntoViewWithOffset(mark);
    mark.classList.add("review-highlight-pulse");
    setTimeout(() => mark.classList.remove("review-highlight-pulse"), 1500);
    return;
  }

  const blockEl = document.querySelector(
    `[${BLOCK_HIGHLIGHT_ATTR}="${CSS.escape(commentId)}"]`,
  );
  if (blockEl) {
    scrollIntoViewWithOffset(blockEl);
    blockEl.classList.add("review-block-highlight-pulse");
    setTimeout(() => blockEl.classList.remove("review-block-highlight-pulse"), 1500);
  }
}

const BLOCK_HIGHLIGHT_CLASS = "review-block-highlight";
const BLOCK_HIGHLIGHT_ATTR = "data-block-highlight-id";

export function applyBlockHighlight(opts: {
  anchor: BlockAnchor;
  commentId: string;
  contentElement: HTMLElement;
}): void {
  const { anchor, commentId, contentElement } = opts;
  removeBlockHighlight(commentId);
  const range = findBlockElement(anchor, contentElement);
  if (!range) return;
  const node = range.startContainer;
  const blockEl = node.nodeType === Node.ELEMENT_NODE
    ? (node as HTMLElement)
    : (node as Text).parentElement;
  if (!blockEl) return;
  blockEl.classList.add(BLOCK_HIGHLIGHT_CLASS);
  blockEl.setAttribute(BLOCK_HIGHLIGHT_ATTR, commentId);
}

export function removeBlockHighlight(commentId: string): void {
  const el = document.querySelector(
    `[${BLOCK_HIGHLIGHT_ATTR}="${CSS.escape(commentId)}"]`,
  );
  if (!el) return;
  el.classList.remove(BLOCK_HIGHLIGHT_CLASS);
  el.removeAttribute(BLOCK_HIGHLIGHT_ATTR);
}

export function removeAllBlockHighlights(): void {
  const els = document.querySelectorAll(`[${BLOCK_HIGHLIGHT_ATTR}]`);
  els.forEach((el) => {
    el.classList.remove(BLOCK_HIGHLIGHT_CLASS);
    el.removeAttribute(BLOCK_HIGHLIGHT_ATTR);
  });
}
