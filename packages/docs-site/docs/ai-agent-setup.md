---
sidebar_position: 4
---

# AI Agent Setup

The plugin can run an AI agent periodically to process open comments automatically.

## How It Works

On each interval tick, the plugin:
1. Scans for open comments with no AI reply (or with new user replies since the last AI reply)
2. For each such comment, spawns your configured agent command
3. The agent reads the review file and the source `.md` file, then responds to the comment directly — editing the Markdown source if needed

## Configuration

Add a `reviewService` block to your plugin options:

```ts
interface ReviewServiceOptions {
  enabled?: boolean;
  intervalMs?: number;
  agentCommand?: string | ((ctx: AgentCommandContext) => string);
  agentPromptFile?: string;
  contextDirs?: Array<string | { dir: string; desc?: string }>;
}
```

Example configuration:

```js
{
  reviewService: {
    intervalMs: 300000,       // How often to run (ms). Default: 300000 (5 minutes)
    agentCommand: '...',      // Shell command to invoke the agent
    agentPromptFile: '...',   // Path to a prompt file (optional)
    contextDirs: [             // Extra read-only directories for the agent (optional)
      { dir: '...', desc: '...' },
    ],
  }
}
```

### `agentCommand`

**Type:** `string | (ctx) => string`

The shell command used to invoke your AI agent. The plugin generates a prompt describing the document and comments to process.

**Recommended (safe) — Function form:**

This is the default implementation used in the plugin source code (see `src/service/index.ts:32`):

```js
agentCommand: ({ reviewsDir, docsDirs, contextDirs }) => {
  // --allowedTools grants edit permission scoped to reviewsDir and docsDirs
  const allowedTools = [
    `Edit(//${reviewsDir.slice(1)}/**)`,
    ...docsDirs.map(d => `Edit(//${d.slice(1)}/**)`),
    'Read'
  ].join(',');

  // --add-dir expands the MCP filesystem context to extra read-only directories
  const addDirs = contextDirs.map(d => `--add-dir ${d.dir}`).join(' ');

  return `claude --allowedTools "${allowedTools}"${addDirs ? ' ' + addDirs : ''} -p`;
}
```

This configuration:
- Uses `--allowedTools` to restrict Claude Code's edit permissions to only the reviews directory and docs directories
- Includes `--add-dir` flags to provide read-only access to additional context directories
- Uses the `-p` flag to pipe the prompt via stdin
- Claude Code will still prompt you for file operations within the allowed directories

**String form** — the command is used as-is. If the string contains `{prompt}`, the prompt is substituted inline. Otherwise the prompt is piped via stdin:

```js
agentCommand: 'claude'
```

**For automated environments only:**

```js
agentCommand: 'claude --dangerously-skip-permissions'
```

> **Warning:** The `--dangerously-skip-permissions` flag bypasses permission prompts. Only use this in trusted, automated environments (like CI) and always review changes before committing.

### `agentPromptFile`

**Type:** `string` (optional)

Path to a Markdown file used as a custom system prompt for the agent. If omitted, the plugin uses a built-in prompt.

### `contextDirs`

**Type:** `{ dir: string; desc?: string }[]` (optional)

Extra directories to pass to the agent as read-only context (e.g. a source code repository that your docs describe). Paths are relative to the site directory. The optional `desc` field is included in the agent prompt so the agent understands what each directory contains.

```js
contextDirs: [
  { dir: '../my-source-repo', desc: 'plugin source code' },
]
```

## Claude Code Example

To use Claude Code as the agent with safe defaults:

```js
{
  reviewService: {
    agentCommand: 'claude',
    contextDirs: [{ dir: '../', desc: 'plugin source code' }],
  }
}
```

For automated workflows where you want to skip permission prompts:

```js
{
  reviewService: {
    agentCommand: 'claude --dangerously-skip-permissions',
    contextDirs: [{ dir: '../', desc: 'plugin source code' }],
  }
}
```

> **Security note:** `--dangerously-skip-permissions` allows Claude Code to edit files without prompting. Only use this locally and review the changes it makes before committing.

## Triggering Manually

To run the agent immediately without waiting for the next interval, use the **Run Now** button in the mdreview panel in your browser.
