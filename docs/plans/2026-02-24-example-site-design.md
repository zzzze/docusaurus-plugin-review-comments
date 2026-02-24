# Example Site Design

## Overview

Create a complete Docusaurus example website in the `example/` directory to test and demonstrate the review-comments plugin functionality. The site will include comprehensive documentation content and automatically generated review comment data.

## Requirements

- Full-featured Docusaurus site with multiple sections and pages
- Local plugin integration using relative path
- Automated review data generation with various scenarios
- Easy setup and reset workflow

## Implementation Approach

**Method: Standard Docusaurus initialization + local plugin integration**

Use `create-docusaurus` to initialize a standard site, configure it to reference the parent directory's plugin source code, create a complete documentation structure, and provide a data generation script for review comments.

**Rationale:**
- Official tooling ensures compatibility and correctness
- Standard structure is easily understood by other developers
- Quick setup focused on plugin demonstration
- Easily extensible for future enhancements

## Project Structure

```
example/
├── docs/                    # Documentation content
│   ├── intro.md
│   ├── getting-started/     # Getting started section
│   ├── api/                 # API reference section
│   ├── guides/              # Usage guides section
│   └── advanced/            # Advanced topics section
├── blog/                    # Blog examples (optional)
├── src/
│   └── pages/              # Custom pages
├── static/                  # Static assets
├── reviews/                 # Review data storage (mirrors docs structure)
│   └── docs/
│       ├── intro.reviews.json
│       ├── getting-started/
│       └── ...
├── scripts/
│   └── generate-reviews.js  # Data generation script
├── docusaurus.config.js     # Configuration file
├── sidebars.js              # Sidebar configuration
└── package.json
```

**Plugin integration:**
- Use `require.resolve('../../src/index.ts')` to reference parent plugin source
- Enables direct testing without build step
- Hot-reload works for plugin development

**Review storage:**
- `reviewsDir: 'reviews'` configured in plugin options (relative to example/)
- Review files mirror document structure: `reviews/docs/path/to/doc.reviews.json`
- Resolved path: `path.resolve(context.siteDir, options.reviewsDir)`

## Documentation Content

The site will contain 4 main sections with 15-20 total pages:

**1. Getting Started**
- Installation.md - Installation instructions
- Quick Start.md - Quick start guide
- Configuration.md - Configuration options

**2. API Reference**
- Overview.md - API overview
- Components.md - Component API
- Hooks.md - Hooks API
- Utils.md - Utility functions

**3. Guides**
- Basic Usage.md - Basic usage
- Styling.md - Styling customization
- Integration.md - Integration with other tools
- Best Practices.md - Best practices

**4. Advanced**
- Architecture.md - Architecture design
- Performance.md - Performance optimization
- Troubleshooting.md - Troubleshooting guide

## Review Data Generation

**Script: `example/scripts/generate-reviews.js`**

Automated Node.js script that generates realistic review comment data:

**Features:**
- Scans all markdown files in `docs/`
- Generates 2-5 comments per document
- Creates corresponding `.reviews.json` files in `reviews/` directory

**Comment types distribution:**
- `question` (40%) - Questions
- `suggestion` (35%) - Suggestions
- `issue` (25%) - Issue reports

**Status distribution:**
- `open` (60%) - Unresolved
- `resolved` (40%) - Resolved

**Anchor scope distribution:**
- `document` (30%) - Document-level comments
- `text` (50%) - Text-specific comments
- `block` (20%) - Code block comments

**Additional features:**
- Random replies (0-3 replies per comment)
- Realistic mock data (author names, content templates, timestamps)
- Timestamps within past 7-30 days
- Total ~50-80 comments across all documents

**CLI options:**
```bash
node scripts/generate-reviews.js          # Default generation
node scripts/generate-reviews.js --clean  # Clean and regenerate
node scripts/generate-reviews.js --count=3 # 3 comments per page
```

## Configuration

**package.json:**
```json
{
  "name": "docusaurus-plugin-review-comments-example",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "start": "docusaurus start",
    "build": "docusaurus build",
    "generate-reviews": "node scripts/generate-reviews.js"
  },
  "dependencies": {
    "@docusaurus/core": "3.9.2",
    "@docusaurus/preset-classic": "3.9.2",
    "@mdx-js/react": "^3.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

**docusaurus.config.js key configuration:**
```js
module.exports = {
  // ... other config
  plugins: [
    [
      require.resolve('../../src/index.ts'),  // Parent plugin source
      {
        reviewsDir: 'reviews',      // Relative to example/
        defaultAuthor: 'Demo User'  // Default author name
      }
    ]
  ]
}
```

**TypeScript support:**
- Add `tsconfig.json` extending `@docusaurus/tsconfig`
- Enables proper TypeScript recognition for plugin source

## Development Workflow

**Initial setup:**
1. `npm install` - Install dependencies
2. `npm run generate-reviews` - Generate review data
3. `npm start` - Start dev server

**Daily development:**
- Modify plugin code in parent directory
- Refresh browser to see changes (hot-reload)

**Reset data:**
- `npm run generate-reviews -- --clean` - Clean and regenerate all reviews

## Success Criteria

- Site runs successfully with `npm start`
- All plugin features are demonstrable
- Review comments display correctly across all pages
- Data generation script produces valid review files
- Clear documentation structure for testing different scenarios
