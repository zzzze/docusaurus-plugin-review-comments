import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  build: {
    outDir: path.resolve(__dirname, "../dist"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@plugin": path.resolve(__dirname, "../../plugin/src"),
    },
  },
});
