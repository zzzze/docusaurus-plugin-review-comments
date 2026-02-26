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
