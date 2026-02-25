---
sidebar_position: 3
---

# Configuration

Configure the review comments plugin for your needs.

## Plugin Options

### reviewsDir

**Type:** `string` (required)

Directory where review comment data is stored, relative to your site directory.

```javascript
{
  reviewsDir: 'reviews'  // Stores in ./reviews/
}
```

### defaultAuthor

**Type:** `string` (required)

Default author name for new comments.

```javascript
{
  defaultAuthor: 'Anonymous'
}
```

## Storage Structure

Review data is stored in JSON files that mirror your documentation structure:

```
reviews/
  docs/
    intro.reviews.json
    getting-started/
      installation.reviews.json
      quick-start.reviews.json
```

## File Format

Each review file contains:

```json
{
  "documentPath": "docs/getting-started/installation",
  "comments": [
    {
      "id": "uuid",
      "anchor": {...},
      "author": "Alice",
      "type": "question",
      "status": "open",
      "content": "Comment text",
      "createdAt": "2026-02-25T10:00:00Z",
      "replies": []
    }
  ]
}
```
