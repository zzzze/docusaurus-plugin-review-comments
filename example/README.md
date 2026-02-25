# Review Comments Plugin - Example Site

Complete Docusaurus documentation site demonstrating the review comments plugin.

## Quick Start

```bash
# Install dependencies
npm install

# Generate review data
npm run generate-reviews

# Start development server
npm start
```

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run generate-reviews` - Generate review comment data
- `npm run generate-reviews -- --clean` - Clean and regenerate data
- `npm run generate-reviews -- --count=3` - Generate 3 comments per page

## Documentation Structure

- **Getting Started** - Installation, quick start, configuration
- **API Reference** - Components, hooks, utilities
- **Guides** - Usage, styling, integration, best practices
- **Advanced** - Architecture, performance, troubleshooting

## Review Data

Review comments are stored in the `reviews/` directory, mirroring the `docs/` structure. Each document has a corresponding `.reviews.json` file.

## Local Development

The plugin is referenced from the parent directory (`../src/index.ts`), so changes to the plugin source code are immediately reflected when you reload the browser.

## Resetting Data

To start fresh with new review data:

```bash
npm run generate-reviews -- --clean
```
