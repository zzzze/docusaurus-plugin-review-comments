import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommentForm } from "../theme/CommentForm";
import type { ReviewAnchor } from "../types";

const mockReview = {
  addComment: vi.fn().mockResolvedValue(undefined),
  addReply: vi.fn().mockResolvedValue(undefined),
  editComment: vi.fn().mockResolvedValue(undefined),
  resolveComment: vi.fn(),
  unresolveComment: vi.fn(),
  deleteComment: vi.fn(),
  editReply: vi.fn(),
  setHoveredCommentId: vi.fn(),
};

vi.mock("../client/ReviewContext", () => ({
  useReview: () => mockReview,
}));

const textAnchor: ReviewAnchor = {
  scope: "text",
  exact: "selected text",
  prefix: "before ",
  suffix: " after",
  heading: "intro",
  blockIndex: 0,
};

const blockAnchor: ReviewAnchor = {
  scope: "block",
  exact: "paragraph content",
  prefix: "",
  suffix: "",
  heading: "intro",
  blockIndex: 0,
};

describe("CommentForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create mode", () => {
    it("renders type selector with question/suggestion/issue", () => {
      render(
        <CommentForm
          mode="create"
          initialAnchor={textAnchor}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.getByText("Question")).toBeInTheDocument();
      expect(screen.getByText("Suggestion")).toBeInTheDocument();
      expect(screen.getByText("Issue")).toBeInTheDocument();
    });

    it("renders scope selector", () => {
      render(
        <CommentForm
          mode="create"
          initialAnchor={textAnchor}
          blockAnchor={blockAnchor}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.getByText("Text")).toBeInTheDocument();
      expect(screen.getByText("Block")).toBeInTheDocument();
      expect(screen.getByText("Document")).toBeInTheDocument();
    });

    it("disables text scope button when starting from block", () => {
      render(
        <CommentForm
          mode="create"
          initialAnchor={blockAnchor}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const textBtn = screen.getByText("Text");
      expect(textBtn).toBeDisabled();
    });

    it("calls addComment on submit", async () => {
      const onSubmit = vi.fn();
      render(
        <CommentForm
          mode="create"
          initialAnchor={textAnchor}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />,
      );

      const textarea = screen.getByPlaceholderText("Write a comment...");
      fireEvent.change(textarea, { target: { value: "My comment" } });

      const submitBtn = screen.getByText("Comment");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockReview.addComment).toHaveBeenCalledWith(
          textAnchor,
          "My comment",
          "question",
        );
      });
      expect(onSubmit).toHaveBeenCalled();
    });

    it("changes comment type when clicking type buttons", async () => {
      const onSubmit = vi.fn();
      render(
        <CommentForm
          mode="create"
          initialAnchor={textAnchor}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("Issue"));

      const textarea = screen.getByPlaceholderText("Write a comment...");
      fireEvent.change(textarea, { target: { value: "Bug report" } });
      fireEvent.click(screen.getByText("Comment"));

      await waitFor(() => {
        expect(mockReview.addComment).toHaveBeenCalledWith(
          textAnchor,
          "Bug report",
          "issue",
        );
      });
    });
  });

  describe("reply mode", () => {
    it("does not show type or scope selectors", () => {
      render(
        <CommentForm
          mode="reply"
          commentId="c1"
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.queryByText("Question")).not.toBeInTheDocument();
      expect(screen.queryByText("Text")).not.toBeInTheDocument();
    });

    it("shows reply placeholder", () => {
      render(
        <CommentForm
          mode="reply"
          commentId="c1"
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.getByPlaceholderText("Write a reply...")).toBeInTheDocument();
    });

    it("calls addReply on submit", async () => {
      const onSubmit = vi.fn();
      render(
        <CommentForm
          mode="reply"
          commentId="c1"
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />,
      );

      fireEvent.change(screen.getByPlaceholderText("Write a reply..."), {
        target: { value: "My reply" },
      });
      fireEvent.click(screen.getByText("Reply"));

      await waitFor(() => {
        expect(mockReview.addReply).toHaveBeenCalledWith("c1", "My reply");
      });
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe("edit mode", () => {
    it("pre-fills content", () => {
      render(
        <CommentForm
          mode="edit"
          commentId="c1"
          initialContent="Original content"
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const textarea = screen.getByDisplayValue("Original content");
      expect(textarea).toBeInTheDocument();
    });

    it("calls editComment on submit", async () => {
      const onSubmit = vi.fn();
      render(
        <CommentForm
          mode="edit"
          commentId="c1"
          initialContent="Original"
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />,
      );

      const textarea = screen.getByDisplayValue("Original");
      fireEvent.change(textarea, { target: { value: "Updated content" } });
      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(mockReview.editComment).toHaveBeenCalledWith("c1", "Updated content");
      });
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe("common behavior", () => {
    it("disables submit button when content is empty", () => {
      render(
        <CommentForm
          mode="create"
          initialAnchor={textAnchor}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const submitBtn = screen.getByText("Comment");
      expect(submitBtn).toBeDisabled();
    });

    it("disables submit button when content is only whitespace", () => {
      render(
        <CommentForm
          mode="create"
          initialAnchor={textAnchor}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const textarea = screen.getByPlaceholderText("Write a comment...");
      fireEvent.change(textarea, { target: { value: "   " } });

      const submitBtn = screen.getByText("Comment");
      expect(submitBtn).toBeDisabled();
    });

    it("calls onCancel when cancel button clicked", () => {
      const onCancel = vi.fn();
      render(
        <CommentForm
          mode="create"
          initialAnchor={textAnchor}
          onSubmit={vi.fn()}
          onCancel={onCancel}
        />,
      );

      fireEvent.click(screen.getByText("Cancel"));
      expect(onCancel).toHaveBeenCalled();
    });

    it("calls onCancel when Escape is pressed", () => {
      const onCancel = vi.fn();
      render(
        <CommentForm
          mode="create"
          initialAnchor={textAnchor}
          onSubmit={vi.fn()}
          onCancel={onCancel}
        />,
      );

      const textarea = screen.getByPlaceholderText("Write a comment...");
      fireEvent.keyDown(textarea, { key: "Escape" });

      expect(onCancel).toHaveBeenCalled();
    });

    it("submits on Ctrl+Enter", async () => {
      const onSubmit = vi.fn();
      render(
        <CommentForm
          mode="create"
          initialAnchor={textAnchor}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />,
      );

      const textarea = screen.getByPlaceholderText("Write a comment...");
      fireEvent.change(textarea, { target: { value: "Quick comment" } });
      fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });

      await waitFor(() => {
        expect(mockReview.addComment).toHaveBeenCalled();
      });
    });

    it("switches between write and preview tabs", () => {
      render(
        <CommentForm
          mode="create"
          initialAnchor={textAnchor}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const textarea = screen.getByPlaceholderText("Write a comment...");
      fireEvent.change(textarea, { target: { value: "**bold text**" } });

      fireEvent.click(screen.getByText("Preview"));
      expect(screen.queryByPlaceholderText("Write a comment...")).not.toBeInTheDocument();
      expect(screen.getByText("bold text")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Write"));
      expect(screen.getByDisplayValue("**bold text**")).toBeInTheDocument();
    });

    it("shows 'Nothing to preview' when content is empty", () => {
      render(
        <CommentForm
          mode="create"
          initialAnchor={textAnchor}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("Preview"));
      expect(screen.getByText("Nothing to preview")).toBeInTheDocument();
    });

    it("shows keyboard hint", () => {
      render(
        <CommentForm
          mode="create"
          initialAnchor={textAnchor}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.getByText("Ctrl+Enter to submit")).toBeInTheDocument();
    });
  });
});

describe("CommentForm snapshots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("matches snapshot for create mode with text anchor", () => {
    const { container } = render(
      <CommentForm
        mode="create"
        initialAnchor={textAnchor}
        blockAnchor={blockAnchor}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("matches snapshot for reply mode", () => {
    const { container } = render(
      <CommentForm
        mode="reply"
        commentId="c1"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("matches snapshot for edit mode with initial content", () => {
    const { container } = render(
      <CommentForm
        mode="edit"
        commentId="c1"
        initialContent="Existing comment content"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
