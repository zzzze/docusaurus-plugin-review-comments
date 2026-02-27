import { describe, it, expect, beforeEach } from "vitest";
import {
  findTextInDocument,
  applyHighlight,
  removeHighlight,
  removeAllHighlights,
  setHighlightHover,
  applyBlockHighlight,
  removeBlockHighlight,
  highlightRangePerNode,
} from "../client/highlightRenderer";
import type { BlockAnchor, TextAnchor } from "../types";

/**
 * Creates a DOM element with the given structure for testing.
 * Uses DOM APIs to build the tree safely.
 */
function createContentElement(...children: Node[]): HTMLElement {
  const div = document.createElement("div");
  for (const child of children) {
    div.appendChild(child);
  }
  document.body.appendChild(div);
  return div;
}

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

function cleanup(): void {
  document.body.replaceChildren();
}

describe("highlightRenderer", () => {
  beforeEach(() => {
    cleanup();
  });

  describe("findTextInDocument", () => {
    it("returns null for document scope", () => {
      const content = createContentElement(el("p", {}, "Hello world"));
      expect(findTextInDocument({ scope: "document" }, content)).toBeNull();
    });

    it("finds exact text match", () => {
      const anchor: TextAnchor = {
        scope: "text",
        exact: "world",
      };
      const content = createContentElement(el("p", {}, "Hello world today"));
      const range = findTextInDocument(anchor, content);

      expect(range).not.toBeNull();
      expect(range!.toString()).toBe("world");
    });

    it("uses prefix to disambiguate multiple matches", () => {
      const anchor: TextAnchor = {
        scope: "text",
        exact: "test",
        prefix: "second ",
      };
      const content = createContentElement(
        el("p", {}, "first test and second test here"),
      );
      const range = findTextInDocument(anchor, content);

      expect(range).not.toBeNull();
      expect(range!.toString()).toBe("test");
      const beforeRange = document.createRange();
      beforeRange.setStart(content, 0);
      beforeRange.setEnd(range!.startContainer, range!.startOffset);
      expect(beforeRange.toString()).toContain("second");
    });

    it("uses suffix to disambiguate multiple matches", () => {
      const anchor: TextAnchor = {
        scope: "text",
        exact: "test",
        suffix: " here",
      };
      const content = createContentElement(
        el("p", {}, "first test and second test here"),
      );
      const range = findTextInDocument(anchor, content);

      expect(range).not.toBeNull();
      expect(range!.toString()).toBe("test");
    });

    it("returns null when text not found", () => {
      const anchor: TextAnchor = {
        scope: "text",
        exact: "missing",
      };
      const content = createContentElement(el("p", {}, "Hello world"));
      expect(findTextInDocument(anchor, content)).toBeNull();
    });

    it("finds block element by heading and exact text", () => {
      const anchor: BlockAnchor = {
        scope: "block",
        exact: "Block content",
        heading: "section1",
        blockIndex: 0,
      };
      const content = createContentElement(
        el("h2", { id: "section1" }, "Section 1"),
        el("p", {}, "Block content"),
        el("p", {}, "Other block"),
      );
      const range = findTextInDocument(anchor, content);

      expect(range).not.toBeNull();
      expect(range!.toString().trim()).toBe("Block content");
    });

    it("falls back to blockIndex when exact text not unique", () => {
      const anchor: BlockAnchor = {
        scope: "block",
        exact: "Same text",
        heading: "section1",
        blockIndex: 1,
      };
      const content = createContentElement(
        el("h2", { id: "section1" }, "Section 1"),
        el("p", {}, "Same text"),
        el("p", {}, "Same text"),
      );
      const range = findTextInDocument(anchor, content);

      expect(range).not.toBeNull();
    });

    it("returns null for block when heading not found", () => {
      const anchor: BlockAnchor = {
        scope: "block",
        exact: "Content",
        heading: "missing",
        blockIndex: 0,
      };
      const content = createContentElement(el("p", {}, "Content"));
      expect(findTextInDocument(anchor, content)).toBeNull();
    });
  });

  describe("applyHighlight / removeHighlight", () => {
    it("wraps text in a mark element", () => {
      const content = createContentElement(el("p", {}, "Hello world"));
      const range = document.createRange();
      const textNode = content.querySelector("p")!.firstChild!;
      range.setStart(textNode, 6);
      range.setEnd(textNode, 11);

      applyHighlight(range, "c1");

      const mark = content.querySelector("mark");
      expect(mark).not.toBeNull();
      expect(mark!.getAttribute("data-comment-id")).toBe("c1");
      expect(mark!.className).toBe("review-highlight");
      expect(mark!.textContent).toBe("world");
    });

    it("removes highlight and restores text", () => {
      const content = createContentElement(el("p", {}, "Hello world"));
      const range = document.createRange();
      const textNode = content.querySelector("p")!.firstChild!;
      range.setStart(textNode, 6);
      range.setEnd(textNode, 11);

      applyHighlight(range, "c1");
      expect(content.querySelector("mark")).not.toBeNull();

      removeHighlight("c1");
      expect(content.querySelector("mark")).toBeNull();
      expect(content.querySelector("p")!.textContent).toBe("Hello world");
    });
  });

  describe("highlightRangePerNode", () => {
    it("highlights text across multiple nodes", () => {
      const content = createContentElement(
        el("p", {},
          el("span", {}, "Hello "),
          el("span", {}, "world"),
        ),
      );
      const p = content.querySelector("p")!;
      const firstText = p.querySelector("span")!.firstChild!;
      const secondText = p.querySelectorAll("span")[1]!.firstChild!;

      const range = document.createRange();
      range.setStart(firstText, 3);
      range.setEnd(secondText, 3);

      highlightRangePerNode(range, "c1");

      const marks = content.querySelectorAll("mark");
      expect(marks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("removeAllHighlights", () => {
    it("removes all highlights from document", () => {
      const content = createContentElement(el("p", {}, "Hello world today"));
      const textNode = content.querySelector("p")!.firstChild!;

      const range1 = document.createRange();
      range1.setStart(textNode, 0);
      range1.setEnd(textNode, 5);
      applyHighlight(range1, "c1");

      const remainingText = content.querySelector("p")!.lastChild!;
      const range2 = document.createRange();
      range2.setStart(remainingText, 1);
      range2.setEnd(remainingText, 6);
      applyHighlight(range2, "c2");

      expect(content.querySelectorAll("mark").length).toBe(2);

      removeAllHighlights();
      expect(content.querySelectorAll("mark").length).toBe(0);
    });
  });

  describe("setHighlightHover", () => {
    it("toggles hover class on highlight", () => {
      const content = createContentElement(el("p", {}, "Hello world"));
      const range = document.createRange();
      const textNode = content.querySelector("p")!.firstChild!;
      range.setStart(textNode, 6);
      range.setEnd(textNode, 11);
      applyHighlight(range, "c1");

      setHighlightHover("c1", true);
      const mark = content.querySelector("mark")!;
      expect(mark.classList.contains("review-highlight-hover")).toBe(true);

      setHighlightHover("c1", false);
      expect(mark.classList.contains("review-highlight-hover")).toBe(false);
    });
  });


  describe("content drift", () => {
    describe("text scope - relocateByContext", () => {
      it("relocates via prefix+suffix when exact text slightly modified", () => {
        const anchor: TextAnchor = {
          scope: "text",
          exact: "the quick brown fox",
          prefix: "Once upon a time, ",
          suffix: " jumped over the lazy",
        };
        // "brown" was changed to "red" — exact match fails
        const content = createContentElement(
          el("p", {}, "Once upon a time, the quick red fox jumped over the lazy dog"),
        );
        const range = findTextInDocument(anchor, content);

        expect(range).not.toBeNull();
        expect(range!.toString()).toContain("quick red fox");
      });

      it("relocates via prefix+suffix when text inserted before anchor", () => {
        const anchor: TextAnchor = {
          scope: "text",
          exact: "important note",
          prefix: "This is an ",
          suffix: " about safety",
        };
        // New sentence inserted before, but prefix+suffix context still present
        const content = createContentElement(
          el("p", {}, "Added intro. This is an important note about safety rules."),
        );
        const range = findTextInDocument(anchor, content);

        expect(range).not.toBeNull();
        expect(range!.toString()).toBe("important note");
      });

      it("relocates via prefix only when suffix missing", () => {
        const anchor: TextAnchor = {
          scope: "text",
          exact: "hello world",
          prefix: "say ",
        };
        // "world" changed to "earth" — exact fails, no suffix
        const content = createContentElement(
          el("p", {}, "Please say hello earth and goodbye"),
        );
        const range = findTextInDocument(anchor, content);

        expect(range).not.toBeNull();
        // prefix-only: starts right after prefix, uses original length as hint
        expect(range!.toString()).toBe("hello earth");
      });

      it("relocates via suffix only when prefix missing", () => {
        const anchor: TextAnchor = {
          scope: "text",
          exact: "hello world",
          suffix: " goodbye",
        };
        // "hello" changed to "hola " (same length) — exact fails, no prefix
        const content = createContentElement(
          el("p", {}, "Start hola  world goodbye end"),
        );
        const range = findTextInDocument(anchor, content);

        expect(range).not.toBeNull();
        // suffix-only: ends right before suffix, uses original length as hint
        expect(range!.toString()).toBe("hola  world");
      });

      it("returns null when both context strings also changed (orphaned)", () => {
        const anchor: TextAnchor = {
          scope: "text",
          exact: "the quick brown fox",
          prefix: "Once upon a time, ",
          suffix: " jumped over the lazy",
        };
        // Completely rewritten — neither prefix nor suffix present
        const content = createContentElement(
          el("p", {}, "A totally different paragraph with no matching context"),
        );
        const range = findTextInDocument(anchor, content);

        expect(range).toBeNull();
      });
    });

    describe("block scope - substring fallback", () => {
      it("finds block via substring when block text modified but contains original", () => {
        const anchor: BlockAnchor = {
          scope: "block",
          exact: "Block content",
          heading: "section1",
          blockIndex: 2,
        };
        // Extra text added to the block, but original text still present as substring.
        // blockIndex is wrong (points beyond available blocks), so only substring can find it.
        const content = createContentElement(
          el("h2", { id: "section1" }, "Section 1"),
          el("p", {}, "Updated Block content with more details"),
          el("p", {}, "Other block"),
        );
        const range = findTextInDocument(anchor, content);

        expect(range).not.toBeNull();
        expect(range!.toString().trim()).toContain("Block content");
      });

      it("finds block by exact text even when new block inserted shifts blockIndex", () => {
        const anchor: BlockAnchor = {
          scope: "block",
          exact: "Target block",
          heading: "section1",
          blockIndex: 0,
        };
        // New block inserted before target — blockIndex is now wrong, but exact text matches
        const content = createContentElement(
          el("h2", { id: "section1" }, "Section 1"),
          el("p", {}, "Newly inserted block"),
          el("p", {}, "Target block"),
        );
        const range = findTextInDocument(anchor, content);

        expect(range).not.toBeNull();
        expect(range!.toString().trim()).toBe("Target block");
      });

      it("falls back to blockIndex when block text completely changed", () => {
        const anchor: BlockAnchor = {
          scope: "block",
          exact: "Original text that no longer exists",
          heading: "section1",
          blockIndex: 1,
        };
        // Block text completely rewritten — no exact or substring match
        const content = createContentElement(
          el("h2", { id: "section1" }, "Section 1"),
          el("p", {}, "First block"),
          el("p", {}, "Completely different text"),
        );
        const range = findTextInDocument(anchor, content);

        expect(range).not.toBeNull();
        expect(range!.toString().trim()).toBe("Completely different text");
      });
    });
  });

  describe("applyBlockHighlight / removeBlockHighlight", () => {
    it("adds highlight class to block element", () => {
      const content = createContentElement(
        el("h2", { id: "section1" }, "Section 1"),
        el("p", {}, "Block content"),
      );
      const anchor: BlockAnchor = {
        scope: "block",
        exact: "Block content",
        heading: "section1",
        blockIndex: 0,
      };

      applyBlockHighlight({ anchor, commentId: "c1", contentElement: content });

      const p = content.querySelector("p")!;
      expect(p.classList.contains("review-block-highlight")).toBe(true);
      expect(p.getAttribute("data-block-highlight-id")).toBe("c1");
    });

    it("removes block highlight", () => {
      const content = createContentElement(
        el("h2", { id: "section1" }, "Section 1"),
        el("p", {}, "Block content"),
      );
      const anchor: BlockAnchor = {
        scope: "block",
        exact: "Block content",
        heading: "section1",
        blockIndex: 0,
      };

      applyBlockHighlight({ anchor, commentId: "c1", contentElement: content });
      removeBlockHighlight("c1");

      const p = content.querySelector("p")!;
      expect(p.classList.contains("review-block-highlight")).toBe(false);
      expect(p.hasAttribute("data-block-highlight-id")).toBe(false);
    });
  });
});
