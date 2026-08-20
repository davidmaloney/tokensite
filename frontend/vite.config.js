import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ["buffer", "process", "util", "stream", "crypto"],
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://backend:4000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
