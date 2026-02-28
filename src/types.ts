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

export interface ContextDir {
  dir: string;
  desc?: string;
}

export interface AgentCommandContext {
  reviewsDir: string;  // absolute path to the reviews directory
  docsDirs: string[];  // absolute paths to all docs content directories
  contextDirs: ContextDir[];  // extra read-only dirs added via --add-dir (e.g. source code repos)
}

export type AgentCommandFn = (ctx: AgentCommandContext) => string;

export interface ReviewServiceOptions {
  enabled?: boolean;
  intervalMs?: number;
  // string: used as-is as the shell command
  // function: called with { reviewsDir, docsDirs, contextDirs }, returns the shell command string
  // In both cases: if the resolved command contains {prompt}, prompt is substituted inline;
  // otherwise prompt is piped via stdin.
  agentCommand?: string | AgentCommandFn;
  agentPromptFile?: string;
  // Extra directories to add as read-only context via --add-dir (e.g. a source code repo that
  // the docs describe). The site root (siteDir) is always included automatically.
  contextDirs?: Array<string | ContextDir>;
  // Extra environment variables to pass to the agent process (merged with process.env).
  env?: Record<string, string>;
}

export interface PluginOptions {
  reviewsDir: string;
  reviewerName: string;
  // Display name used as the author field on AI-generated replies. Defaults to "Claude".
  // Used both by the review service and by the prompt endpoints for manual agent use.
  agentName?: string;
  reviewService?: ReviewServiceOptions;
}
