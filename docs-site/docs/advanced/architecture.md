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
