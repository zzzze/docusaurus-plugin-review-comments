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
import type { ReviewAnchor } from "../types";

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
      const anchor: ReviewAnchor = {
        scope: "document",
        exact: "",
        prefix: "",
        suffix: "",
        heading: "",
        blockIndex: null,
      };
      const content = createContentElement(el("p", {}, "Hello world"));
      expect(findTextInDocument(anchor, content)).toBeNull();
    });

    it("finds exact text match", () => {
      const anchor: ReviewAnchor = {
        scope: "text",
        exact: "world",
        prefix: "",
        suffix: "",
        heading: "",
        blockIndex: null,
      };
      const content = createContentElement(el("p", {}, "Hello world today"));
      const range = findTextInDocument(anchor, content);

      expect(range).not.toBeNull();
      expect(range!.toString()).toBe("world");
    });

    it("uses prefix to disambiguate multiple matches", () => {
      const anchor: ReviewAnchor = {
        scope: "text",
        exact: "test",
        prefix: "second ",
        suffix: "",
        heading: "",
        blockIndex: null,
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
      const anchor: ReviewAnchor = {
        scope: "text",
        exact: "test",
        prefix: "",
        suffix: " here",
        heading: "",
        blockIndex: null,
      };
      const content = createContentElement(
        el("p", {}, "first test and second test here"),
      );
      const range = findTextInDocument(anchor, content);

      expect(range).not.toBeNull();
      expect(range!.toString()).toBe("test");
    });

    it("returns null when text not found", () => {
      const anchor: ReviewAnchor = {
        scope: "text",
        exact: "missing",
        prefix: "",
        suffix: "",
        heading: "",
        blockIndex: null,
      };
      const content = createContentElement(el("p", {}, "Hello world"));
      expect(findTextInDocument(anchor, content)).toBeNull();
    });

    it("finds block element by heading and exact text", () => {
      const anchor: ReviewAnchor = {
        scope: "block",
        exact: "Block content",
        prefix: "",
        suffix: "",
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
      const anchor: ReviewAnchor = {
        scope: "block",
        exact: "Same text",
        prefix: "",
        suffix: "",
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
      const anchor: ReviewAnchor = {
        scope: "block",
        exact: "Content",
        prefix: "",
        suffix: "",
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

  describe("findTextInDocument in syntax-highlighted code blocks", () => {
    it("finds text that spans multiple Prism token spans", () => {
      // Prism splits code into spans per token; the exact text is split across them
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      // "reviewsDir: 'reviews'" split across spans as Prism might render it
      const spans = [
        el("span", {}, "reviewsDir"),
        el("span", {}, ": "),
        el("span", {}, "'reviews'"),
      ];
      for (const s of spans) code.appendChild(s);
      pre.appendChild(code);

      const anchor: ReviewAnchor = {
        scope: "text",
        exact: "reviewsDir: 'reviews'",
        prefix: "",
        suffix: "",
        heading: "",
        blockIndex: null,
      };
      const content = createContentElement(pre);
      const range = findTextInDocument(anchor, content);

      expect(range).not.toBeNull();
      expect(range!.toString()).toBe("reviewsDir: 'reviews'");
    });

    it("finds multiline text in code block spanning token spans and newlines", () => {
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      // Simulate: "foo\nbar" where each word is a token and \n is a separate text node
      code.appendChild(el("span", {}, "foo"));
      code.appendChild(document.createTextNode("\n"));
      code.appendChild(el("span", {}, "bar"));
      pre.appendChild(code);

      const anchor: ReviewAnchor = {
        scope: "text",
        exact: "foo\nbar",
        prefix: "",
        suffix: "",
        heading: "",
        blockIndex: null,
      };
      const content = createContentElement(pre);
      const range = findTextInDocument(anchor, content);

      expect(range).not.toBeNull();
      expect(range!.toString()).toBe("foo\nbar");
    });

    it("finds multiline text in Docusaurus CodeBlock where lines end with <br> not \\n", () => {
      // Docusaurus renders each code line as: <span>...tokens...<br/></span>
      // selection.toString() converts <br> → "\n", so anchor.exact contains "\n"
      // but naive text-node concatenation produces no "\n" at line boundaries.
      const pre = document.createElement("pre");
      const code = document.createElement("code");

      // Line 1: "  foo: 'bar'," + <br>
      const line1 = document.createElement("span");
      line1.appendChild(document.createTextNode("  foo: 'bar',"));
      line1.appendChild(document.createElement("br"));

      // Line 2: "  baz: 'qux'," + <br>
      const line2 = document.createElement("span");
      line2.appendChild(document.createTextNode("  baz: 'qux',"));
      line2.appendChild(document.createElement("br"));

      code.appendChild(line1);
      code.appendChild(line2);
      pre.appendChild(code);

      const anchor: ReviewAnchor = {
        scope: "text",
        exact: "foo: 'bar',\n  baz: 'qux',",
        prefix: "  ",
        suffix: "",
        heading: "",
        blockIndex: null,
      };
      const content = createContentElement(pre);
      const range = findTextInDocument(anchor, content);

      expect(range).not.toBeNull();
      // The range spans from "foo" to the end of "qux',"
      expect(range!.toString()).toContain("foo: 'bar'");
      expect(range!.toString()).toContain("baz: 'qux',");
    });
  });

  describe("content drift in CodeBlock (<br> lines)", () => {
    function makeCodeBlock(...lines: string[]): HTMLElement {
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      for (const line of lines) {
        const span = document.createElement("span");
        span.appendChild(document.createTextNode(line));
        span.appendChild(document.createElement("br"));
        code.appendChild(span);
      }
      pre.appendChild(code);
      return pre;
    }

    it("relocates via suffix (across <br>) when one char deleted from exact text", () => {
      // suffix spans a <br>-terminated line boundary: "\n};" is in fullText as "\n};"
      const pre = makeCodeBlock("  foo: 'ba',", "  baz: 'qux',", "};");
      const anchor: ReviewAnchor = {
        scope: "text",
        exact: "foo: 'bar',\n  baz: 'qux',",
        prefix: "",
        suffix: "\n};",  // newline (from <br>) + next line content
        heading: "",
        blockIndex: null,
      };
      const content = createContentElement(pre);
      const range = findTextInDocument(anchor, content);

      expect(range).not.toBeNull();
    });

    it("relocates via prefix+suffix when one char deleted from exact text", () => {
      // Both prefix and suffix are long enough to uniquely locate the anchor
      const pre = makeCodeBlock("module.exports = {", "  foo: 'ba',", "  baz: 'qux',", "};");
      const anchor: ReviewAnchor = {
        scope: "text",
        exact: "foo: 'bar',\n  baz: 'qux',",
        prefix: "exports = {\n  ",  // crosses a <br> boundary
        suffix: "\n};",
        heading: "",
        blockIndex: null,
      };
      const content = createContentElement(pre);
      const range = findTextInDocument(anchor, content);

      expect(range).not.toBeNull();
    });

    it("returns null when both prefix and suffix also changed (orphaned)", () => {
      const pre = makeCodeBlock("completely different", "content here");
      const anchor: ReviewAnchor = {
        scope: "text",
        exact: "foo: 'bar',\n  baz: 'qux',",
        prefix: "exports = {\n  ",
        suffix: "\n};",
        heading: "",
        blockIndex: null,
      };
      const content = createContentElement(pre);
      const range = findTextInDocument(anchor, content);

      expect(range).toBeNull();
    });
  });

  describe("content drift", () => {
    describe("text scope - relocateByContext", () => {
      it("relocates via prefix+suffix when exact text slightly modified", () => {
        const anchor: ReviewAnchor = {
          scope: "text",
          exact: "the quick brown fox",
          prefix: "Once upon a time, ",
          suffix: " jumped over the lazy",
          heading: "",
          blockIndex: null,
        };
        // "brown" was changed to "red" — exact match fails
        const content = createContentElement(
          el("p", {}, "Once upon a time, the quick red fox jumped over the lazy dog"),
        );
        const range = findTextInDocument(anchor, content);

        expect(range).not.toBeNull();
        expect(range!.toString()).toBe("the quick red fox");
      });

      it("relocates via prefix+suffix when text inserted before anchor", () => {
        const anchor: ReviewAnchor = {
          scope: "text",
          exact: "important note",
          prefix: "This is an ",
          suffix: " about safety",
          heading: "",
          blockIndex: null,
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
        const anchor: ReviewAnchor = {
          scope: "text",
          exact: "hello world",
          prefix: "say ",
          suffix: "",
          heading: "",
          blockIndex: null,
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
        const anchor: ReviewAnchor = {
          scope: "text",
          exact: "hello world",
          prefix: "",
          suffix: " goodbye",
          heading: "",
          blockIndex: null,
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
        const anchor: ReviewAnchor = {
          scope: "text",
          exact: "the quick brown fox",
          prefix: "Once upon a time, ",
          suffix: " jumped over the lazy",
          heading: "",
          blockIndex: null,
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
        const anchor: ReviewAnchor = {
          scope: "block",
          exact: "Block content",
          prefix: "",
          suffix: "",
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
        const anchor: ReviewAnchor = {
          scope: "block",
          exact: "Target block",
          prefix: "",
          suffix: "",
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
        const anchor: ReviewAnchor = {
          scope: "block",
          exact: "Original text that no longer exists",
          prefix: "",
          suffix: "",
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
      const anchor: ReviewAnchor = {
        scope: "block",
        exact: "Block content",
        prefix: "",
        suffix: "",
        heading: "section1",
        blockIndex: 0,
      };

      applyBlockHighlight(anchor, "c1", content);

      const p = content.querySelector("p")!;
      expect(p.classList.contains("review-block-highlight")).toBe(true);
      expect(p.getAttribute("data-block-highlight-id")).toBe("c1");
    });

    it("removes block highlight", () => {
      const content = createContentElement(
        el("h2", { id: "section1" }, "Section 1"),
        el("p", {}, "Block content"),
      );
      const anchor: ReviewAnchor = {
        scope: "block",
        exact: "Block content",
        prefix: "",
        suffix: "",
        heading: "section1",
        blockIndex: 0,
      };

      applyBlockHighlight(anchor, "c1", content);
      removeBlockHighlight("c1");

      const p = content.querySelector("p")!;
      expect(p.classList.contains("review-block-highlight")).toBe(false);
      expect(p.hasAttribute("data-block-highlight-id")).toBe(false);
    });
  });
});
