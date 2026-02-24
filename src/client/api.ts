import type { ReviewFile, ReviewComment, ReviewAnchor } from "../types";

const API_BASE = "/api/reviews";

export async function fetchComments(docPath: string): Promise<ReviewFile> {
  const res = await fetch(`${API_BASE}?doc=${encodeURIComponent(docPath)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch comments: ${res.statusText}`);
  }
  return res.json() as Promise<ReviewFile>;
}

export async function createComment(
  docPath: string,
  payload: {
    anchor: ReviewAnchor;
    content: string;
    type: ReviewComment["type"];
  },
): Promise<ReviewComment> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doc: docPath, ...payload }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create comment: ${res.statusText}`);
  }
  return res.json() as Promise<ReviewComment>;
}

export async function updateComment(
  commentId: string,
  payload: {
    doc: string;
    status?: ReviewComment["status"];
    content?: string;
    reply?: { author: string; content: string };
    editReply?: { replyId: string; content: string };
  },
): Promise<ReviewComment> {
  const res = await fetch(`${API_BASE}/${commentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to update comment: ${res.statusText}`);
  }
  return res.json() as Promise<ReviewComment>;
}

export async function deleteComment(
  commentId: string,
  docPath: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/${commentId}?doc=${encodeURIComponent(docPath)}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    throw new Error(`Failed to delete comment: ${res.statusText}`);
  }
}
