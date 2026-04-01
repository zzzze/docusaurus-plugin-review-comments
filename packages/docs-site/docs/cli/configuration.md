---
sidebar_position: 3
---

# Configuration

The CLI can be configured via command-line arguments, a config file, or both. CLI arguments take priority over the config file.

## Config File

The CLI searches upward from the target directory for a config file named:

- `review.config.mjs`
- `review.config.js`

### Example

```js
// review.config.mjs
export default {
  reviewsDir: './reviews',
  user: 'Alice',
  agent: true,
  agentCommand: 'claude -p',
  agentName: 'Claude',
  interval: 300000,
  contextDirs: ['../source-repo'],
  port: 4100,
};
```

### All Options

| Option | Type | Description |
|--------|------|-------------|
| `path` | `string` | Directory or file to review. |
| `reviewsDir` | `string` | Where to store `.reviews.json` files. |
| `user` | `string` | Reviewer name. |
| `agent` | `boolean` | Enable AI review service. |
| `agentCommand` | `string \| function` | Shell command to invoke the agent. |
| `agentName` | `string` | Agent display name. |
| `agentPromptFile` | `string` | Path to custom prompt template. |
| `interval` | `number` | Auto-review polling interval in ms. |
| `contextDirs` | `string[]` | Extra read-only context directories. |
| `port` | `number` | Server port. |
| `noOpen` | `boolean` | Don't auto-open the browser. |

### Dynamic `agentCommand`

The `agentCommand` option can be a function that receives context about the review session:

```js
// review.config.mjs
export default {
  agentCommand: ({ reviewsDir }) =>
    `claude --allowedTools "Edit(${reviewsDir}/**)" -p`,
};
```

The function receives an object with:

| Property | Description |
|----------|-------------|
| `reviewsDir` | Absolute path to the reviews directory. |

This is useful for dynamically scoping agent permissions to the correct directories.
