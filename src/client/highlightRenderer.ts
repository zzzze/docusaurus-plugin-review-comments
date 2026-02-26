import type { ReviewAnchor } from "../types";

export function findTextInDocument(
  anchor: ReviewAnchor,
  contentElement: HTMLElement,
): Range | null {
  if (anchor.scope === "document") return null;

  if (anchor.scope === "block") {
    return findBlockElement(anchor, contentElement);
  }

  return findTextRange(anchor, contentElement);
}

function findBlockElement(
  anchor: ReviewAnchor,
  contentElement: HTMLElement,
): Range | null {
  if (!anchor.heading) return null;
  const heading = contentElement.querySelector(
    `#${CSS.escape(anchor.heading)}`,
  );
  if (!heading) return null;

  const blocks: Element[] = [];
  let sibling = heading.nextElementSibling;
  while (sibling) {
    if (isBlockElement(sibling)) blocks.push(sibling);
    sibling = sibling.nextElementSibling;
  }

  // Primary: match by text content
  if (anchor.exact) {
    const exactMatches = blocks.filter(
      (el) => el.textContent?.trim() === anchor.exact.trim(),
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
      (el) => el.textContent?.includes(anchor.exact.trim()),
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

function findTextRange(
  anchor: ReviewAnchor,
  contentElement: HTMLElement,
): Range | null {
  const treeWalker = document.createTreeWalker(
    contentElement,
    NodeFilter.SHOW_TEXT,
  );
  let fullText = "";
  const textNodes: { node: Text; start: number }[] = [];

  let node: Text | null;
  while ((node = treeWalker.nextNode() as Text | null)) {
    textNodes.push({ node, start: fullText.length });
    fullText += node.textContent ?? "";
  }

  const searchText = anchor.exact;
  let searchStart = 0;
  let bestMatch = -1;

  while (true) {
    const idx = fullText.indexOf(searchText, searchStart);
    if (idx === -1) break;

    if (anchor.prefix || anchor.suffix) {
      const beforeText = fullText.slice(Math.max(0, idx - 50), idx);
      const afterText = fullText.slice(
        idx + searchText.length,
        idx + searchText.length + 50,
      );

      if (anchor.prefix && beforeText.endsWith(anchor.prefix)) {
        bestMatch = idx;
        break;
      }
      if (anchor.suffix && afterText.startsWith(anchor.suffix)) {
        bestMatch = idx;
        break;
      }
    }

    if (bestMatch === -1) bestMatch = idx;
    searchStart = idx + 1;
  }

  if (bestMatch === -1) {
    const relocated = relocateByContext(
      fullText,
      anchor.prefix,
      anchor.suffix,
      searchText.length,
    );
    if (!relocated) return null;
    return createRangeFromPosition(textNodes, relocated.start, relocated.end);
  }

  return createRangeFromPosition(
    textNodes,
    bestMatch,
    bestMatch + searchText.length,
  );
}

function relocateByContext(
  fullText: string,
  prefix: string,
  suffix: string,
  exactLength: number,
): { start: number; end: number } | null {
  const windowLimit = exactLength * 3;

  if (prefix && suffix) {
    const prefixIdx = fullText.indexOf(prefix);
    if (prefixIdx === -1) return null;
    const anchorStart = prefixIdx + prefix.length;
    const suffixIdx = fullText.indexOf(suffix, anchorStart);
    if (suffixIdx === -1 || suffixIdx - anchorStart > windowLimit) return null;
    return { start: anchorStart, end: suffixIdx };
  }

  if (prefix) {
    const prefixIdx = fullText.indexOf(prefix);
    if (prefixIdx === -1) return null;
    const anchorStart = prefixIdx + prefix.length;
    return { start: anchorStart, end: anchorStart + exactLength };
  }

  if (suffix) {
    const suffixIdx = fullText.indexOf(suffix);
    if (suffixIdx === -1) return null;
    const anchorEnd = suffixIdx;
    return { start: Math.max(0, anchorEnd - exactLength), end: anchorEnd };
  }

  return null;
}

function createRangeFromPosition(
  textNodes: { node: Text; start: number }[],
  start: number,
  end: number,
): Range | null {
  const range = document.createRange();
  let startSet = false;

  for (const tn of textNodes) {
    const nodeEnd = tn.start + (tn.node.textContent?.length ?? 0);

    if (!startSet && start >= tn.start && start < nodeEnd) {
      range.setStart(tn.node, start - tn.start);
      startSet = true;
    }

    if (startSet && end <= nodeEnd) {
      range.setEnd(tn.node, end - tn.start);
      return range;
    }
  }

  return null;
}

const BLOCK_TAGS = new Set([
  "P",
  "UL",
  "OL",
  "BLOCKQUOTE",
  "PRE",
  "TABLE",
  "DIV",
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

export function applyBlockHighlight(
  anchor: ReviewAnchor,
  commentId: string,
  contentElement: HTMLElement,
): void {
  removeBlockHighlight(commentId);
  const range = findBlockElement(anchor, contentElement);
  if (!range) return;
  const blockEl = range.startContainer as HTMLElement;
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
