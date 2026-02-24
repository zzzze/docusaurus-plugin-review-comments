import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHighlights } from "../client/useHighlights";
import * as highlightRenderer from "../client/highlightRenderer";
import type { ReviewComment } from "../types";

vi.mock("../client/highlightRenderer", () => ({
  findTextInDocument: vi.fn(),
  applyHighlight: vi.fn(),
  removeAllHighlights: vi.fn(),
  setHighlightHover: vi.fn(),
  applyBlockHighlight: vi.fn(),
  removeAllBlockHighlights: vi.fn(),
}));

const sampleAnchor = {
  scope: "text" as const,
  exact: "hello",
  prefix: "",
  suffix: "",
  heading: "",
  blockIndex: null,
};

function createComment(overrides: Partial<ReviewComment> = {}): ReviewComment {
  return {
    id: "c1",
    anchor: sampleAnchor,
    author: "alice",
    type: "question",
    status: "open",
    content: "What?",
    createdAt: "2025-01-01T00:00:00.000Z",
    replies: [],
    ...overrides,
  };
}

describe("useHighlights", () => {
  const contentEl = document.createElement("div");
  const contentRef = { current: contentEl };
  const onOrphanedFound = vi.fn();
  const onHighlightClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.replaceChildren();
    document.body.appendChild(contentEl);
  });

  it("applies text highlights for open comments", () => {
    const mockRange = document.createRange();
    vi.mocked(highlightRenderer.findTextInDocument).mockReturnValue(mockRange);

    renderHook(() =>
      useHighlights({
        comments: [createComment()],
        hoveredCommentId: null,
        contentRef,
        onOrphanedFound,
        onHighlightClick,
      }),
    );

    expect(highlightRenderer.removeAllHighlights).toHaveBeenCalled();
    expect(highlightRenderer.findTextInDocument).toHaveBeenCalledWith(
      sampleAnchor,
      contentEl,
    );
    expect(highlightRenderer.applyHighlight).toHaveBeenCalledWith(
      mockRange,
      "c1",
    );
  });

  it("applies block highlights for block-scoped comments", () => {
    const blockAnchor = { ...sampleAnchor, scope: "block" as const };
    const mockRange = document.createRange();
    vi.mocked(highlightRenderer.findTextInDocument).mockReturnValue(mockRange);

    renderHook(() =>
      useHighlights({
        comments: [createComment({ anchor: blockAnchor })],
        hoveredCommentId: null,
        contentRef,
        onOrphanedFound,
        onHighlightClick,
      }),
    );

    expect(highlightRenderer.applyBlockHighlight).toHaveBeenCalledWith(
      blockAnchor,
      "c1",
      contentEl,
    );
  });

  it("skips document-scoped comments", () => {
    const docAnchor = { ...sampleAnchor, scope: "document" as const };

    renderHook(() =>
      useHighlights({
        comments: [createComment({ anchor: docAnchor })],
        hoveredCommentId: null,
        contentRef,
        onOrphanedFound,
        onHighlightClick,
      }),
    );

    expect(highlightRenderer.findTextInDocument).not.toHaveBeenCalled();
    expect(highlightRenderer.applyHighlight).not.toHaveBeenCalled();
  });

  it("skips resolved comments", () => {
    renderHook(() =>
      useHighlights({
        comments: [createComment({ status: "resolved" })],
        hoveredCommentId: null,
        contentRef,
        onOrphanedFound,
        onHighlightClick,
      }),
    );

    expect(highlightRenderer.findTextInDocument).not.toHaveBeenCalled();
  });

  it("reports orphaned comments when range not found", () => {
    vi.mocked(highlightRenderer.findTextInDocument).mockReturnValue(null);

    renderHook(() =>
      useHighlights({
        comments: [createComment()],
        hoveredCommentId: null,
        contentRef,
        onOrphanedFound,
        onHighlightClick,
      }),
    );

    expect(onOrphanedFound).toHaveBeenCalledWith(["c1"]);
  });

  it("sets hover state when hoveredCommentId changes", () => {
    const { rerender } = renderHook(
      ({ hoveredId }) =>
        useHighlights({
          comments: [],
          hoveredCommentId: hoveredId,
          contentRef,
          onOrphanedFound,
          onHighlightClick,
        }),
      { initialProps: { hoveredId: null as string | null } },
    );

    rerender({ hoveredId: "c1" });

    expect(highlightRenderer.setHighlightHover).toHaveBeenCalledWith(
      "c1",
      true,
    );

    rerender({ hoveredId: null });

    expect(highlightRenderer.setHighlightHover).toHaveBeenCalledWith(
      "c1",
      false,
    );
  });

  it("handles highlight click on mark element", () => {
    const mark = document.createElement("mark");
    mark.setAttribute("data-comment-id", "c1");
    document.body.appendChild(mark);

    renderHook(() =>
      useHighlights({
        comments: [],
        hoveredCommentId: null,
        contentRef,
        onOrphanedFound,
        onHighlightClick,
      }),
    );

    act(() => {
      mark.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onHighlightClick).toHaveBeenCalledWith("c1");
  });

  it("handles highlight click on block element", () => {
    const block = document.createElement("p");
    block.setAttribute("data-block-highlight-id", "c2");
    document.body.appendChild(block);

    renderHook(() =>
      useHighlights({
        comments: [],
        hoveredCommentId: null,
        contentRef,
        onOrphanedFound,
        onHighlightClick,
      }),
    );

    act(() => {
      block.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onHighlightClick).toHaveBeenCalledWith("c2");
  });
});
