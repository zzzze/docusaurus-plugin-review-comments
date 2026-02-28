---
sidebar_position: 3
---

# Configuration

All options for `docusaurus-plugin-review-comments`.

## Options

### `reviewsDir` (required)

**Type:** `string`

Directory where comment data is stored, relative to your site directory. Created automatically.

```js
{ reviewsDir: 'reviews' }
```

### `defaultAuthor` (required)

**Type:** `string`

Author name attached to comments created through the UI.

```js
{ defaultAuthor: 'Alice' }
```

### `reviewService` (optional)

Configuration for the AI review service. Omit this option entirely if you don't want AI processing.

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
      'docusaurus-plugin-review-comments',
      {
        reviewsDir: 'reviews',
        defaultAuthor: 'Alice',
        reviewService: {
          intervalMs: 300000,
          agentCommand: 'claude --dangerously-skip-permissions',
          agentPromptFile: 'path/to/prompt.md',
          contextDirs: [{ dir: '../source-repo', desc: 'source repository' }],
        },
      },
    ],
  ],
};
```
