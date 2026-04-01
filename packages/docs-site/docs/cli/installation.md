---
sidebar_position: 2
---

# Installation & Usage

## Prerequisites

- Node.js 18 or later

## Install

```bash
npm install -g @mdreview/cli
```

Or use it without installing via `npx`:

```bash
npx @mdreview/cli ./docs
```

## Usage

```
mdreview [path] [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `path` | Directory or `.md`/`.mdx` file to review. Defaults to `.` (current directory). |

### Options

| Option | Description |
|--------|-------------|
| `--reviews-dir <dir>` | Where to store `.reviews.json` files. Default: `~/.mdreview/reviews/<project>/` |
| `--user <name>` | Reviewer name. Defaults to your OS username. |
| `--port <number>` | Server port. Default: `4100` (auto-increments if busy). |
| `--no-open` | Don't auto-open the browser. |
| `-h, --help` | Show help. |

### Agent Options

| Option | Description |
|--------|-------------|
| `--agent` | Enable AI review service. |
| `--agent-command <cmd>` | Shell command to invoke the agent. Default: `"claude -p"`. Use `{prompt}` for inline substitution; otherwise prompt is piped via stdin. |
| `--agent-name <name>` | Agent display name. Default: `"Claude"`. |
| `--agent-prompt-file <path>` | Path to a custom prompt template file. |
| `--interval <ms>` | Auto-review polling interval in milliseconds. Default: `300000` (5 minutes). |
| `--context-dir <dir>` | Extra read-only context directory for the agent. Can be repeated. |

## Examples

Review the current directory:

```bash
mdreview
```

Review a specific docs folder with a custom reviewer name:

```bash
mdreview ./docs --user "Alice"
```

Review a single file:

```bash
mdreview ./docs/getting-started.md
```

Start with AI agent enabled:

```bash
mdreview ./docs --agent
```

Use a custom port and skip browser auto-open:

```bash
mdreview ./docs --port 8080 --no-open
```

## Review Storage

By default, reviews are stored in `~/.mdreview/reviews/<project>/`, where `<project>` is a namespace derived from your project's root directory. This keeps reviews separate per project without polluting your source tree.

To store reviews alongside your docs instead:

```bash
mdreview ./docs --reviews-dir ./reviews
```
