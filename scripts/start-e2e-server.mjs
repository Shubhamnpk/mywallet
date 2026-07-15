// Starts the Next.js dev server for E2E tests, but only if one isn't already running.
import { createServer } from "http";

const HOST = "http://localhost:3000";

// Quick health check
const alive = await fetch(HOST).then(r => r.ok).catch(() => false);

if (alive) {
  console.log("Server already running at", HOST);
  process.exit(0);
}

// Start next dev
import { spawn } from "child_process";
const server = spawn("pnpm", ["dev"], {
  stdio: "inherit",
  env: { ...process.env, PORT: "3000" },
  shell: true,
});

process.on("SIGINT", () => server.kill());
process.on("SIGTERM", () => server.kill());
server.on("exit", (code) => process.exit(code ?? 1));
