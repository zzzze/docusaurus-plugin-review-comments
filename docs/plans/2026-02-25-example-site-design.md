# Example Site Design

**Date:** 2026-02-25
**Purpose:** Create a comprehensive Docusaurus example site for local development and testing of the review comments plugin

## Overview

This design outlines the creation of a complete Docusaurus documentation site in the `example/` directory. The site will demonstrate all plugin features with realistic content and auto-generated review comments covering various scenarios.

## Requirements

- Full-featured Docusaurus site with 15-20 documentation pages
- Local plugin integration for hot-reload development
- Automated script to generate 50-80 realistic review comments
- Multiple documentation sections demonstrating different use cases
- Easy setup and reset workflow for testing

## Approach

**Selected Approach:** Standard Docusaurus initialization with local plugin integration

**Rationale:**
- Uses official tooling for reliability and compatibility
- Standard structure is familiar to developers
- Quick to set up, focuses on plugin demonstration
- Easy to maintain and extend

**Alternatives Considered:**
- Monorepo structure: Too complex for a single plugin
- Manual setup: Error-prone and harder to maintain

## Architecture

### Directory Structure

```
example/
├── docs/                          # Documentation content
│   ├── intro.md
│   ├── getting-started/           # Installation, quick start, configuration
│   ├── api/                       # API reference pages
│   ├── guides/                    # Usage guides and best practices
│   └── advanced/                  # Architecture, performance, troubleshooting
├── blog/                          # Optional blog posts
├── src/
│   └── pages/                     # Custom pages (index, etc.)
├── static/                        # Static assets (images, etc.)
├── reviews/                       # Review comments storage
│   └── docs/                      # Mirrors docs/ structure
│       ├── intro.reviews.json
│       ├── getting-started/
│       │   └── *.reviews.json
│       └── ...
├── scripts/
│   └── generate-reviews.js        # Auto-generate review data
├── docusaurus.config.js           # Site configuration
├── sidebars.js                    # Sidebar navigation
├── package.json                   # Dependencies and scripts
└── tsconfig.json                  # TypeScript configuration
```

### Plugin Integration

The plugin will be referenced via relative path in `docusaurus.config.js`:

```javascript
plugins: [
  [
    require.resolve('../../src/index.ts'),  // Reference parent directory source
    {
      reviewsDir: 'reviews',                // Relative to example/
      defaultAuthor: 'Demo User'            // Default author name
    }
  ]
]
```

This allows testing the plugin source code directly without building, enabling hot-reload development.

### Review Data Storage

Review files mirror the documentation structure:
- Document path: `docs/getting-started/installation.md`
- Review file: `reviews/docs/getting-started/installation.reviews.json`

Format follows the plugin's `ReviewFile` type:
```json
{
  "documentPath": "docs/getting-started/installation",
  "comments": [
    {
      "id": "uuid",
      "anchor": { "scope": "text", "text": "..." },
      "author": "Alice",
      "type": "question",
      "status": "open",
      "content": "Comment content here",
      "createdAt": "2026-02-18T10:30:00Z",
      "replies": []
    }
  ]
}
```

## Documentation Content

### Structure (15-20 pages across 4 sections)

**1. Getting Started (3 pages)**
- Installation - Setup instructions
- Quick Start - First steps tutorial
- Configuration - Plugin options reference

**2. API Reference (4 pages)**
- Overview - API introduction
- Components - React component API
- Hooks - React hooks API
- Utils - Utility functions

**3. Guides (4 pages)**
- Basic Usage - Common use cases
- Styling - Customization guide
- Integration - Third-party integrations
- Best Practices - Recommendations

**4. Advanced (4 pages)**
- Architecture - Design decisions
- Performance - Optimization tips
- Troubleshooting - Common issues

**Plus:** Additional pages like intro.md, blog posts

## Data Generation Script

### Location and Usage

`example/scripts/generate-reviews.js` - Node.js script for generating review data

**Usage:**
```bash
npm run generate-reviews           # Default generation
npm run generate-reviews -- --clean # Clean and regenerate
npm run generate-reviews -- --count=3 # 3 comments per page
```

### Generation Strategy

**Scan and Generate:**
1. Find all `.md` files in `docs/` directory
2. For each document, generate 2-5 random comments
3. Create corresponding `.reviews.json` file in `reviews/` directory

**Comment Distribution:**
- Type: `question` (40%), `suggestion` (35%), `issue` (25%)
- Status: `open` (60%), `resolved` (40%)
- Replies: 0-3 replies per comment (randomly)

**Anchor Distribution:**
- `scope: "document"` (30%) - Overall document comments
- `scope: "text"` (50%) - Specific text selections
- `scope: "block"` (20%) - Code block comments

**Realistic Data:**
- Author pool: Alice, Bob, Charlie, Diana, Eve, Frank
- Timestamps: Random dates within past 7-30 days
- Content templates: Realistic documentation feedback
  - Questions: "Could you clarify...", "What's the difference between..."
  - Suggestions: "Consider adding...", "This could be improved by..."
  - Issues: "This doesn't work when...", "Typo in..."

### Output

Console output shows:
- Total documents scanned
- Total comments generated
- Breakdown by type and status
- File paths created

## Configuration Files

### package.json

**Dependencies:**
- `@docusaurus/core`: 3.9.2
- `@docusaurus/preset-classic`: 3.9.2
- Standard React, MDX dependencies

**Scripts:**
```json
{
  "start": "docusaurus start",
  "build": "docusaurus build",
  "generate-reviews": "node scripts/generate-reviews.js"
}
```

### docusaurus.config.js

**Key Settings:**
- Title, tagline, URL, baseUrl
- Preset: `@docusaurus/preset-classic` with docs and blog
- Theme configuration: navbar, footer
- Plugin: Local review comments plugin with configuration

### sidebars.js

Auto-generated with customization for the four main sections:
- Getting Started
- API Reference
- Guides
- Advanced

## Development Workflow

### Initial Setup
```bash
cd example
npm install
npm run generate-reviews
npm start
```

### Daily Development
1. Modify plugin source code in `src/`
2. Browser auto-refreshes with changes
3. Test different scenarios with existing review data

### Reset Testing Data
```bash
npm run generate-reviews -- --clean
```

### Build Production
```bash
npm run build
```

## Implementation Steps

1. Initialize Docusaurus project in `example/` directory
2. Configure plugin integration in `docusaurus.config.js`
3. Create documentation structure (4 sections, 15-20 pages)
4. Write documentation content (realistic technical content)
5. Implement `generate-reviews.js` script
6. Generate initial review data
7. Test plugin functionality with generated data
8. Document setup instructions in example README

## Success Criteria

- Example site runs with `npm start` without errors
- Plugin features are fully functional
- Review comments display on all documentation pages
- Can create, reply, resolve, and delete comments
- Data generation script produces realistic varied data
- Hot-reload works when modifying plugin source code
- Site can be built for production without issues

## Future Enhancements

- Add blog posts with review comments
- Include examples with different anchor types
- Add custom React components demonstrating advanced usage
- Create video or animated demos
- Multiple author personas with avatars
