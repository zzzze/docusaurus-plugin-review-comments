---
sidebar_position: 2
---

# Installation

## Prerequisites

- Docusaurus 3.0 or later
- Node.js 18 or later

## Install

```bash
npm install docusaurus-plugin-review-comments
```

## Configure

Add the plugin to your `docusaurus.config.js` (or `.ts`):

```js
export default {
  plugins: [
    [
      'docusaurus-plugin-review-comments',
      {
        reviewsDir: 'reviews',
        defaultAuthor: 'Your Name',
      },
    ],
  ],
};
```

The `reviewsDir` directory is created automatically when you first add a comment.

## Verify

Start your dev server:

```bash
npm start
```

Open any documentation page. Select some text — you should see a comment button appear next to your selection.

> **Note:** The plugin only runs in development mode (`npm start`). It has no effect on production builds.
