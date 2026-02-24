import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommentCard } from "../theme/ReviewPanel/CommentCard";
import type { ReviewComment } from "../types";

const mockReview = {
  resolveComment: vi.fn().mockResolvedValue(undefined),
  unresolveComment: vi.fn().mockResolvedValue(undefined),
  deleteComment: vi.fn().mockResolvedValue(undefined),
  editReply: vi.fn().mockResolvedValue(undefined),
  setHoveredCommentId: vi.fn(),
  addComment: vi.fn(),
  addReply: vi.fn(),
  editComment: vi.fn(),
};

vi.mock("../client/ReviewContext", () => ({
  useReview: () => mockReview,
}));

vi.mock("../client/highlightRenderer", () => ({
  scrollToHighlight: vi.fn(),
}));

// Fixed timestamp for snapshot stability
const FIXED_DATE = "2025-01-15T10:00:00.000Z";

function createComment(overrides: Partial<ReviewComment> = {}): ReviewComment {
  return {
    id: "c1",
    anchor: {
      scope: "text",
      exact: "selected text",
      prefix: "before ",
      suffix: " after",
      heading: "intro",
      blockIndex: 0,
    },
    author: "alice",
    type: "question",
    status: "open",
    content: "What does this mean?",
    createdAt: FIXED_DATE,
    replies: [],
    ...overrides,
  };
}

describe("CommentCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders author, type badge, and content", () => {
    render(<CommentCard comment={createComment()} />);

    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("question")).toBeInTheDocument();
    expect(screen.getByText("What does this mean?")).toBeInTheDocument();
  });

  it("shows text anchor excerpt for text scope", () => {
    render(<CommentCard comment={createComment()} />);

    expect(screen.getByText('"selected text"')).toBeInTheDocument();
  });

  it("shows block preview for block scope", () => {
    const comment = createComment({
      anchor: {
        scope: "block",
        exact: "This is a paragraph block",
        prefix: "",
        suffix: "",
        heading: "intro",
        blockIndex: 0,
      },
    });
    render(<CommentCard comment={comment} />);

    expect(screen.getByText(/This is a paragraph block/)).toBeInTheDocument();
  });

  it("shows 'Entire document' for document scope", () => {
    const comment = createComment({
      anchor: {
        scope: "document",
        exact: "",
        prefix: "",
        suffix: "",
        heading: "",
        blockIndex: null,
      },
    });
    render(<CommentCard comment={comment} />);

    expect(screen.getByText("Entire document")).toBeInTheDocument();
  });

  it("renders collapsed state for resolved comments", () => {
    const comment = createComment({ status: "resolved" });
    const { container } = render(<CommentCard comment={comment} />);

    expect(screen.getByText("resolved")).toBeInTheDocument();
    // Collapsed state shows preview, not full markdown body
    expect(container.querySelector(".resolvedPreview")).toBeInTheDocument();
    expect(container.querySelector(".commentBody")).not.toBeInTheDocument();
  });

  it("expands resolved comment when clicked", () => {
    const comment = createComment({ status: "resolved" });
    render(<CommentCard comment={comment} />);

    const collapsed = screen.getByRole("button");
    fireEvent.click(collapsed);

    expect(screen.getByText("What does this mean?")).toBeInTheDocument();
  });

  it("collapses expanded resolved comment when collapse button clicked", () => {
    const comment = createComment({ status: "resolved" });
    const { container } = render(<CommentCard comment={comment} />);

    // Expand
    fireEvent.click(screen.getByRole("button"));
    expect(container.querySelector(".commentBody")).toBeInTheDocument();

    // Collapse
    fireEvent.click(screen.getByLabelText("Collapse resolved comment"));
    expect(container.querySelector(".commentBody")).not.toBeInTheDocument();
    expect(container.querySelector(".resolvedPreview")).toBeInTheDocument();
    expect(screen.getByText("resolved")).toBeInTheDocument();
  });

  it("renders replies when expanded", () => {
    const comment = createComment({
      replies: [
        {
          id: "r1",
          author: "bob",
          content: "Good question!",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    render(<CommentCard comment={comment} />);

    // Replies are collapsed by default, click to expand
    const repliesToggle = screen.getByText("1 reply");
    fireEvent.click(repliesToggle);

    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("Good question!")).toBeInTheDocument();
  });

  it("shows delete confirmation when delete button clicked", () => {
    render(<CommentCard comment={createComment()} />);

    const deleteBtn = screen.getByLabelText("Delete comment");
    fireEvent.click(deleteBtn);

    expect(screen.getByText("Delete?")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("calls deleteComment when confirming delete", async () => {
    render(<CommentCard comment={createComment()} />);

    fireEvent.click(screen.getByLabelText("Delete comment"));
    fireEvent.click(screen.getByText("Yes"));

    expect(mockReview.deleteComment).toHaveBeenCalledWith("c1");
  });

  it("cancels delete confirmation when clicking No", () => {
    render(<CommentCard comment={createComment()} />);

    fireEvent.click(screen.getByLabelText("Delete comment"));
    fireEvent.click(screen.getByText("No"));

    expect(screen.queryByText("Delete?")).not.toBeInTheDocument();
    expect(mockReview.deleteComment).not.toHaveBeenCalled();
  });

  it("shows resolve confirmation when resolve button clicked", () => {
    render(<CommentCard comment={createComment()} />);

    const resolveBtn = screen.getByLabelText("Resolve");
    fireEvent.click(resolveBtn);

    expect(screen.getByText("Resolve?")).toBeInTheDocument();
  });

  it("calls resolveComment when confirming resolve", async () => {
    const onResolved = vi.fn();
    render(<CommentCard comment={createComment()} onResolved={onResolved} />);

    fireEvent.click(screen.getByLabelText("Resolve"));
    fireEvent.click(screen.getByText("Yes"));

    expect(mockReview.resolveComment).toHaveBeenCalledWith("c1");
  });

  it("shows reopen confirmation for resolved comments", () => {
    const comment = createComment({ status: "resolved" });
    render(<CommentCard comment={comment} />);

    // Expand first
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByLabelText("Reopen"));

    expect(screen.getByText("Reopen?")).toBeInTheDocument();
  });

  it("calls unresolveComment when confirming reopen", async () => {
    const comment = createComment({ status: "resolved" });
    render(<CommentCard comment={comment} />);

    fireEvent.click(screen.getByRole("button")); // expand
    fireEvent.click(screen.getByLabelText("Reopen"));
    fireEvent.click(screen.getByText("Yes"));

    expect(mockReview.unresolveComment).toHaveBeenCalledWith("c1");
  });

  it("toggles reply form when reply button clicked", () => {
    render(<CommentCard comment={createComment()} />);

    const replyBtn = screen.getByLabelText("Reply");
    fireEvent.click(replyBtn);

    expect(screen.getByPlaceholderText("Write a reply...")).toBeInTheDocument();
  });

  it("sets hovered comment id on mouse enter/leave", () => {
    render(<CommentCard comment={createComment()} />);

    const card = screen.getByText("alice").closest("[data-card-comment-id]")!;
    fireEvent.mouseEnter(card);
    expect(mockReview.setHoveredCommentId).toHaveBeenCalledWith("c1");

    fireEvent.mouseLeave(card);
    expect(mockReview.setHoveredCommentId).toHaveBeenCalledWith(null);
  });

  it("truncates long text excerpts", () => {
    const comment = createComment({
      anchor: {
        scope: "text",
        exact: "This is a very long piece of selected text that should be truncated after sixty characters",
        prefix: "",
        suffix: "",
        heading: "",
        blockIndex: null,
      },
    });
    render(<CommentCard comment={comment} />);

    expect(screen.getByText(/This is a very long.*\.\.\./)).toBeInTheDocument();
  });

  it("shows edit button for replies on open comments", () => {
    const comment = createComment({
      replies: [
        {
          id: "r1",
          author: "bob",
          content: "A reply",
          createdAt: FIXED_DATE,
        },
      ],
    });
    render(<CommentCard comment={comment} />);

    fireEvent.click(screen.getByText("1 reply"));
    expect(screen.getByLabelText("Edit reply")).toBeInTheDocument();
  });

  it("hides edit button for replies on resolved comments", () => {
    const comment = createComment({
      status: "resolved",
      replies: [
        {
          id: "r1",
          author: "bob",
          content: "A reply",
          createdAt: FIXED_DATE,
        },
      ],
    });
    render(<CommentCard comment={comment} />);

    // Expand the resolved comment
    fireEvent.click(screen.getByRole("button"));
    // Expand replies
    fireEvent.click(screen.getByText("1 reply"));

    expect(screen.getByText("A reply")).toBeInTheDocument();
    expect(screen.queryByLabelText("Edit reply")).not.toBeInTheDocument();
  });
});

describe("CommentCard snapshots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Fix system time for stable relative time display in snapshots
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-20T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows 'just now' for comments less than 1 minute old", () => {
    const comment = createComment({
      createdAt: "2025-01-20T09:59:30.000Z", // 30 seconds ago
    });
    render(<CommentCard comment={comment} />);
    expect(screen.getByText("just now")).toBeInTheDocument();
  });

  it("shows '1m ago' for comments exactly 1 minute old", () => {
    const comment = createComment({
      createdAt: "2025-01-20T09:59:00.000Z", // exactly 1 minute ago
    });
    render(<CommentCard comment={comment} />);
    expect(screen.getByText("1m ago")).toBeInTheDocument();
  });

  it("shows '1h ago' for comments exactly 60 minutes old", () => {
    const comment = createComment({
      createdAt: "2025-01-20T09:00:00.000Z", // exactly 60 minutes ago
    });
    render(<CommentCard comment={comment} />);
    expect(screen.getByText("1h ago")).toBeInTheDocument();
  });

  it("shows '1d ago' for comments exactly 24 hours old", () => {
    const comment = createComment({
      createdAt: "2025-01-19T10:00:00.000Z", // exactly 24 hours ago
    });
    render(<CommentCard comment={comment} />);
    expect(screen.getByText("1d ago")).toBeInTheDocument();
  });

  it("matches snapshot for open comment with text anchor", () => {
    const { container } = render(<CommentCard comment={createComment()} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("matches snapshot for collapsed resolved comment", () => {
    const comment = createComment({ status: "resolved" });
    const { container } = render(<CommentCard comment={comment} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("matches snapshot for open comment with replies", () => {
    const comment = createComment({
      replies: [
        {
          id: "r1",
          author: "bob",
          content: "Good question!",
          createdAt: FIXED_DATE,
        },
        {
          id: "r2",
          author: "charlie",
          content: "I agree with bob.",
          createdAt: FIXED_DATE,
        },
      ],
    });
    const { container } = render(<CommentCard comment={comment} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("matches snapshot for block scope anchor", () => {
    const comment = createComment({
      anchor: {
        scope: "block",
        exact: "This is a code block",
        prefix: "",
        suffix: "",
        heading: "examples",
        blockIndex: 2,
      },
    });
    const { container } = render(<CommentCard comment={comment} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("matches snapshot for document scope anchor", () => {
    const comment = createComment({
      anchor: {
        scope: "document",
        exact: "",
        prefix: "",
        suffix: "",
        heading: "",
        blockIndex: null,
      },
    });
    const { container } = render(<CommentCard comment={comment} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
