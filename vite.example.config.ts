import { defineConfig } from "vite";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  root: resolve(__dirname, "example"),
  base: "/ya-react-eyedropper/",
  build: {
    outDir: resolve(__dirname, "dist-example"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "ya-react-eyedropper": resolve(__dirname, "src/index.ts"),
    },
  },
});
