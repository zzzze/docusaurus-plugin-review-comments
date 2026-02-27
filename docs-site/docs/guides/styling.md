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
