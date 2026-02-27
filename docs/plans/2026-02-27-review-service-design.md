# Review Service Design

**Date:** 2026-02-27
**Status:** Approved

## Overview

Add a review service to `docusaurus-plugin-review-comments` that periodically checks for open review comments needing AI responses and invokes a configurable AI agent (e.g. Claude Code) to process them.

## Architecture

The service starts inside the existing `configureWebpack.devServer.setupMiddlewares` hook in `src/index.ts`, alongside `createReviewsMiddleware`. A `startReviewService(options)` function sets up a `setInterval` loop. Each tick:

1. Calls `GET /api/reviews/pending` — a new endpoint returning docs with open comments needing AI response
2. For each pending doc path, pipes a composed prompt to the configured `agentCommand` via stdin

The service only runs during `docusaurus start` (devServer) by default.

## New API Endpoint: `GET /api/reviews/pending`

Returns document paths that have at least one open comment needing an AI response.

**Needs-AI-response criteria:** comment has `status: "open"` AND (no replies OR last reply's `author` is not `"ai"`).

**Response:**
```json
{ "docs": ["docs/intro", "docs/advanced/architecture"] }
```

The endpoint scans all `*.reviews.json` files in `reviewsDir` and filters using the above criteria. The AI agent itself also validates before acting (per its prompt instructions).

## Path Resolution

At plugin init time, the service reads `context.siteConfig` to build a `routeBasePath → fsPath` map by scanning `@docusaurus/plugin-content-docs` instances from both `siteConfig.plugins` and `siteConfig.presets`.

Example map:
```
"docs"      → "docs"        (default instance)
"api"       → "api-content" (custom path)
```

Given `documentPath: "docs/intro"`:
- Split on `/`, first segment = `"docs"`
- Look up `"docs"` in map → fs path = `"docs"`
- Source file = `siteDir/docs/intro.md`

`siteDir` comes from `context.siteDir` — no user configuration needed.

## Agent Invocation

For each pending doc, the service runs:

```bash
echo "<prompt>" | <agentCommand>
```

The prompt combines:
1. The AGENTS.md content (with `{reviewsDir}` and `{siteDir}` substituted)
2. A directive: `Process reviews for document: <documentPath>`

The subprocess runs with `cwd` set to `siteDir`.

## Bundled AGENTS.md

Stored at `src/service/AGENTS.md`. Adapted for this project's structure:

- Reviews in `{reviewsDir}/` (e.g. `reviews/`)
- Source docs resolved via the path map above
- Same comment-processing logic as tiger's AGENTS.md:
  - `question` → add AI reply
  - `suggestion` → evaluate + optionally edit source + add reply
  - `issue` → fix source + add reply
- Never changes `status` — only users resolve comments
- Reply format: `{ id, author: "ai", content, createdAt }`

## Plugin Options

New `reviewService` option added to `PluginOptions`:

```ts
interface ReviewServiceOptions {
  enabled?: boolean;        // default: true (devServer only)
  intervalMs?: number;      // default: 60000 (1 minute)
  agentCommand?: string;    // default: "claude --dangerously-skip-permissions -p"
  agentPromptFile?: string; // path to custom AGENTS.md; default: bundled src/service/AGENTS.md
}

interface PluginOptions {
  reviewsDir: string;
  defaultAuthor: string;
  reviewService?: ReviewServiceOptions; // optional, all sub-fields optional
}
```

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/options.ts` | Add `reviewService` option with defaults and validation |
| `src/types.ts` | Add `ReviewServiceOptions` interface |
| `src/service/AGENTS.md` | New: bundled AI agent prompt |
| `src/service/index.ts` | New: `startReviewService()` function |
| `src/api/reviews.ts` | Add `GET /api/reviews/pending` endpoint |
| `src/index.ts` | Wire `startReviewService()` into `setupMiddlewares` |

## Testing

- Unit tests for `GET /api/reviews/pending` filtering logic
- Unit tests for path resolution (routeBasePath → fsPath map)
- Unit tests for prompt composition (template substitution)
- Integration: mock `child_process.spawn` to verify agent is invoked with correct args
