export interface ReviewAnchor {
  scope: "text" | "block" | "document";
  exact: string;
  prefix: string;
  suffix: string;
  heading: string;
  blockIndex: number | null;
}

export interface ReviewReply {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface ReviewComment {
  id: string;
  anchor: ReviewAnchor;
  author: string;
  type: "question" | "suggestion" | "issue";
  status: "open" | "resolved";
  content: string;
  createdAt: string;
  replies: ReviewReply[];
}

export interface ReviewFile {
  documentPath: string;
  comments: ReviewComment[];
}

export interface PluginOptions {
  reviewsDir: string;
  defaultAuthor: string;
}
