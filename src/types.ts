export interface TextAnchor {
  scope: "text";
  exact: string;
  prefix?: string;
  suffix?: string;
}

export interface BlockAnchor {
  scope: "block";
  exact: string;
  heading: string;
  blockIndex: number | null;
}

export interface DocumentAnchor {
  scope: "document";
}

export type ReviewAnchor = TextAnchor | BlockAnchor | DocumentAnchor;

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
