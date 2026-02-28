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

export interface Capabilities {
  hasTrigger: boolean;
  hasPrompt: boolean;
  hasGlobalPrompt: boolean;
  /** Polling interval in ms when hasTrigger is true */
  intervalMs?: number;
}

export async function fetchCapabilities(): Promise<Capabilities> {
  const res = await fetch(`${API_BASE}/capabilities`);
  if (!res.ok) {
    throw new Error(`Failed to fetch capabilities: ${res.statusText}`);
  }
  return res.json() as Promise<Capabilities>;
}

export async function triggerReview(): Promise<void> {
  const res = await fetch(`${API_BASE}/trigger`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Failed to trigger review: ${res.statusText}`);
  }
}

export async function fetchGlobalPrompt(): Promise<string> {
  const res = await fetch(`${API_BASE}/global-prompt`);
  if (!res.ok) {
    throw new Error(`Failed to fetch global prompt: ${res.statusText}`);
  }
  const data = await res.json() as { prompt: string };
  return data.prompt;
}

export async function fetchPrompt(docPath: string): Promise<string> {
  const res = await fetch(`${API_BASE}/prompt?doc=${encodeURIComponent(docPath)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch prompt: ${res.statusText}`);
  }
  const data = await res.json() as { prompt: string };
  return data.prompt;
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
