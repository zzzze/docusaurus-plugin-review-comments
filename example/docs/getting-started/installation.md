---
sidebar_position: 1
---

# Installation

Install the review comments plugin in your Docusaurus project.

## Prerequisites

- Docusaurus 3.0 or later
- Node.js 18 or later

## Installation Steps

```bash
npm install docusaurus-plugin-review-comments
```

## Configuration

Add the plugin to your `docusaurus.config.js`:

```javascript
module.exports = {
  plugins: [
    [
      'docusaurus-plugin-review-comments',
      {
        reviewsDir: 'reviews',
        defaultAuthor: 'Anonymous',
      },
    ],
  ],
};
```

## Verify Installation

Start your development server:

```bash
npm run start
```

You should see the review comments interface on your documentation pages.
