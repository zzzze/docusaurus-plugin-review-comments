---
sidebar_position: 2
---

# Performance

Optimization techniques and performance considerations.

## File System Performance

### Read Optimization

Comments are loaded once per document and cached in memory during the session.

### Write Optimization

Writes are debounced to avoid excessive file system operations.

### Large Files

For documents with 100+ comments, consider pagination:

```typescript
const pageSize = 20;
const page = 1;
const paginatedComments = comments.slice(
  (page - 1) * pageSize,
  page * pageSize
);
```

## Network Performance

### Lazy Loading

Comments load after the main document content:

```typescript
useEffect(() => {
  // Document loads first
  loadComments(); // Then comments
}, []);
```

### Request Batching

Multiple comment operations are batched:

```typescript
const updates = [
  updateComment(id1, data1),
  updateComment(id2, data2),
  updateComment(id3, data3),
];
await Promise.all(updates);
```

## Rendering Performance

### Virtual Scrolling

For long comment threads, use virtual scrolling:

```typescript
import { VirtualList } from 'virtual-list';

<VirtualList
  items={comments}
  renderItem={comment => <CommentThread comment={comment} />}
/>
```

### Memoization

Prevent unnecessary re-renders:

```typescript
const CommentThread = memo(({ comment }) => {
  // Component only re-renders if comment changes
});
```

## Monitoring

### Performance Metrics

Track key metrics:
- Time to load comments
- Time to create comment
- Time to render comment list

```typescript
performance.mark('comments-start');
await loadComments();
performance.mark('comments-end');
performance.measure('comments-load', 'comments-start', 'comments-end');
```
