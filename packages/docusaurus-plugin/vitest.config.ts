import { defineConfig } from "vitest/config";
import path from "path";

const uiSrc = path.resolve(__dirname, "../ui/src");

export default defineConfig({
  resolve: {
    alias: [
      // Map @mdreview/ui subpath imports to source .ts files so vitest can
      // resolve, type-check, and mock them without a prior build step.
      { find: /^@mdreview\/ui\/hooks$/, replacement: path.join(uiSrc, "hooks/index.ts") },
      { find: /^@mdreview\/ui\/components$/, replacement: path.join(uiSrc, "components/index.ts") },
      { find: /^@mdreview\/ui\/utils$/, replacement: path.join(uiSrc, "utils/index.ts") },
      { find: /^@mdreview\/ui$/, replacement: path.join(uiSrc, "index.ts") },
    ],
  },
  test: {
    environment: "node",
    environmentMatchGlobs: [
      ["src/__tests__/CommentCard.test.tsx", "happy-dom"],
      ["src/__tests__/CommentForm.test.tsx", "happy-dom"],
      ["src/__tests__/highlightRenderer.test.ts", "happy-dom"],
      ["src/__tests__/anchorUtils.test.ts", "happy-dom"],
      ["src/__tests__/useMdReview.test.ts", "happy-dom"],
      ["src/__tests__/useGutterButtons.test.ts", "happy-dom"],
      ["src/__tests__/useHighlights.test.ts", "happy-dom"],
      ["src/__tests__/useKeyboardShortcuts.test.ts", "happy-dom"],
      ["src/__tests__/ReviewPanel.test.tsx", "happy-dom"],
    ],
    setupFiles: ["src/__tests__/setup.ts"],
    css: {
      modules: {
        classNameStrategy: "non-scoped",
      },
    },
  },
});
