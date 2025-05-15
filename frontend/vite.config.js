// vite.config.js
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    fs: {
      strict: true,
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
      },
    },
  },
  optimizeDeps: {
    exclude: ["uploads/*"],
  },
});
