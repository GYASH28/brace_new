import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787'
    },
    watch: {
      ignored: ["**/dist/**", "**/release/**"],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, "/");
          if (!normalized.includes("node_modules")) return undefined;
          if (normalized.includes("node_modules/lucide-react")) return "icons";
          if (normalized.includes("node_modules/framer-motion") || normalized.includes("node_modules/motion-dom") || normalized.includes("node_modules/motion-utils")) return "animation";
          if (normalized.includes("node_modules/react") || normalized.includes("node_modules/react-dom")) return "react";
          return "vendor";
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
});
