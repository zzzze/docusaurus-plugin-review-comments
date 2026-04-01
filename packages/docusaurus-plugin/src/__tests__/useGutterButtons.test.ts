import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGutterButtons } from "../client/useGutterButtons";

function el(tag: string, text: string): HTMLElement {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

describe("useGutterButtons", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("returns null state initially", () => {
    const contentEl = document.createElement("div");
    document.body.appendChild(contentEl);
    const ref = { current: contentEl };

    const { result } = renderHook(() => useGutterButtons(ref));

    expect(result.current.activeBlock).toBeNull();
    expect(result.current.gutterPosition).toBeNull();
  });

  it("detects block element on mousemove", () => {
    const contentEl = document.createElement("div");
    const paragraph = el("p", "Hello world");
    contentEl.appendChild(paragraph);
    document.body.appendChild(contentEl);
    const ref = { current: contentEl };

    const { result } = renderHook(() => useGutterButtons(ref));

    act(() => {
      paragraph.dispatchEvent(
        new MouseEvent("mousemove", { bubbles: true }),
      );
    });

    expect(result.current.activeBlock).toBe(paragraph);
    expect(result.current.gutterPosition).not.toBeNull();
  });

  it("detects nested element inside block", () => {
    const contentEl = document.createElement("div");
    const paragraph = document.createElement("p");
    const span = document.createElement("span");
    span.textContent = "nested text";
    paragraph.appendChild(span);
    contentEl.appendChild(paragraph);
    document.body.appendChild(contentEl);
    const ref = { current: contentEl };

    const { result } = renderHook(() => useGutterButtons(ref));

    act(() => {
      span.dispatchEvent(
        new MouseEvent("mousemove", { bubbles: true }),
      );
    });

    expect(result.current.activeBlock).toBe(paragraph);
  });

  it("clears state on mouseleave", () => {
    const contentEl = document.createElement("div");
    const paragraph = el("p", "Hello");
    contentEl.appendChild(paragraph);
    document.body.appendChild(contentEl);
    const ref = { current: contentEl };

    const { result } = renderHook(() => useGutterButtons(ref));

    act(() => {
      paragraph.dispatchEvent(
        new MouseEvent("mousemove", { bubbles: true }),
      );
    });
    expect(result.current.activeBlock).toBe(paragraph);

    act(() => {
      contentEl.dispatchEvent(
        new MouseEvent("mouseleave", { bubbles: true }),
      );
    });

    expect(result.current.activeBlock).toBeNull();
    expect(result.current.gutterPosition).toBeNull();
  });

  it("handles null contentRef", () => {
    const ref = { current: null };
    const { result } = renderHook(() => useGutterButtons(ref));

    expect(result.current.activeBlock).toBeNull();
    expect(result.current.gutterPosition).toBeNull();
  });

  it("recognizes different block tags", () => {
    const contentEl = document.createElement("div");
    const blockquote = document.createElement("blockquote");
    blockquote.textContent = "Quote";
    contentEl.appendChild(blockquote);
    document.body.appendChild(contentEl);
    const ref = { current: contentEl };

    const { result } = renderHook(() => useGutterButtons(ref));

    act(() => {
      blockquote.dispatchEvent(
        new MouseEvent("mousemove", { bubbles: true }),
      );
    });

    expect(result.current.activeBlock).toBe(blockquote);
  });

  it("cleans up listeners on unmount", () => {
    const contentEl = document.createElement("div");
    const paragraph = el("p", "Hello");
    contentEl.appendChild(paragraph);
    document.body.appendChild(contentEl);
    const ref = { current: contentEl };

    const { result, unmount } = renderHook(() => useGutterButtons(ref));

    unmount();

    act(() => {
      paragraph.dispatchEvent(
        new MouseEvent("mousemove", { bubbles: true }),
      );
    });

    // After unmount, state should remain null (no updates)
    expect(result.current.activeBlock).toBeNull();
  });
});
