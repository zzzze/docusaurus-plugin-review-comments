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
