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
