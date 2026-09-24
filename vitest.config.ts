import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  // Lets tunnel URLs (ngrok subdomain changes on every restart) reach the server.
  server: {
    allowedHosts: [".ngrok-free.app", ".ngrok.io"],
  },
  test: {
    environment: "jsdom",
    include: ["tests/unit/*.test.ts", "tests/unit/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
})
