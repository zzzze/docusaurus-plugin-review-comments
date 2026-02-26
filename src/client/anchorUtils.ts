import type { ReviewAnchor } from "../types";

/**
 * Collects all text before `targetNode` up to `charCount` characters by
 * walking backwards through the tree using a TreeWalker on the nearest
 * block ancestor. This handles syntax-highlighted code blocks where the
 * selection start sits inside a deeply-nested <span> with little local text.
 */
/**
 * Walks a subtree rooted at `root`, yielding each node in document order.
 * Text nodes are yielded as-is; <br> elements emit a synthetic "\n" entry.
 * Other element nodes are skipped (but their children are still visited).
 */
function* iterTextWithBr(
  root: Node,
): Generator<{ type: "text"; node: Text; text: string } | { type: "br" }> {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
  );
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) {
      yield { type: "text", node: node as Text, text: node.textContent ?? "" };
    } else if ((node as Element).tagName === "BR") {
      yield { type: "br" };
    }
  }
}

function collectTextBefore(
  targetNode: Node,
  offsetInNode: number,
  charCount: number,
): string {
  const blockAncestor = findNearestBlockAncestor(targetNode);
  if (!blockAncestor) {
    const text = targetNode.textContent ?? "";
    const start = Math.max(0, offsetInNode - charCount);
    return text.slice(start, offsetInNode);
  }

  let accumulated = "";
  for (const item of iterTextWithBr(blockAncestor)) {
    if (item.type === "br") {
      accumulated += "\n";
      continue;
    }
    if (item.node === targetNode) break;
    accumulated += item.text;
  }
  accumulated += (targetNode.textContent ?? "").slice(0, offsetInNode);
  return accumulated.slice(-charCount);
}

/**
 * Collects all text after `targetNode` from `offsetInNode` up to `charCount`
 * characters by walking forwards through the tree.
 */
function collectTextAfter(
  targetNode: Node,
  offsetInNode: number,
  charCount: number,
): string {
  const blockAncestor = findNearestBlockAncestor(targetNode);
  if (!blockAncestor) {
    const text = targetNode.textContent ?? "";
    return text.slice(offsetInNode, offsetInNode + charCount);
  }

  let accumulated = "";
  let pastTarget = false;
  for (const item of iterTextWithBr(blockAncestor)) {
    if (!pastTarget) {
      if (item.type === "text" && item.node === targetNode) {
        accumulated += item.text.slice(offsetInNode);
        pastTarget = true;
      }
      continue;
    }
    if (accumulated.length >= charCount) break;
    accumulated += item.type === "br" ? "\n" : item.text;
  }
  return accumulated.slice(0, charCount);
}

function findNearestBlockAncestor(node: Node): HTMLElement | null {
  const BLOCK = new Set(["P","UL","OL","BLOCKQUOTE","PRE","TABLE","DIV","H1","H2","H3","H4","H5","H6"]);
  let current: Node | null = node.parentNode;
  while (current) {
    if (current instanceof HTMLElement && BLOCK.has(current.tagName)) return current;
    current = current.parentNode;
  }
  return null;
}

export function extractPrefix(range: Range, charCount = 32): string {
  const container = range.startContainer;
  if (container.nodeType !== Node.TEXT_NODE) return "";
  return collectTextBefore(container, range.startOffset, charCount);
}

export function extractSuffix(range: Range, charCount = 32): string {
  const container = range.endContainer;
  if (container.nodeType !== Node.TEXT_NODE) return "";
  return collectTextAfter(container, range.endOffset, charCount);
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
