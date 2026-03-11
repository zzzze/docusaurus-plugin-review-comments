---
sidebar_position: 3
---

# Configuration

All options for `docusaurus-plugin-mdreview`.

## Options

### `reviewsDir` (required)

**Type:** `string`

Directory where comment data is stored, relative to your site directory. Created automatically.

```js
{ reviewsDir: 'reviews' }
```

### `userName` (required)

**Type:** `string`

Author name attached to comments created through the UI.

```js
{ userName: 'Alice' }
```

### `agentName` (optional)

**Type:** `string`
**Default:** `"Claude"`

Display name used as the author field on AI-generated replies.

```js
{ agentName: 'Claude' }
```

### `reviewService` (optional)

Configuration for the AI review service. Omit this option entirely if you don't want AI processing.

```ts
interface ReviewServiceOptions {
  enabled?: boolean;            // Enable/disable the service (default: true when reviewService is set)
  intervalMs?: number;          // Polling interval in milliseconds (default: 300000 = 5 min)
  agentCommand?: string | AgentCommandFn;  // Shell command to invoke the agent
  agentPromptFile?: string;     // Path to custom prompt template file
  contextDirs?: Array<string | { dir: string; desc?: string }>;  // Extra read-only directories for agent context
  env?: Record<string, string>; // Extra environment variables for the agent process
}
```

| Option | Description |
|--------|-------------|
| `enabled` | Set to `false` to disable the service without removing config. |
| `intervalMs` | How often to check for pending comments. Default is 5 minutes. |
| `agentCommand` | The shell command to run. If it contains `{prompt}`, the prompt is substituted inline; otherwise it's piped via stdin. Can also be a function receiving `{ reviewsDir, docsDirs, contextDirs }`. |
| `agentPromptFile` | Path to a custom prompt template (relative to site root). |
| `contextDirs` | Additional directories the agent can read (e.g., source code repos the docs describe). |
| `env` | Environment variables merged with `process.env` when spawning the agent. |

See [AI Agent Setup](./ai-agent-setup.md) for details.

## Storage Format

Comments are stored as JSON files mirroring your document paths:

```
reviews/
  docs/
    intro.reviews.json
    getting-started/
      installation.reviews.json
```

Each file contains the comments for that document. You can commit these files to version control or add them to `.gitignore`.

## Full Example

```js
export default {
  plugins: [
    [
      'docusaurus-plugin-mdreview',
      {
        reviewsDir: 'reviews',
        userName: 'Alice',
        agentName: 'Claude',
        reviewService: {
          intervalMs: 300000,
          agentCommand: 'claude --dangerously-skip-permissions -p',
          agentPromptFile: 'path/to/prompt.md',
          contextDirs: [{ dir: '../source-repo', desc: 'source repository' }],
        },
      },
    ],
  ],
};
```
