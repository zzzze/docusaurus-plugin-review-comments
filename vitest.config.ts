import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    environmentMatchGlobs: [
      ["src/__tests__/CommentCard.test.tsx", "happy-dom"],
      ["src/__tests__/CommentForm.test.tsx", "happy-dom"],
      ["src/__tests__/highlightRenderer.test.ts", "happy-dom"],
      ["src/__tests__/anchorUtils.test.ts", "happy-dom"],
      ["src/__tests__/useReviewComments.test.ts", "happy-dom"],
      ["src/__tests__/useGutterButtons.test.ts", "happy-dom"],
      ["src/__tests__/useHighlights.test.ts", "happy-dom"],
      ["src/__tests__/useKeyboardShortcuts.test.ts", "happy-dom"],
    ],
    setupFiles: ["src/__tests__/setup.ts"],
  },
});
