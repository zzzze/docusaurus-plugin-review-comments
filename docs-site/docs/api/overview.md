---
sidebar_position: 1
---

# API Overview

The plugin provides both React hooks and REST endpoints.

## React Hooks

- `useReviewComments()` - Access comments for current document
- `useCreateComment()` - Create new comments
- `useUpdateComment()` - Update or resolve comments
- `useDeleteComment()` - Delete comments

## REST API

All endpoints are available during development at `/api/reviews`:

- `GET /api/reviews?doc={path}` - Get all comments for a document
- `POST /api/reviews` - Create a new comment
- `PATCH /api/reviews/:id` - Update a comment or add reply
- `DELETE /api/reviews/:id` - Delete a comment

## Type Definitions

```typescript
interface ReviewComment {
  id: string;
  anchor: ReviewAnchor;
  author: string;
  type: 'question' | 'suggestion' | 'issue';
  status: 'open' | 'resolved';
  content: string;
  createdAt: string;
  replies: ReviewReply[];
}
```
