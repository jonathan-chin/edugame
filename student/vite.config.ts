import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In production the built bundle is served by the API itself (same origin), so no API
// URL is ever baked in. In dev we proxy to the local API so the same relative paths work.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
      "/ws": { target: "ws://localhost:4000", ws: true },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
