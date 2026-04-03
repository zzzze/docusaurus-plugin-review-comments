import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const uiSrc = path.resolve(__dirname, "../../ui/src");

export default defineConfig({
  plugins: [tailwindcss(), react()],
  root: __dirname,
  build: {
    outDir: path.resolve(__dirname, "../dist"),
    emptyOutDir: true,
  },
  resolve: {
    alias: [
      { find: /^@mdreview\/ui\/hooks$/, replacement: path.join(uiSrc, "hooks/index.ts") },
      { find: /^@mdreview\/ui\/components$/, replacement: path.join(uiSrc, "components/index.ts") },
      { find: /^@mdreview\/ui\/utils$/, replacement: path.join(uiSrc, "utils/index.ts") },
      { find: /^@mdreview\/ui\/styles\.css$/, replacement: path.join(uiSrc, "styles.css") },
      { find: /^@mdreview\/ui$/, replacement: path.join(uiSrc, "index.ts") },
    ],
  },
});
