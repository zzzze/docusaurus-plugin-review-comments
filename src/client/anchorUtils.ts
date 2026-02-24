import type { ReviewAnchor } from "../types";

export function extractPrefix(range: Range, charCount = 32): string {
  const container = range.startContainer;
  if (container.nodeType === Node.TEXT_NODE) {
    const text = container.textContent ?? "";
    const start = Math.max(0, range.startOffset - charCount);
    return text.slice(start, range.startOffset);
  }
  return "";
}

export function extractSuffix(range: Range, charCount = 32): string {
  const container = range.endContainer;
  if (container.nodeType === Node.TEXT_NODE) {
    const text = container.textContent ?? "";
    return text.slice(range.endOffset, range.endOffset + charCount);
  }
  return "";
}

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
): ReviewAnchor | null {
  if (selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  const exact = selection.toString().trim();
  if (!exact) return null;

  const heading = findNearestHeading(range.startContainer);
  return {
    scope: "text",
    exact,
    prefix: extractPrefix(range),
    suffix: extractSuffix(range),
    heading,
    blockIndex: countBlockIndex(range.startContainer, heading),
  };
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
): ReviewAnchor {
  const heading = findNearestHeading(blockElement);
  return {
    scope: "block",
    exact: extractBlockText(blockElement),
    prefix: "",
    suffix: "",
    heading,
    blockIndex: countBlockIndex(blockElement, heading),
  };
}
