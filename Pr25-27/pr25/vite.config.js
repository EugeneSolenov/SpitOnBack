import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: "dist/bundle-report.html",
      gzipSize: true,
      brotliSize: true,
      template: "treemap"
    })
  ],
  server: {
    port: 5174
  }
});
