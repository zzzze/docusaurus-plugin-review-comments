---
sidebar_position: 1
---

# Introduction

`@mdreview/docusaurus-plugin` adds inline review comments to your Docusaurus site.
While reading your documentation locally, you can select any text and leave a comment — a question, a suggestion, or a reported issue. Comments are saved as JSON files alongside your docs.

The plugin also supports an optional **AI review service**: an AI agent (such as Claude Code) runs periodically, reads open comments, and responds directly — answering questions, applying suggestions, or fixing issues in your Markdown source files.

**Note:** This is a **local development tool** designed for reviewing documentation during development. Since it requires a server, local file system access, and optionally an AI agent, it does not work in production static deployments — the plugin has no effect when your Docusaurus site is deployed statically.

## How It Works

1. Run your Docusaurus site locally with `npm start`
2. Select text on any page — a comment button appears
3. Leave a comment (question, suggestion, or issue)
4. Optionally, configure an AI agent to process comments automatically, or manually copy the AI prompt and use it in your project's AI assistant

Comments are stored as `.reviews.json` files in a directory you configure. They can be committed to version control or kept local.

## Two Ways to Use mdreview

### Docusaurus Plugin

If you have a Docusaurus site, install `docusaurus-plugin-mdreview` to add review comments directly into your Docusaurus dev server.

- [Install the plugin](./installation.md)
- [Configure options](./configuration.md)
- [Set up AI review service](./ai-agent-setup.md)
- [Learn how to leave comments](./using-comments.md)

### Standalone CLI

If you want to review **any** markdown project (no Docusaurus required), use the `mdreview` CLI tool. It launches its own local server with a built-in review UI.

- [CLI overview](./cli/intro.md)
- [CLI installation & usage](./cli/installation.md)
- [CLI configuration](./cli/configuration.md)
- [CLI AI agent setup](./cli/ai-agent-setup.md)
