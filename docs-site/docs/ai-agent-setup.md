---
sidebar_position: 4
---

# AI Agent Setup

The plugin can run an AI agent periodically to process open review comments automatically.

## How It Works

On each interval tick, the plugin:
1. Scans for open comments with no AI reply (or with new user replies since the last AI reply)
2. For each such comment, spawns your configured agent command
3. The agent reads the review file and the source `.md` file, then responds to the comment directly — editing the Markdown source if needed

## Configuration

Add a `reviewService` block to your plugin options:

```js
{
  reviewService: {
    intervalMs: 300000,       // How often to run (ms). Default: 300000 (5 minutes)
    agentCommand: '...',      // Shell command to invoke the agent
    agentPromptFile: '...',   // Path to a prompt file (optional)
    contextDirs: ['...'],     // Extra read-only directories for the agent (optional)
  }
}
```

### `agentCommand`

**Type:** `string | (ctx) => string`

The shell command used to invoke your AI agent. The plugin generates a prompt describing the document and comments to process.

**String form** — the command is used as-is. If the string contains `{prompt}`, the prompt is substituted inline. Otherwise the prompt is piped via stdin:

```js
agentCommand: 'claude --dangerously-skip-permissions'
```

**Function form** — called with a context object, returns the command string:

```js
agentCommand: ({ reviewsDir, docsDirs, contextDirs }) => {
  return `my-agent --reviews ${reviewsDir}`;
}
```

### `agentPromptFile`

**Type:** `string` (optional)

Path to a Markdown file used as a custom system prompt for the agent. If omitted, the plugin uses a built-in prompt.

### `contextDirs`

**Type:** `string[]` (optional)

Extra directories to pass to the agent as read-only context (e.g. a source code repository that your docs describe). Paths are relative to the site directory.

```js
contextDirs: ['../my-source-repo']
```

## Claude Code Example

To use Claude Code as the agent:

```js
{
  reviewService: {
    agentCommand: 'claude --dangerously-skip-permissions',
    contextDirs: ['../'],  // Include the repo root for context
  }
}
```

> **Security note:** `--dangerously-skip-permissions` allows Claude Code to edit files without prompting. Only use this locally and review the changes it makes before committing.

## Triggering Manually

To run the agent immediately without waiting for the next interval, use the **Run Now** button in the review comments panel in your browser.
