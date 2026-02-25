---
sidebar_position: 2
---

# Components API

React components provided by the plugin.

## ReviewComments

Main component that displays all comments for the current document.

```tsx
import ReviewComments from '@theme/ReviewComments';

<ReviewComments />
```

### Props

None. The component automatically detects the current document path.

## CommentThread

Displays a single comment thread with replies.

```tsx
import CommentThread from '@theme/CommentThread';

<CommentThread comment={comment} />
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `comment` | `ReviewComment` | The comment to display |

## CommentForm

Form for creating or replying to comments.

```tsx
import CommentForm from '@theme/CommentForm';

<CommentForm onSubmit={handleSubmit} type="question" />
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `onSubmit` | `(content: string) => void` | Submit handler |
| `type` | `'question' \| 'suggestion' \| 'issue'` | Comment type |
