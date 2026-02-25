---
sidebar_position: 3
---

# Troubleshooting

Solutions to common problems.

## Comments Not Showing

### Check Plugin Configuration

Verify the plugin is configured in `docusaurus.config.js`:

```javascript
plugins: [
  ['docusaurus-plugin-review-comments', {
    reviewsDir: 'reviews',
    defaultAuthor: 'User',
  }]
]
```

### Check File Paths

Review files must match document paths:
- Document: `docs/intro.md`
- Review file: `reviews/docs/intro.reviews.json`

### Check JSON Format

Validate review files are valid JSON:

```bash
jq empty reviews/docs/intro.reviews.json
```

## Comments Not Saving

### Check Permissions

Ensure the `reviews/` directory is writable:

```bash
ls -la reviews/
```

### Check Disk Space

Verify sufficient disk space:

```bash
df -h
```

### Check Network

Open browser DevTools and check for API errors in the Network tab.

## TypeScript Errors

### Missing Types

Install type definitions:

```bash
npm install --save-dev @types/express @types/uuid
```

### Type Conflicts

Clear TypeScript cache:

```bash
rm -rf node_modules/.cache
npm run typecheck
```

## Build Errors

### Development vs Production

The plugin only works in development mode. For production builds, comments are not included.

### Path Resolution

Use absolute imports in plugin configuration:

```javascript
require.resolve('docusaurus-plugin-review-comments')
```

## Getting Help

If you're still stuck:

1. Check the [GitHub Issues](https://github.com/user/repo/issues)
2. Search for similar problems
3. Open a new issue with:
   - Error messages
   - Configuration files
   - Steps to reproduce
