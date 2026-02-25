---
sidebar_position: 4
---

# Utils API

Utility functions for working with review comments.

## resolveReviewFilePath

Resolve the file path for a document's review data.

```typescript
import { resolveReviewFilePath } from 'docusaurus-plugin-review-comments/lib/api/storage';

const filePath = resolveReviewFilePath('/path/to/reviews', 'docs/intro');
// Returns: '/path/to/reviews/docs/intro.reviews.json'
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `reviewsDir` | `string` | Base directory for review files |
| `docPath` | `string` | Document path |

## readReviewFile

Read review data from a file.

```typescript
import { readReviewFile } from 'docusaurus-plugin-review-comments/lib/api/storage';

const data = await readReviewFile(filePath);
// Returns: ReviewFile object
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | `string` | Path to review file |

### Return Value

Returns a `ReviewFile` object, or empty structure if file doesn't exist.

## writeReviewFile

Write review data to a file.

```typescript
import { writeReviewFile } from 'docusaurus-plugin-review-comments/lib/api/storage';

await writeReviewFile(filePath, reviewData);
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | `string` | Path to review file |
| `data` | `ReviewFile` | Review data to write |
