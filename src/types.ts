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

export interface AgentCommandContext {
  reviewsDir: string;  // absolute path to the reviews directory
  docsDirs: string[];  // absolute paths to all docs content directories
}

export type AgentCommandFn = (ctx: AgentCommandContext) => string;

export interface ReviewServiceOptions {
  enabled?: boolean;
  intervalMs?: number;
  // string: used as-is as the shell command
  // function: called with { reviewsDir, docsDirs }, returns the shell command string
  // In both cases: if the resolved command contains {prompt}, prompt is substituted inline;
  // otherwise prompt is piped via stdin.
  // Default: a function that builds "claude --add-dir <reviewsDir> --add-dir <docsDir>... -p"
  agentCommand?: string | AgentCommandFn;
  agentPromptFile?: string;
}

export interface PluginOptions {
  reviewsDir: string;
  defaultAuthor: string;
  reviewService?: ReviewServiceOptions;
}
