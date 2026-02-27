# Review Service Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a review service to the plugin that periodically polls for open comments needing AI responses and spawns a configurable AI agent (e.g. Claude Code) to process them.

**Architecture:** `GET /api/reviews/pending` scans all `*.reviews.json` files and returns doc paths with open comments lacking an AI reply. A `startReviewService()` function starts a `setInterval` loop inside `setupMiddlewares` — each tick resolves the shell command via `agentCommand` (string or function), then pipes the prompt via stdin or `{prompt}` substitution. `agentCommand` as a function receives `{ reviewsDir: string, docsDirs: string[] }` and returns a shell command string — enabling users to inject `--add-dir` flags per directory. Path resolution uses a `routeBasePath → fsPath` map built from `siteConfig` at init time; `docsDirs` is derived from all values in that map.

**Tech Stack:** Node.js `child_process.spawn`, `node:fs/promises` glob, TypeScript, Vitest (node environment)

---

### Task 1: Add `ReviewServiceOptions` to types and options

**Files:**
- Modify: `src/types.ts`
- Modify: `src/options.ts`
- Modify: `src/__tests__/options.test.ts`

**Step 1: Write the failing test**

Add to `src/__tests__/options.test.ts` after the existing `describe` block:

```typescript
describe("validateOptions — reviewService", () => {
  it("accepts missing reviewService (optional)", () => {
    const result = callValidate({
      reviewsDir: "./.reviews",
      defaultAuthor: "reviewer",
    });
    expect(result.reviewService).toBeUndefined();
  });

  it("accepts empty reviewService object", () => {
    const result = callValidate({
      reviewsDir: "./.reviews",
      defaultAuthor: "reviewer",
      reviewService: {},
    });
    expect(result.reviewService).toEqual({});
  });

  it("accepts valid reviewService options with string agentCommand", () => {
    const result = callValidate({
      reviewsDir: "./.reviews",
      defaultAuthor: "reviewer",
      reviewService: {
        enabled: false,
        intervalMs: 30000,
        agentCommand: "my-agent -p",
        agentPromptFile: "/custom/AGENTS.md",
      },
    });
    expect(result.reviewService).toEqual({
      enabled: false,
      intervalMs: 30000,
      agentCommand: "my-agent -p",
      agentPromptFile: "/custom/AGENTS.md",
    });
  });

  it("accepts agentCommand as a function", () => {
    const fn = ({ reviewsDir, docsDirs }: { reviewsDir: string; docsDirs: string[] }) =>
      `claude --add-dir ${reviewsDir} ${docsDirs.map((d) => `--add-dir ${d}`).join(" ")} -p`;
    const result = callValidate({
      reviewsDir: "./.reviews",
      defaultAuthor: "reviewer",
      reviewService: { agentCommand: fn },
    });
    expect(typeof result.reviewService?.agentCommand).toBe("function");
  });

  it("throws when agentCommand is neither string nor function", () => {
    expect(() =>
      callValidate({
        reviewsDir: "./.reviews",
        defaultAuthor: "reviewer",
        reviewService: { agentCommand: 42 },
      }),
    ).toThrow("'reviewService.agentCommand' must be a string or function");
  });

  it("throws when reviewService.intervalMs is not a number", () => {
    expect(() =>
      callValidate({
        reviewsDir: "./.reviews",
        defaultAuthor: "reviewer",
        reviewService: { intervalMs: "fast" },
      }),
    ).toThrow("'reviewService.intervalMs' must be a positive number");
  });

  it("throws when reviewService.intervalMs is zero or negative", () => {
    expect(() =>
      callValidate({
        reviewsDir: "./.reviews",
        defaultAuthor: "reviewer",
        reviewService: { intervalMs: 0 },
      }),
    ).toThrow("'reviewService.intervalMs' must be a positive number");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test src/__tests__/options.test.ts
```

Expected: FAIL — `reviewService` field not recognized / validation not implemented

**Step 3: Add `ReviewServiceOptions` to `src/types.ts`**

Add after the `PluginOptions` interface:

```typescript
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
```

Then update `PluginOptions`:

```typescript
export interface PluginOptions {
  reviewsDir: string;
  defaultAuthor: string;
  reviewService?: ReviewServiceOptions;
}
```

**Step 4: Update `src/options.ts` to validate `reviewService`**

Replace the return statement with:

```typescript
import type { OptionValidationContext } from "@docusaurus/types";
import type { PluginOptions } from "./types";

export function validateOptions({
  options,
}: OptionValidationContext<PluginOptions, PluginOptions>): PluginOptions {
  if (!options.reviewsDir || typeof options.reviewsDir !== "string") {
    throw new Error(
      "docusaurus-plugin-review-comments: 'reviewsDir' option is required",
    );
  }
  if (!options.defaultAuthor || typeof options.defaultAuthor !== "string") {
    throw new Error(
      "docusaurus-plugin-review-comments: 'defaultAuthor' option is required",
    );
  }
  if (options.reviewService !== undefined) {
    const rs = options.reviewService;
    if (
      rs.intervalMs !== undefined &&
      (typeof rs.intervalMs !== "number" || rs.intervalMs <= 0)
    ) {
      throw new Error(
        "docusaurus-plugin-review-comments: 'reviewService.intervalMs' must be a positive number",
      );
    }
    if (
      rs.agentCommand !== undefined &&
      typeof rs.agentCommand !== "string" &&
      typeof rs.agentCommand !== "function"
    ) {
      throw new Error(
        "docusaurus-plugin-review-comments: 'reviewService.agentCommand' must be a string or function",
      );
    }
  }
  return options as PluginOptions;
}
```

**Step 5: Run test to verify it passes**

```bash
pnpm test src/__tests__/options.test.ts
```

Expected: PASS (all tests including the new reviewService tests)

**Step 6: Commit**

```bash
git add src/types.ts src/options.ts src/__tests__/options.test.ts
git commit -m "feat: add ReviewServiceOptions type and validation"
```

---

### Task 2: Add `GET /api/reviews/pending` endpoint

**Files:**
- Modify: `src/api/reviews.ts`
- Modify: `src/__tests__/reviews.test.ts`

**Step 1: Write the failing test**

Add a new `describe` block at the end of `src/__tests__/reviews.test.ts`:

```typescript
describe("GET /api/reviews/pending", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "reviews-pending-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function writeReview(
    relPath: string,
    data: ReviewFile,
  ): Promise<void> {
    const full = path.join(tmpDir, relPath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, JSON.stringify(data));
  }

  it("returns empty docs array when no review files exist", async () => {
    const app = makeApp(tmpDir);
    const res = await request(app, "GET", "/api/reviews/pending");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ docs: [] });
  });

  it("returns doc path for comment with no replies", async () => {
    await writeReview("docs/intro.reviews.json", {
      documentPath: "docs/intro",
      comments: [
        {
          id: "c1",
          anchor: sampleAnchor,
          author: "alice",
          type: "question",
          status: "open",
          content: "Why?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    });
    const app = makeApp(tmpDir);
    const res = await request(app, "GET", "/api/reviews/pending");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ docs: ["docs/intro"] });
  });

  it("returns doc path when last reply is not from ai", async () => {
    await writeReview("docs/guide.reviews.json", {
      documentPath: "docs/guide",
      comments: [
        {
          id: "c1",
          anchor: sampleAnchor,
          author: "alice",
          type: "question",
          status: "open",
          content: "How?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [
            {
              id: "r1",
              author: "ai",
              content: "Here is how...",
              createdAt: "2025-01-02T00:00:00.000Z",
            },
            {
              id: "r2",
              author: "alice",
              content: "Thanks, but what about X?",
              createdAt: "2025-01-03T00:00:00.000Z",
            },
          ],
        },
      ],
    });
    const app = makeApp(tmpDir);
    const res = await request(app, "GET", "/api/reviews/pending");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ docs: ["docs/guide"] });
  });

  it("excludes doc when last reply is from ai", async () => {
    await writeReview("docs/done.reviews.json", {
      documentPath: "docs/done",
      comments: [
        {
          id: "c1",
          anchor: sampleAnchor,
          author: "alice",
          type: "question",
          status: "open",
          content: "Done?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [
            {
              id: "r1",
              author: "ai",
              content: "Yes, done.",
              createdAt: "2025-01-02T00:00:00.000Z",
            },
          ],
        },
      ],
    });
    const app = makeApp(tmpDir);
    const res = await request(app, "GET", "/api/reviews/pending");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ docs: [] });
  });

  it("excludes resolved comments", async () => {
    await writeReview("docs/resolved.reviews.json", {
      documentPath: "docs/resolved",
      comments: [
        {
          id: "c1",
          anchor: sampleAnchor,
          author: "alice",
          type: "question",
          status: "resolved",
          content: "Old question",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    });
    const app = makeApp(tmpDir);
    const res = await request(app, "GET", "/api/reviews/pending");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ docs: [] });
  });

  it("returns each doc at most once even with multiple pending comments", async () => {
    await writeReview("docs/multi.reviews.json", {
      documentPath: "docs/multi",
      comments: [
        {
          id: "c1",
          anchor: sampleAnchor,
          author: "alice",
          type: "question",
          status: "open",
          content: "First?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
        {
          id: "c2",
          anchor: sampleAnchor,
          author: "bob",
          type: "issue",
          status: "open",
          content: "Second?",
          createdAt: "2025-01-02T00:00:00.000Z",
          replies: [],
        },
      ],
    });
    const app = makeApp(tmpDir);
    const res = await request(app, "GET", "/api/reviews/pending");
    expect(res.status).toBe(200);
    expect((res.body as { docs: string[] }).docs).toHaveLength(1);
    expect((res.body as { docs: string[] }).docs[0]).toBe("docs/multi");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test src/__tests__/reviews.test.ts
```

Expected: FAIL — `GET /api/reviews/pending` returns 404

**Step 3: Implement the endpoint in `src/api/reviews.ts`**

Add these imports at the top:

```typescript
import fs from "node:fs/promises";
import path from "node:path";
```

(Note: `path` is already imported — only add what's missing.)

Add the new endpoint **before** the `app.get("/api/reviews", ...)` handler (more specific routes must come first in Express):

```typescript
app.get("/api/reviews/pending", async (_req, res) => {
  const pendingDocs: string[] = [];

  let entries: string[];
  try {
    entries = await globReviewFiles(reviewsDir);
  } catch {
    res.json({ docs: [] });
    return;
  }

  for (const filePath of entries) {
    const reviewFile = await readReviewFile(filePath);
    const hasPending = reviewFile.comments.some((comment) => {
      if (comment.status !== "open") return false;
      if (comment.replies.length === 0) return true;
      const lastReply = comment.replies[comment.replies.length - 1]!;
      return lastReply.author !== "ai";
    });
    if (hasPending && reviewFile.documentPath) {
      pendingDocs.push(reviewFile.documentPath);
    }
  }

  res.json({ docs: pendingDocs });
});
```

Also add the `globReviewFiles` helper to `src/api/storage.ts`:

```typescript
export async function globReviewFiles(reviewsDir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries: import("node:fs/promises").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".reviews.json")) {
        results.push(full);
      }
    }
  }

  await walk(reviewsDir);
  return results;
}
```

Import it in `src/api/reviews.ts`:

```typescript
import {
  readReviewFile,
  resolveReviewFilePath,
  writeReviewFile,
  globReviewFiles,
} from "./storage";
```

**Step 4: Run test to verify it passes**

```bash
pnpm test src/__tests__/reviews.test.ts
```

Expected: PASS (all existing tests + new pending tests)

**Step 5: Commit**

```bash
git add src/api/reviews.ts src/api/storage.ts src/__tests__/reviews.test.ts
git commit -m "feat: add GET /api/reviews/pending endpoint"
```

---

### Task 3: Build `routeBasePath → fsPath` map from siteConfig

**Files:**
- Create: `src/service/pathMap.ts`
- Create: `src/__tests__/pathMap.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/pathMap.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildDocsPathMap, resolveDocSourcePath } from "../service/pathMap";
import type { DocusaurusConfig } from "@docusaurus/types";

function makeConfig(
  plugins: unknown[] = [],
  presets: unknown[] = [],
): DocusaurusConfig {
  return {
    plugins,
    presets,
  } as unknown as DocusaurusConfig;
}

describe("buildDocsPathMap", () => {
  it("returns empty map for empty config", () => {
    const map = buildDocsPathMap(makeConfig());
    expect(map.size).toBe(0);
  });

  it("reads plugin-content-docs from plugins array (tuple form)", () => {
    const map = buildDocsPathMap(
      makeConfig([
        [
          "@docusaurus/plugin-content-docs",
          { path: "docs", routeBasePath: "docs" },
        ],
      ]),
    );
    expect(map.get("docs")).toBe("docs");
  });

  it("uses default routeBasePath 'docs' when not specified", () => {
    const map = buildDocsPathMap(
      makeConfig([
        ["@docusaurus/plugin-content-docs", { path: "docs" }],
      ]),
    );
    expect(map.get("docs")).toBe("docs");
  });

  it("uses default path 'docs' when not specified", () => {
    const map = buildDocsPathMap(
      makeConfig([["@docusaurus/plugin-content-docs", {}]]),
    );
    expect(map.get("docs")).toBe("docs");
  });

  it("handles custom path and routeBasePath", () => {
    const map = buildDocsPathMap(
      makeConfig([
        [
          "@docusaurus/plugin-content-docs",
          { path: "api-content", routeBasePath: "api" },
        ],
      ]),
    );
    expect(map.get("api")).toBe("api-content");
  });

  it("reads plugin-content-docs from classic preset", () => {
    const map = buildDocsPathMap(
      makeConfig(
        [],
        [
          [
            "@docusaurus/preset-classic",
            { docs: { path: "docs", routeBasePath: "docs" } },
          ],
        ],
      ),
    );
    expect(map.get("docs")).toBe("docs");
  });

  it("handles multiple docs instances", () => {
    const map = buildDocsPathMap(
      makeConfig([
        ["@docusaurus/plugin-content-docs", { path: "docs", routeBasePath: "docs" }],
        [
          "@docusaurus/plugin-content-docs",
          { id: "community", path: "community", routeBasePath: "community" },
        ],
      ]),
    );
    expect(map.get("docs")).toBe("docs");
    expect(map.get("community")).toBe("community");
  });

  it("ignores non-docs plugins", () => {
    const map = buildDocsPathMap(
      makeConfig([["@docusaurus/plugin-content-blog", { path: "blog" }]]),
    );
    expect(map.size).toBe(0);
  });
});

describe("resolveDocSourcePath", () => {
  const siteDir = "/site";

  it("resolves documentPath using map", () => {
    const map = new Map([["docs", "docs"]]);
    expect(resolveDocSourcePath(siteDir, map, "docs/intro")).toBe(
      "/site/docs/intro.md",
    );
  });

  it("resolves with custom fsPath", () => {
    const map = new Map([["api", "api-content"]]);
    expect(resolveDocSourcePath(siteDir, map, "api/reference")).toBe(
      "/site/api-content/reference.md",
    );
  });

  it("falls back to documentPath directly when no map entry", () => {
    const map = new Map<string, string>();
    expect(resolveDocSourcePath(siteDir, map, "docs/intro")).toBe(
      "/site/docs/intro.md",
    );
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test src/__tests__/pathMap.test.ts
```

Expected: FAIL — `../service/pathMap` module not found

**Step 3: Create `src/service/pathMap.ts`**

```typescript
import path from "node:path";
import type { DocusaurusConfig } from "@docusaurus/types";

const DOCS_PLUGIN_NAME = "@docusaurus/plugin-content-docs";
const CLASSIC_PRESET_NAME = "@docusaurus/preset-classic";

interface DocsPluginOptions {
  path?: string;
  routeBasePath?: string;
  id?: string;
}

/**
 * Builds a map from URL routeBasePath to filesystem path for all
 * @docusaurus/plugin-content-docs instances found in siteConfig.
 */
export function buildDocsPathMap(
  siteConfig: DocusaurusConfig,
): Map<string, string> {
  const map = new Map<string, string>();

  // Scan plugins array
  for (const plugin of siteConfig.plugins ?? []) {
    extractFromPluginEntry(plugin, map);
  }

  // Scan presets array
  for (const preset of siteConfig.presets ?? []) {
    if (!Array.isArray(preset)) continue;
    const [presetName, presetOptions] = preset;
    if (
      typeof presetName === "string" &&
      presetName.includes("preset-classic") &&
      presetOptions &&
      typeof presetOptions === "object"
    ) {
      const opts = presetOptions as Record<string, unknown>;
      if (opts.docs && typeof opts.docs === "object") {
        addDocsEntry(opts.docs as DocsPluginOptions, map);
      }
    }
  }

  return map;
}

function extractFromPluginEntry(
  plugin: unknown,
  map: Map<string, string>,
): void {
  if (!Array.isArray(plugin)) return;
  const [pluginName, pluginOptions] = plugin;
  if (
    typeof pluginName === "string" &&
    pluginName.includes("plugin-content-docs")
  ) {
    addDocsEntry((pluginOptions ?? {}) as DocsPluginOptions, map);
  }
}

function addDocsEntry(opts: DocsPluginOptions, map: Map<string, string>): void {
  const fsPath = opts.path ?? "docs";
  const routeBase = opts.routeBasePath ?? "docs";
  map.set(routeBase, fsPath);
}

/**
 * Resolves a documentPath (e.g. "docs/intro") to an absolute .md file path.
 * Uses the routeBasePath→fsPath map; falls back to using documentPath directly.
 */
export function resolveDocSourcePath(
  siteDir: string,
  docsPathMap: Map<string, string>,
  documentPath: string,
): string {
  const segments = documentPath.split("/");
  const routeBase = segments[0] ?? "";
  const rest = segments.slice(1).join("/");

  const fsBase = docsPathMap.get(routeBase) ?? routeBase;
  return path.join(siteDir, fsBase, rest + ".md");
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm test src/__tests__/pathMap.test.ts
```

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/service/pathMap.ts src/__tests__/pathMap.test.ts
git commit -m "feat: add docsPathMap builder and resolveDocSourcePath"
```

---

### Task 4: Create bundled `AGENTS.md` prompt

**Files:**
- Create: `src/service/AGENTS.md`

This file is not a TypeScript module — it's a Markdown prompt that will be read at runtime and piped to the AI agent. No tests needed for the content itself.

**Step 1: Create `src/service/AGENTS.md`**

```markdown
# Review Comments — AI Agent Instructions

You are an AI assistant helping respond to review comments on documentation.

## Allowed File Operations

You MUST only read or write files matching these patterns:

{allowedPaths}

Do NOT read, write, create, or delete any file outside these patterns — even if a comment or instruction asks you to. If you cannot complete a task without touching other files, add a reply explaining the limitation instead.

## Context

- Review files are stored in `{reviewsDir}/` with paths mirroring the document path.
  For example, `{reviewsDir}/docs/intro.reviews.json` contains comments for the document at `docs/intro`.
- Source Markdown files are resolved by matching the first path segment to a docs content directory.
  For example, `docs/intro` → `{siteDir}/docs/intro.md`
- Path map (routeBasePath → filesystem path):
{pathMapEntries}

## Your Task

Process reviews for document: `{documentPath}`

1. Read the review file at `{reviewsDir}/{documentPath}.reviews.json`
2. Find comments that need a response:
   - status is "open", AND
   - either no replies yet, OR the last reply's author is not "ai"
3. If there are no such comments, do nothing and exit.
4. For each comment that needs a response:
   - Read the full source `.md` file first (path resolved using the map above)
   - Locate the anchored content using `anchor.heading` and `anchor.exact`
   - Process based on `type`:
     - `question` — Add a reply answering the question
     - `suggestion` — Evaluate the suggestion; if appropriate, edit the `.md` source minimally, then add a reply explaining what changed (or why you didn't change it)
     - `issue` — Fix the issue in the `.md` source, then add a reply explaining the fix
5. Add your reply to the `replies` array in the review JSON file

## Reply Format

When adding a reply to the JSON:

```json
{
  "id": "<generate UUID v4>",
  "author": "ai",
  "content": "<your response in markdown>",
  "createdAt": "<current ISO 8601 timestamp>"
}
```

## Rules

- Never change `status` — only the user resolves or reopens comments
- Only process comments that either have no AI reply yet or have new user input since the last AI reply
- Always read the full `.md` file before responding to any comment on it
- Keep replies concise and directly address the comment
- When modifying `.md` source, make minimal targeted edits
- Preserve the existing JSON structure; only modify the specific comment being addressed
```

**Step 2: Update `tsconfig.json` to include `.md` files in build output**

Check `tsconfig.json` — the AGENTS.md needs to be copied to `lib/service/AGENTS.md` during build. Since `tsc` only copies `.ts` files, add a postbuild copy step to `package.json`:

In `package.json`, update the `build` script:

```json
"build": "tsc && cp src/service/AGENTS.md lib/service/AGENTS.md"
```

**Step 3: Commit**

```bash
git add src/service/AGENTS.md package.json
git commit -m "feat: add bundled AGENTS.md prompt for review service"
```

---

### Task 5: Create `src/service/index.ts` — the review service

**Files:**
- Create: `src/service/index.ts`
- Create: `src/__tests__/service.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/service.test.ts`:

```typescript
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import * as childProcess from "node:child_process";
import { startReviewService } from "../service/index";
import type { DocusaurusConfig } from "@docusaurus/types";

vi.mock("node:child_process");

function makeConfig(): DocusaurusConfig {
  return {
    plugins: [
      ["@docusaurus/plugin-content-docs", { path: "docs", routeBasePath: "docs" }],
    ],
    presets: [],
  } as unknown as DocusaurusConfig;
}

describe("startReviewService", () => {
  let siteDir: string;
  let reviewsDir: string;
  let spawnMock: MockInstance;

  beforeEach(async () => {
    siteDir = await fs.mkdtemp(path.join(os.tmpdir(), "review-service-site-"));
    reviewsDir = path.join(siteDir, "reviews");
    await fs.mkdir(reviewsDir, { recursive: true });

    // Mock spawn to return a fake child process
    const fakeChild = {
      stdin: { write: vi.fn(), end: vi.fn() },
      on: vi.fn(),
    };
    spawnMock = vi.spyOn(childProcess, "spawn").mockReturnValue(
      fakeChild as unknown as ReturnType<typeof childProcess.spawn>,
    );

    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await fs.rm(siteDir, { recursive: true, force: true });
  });

  it("returns a stop function", () => {
    const stop = startReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
    });
    expect(typeof stop).toBe("function");
    stop();
  });

  it("does not spawn agent when no pending reviews", async () => {
    startReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
    });

    await vi.runAllTimersAsync();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("spawns agent for each pending doc using default command (function)", async () => {
    const reviewFile = {
      documentPath: "docs/intro",
      comments: [
        {
          id: "c1",
          anchor: { scope: "document" },
          author: "alice",
          type: "question",
          status: "open",
          content: "Why?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    };
    const filePath = path.join(reviewsDir, "docs/intro.reviews.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(reviewFile));

    startReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
    });

    await vi.runAllTimersAsync();
    expect(spawnMock).toHaveBeenCalledTimes(1);

    const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(cmd).toBe("sh");
    expect(args[0]).toBe("-c");
    // Default command includes --add-dir for reviewsDir and docsDirs
    expect(args[1]).toContain("--add-dir");
    expect(args[1]).toContain(reviewsDir);
    expect(args[1]).toContain("claude");
    expect(args[1]).toContain("-p");
  });

  it("uses custom agentCommand string (stdin mode)", async () => {
    const reviewFile = {
      documentPath: "docs/guide",
      comments: [
        {
          id: "c1",
          anchor: { scope: "document" },
          author: "bob",
          type: "issue",
          status: "open",
          content: "Bug here",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    };
    const filePath = path.join(reviewsDir, "docs/guide.reviews.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(reviewFile));

    startReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
      agentCommand: "my-custom-agent --flag",
    });

    await vi.runAllTimersAsync();
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(cmd).toBe("sh");
    expect(args[1]).toContain("my-custom-agent --flag");
  });

  it("calls agentCommand function with reviewsDir and docsDirs", async () => {
    const reviewFile = {
      documentPath: "docs/fn-test",
      comments: [
        {
          id: "c1",
          anchor: { scope: "document" },
          author: "alice",
          type: "question",
          status: "open",
          content: "Fn?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    };
    const filePath = path.join(reviewsDir, "docs/fn-test.reviews.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(reviewFile));

    const capturedCtx: { reviewsDir: string; docsDirs: string[] }[] = [];
    const agentCommand = (ctx: { reviewsDir: string; docsDirs: string[] }) => {
      capturedCtx.push(ctx);
      return `my-agent --dir ${ctx.reviewsDir} -p`;
    };

    startReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
      agentCommand,
    });

    await vi.runAllTimersAsync();
    expect(capturedCtx).toHaveLength(1);
    expect(capturedCtx[0]!.reviewsDir).toBe(reviewsDir);
    expect(Array.isArray(capturedCtx[0]!.docsDirs)).toBe(true);
    // makeConfig has docs → "docs", so docsDirs should include siteDir/docs
    expect(capturedCtx[0]!.docsDirs[0]).toContain("docs");
  });

  it("uses {prompt} placeholder mode when agentCommand string contains {prompt}", async () => {
    const reviewFile = {
      documentPath: "docs/opencode",
      comments: [
        {
          id: "c1",
          anchor: { scope: "document" },
          author: "bob",
          type: "question",
          status: "open",
          content: "How?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    };
    const filePath = path.join(reviewsDir, "docs/opencode.reviews.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(reviewFile));

    const fakeChildNoStdin = { on: vi.fn() };
    spawnMock.mockReturnValue(
      fakeChildNoStdin as unknown as ReturnType<typeof childProcess.spawn>,
    );

    startReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
      agentCommand: "opencode run {prompt}",
    });

    await vi.runAllTimersAsync();
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(cmd).toBe("sh");
    expect(args[1]).not.toContain("{prompt}");
    expect(args[1]).toContain("opencode run");
  });

  it("respects custom intervalMs", async () => {
    startReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
      intervalMs: 5000,
    });

    // Advance less than interval — no tick
    await vi.advanceTimersByTimeAsync(4999);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("injects auto-computed allowedPaths into prompt", async () => {
    const reviewFile = {
      documentPath: "docs/security",
      comments: [
        {
          id: "c1",
          anchor: { scope: "document" },
          author: "alice",
          type: "question",
          status: "open",
          content: "Safe?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    };
    const filePath = path.join(reviewsDir, "docs/security.reviews.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(reviewFile));

    // Capture what gets written to stdin
    const writtenChunks: string[] = [];
    const fakeChild = {
      stdin: {
        write: vi.fn((chunk: string) => writtenChunks.push(chunk)),
        end: vi.fn(),
      },
      on: vi.fn(),
    };
    spawnMock.mockReturnValue(
      fakeChild as unknown as ReturnType<typeof childProcess.spawn>,
    );

    startReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(), // has docs → "docs" mapping
    });

    await vi.runAllTimersAsync();
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const written = writtenChunks.join("");
    // reviewsDir path injected
    expect(written).toContain(reviewsDir);
    // docs fsPath injected
    expect(written).toContain("docs");
    // must not contain raw placeholder
    expect(written).not.toContain("{allowedPaths}");
  });

  it("does not spawn a second agent for a doc already in progress", async () => {
    const reviewFile = {
      documentPath: "docs/in-progress",
      comments: [
        {
          id: "c1",
          anchor: { scope: "document" },
          author: "alice",
          type: "question",
          status: "open",
          content: "Q?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    };
    const filePath = path.join(reviewsDir, "docs/in-progress.reviews.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(reviewFile));

    // Simulate a long-running agent: capture the "close" callback but never call it
    let closeCallback: (() => void) | undefined;
    const fakeChild = {
      stdin: { write: vi.fn(), end: vi.fn() },
      on: vi.fn((event: string, cb: () => void) => {
        if (event === "close") closeCallback = cb;
      }),
    };
    spawnMock.mockReturnValue(
      fakeChild as unknown as ReturnType<typeof childProcess.spawn>,
    );

    startReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
      intervalMs: 1000,
    });

    // First tick — agent spawned, close not called yet
    await vi.advanceTimersByTimeAsync(1000);
    expect(spawnMock).toHaveBeenCalledTimes(1);

    // Second tick — same doc still in progress, should not spawn again
    await vi.advanceTimersByTimeAsync(1000);
    expect(spawnMock).toHaveBeenCalledTimes(1);

    // Simulate agent finishing
    closeCallback?.();

    // Third tick — doc no longer in progress, should spawn again
    await vi.advanceTimersByTimeAsync(1000);
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });

  it("stop() clears the interval", async () => {
    const reviewFile = {
      documentPath: "docs/stop-test",
      comments: [
        {
          id: "c1",
          anchor: { scope: "document" },
          author: "alice",
          type: "question",
          status: "open",
          content: "Q?",
          createdAt: "2025-01-01T00:00:00.000Z",
          replies: [],
        },
      ],
    };
    const filePath = path.join(reviewsDir, "docs/stop-test.reviews.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(reviewFile));

    const stop = startReviewService({
      siteDir,
      reviewsDir,
      siteConfig: makeConfig(),
      intervalMs: 1000,
    });

    await vi.advanceTimersByTimeAsync(1000);
    expect(spawnMock).toHaveBeenCalledTimes(1);

    stop();
    spawnMock.mockClear();

    await vi.advanceTimersByTimeAsync(5000);
    expect(spawnMock).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test src/__tests__/service.test.ts
```

Expected: FAIL — `../service/index` module not found

**Step 3: Create `src/service/index.ts`**

```typescript
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import type { DocusaurusConfig } from "@docusaurus/types";
import { globReviewFiles, readReviewFile } from "../api/storage";
import { buildDocsPathMap } from "./pathMap";
import type { AgentCommandFn } from "../types";

const DEFAULT_INTERVAL_MS = 300_000; // 5 minutes — gives agent time to finish before next tick

function defaultAgentCommand({ reviewsDir, docsDirs }: { reviewsDir: string; docsDirs: string[] }): string {
  const addDirs = [reviewsDir, ...docsDirs]
    .map((d) => `--add-dir ${d}`)
    .join(" ");
  return `claude ${addDirs} -p`;
}

export interface ReviewServiceConfig {
  siteDir: string;
  reviewsDir: string;
  siteConfig: DocusaurusConfig;
  intervalMs?: number;
  agentCommand?: string | AgentCommandFn;
  agentPromptFile?: string;
}

/**
 * Starts the periodic review service. Returns a stop() function.
 */
export function startReviewService(config: ReviewServiceConfig): () => void {
  const {
    siteDir,
    reviewsDir,
    siteConfig,
    intervalMs = DEFAULT_INTERVAL_MS,
    agentCommand = defaultAgentCommand,
    agentPromptFile,
  } = config;

  const docsPathMap = buildDocsPathMap(siteConfig);
  // Compute docsDirs once: absolute paths of all docs content directories
  const docsDirs = Array.from(docsPathMap.values()).map((fsPath) =>
    path.join(siteDir, fsPath),
  );

  // Track docs currently being processed to prevent concurrent writes to the same file
  const inProgress = new Set<string>();

  const intervalId = setInterval(() => {
    void runTick(siteDir, reviewsDir, docsPathMap, docsDirs, agentCommand, agentPromptFile, inProgress);
  }, intervalMs);

  return () => clearInterval(intervalId);
}

async function runTick(
  siteDir: string,
  reviewsDir: string,
  docsPathMap: Map<string, string>,
  docsDirs: string[],
  agentCommand: string | AgentCommandFn,
  agentPromptFile: string | undefined,
  inProgress: Set<string>,
): Promise<void> {
  const pendingDocs = await collectPendingDocs(reviewsDir);
  if (pendingDocs.length === 0) return;

  // Resolve agentCommand to a string once per tick
  const resolvedCommand =
    typeof agentCommand === "function"
      ? agentCommand({ reviewsDir, docsDirs })
      : agentCommand;

  const promptTemplate = await loadPromptTemplate(agentPromptFile);

  for (const documentPath of pendingDocs) {
    // Skip docs already being processed by a previous tick's agent
    if (inProgress.has(documentPath)) continue;

    const prompt = buildPrompt(
      promptTemplate,
      siteDir,
      reviewsDir,
      docsPathMap,
      documentPath,
    );
    inProgress.add(documentPath);
    spawnAgent(resolvedCommand, prompt, siteDir, () => inProgress.delete(documentPath));
  }
}

async function collectPendingDocs(reviewsDir: string): Promise<string[]> {
  const pendingDocs: string[] = [];
  let files: string[];
  try {
    files = await globReviewFiles(reviewsDir);
  } catch {
    return [];
  }

  for (const filePath of files) {
    const reviewFile = await readReviewFile(filePath);
    const hasPending = reviewFile.comments.some((comment) => {
      if (comment.status !== "open") return false;
      if (comment.replies.length === 0) return true;
      const lastReply = comment.replies[comment.replies.length - 1]!;
      return lastReply.author !== "ai";
    });
    if (hasPending && reviewFile.documentPath) {
      pendingDocs.push(reviewFile.documentPath);
    }
  }

  return pendingDocs;
}

async function loadPromptTemplate(
  agentPromptFile: string | undefined,
): Promise<string> {
  const filePath =
    agentPromptFile ?? path.join(__dirname, "AGENTS.md");
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

function buildPrompt(
  template: string,
  siteDir: string,
  reviewsDir: string,
  docsPathMap: Map<string, string>,
  documentPath: string,
): string {
  const pathMapEntries =
    docsPathMap.size === 0
      ? "  (none configured — using documentPath prefix as-is)"
      : Array.from(docsPathMap.entries())
          .map(([route, fsPath]) => `  ${route} → ${fsPath}`)
          .join("\n");

  // Compute allowed paths automatically from reviewsDir + docsPathMap
  const allowedPaths = [
    `${reviewsDir}/**/*.reviews.json`,
    ...Array.from(docsPathMap.values()).map((fsPath) => `${siteDir}/${fsPath}/**/*.md`),
  ];
  const allowedPathsText = allowedPaths.map((p) => `- ${p}`).join("\n");

  return template
    .replace(/\{reviewsDir\}/g, reviewsDir)
    .replace(/\{siteDir\}/g, siteDir)
    .replace(/\{pathMapEntries\}/g, pathMapEntries)
    .replace(/\{documentPath\}/g, documentPath)
    .replace(/\{allowedPaths\}/g, allowedPathsText);
}

function spawnAgent(
  agentCommand: string,
  prompt: string,
  cwd: string,
  onDone: () => void,
): void {
  // If agentCommand contains {prompt}, substitute it inline (e.g. "opencode run {prompt}").
  // Otherwise pipe prompt via stdin (e.g. "claude -p", "gemini", "amp -x").
  if (agentCommand.includes("{prompt}")) {
    const cmd = agentCommand.replace(
      /\{prompt\}/g,
      prompt.replace(/'/g, "'\\''"),
    );
    const child = spawn("sh", ["-c", cmd], {
      cwd,
      stdio: "inherit",
    });
    child.on("error", (err) => {
      console.error("[review-service] Failed to spawn agent:", err.message);
    });
    child.on("close", onDone);
  } else {
    const child = spawn("sh", ["-c", agentCommand], {
      cwd,
      stdio: ["pipe", "inherit", "inherit"],
    });
    child.stdin.write(prompt);
    child.stdin.end();
    child.on("error", (err) => {
      console.error("[review-service] Failed to spawn agent:", err.message);
    });
    child.on("close", onDone);
  }
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm test src/__tests__/service.test.ts
```

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/service/index.ts src/__tests__/service.test.ts
git commit -m "feat: implement startReviewService with periodic agent invocation"
```

---

### Task 6: Wire review service into plugin

**Files:**
- Modify: `src/index.ts`

No new tests needed — the wiring is a thin integration layer. The service itself is tested in Task 5.

**Step 1: Update `src/index.ts`**

Replace the entire file:

```typescript
import type { LoadContext, Plugin } from "@docusaurus/types";
import type { PluginOptions } from "./types";
import path from "node:path";
import { createReviewsMiddleware } from "./api/reviews";
import { startReviewService } from "./service/index";
// AgentCommandFn is re-exported from types so users can import it for type annotations

export { validateOptions } from "./options";

export default function pluginReviewComments(
  context: LoadContext,
  options: PluginOptions,
): Plugin {
  const resolvedReviewsDir = path.resolve(context.siteDir, options.reviewsDir);

  return {
    name: "docusaurus-plugin-review-comments",

    getThemePath() {
      return path.resolve(__dirname, "./theme");
    },

    getClientModules() {
      return [path.resolve(__dirname, "./client/styles.css")];
    },

    getPathsToWatch() {
      return [`${resolvedReviewsDir}/**/*.reviews.json`];
    },

    configureWebpack() {
      return {
        devServer: {
          setupMiddlewares(middlewares: unknown[], devServer: unknown) {
            const app = (devServer as { app: import("express").Express }).app;
            createReviewsMiddleware(app, resolvedReviewsDir, options.defaultAuthor);

            const rs = options.reviewService;
            if (rs?.enabled !== false) {
              startReviewService({
                siteDir: context.siteDir,
                reviewsDir: resolvedReviewsDir,
                siteConfig: context.siteConfig,
                intervalMs: rs?.intervalMs,
                agentCommand: rs?.agentCommand,
                agentPromptFile: rs?.agentPromptFile,
              });
            }

            return middlewares;
          },
        },
      };
    },
  };
}
```

**Step 2: Run all tests**

```bash
pnpm test
```

Expected: All PASS

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: no errors

**Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: wire review service into plugin setupMiddlewares"
```

---

### Task 7: Build and verify

**Step 1: Run the build**

```bash
pnpm build
```

Expected: TypeScript compiles successfully, `lib/` directory populated

**Step 2: Verify AGENTS.md is copied**

```bash
ls lib/service/
```

Expected: `AGENTS.md  index.js  index.d.ts  pathMap.js  pathMap.d.ts`

If `AGENTS.md` is missing, the copy step in `package.json` didn't work. Check that the build script is `"tsc && cp src/service/AGENTS.md lib/service/AGENTS.md"`.

**Step 3: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: ensure AGENTS.md is included in build output"
```
