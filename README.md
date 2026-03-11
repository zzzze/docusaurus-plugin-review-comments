# mdreview

A Docusaurus plugin for adding inline review comments to your documentation site. Select any text while reading your docs locally, leave a comment, and optionally have an AI agent process comments automatically.

## How It Works

1. Run your Docusaurus site locally with `npm start`
2. Select text on any page — a comment button appears
3. Leave a comment: a question, suggestion, or issue
4. Optionally, configure an AI agent to respond and apply changes automatically

Comments are saved as `.reviews.json` files alongside your docs. They can be committed to version control or kept local.

> **Note:** The plugin only runs in development mode (`npm start`). It has no effect on production builds.

## Installation

**Prerequisites:** Docusaurus 3.0+, Node.js 18+

```bash
npm install docusaurus-plugin-mdreview
```

Add the plugin to your `docusaurus.config.js` (or `.ts`):

```js
export default {
  plugins: [
    [
      'docusaurus-plugin-mdreview',
      {
        reviewsDir: 'reviews',
        defaultAuthor: 'Your Name',
      },
    ],
  ],
};
```

Start your dev server and select some text on any page — you should see a comment button appear.

## Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `reviewsDir` | `string` | Yes | Directory for comment storage, relative to your site directory. Created automatically. |
| `defaultAuthor` | `string` | Yes | Author name attached to comments created through the UI. |
| `reviewService` | `object` | No | AI review service configuration. Omit to disable. |

### Storage Format

Comments mirror your document paths:

```
reviews/
  docs/
    intro.reviews.json
    getting-started/
      installation.reviews.json
```

## AI Agent Setup

The plugin can run an AI agent periodically to process open comments — answering questions, applying suggestions, or fixing issues in your Markdown source files.

Add a `reviewService` block to your plugin options:

```js
{
  reviewService: {
    intervalMs: 300000,       // How often to run (ms). Default: 5 minutes
    agentCommand: 'claude',   // Shell command to invoke the agent
    agentPromptFile: '...',   // Path to a custom prompt file (optional)
    contextDirs: [            // Extra read-only directories for the agent (optional)
      { dir: '../my-source-repo', desc: 'project source code' },
    ],
  }
}
```

### `agentCommand`

The shell command used to invoke your AI agent. The plugin generates a prompt describing the document and comments to process, piped via stdin.

**Safe default (function form)** — restricts edit permissions to only the reviews and docs directories:

```js
agentCommand: ({ reviewsDir, docsDirs, contextDirs }) => {
  const allowedTools = [
    `Edit(//${reviewsDir.slice(1)}/**)`,
    ...docsDirs.map(d => `Edit(//${d.slice(1)}/**)`),
    'Read'
  ].join(',');
  const addDirs = contextDirs.map(d => `--add-dir ${d.dir}`).join(' ');
  return `claude --allowedTools "${allowedTools}"${addDirs ? ' ' + addDirs : ''} -p`;
}
```

**String form** — used as-is, prompt piped via stdin (or substituted inline if `{prompt}` is present):

```js
agentCommand: 'claude -p'
// or
agentCommand: 'claude {prompt} -p'
```

**Automated environments only:**

```js
agentCommand: 'claude -p --dangerously-skip-permissions'
```

> **Warning:** `--dangerously-skip-permissions` bypasses permission prompts. Only use this in trusted, automated environments and always review changes before committing.

### `contextDirs`

Extra directories to pass to the agent as read-only context (e.g. a source repository your docs describe):

```js
contextDirs: [
  { dir: '../my-source-repo', desc: 'project source code' },
]
```

### Manual Trigger

To run the agent immediately without waiting for the next interval, use the **Run Now** button in the mdreview panel in your browser.

## Using Comments

**Leave a comment:** Select text → click the comment button → choose a type → submit.

**Comment types:**
- **Question** — something unclear or you need more information
- **Suggestion** — an idea to improve the documentation
- **Issue** — an error or problem in the documentation

**Resolve a comment:** Click **Resolve** once a comment has been addressed. Resolved comments are hidden by default but can be shown with the filter toggle.
