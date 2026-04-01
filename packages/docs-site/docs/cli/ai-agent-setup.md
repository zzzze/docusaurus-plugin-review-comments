---
sidebar_position: 4
---

# AI Agent Setup

The CLI can run an AI agent to automatically process open comments — answering questions, applying suggestions, or fixing issues in your markdown files.

## Enabling the Agent

Pass the `--agent` flag:

```bash
mdreview ./docs --agent
```

Or set `agent: true` in your config file.

By default, this uses `claude -p` as the agent command. Make sure Claude Code is installed and available on your `PATH`.

## How It Works

On each interval tick (default: every 5 minutes), the CLI:

1. Scans for open comments with no AI reply (or with new user replies since the last AI response)
2. Spawns your configured agent command for each such comment
3. The agent reads the review file and the source markdown, then responds — editing the file if needed

## Customizing the Agent

### Use a different command

```bash
mdreview ./docs --agent --agent-command "my-ai-tool --stdin"
```

If the command contains `{prompt}`, the prompt is substituted inline. Otherwise it's piped via stdin.

### Change the polling interval

```bash
mdreview ./docs --agent --interval 60000   # every 1 minute
```

### Provide extra context directories

Give the agent read-only access to related source code:

```bash
mdreview ./docs --agent --context-dir ../src --context-dir ../lib
```

### Use a custom prompt template

```bash
mdreview ./docs --agent --agent-prompt-file ./my-prompt.md
```

## Claude Code Example

Basic setup:

```bash
mdreview ./docs --agent
```

With scoped permissions via config file:

```js
// review.config.mjs
export default {
  agent: true,
  agentCommand: ({ reviewsDir }) =>
    `claude --allowedTools "Edit(${reviewsDir}/**),Read" -p`,
  contextDirs: ['../src'],
};
```

For automated environments where you want to skip permission prompts:

```bash
mdreview ./docs --agent --agent-command "claude --dangerously-skip-permissions -p"
```

> **Warning:** `--dangerously-skip-permissions` bypasses all permission prompts. Only use this in trusted, automated environments and always review changes before committing.

## Triggering Manually

To run the agent immediately without waiting for the next interval, click the **Run Now** button in the review panel in your browser.
