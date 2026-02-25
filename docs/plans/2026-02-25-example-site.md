# Example Site Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a complete Docusaurus example site with auto-generated review comments for local plugin development and testing.

**Architecture:** Standard Docusaurus site initialized with create-docusaurus, configured to reference parent directory plugin source via relative path. Includes 15-20 documentation pages across 4 sections and a Node.js script to generate realistic review comment data.

**Tech Stack:** Docusaurus 3.9.2, Node.js, TypeScript

---

## Task 1: Initialize Docusaurus Project

**Files:**
- Create: `example/` directory structure
- Create: `example/package.json`
- Create: `example/docusaurus.config.js`
- Create: `example/tsconfig.json`

**Step 1: Create example directory**

```bash
mkdir -p example
cd example
```

**Step 2: Initialize Docusaurus with create-docusaurus**

Run: `npx create-docusaurus@3.9.2 . classic --typescript`

Expected: Docusaurus project initialized with TypeScript template

**Step 3: Verify installation**

Run: `ls -la`

Expected: See `docs/`, `blog/`, `src/`, `static/`, `docusaurus.config.ts`, `package.json`, `sidebars.ts`

**Step 4: Commit initial setup**

```bash
git add .
git commit -m "chore: initialize Docusaurus example site"
```

---

## Task 2: Configure Plugin Integration

**Files:**
- Modify: `example/docusaurus.config.ts`
- Modify: `example/package.json`

**Step 1: Update docusaurus.config.ts to reference plugin**

Replace the plugins array with:

```typescript
plugins: [
  [
    require.resolve('../src/index.ts'),
    {
      reviewsDir: 'reviews',
      defaultAuthor: 'Demo User',
    },
  ],
],
```

**Step 2: Add parent dependencies to package.json**

Add to devDependencies:

```json
"@types/express": "^5.0.0",
"@types/uuid": "^10.0.0"
```

**Step 3: Install dependencies**

Run: `npm install`

Expected: Dependencies installed successfully

**Step 4: Verify TypeScript compilation**

Run: `npm run typecheck`

Expected: No TypeScript errors

**Step 5: Commit configuration**

```bash
git add docusaurus.config.ts package.json package-lock.json
git commit -m "feat: configure review comments plugin"
```

---

## Task 3: Create Documentation Structure

**Files:**
- Create: `example/docs/intro.md`
- Create: `example/docs/getting-started/installation.md`
- Create: `example/docs/getting-started/quick-start.md`
- Create: `example/docs/getting-started/configuration.md`
- Create: `example/docs/api/overview.md`
- Create: `example/docs/api/components.md`
- Create: `example/docs/api/hooks.md`
- Create: `example/docs/api/utils.md`
- Create: `example/docs/guides/basic-usage.md`
- Create: `example/docs/guides/styling.md`
- Create: `example/docs/guides/integration.md`
- Create: `example/docs/guides/best-practices.md`
- Create: `example/docs/advanced/architecture.md`
- Create: `example/docs/advanced/performance.md`
- Create: `example/docs/advanced/troubleshooting.md`
- Modify: `example/sidebars.ts`

**Step 1: Create directory structure**

```bash
mkdir -p docs/getting-started docs/api docs/guides docs/advanced
```

**Step 2: Create intro.md**

```markdown
---
sidebar_position: 1
---

# Introduction

Welcome to the Review Comments Plugin documentation. This plugin adds collaborative review functionality to your Docusaurus documentation site.

## Features

- **Inline Comments**: Add comments to specific text selections or code blocks
- **Discussion Threads**: Reply to comments and have conversations
- **Status Tracking**: Mark comments as resolved or keep them open
- **Multiple Types**: Support for questions, suggestions, and issue reports
- **Real-time Updates**: Comments update instantly during development

## Quick Start

Get started by [installing the plugin](./getting-started/installation.md).
```

**Step 3: Create getting-started/installation.md**

```markdown
---
sidebar_position: 1
---

# Installation

Install the review comments plugin in your Docusaurus project.

## Prerequisites

- Docusaurus 3.0 or later
- Node.js 18 or later

## Installation Steps

```bash
npm install docusaurus-plugin-review-comments
```

## Configuration

Add the plugin to your `docusaurus.config.js`:

```javascript
module.exports = {
  plugins: [
    [
      'docusaurus-plugin-review-comments',
      {
        reviewsDir: 'reviews',
        defaultAuthor: 'Anonymous',
      },
    ],
  ],
};
```

## Verify Installation

Start your development server:

```bash
npm run start
```

You should see the review comments interface on your documentation pages.
```

**Step 4: Create getting-started/quick-start.md**

```markdown
---
sidebar_position: 2
---

# Quick Start

Learn how to add your first review comment in under 2 minutes.

## Adding a Comment

1. **Select Text**: Highlight any text in the documentation
2. **Click Comment Button**: A floating button appears next to your selection
3. **Choose Type**: Select question, suggestion, or issue
4. **Write Content**: Add your comment text
5. **Submit**: Your comment is saved immediately

## Comment Types

### Question
Use when you need clarification or more information.

Example: "Could you provide an example of this in TypeScript?"

### Suggestion
Use when you have an idea to improve the documentation.

Example: "Consider adding a diagram to visualize this concept."

### Issue
Use when you've found an error or problem.

Example: "This code snippet is missing a closing bracket."

## Replying to Comments

Click on any existing comment to view it, then use the reply field to add your response.

## Resolving Comments

Mark comments as resolved when the issue is addressed or question is answered.
```

**Step 5: Create getting-started/configuration.md**

```markdown
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
```

**Step 6: Create api/overview.md**

```markdown
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
```

**Step 7: Create api/components.md**

```markdown
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
```

**Step 8: Create api/hooks.md**

```markdown
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
```

**Step 9: Create api/utils.md**

```markdown
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
```

**Step 10: Create guides/basic-usage.md**

```markdown
---
sidebar_position: 1
---

# Basic Usage

Common use cases and workflows for review comments.

## Reviewing Documentation

As a reviewer, your workflow looks like this:

1. Read through the documentation
2. Select text that needs feedback
3. Add a comment with your feedback
4. Continue reading and commenting

## Types of Feedback

### Questions

Use questions when something is unclear:

- "What does this parameter do?"
- "Can you provide an example?"
- "Is this required or optional?"

### Suggestions

Use suggestions to improve quality:

- "Consider adding a diagram here"
- "This could be explained more simply"
- "Add a link to the related concept"

### Issues

Use issues for errors or problems:

- "This code snippet has a typo"
- "The command is missing a flag"
- "This contradicts the previous section"

## Responding to Comments

As an author, respond to comments by:

1. Reading the feedback
2. Making necessary changes to the documentation
3. Replying to explain what you changed
4. Marking the comment as resolved

## Managing Comment Threads

Keep discussions focused:

- One topic per comment thread
- Mark resolved comments promptly
- Use replies for clarification only
- Create new comments for new topics
```

**Step 11: Create guides/styling.md**

```markdown
---
sidebar_position: 2
---

# Styling

Customize the appearance of review comments.

## CSS Variables

The plugin uses CSS variables for theming:

```css
:root {
  --review-comment-bg: #f8f9fa;
  --review-comment-border: #dee2e6;
  --review-comment-text: #212529;
  --review-comment-resolved: #28a745;
}
```

## Custom Styles

Override styles in your custom CSS:

```css
/* custom.css */
.review-comment {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.review-comment--question {
  border-left: 4px solid #007bff;
}

.review-comment--suggestion {
  border-left: 4px solid #28a745;
}

.review-comment--issue {
  border-left: 4px solid #dc3545;
}
```

## Dark Mode

The plugin automatically adapts to Docusaurus dark mode:

```css
[data-theme='dark'] {
  --review-comment-bg: #1e2125;
  --review-comment-border: #30363d;
  --review-comment-text: #c9d1d9;
}
```

## Component Swizzling

For advanced customization, swizzle the components:

```bash
npm run swizzle docusaurus-plugin-review-comments ReviewComments
```

This creates a local copy you can modify.
```

**Step 12: Create guides/integration.md**

```markdown
---
sidebar_position: 3
---

# Integration

Integrate review comments with other tools and workflows.

## Git Workflow

### Commit Review Data

Include review files in version control:

```bash
git add reviews/
git commit -m "docs: add review comments"
```

### Ignore Review Data

To keep reviews local only:

```gitignore
# .gitignore
reviews/
```

## CI/CD Integration

### Validate Review Files

Check review files are valid JSON:

```bash
# validate-reviews.sh
find reviews -name "*.reviews.json" -exec jq empty {} \;
```

### Generate Reports

Count open comments:

```bash
find reviews -name "*.reviews.json" -exec jq '.comments[] | select(.status == "open")' {} \; | wc -l
```

## Collaboration Tools

### Export Comments

Extract all comments to a CSV:

```javascript
// export-comments.js
const comments = getAllReviewFiles();
const csv = comments.map(c =>
  `${c.author},${c.type},${c.content}`
).join('\n');
```

### Import Comments

Bulk import from external source:

```javascript
// import-comments.js
const data = readCSV('comments.csv');
for (const row of data) {
  await createComment(row);
}
```

## Webhooks

Trigger actions when comments are created:

```javascript
// docusaurus.config.js
plugins: [
  ['docusaurus-plugin-review-comments', {
    reviewsDir: 'reviews',
    defaultAuthor: 'User',
    onCommentCreated: (comment) => {
      // Send notification
      fetch('https://webhook.site/...', {
        method: 'POST',
        body: JSON.stringify(comment)
      });
    }
  }]
]
```
```

**Step 13: Create guides/best-practices.md**

```markdown
---
sidebar_position: 4
---

# Best Practices

Guidelines for effective documentation reviews.

## For Reviewers

### Be Specific

❌ "This is confusing"
✅ "The relationship between X and Y is unclear. Consider adding a diagram."

### Be Constructive

❌ "This is wrong"
✅ "This should be Y instead of X because..."

### One Topic Per Comment

Create separate comments for different topics, not one long comment covering multiple issues.

### Use Appropriate Types

- **Question**: When you need clarification
- **Suggestion**: When proposing improvements
- **Issue**: When reporting errors

## For Authors

### Respond Promptly

Reply to comments within 24-48 hours to keep momentum.

### Make Changes First, Then Resolve

1. Update the documentation
2. Reply explaining what changed
3. Mark as resolved

### Ask for Clarification

If a comment is unclear, ask questions before making changes.

### Track Patterns

If multiple reviewers point out the same issue, it's definitely a problem.

## Team Workflow

### Assign Ownership

Designate owners for different documentation sections.

### Regular Review Cycles

Schedule regular review sessions (e.g., weekly) rather than ad-hoc reviews.

### Resolution Criteria

Agree on what "resolved" means:
- Author made the change
- Reviewer approved the change
- Team consensus reached

### Archive Old Comments

Periodically clean up resolved comments from 30+ days ago.
```

**Step 14: Create advanced/architecture.md**

```markdown
---
sidebar_position: 1
---

# Architecture

Technical design and implementation details.

## System Overview

The plugin consists of three main layers:

1. **Storage Layer**: File-based JSON storage
2. **API Layer**: Express middleware for CRUD operations
3. **UI Layer**: React components and hooks

## Data Flow

```
User Action → React Hook → REST API → Storage Layer → File System
                ↓
         State Update → UI Re-render
```

## Storage Design

### File Structure

```
reviews/
  {documentPath}.reviews.json
```

Each document has one review file containing all its comments.

### Why File-Based?

- Simple and transparent
- Works with version control
- No database required
- Easy to backup and migrate

### Concurrency

File writes are atomic. Last write wins in concurrent scenarios.

## API Design

### RESTful Endpoints

- `GET /api/reviews?doc={path}` - Read
- `POST /api/reviews` - Create
- `PATCH /api/reviews/:id` - Update
- `DELETE /api/reviews/:id` - Delete

### Error Handling

All endpoints return standard HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 404: Not Found
- 500: Server Error

## UI Architecture

### Component Hierarchy

```
ReviewComments
  ├─ CommentList
  │   └─ CommentThread
  │       ├─ CommentHeader
  │       ├─ CommentContent
  │       └─ ReplyList
  └─ CommentForm
```

### State Management

Uses React Context for global state:
- Current document comments
- Loading states
- Error states

### Text Selection

Uses browser Selection API to capture user text selections and create anchors.
```

**Step 15: Create advanced/performance.md**

```markdown
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
```

**Step 16: Create advanced/troubleshooting.md**

```markdown
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
```

**Step 17: Update sidebars.ts**

Replace the entire file:

```typescript
import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
        'getting-started/configuration',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/overview',
        'api/components',
        'api/hooks',
        'api/utils',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/basic-usage',
        'guides/styling',
        'guides/integration',
        'guides/best-practices',
      ],
    },
    {
      type: 'category',
      label: 'Advanced',
      items: [
        'advanced/architecture',
        'advanced/performance',
        'advanced/troubleshooting',
      ],
    },
  ],
};

export default sidebars;
```

**Step 18: Verify documentation structure**

Run: `ls -R docs/`

Expected: All documentation files created

**Step 19: Test documentation site**

Run: `npm start`

Expected: Site starts without errors, all pages accessible

**Step 20: Commit documentation**

```bash
git add docs/ sidebars.ts
git commit -m "docs: create comprehensive documentation structure"
```

---

## Task 4: Implement Review Data Generation Script

**Files:**
- Create: `example/scripts/generate-reviews.js`
- Modify: `example/package.json`

**Step 1: Create scripts directory**

```bash
mkdir -p scripts
```

**Step 2: Write generate-reviews.js script**

```javascript
const fs = require('fs').promises;
const path = require('path');
const { randomUUID } = require('crypto');

// Configuration
const DOCS_DIR = path.join(__dirname, '../docs');
const REVIEWS_DIR = path.join(__dirname, '../reviews');
const AUTHORS = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
const COMMENT_TYPES = ['question', 'suggestion', 'issue'];
const STATUSES = ['open', 'resolved'];

// Comment templates
const TEMPLATES = {
  question: [
    'Could you clarify what {topic} means?',
    'What is the difference between {topic} and {alternative}?',
    'Can you provide an example of {topic}?',
    'Is {topic} required or optional?',
    'How does {topic} work with {other}?',
  ],
  suggestion: [
    'Consider adding a diagram to visualize {topic}.',
    'This section could benefit from more examples.',
    'You might want to link to {related} here.',
    'Consider breaking this into smaller sections.',
    'Adding a code snippet would help explain {topic}.',
  ],
  issue: [
    'There appears to be a typo in this section.',
    'This code snippet is missing {element}.',
    'The command shown here doesn\'t work as written.',
    'This contradicts what was said in {other}.',
    'The link to {target} appears to be broken.',
  ],
};

// Parse command line arguments
const args = process.argv.slice(2);
const clean = args.includes('--clean');
const countArg = args.find(arg => arg.startsWith('--count='));
const commentsPerDoc = countArg ? parseInt(countArg.split('=')[1]) : null;

// Random helpers
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo = 30) {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(7, daysAgo));
  date.setHours(randomInt(0, 23), randomInt(0, 59), 0, 0);
  return date.toISOString();
}

// Generate comment content
function generateContent(type) {
  const template = randomItem(TEMPLATES[type]);
  return template
    .replace('{topic}', 'this feature')
    .replace('{alternative}', 'the other approach')
    .replace('{other}', 'the previous section')
    .replace('{related}', 'the related documentation')
    .replace('{element}', 'a closing bracket')
    .replace('{target}', 'the API reference');
}

// Generate anchor
function generateAnchor() {
  const scope = randomItem(['document', 'text', 'text', 'text', 'text', 'block', 'block']);

  if (scope === 'document') {
    return {
      scope: 'document',
      exact: '',
      prefix: '',
      suffix: '',
      heading: '',
      blockIndex: null,
    };
  }

  if (scope === 'block') {
    return {
      scope: 'block',
      exact: '',
      prefix: '',
      suffix: '',
      heading: '',
      blockIndex: randomInt(0, 3),
    };
  }

  // text anchor
  const texts = [
    'This is important',
    'configuration options',
    'best practices',
    'common use case',
    'recommended approach',
  ];
  const exact = randomItem(texts);

  return {
    scope: 'text',
    exact,
    prefix: 'the ',
    suffix: ' for',
    heading: '',
    blockIndex: null,
  };
}

// Generate replies
function generateReplies(count) {
  const replies = [];
  for (let i = 0; i < count; i++) {
    replies.push({
      id: randomUUID(),
      author: randomItem(AUTHORS),
      content: randomItem([
        'Thanks for pointing that out!',
        'I\'ve updated the documentation.',
        'Good question, let me clarify...',
        'You\'re absolutely right, fixing now.',
        'I agree, this needs improvement.',
      ]),
      createdAt: randomDate(25),
    });
  }
  return replies;
}

// Generate comment
function generateComment() {
  const type = randomItem(COMMENT_TYPES);
  const typeWeights = { question: 0.4, suggestion: 0.35, issue: 0.25 };
  const rand = Math.random();
  const selectedType = rand < typeWeights.question ? 'question'
    : rand < (typeWeights.question + typeWeights.suggestion) ? 'suggestion'
    : 'issue';

  const status = Math.random() < 0.6 ? 'open' : 'resolved';
  const replyCount = status === 'resolved' ? randomInt(1, 3) : randomInt(0, 2);

  return {
    id: randomUUID(),
    anchor: generateAnchor(),
    author: randomItem(AUTHORS),
    type: selectedType,
    status,
    content: generateContent(selectedType),
    createdAt: randomDate(),
    replies: generateReplies(replyCount),
  };
}

// Find all markdown files
async function findMarkdownFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Convert file path to document path
function getDocumentPath(filePath) {
  const relative = path.relative(DOCS_DIR, filePath);
  return path.join('docs', relative).replace(/\.md$/, '').replace(/\\/g, '/');
}

// Get review file path
function getReviewFilePath(docPath) {
  return path.join(REVIEWS_DIR, `${docPath}.reviews.json`);
}

// Generate reviews for a document
async function generateReviewsForDoc(docPath) {
  const count = commentsPerDoc || randomInt(2, 5);
  const comments = [];

  for (let i = 0; i < count; i++) {
    comments.push(generateComment());
  }

  const reviewData = {
    documentPath: docPath,
    comments,
  };

  const reviewFile = getReviewFilePath(docPath);
  await fs.mkdir(path.dirname(reviewFile), { recursive: true });
  await fs.writeFile(reviewFile, JSON.stringify(reviewData, null, 2) + '\n');

  return comments.length;
}

// Main function
async function main() {
  console.log('🔄 Generating review comments...\n');

  // Clean existing reviews if requested
  if (clean) {
    console.log('🧹 Cleaning existing reviews...');
    try {
      await fs.rm(REVIEWS_DIR, { recursive: true, force: true });
      console.log('✅ Cleaned reviews directory\n');
    } catch (err) {
      // Directory might not exist, that's ok
    }
  }

  // Find all markdown files
  const markdownFiles = await findMarkdownFiles(DOCS_DIR);
  console.log(`📄 Found ${markdownFiles.length} documentation files\n`);

  // Generate reviews
  let totalComments = 0;
  const stats = {
    question: 0,
    suggestion: 0,
    issue: 0,
    open: 0,
    resolved: 0,
  };

  for (const file of markdownFiles) {
    const docPath = getDocumentPath(file);
    const count = await generateReviewsForDoc(docPath);
    totalComments += count;
    console.log(`  ✅ ${docPath} (${count} comments)`);

    // Update stats (re-read to count accurately)
    const reviewFile = getReviewFilePath(docPath);
    const data = JSON.parse(await fs.readFile(reviewFile, 'utf-8'));
    data.comments.forEach(comment => {
      stats[comment.type]++;
      stats[comment.status]++;
    });
  }

  // Print summary
  console.log('\n📊 Generation Summary:');
  console.log(`   Total documents: ${markdownFiles.length}`);
  console.log(`   Total comments: ${totalComments}`);
  console.log(`\n   By type:`);
  console.log(`     Questions: ${stats.question}`);
  console.log(`     Suggestions: ${stats.suggestion}`);
  console.log(`     Issues: ${stats.issue}`);
  console.log(`\n   By status:`);
  console.log(`     Open: ${stats.open}`);
  console.log(`     Resolved: ${stats.resolved}`);
  console.log('\n✨ Done!');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
```

**Step 3: Add script to package.json**

Add to scripts section:

```json
"generate-reviews": "node scripts/generate-reviews.js"
```

**Step 4: Test script with --help**

Run: `node scripts/generate-reviews.js --help`

Expected: Script runs (no --help output, but validates syntax)

**Step 5: Commit generation script**

```bash
git add scripts/generate-reviews.js package.json
git commit -m "feat: add review data generation script"
```

---

## Task 5: Generate Initial Review Data

**Files:**
- Create: `example/reviews/**/*.reviews.json`

**Step 1: Run generation script**

Run: `npm run generate-reviews`

Expected: Script generates 50-80 review files

**Step 2: Verify review files created**

Run: `ls -R reviews/`

Expected: See reviews/ directory mirroring docs/ structure

**Step 3: Inspect a sample review file**

Run: `cat reviews/docs/intro.reviews.json`

Expected: Valid JSON with comments array

**Step 4: Count generated comments**

Run: `find reviews -name "*.reviews.json" -exec jq '.comments | length' {} \; | awk '{sum+=$1} END {print sum}'`

Expected: Total count between 50-80

**Step 5: Commit review data**

```bash
git add reviews/
git commit -m "feat: generate initial review data"
```

---

## Task 6: Test and Verify

**Files:**
- Create: `example/README.md`

**Step 1: Start development server**

Run: `npm start`

Expected: Server starts on http://localhost:3000

**Step 2: Test navigation**

Open browser to http://localhost:3000
Navigate through all sections: Getting Started, API, Guides, Advanced

Expected: All pages load correctly

**Step 3: Verify review comments display**

Check if comments appear on documentation pages

Expected: Comments visible with correct styling

**Step 4: Test comment interactions**

Try creating, replying to, and resolving comments

Expected: All actions work correctly

**Step 5: Create README**

```markdown
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
```

**Step 6: Commit README**

```bash
git add README.md
git commit -m "docs: add example site README"
```

**Step 7: Final verification**

Run: `npm run build`

Expected: Production build completes successfully

**Step 8: Return to parent directory**

```bash
cd ..
```

**Step 9: Update parent README (if needed)**

Add section about example site:

```markdown
## Development

See the `example/` directory for a complete Docusaurus site demonstrating all plugin features.

```bash
cd example
npm install
npm run generate-reviews
npm start
```
```

**Step 10: Final commit**

```bash
git add README.md
git commit -m "docs: add reference to example site"
```

---

## Completion Checklist

- [ ] Docusaurus project initialized in `example/`
- [ ] Plugin configured via relative path
- [ ] 15+ documentation pages created across 4 sections
- [ ] Sidebar navigation configured
- [ ] Review data generation script implemented
- [ ] Initial review data generated (50-80 comments)
- [ ] Development server runs without errors
- [ ] All pages accessible and display correctly
- [ ] Comments display on pages
- [ ] Comment interactions work (create, reply, resolve)
- [ ] Production build successful
- [ ] README documentation complete
- [ ] All changes committed to git

## Notes

- The plugin references parent directory source code, enabling hot-reload development
- Review data mirrors documentation structure for easy maintenance
- Generation script creates realistic, varied comment data for testing
- All documentation content is complete and interconnected
