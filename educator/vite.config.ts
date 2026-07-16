import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Served same-origin by the localhost-only educator server in production. In dev we
// proxy to that server (port 4100).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5273,
    proxy: {
      "/api": "http://localhost:4100",
      "/ws": { target: "ws://localhost:4100", ws: true },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
