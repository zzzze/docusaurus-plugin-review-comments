---
sidebar_position: 1
---

# CLI Tool

`@mdreview/cli` is a standalone command-line tool for reviewing markdown documents with inline comments. It works with **any** markdown project — no Docusaurus required.

The CLI launches a local web server with a review UI where you can browse your markdown files, select text, and leave comments (questions, suggestions, issues). Comments are stored as `.reviews.json` files that can be committed to version control.

Like the Docusaurus plugin, the CLI also supports an optional **AI review service** that processes comments automatically using an AI agent such as Claude Code.

## When to Use the CLI vs the Docusaurus Plugin

| | CLI (`mdreview`) | Docusaurus Plugin |
|---|---|---|
| **Use case** | Any markdown project | Docusaurus sites only |
| **Setup** | Zero config — just run `mdreview` | Requires `docusaurus.config.js` changes |
| **Rendering** | Built-in markdown viewer | Full Docusaurus rendering |
| **Install** | `npm install -g @mdreview/cli` | `npm install docusaurus-plugin-mdreview` |

## Quick Start

```bash
# Install globally
npm install -g @mdreview/cli

# Review the current directory
mdreview

# Review a specific directory or file
mdreview ./docs
mdreview ./docs/README.md
```

The browser opens automatically. Select text on any page to leave a comment.

## Next Steps

- [Installation & usage](./installation.md)
- [Configuration](./configuration.md)
- [AI agent setup](./ai-agent-setup.md)
