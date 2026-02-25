---
sidebar_position: 3
---

# Hooks API

React hooks for managing review comments.

## useReviewComments

Access all comments for the current document.

```tsx
import { useReviewComments } from '@theme/ReviewComments';

function MyComponent() {
  const { comments, loading, error } = useReviewComments();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>{comments.length} comments</div>;
}
```

### Return Value

```typescript
{
  comments: ReviewComment[];
  loading: boolean;
  error: string | null;
}
```

## useCreateComment

Create a new comment.

```tsx
import { useCreateComment } from '@theme/ReviewComments';

function MyComponent() {
  const createComment = useCreateComment();

  const handleCreate = async () => {
    await createComment({
      anchor: {...},
      type: 'question',
      content: 'My question',
    });
  };
}
```

## useUpdateComment

Update an existing comment.

```tsx
import { useUpdateComment } from '@theme/ReviewComments';

function MyComponent() {
  const updateComment = useUpdateComment();

  const handleResolve = async (id: string) => {
    await updateComment(id, { status: 'resolved' });
  };
}
```

## useDeleteComment

Delete a comment.

```tsx
import { useDeleteComment } from '@theme/ReviewComments';

function MyComponent() {
  const deleteComment = useDeleteComment();

  const handleDelete = async (id: string) => {
    await deleteComment(id);
  };
}
```
