import { execSync } from "child_process";
import { readFileSync } from "fs";
import { globSync } from "fs";
import { readdirSync, statSync } from "fs";
import { join, extname } from "path";

const ROOT = new URL("..", import.meta.url).pathname;
const failures = [];

// 1. pnpm audit (high / critical)
try {
  execSync("pnpm audit --audit-level=high", { stdio: "inherit", cwd: ROOT });
  console.log("[PASS] pnpm audit");
} catch {
  failures.push("pnpm audit found high/critical vulnerabilities");
}

// 2. Hardcoded secret detection (simple static scan)
const SECRET_PATTERNS = [
  /(?:api[Kk]ey|secret|password|token|auth)\s*[:=]\s*['"][^'"]+['"]/,
];
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "public/sw.js"]);
const SKIP_EXTS = new Set([".test.ts", ".spec.ts", ".d.ts"]);

function scanDir(dir) {
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (SKIP_DIRS.has(entry)) continue;
      if (statSync(full).isDirectory()) { scanDir(full); continue; }
      const ext = extname(full);
      if (![".js", ".mjs", ".jsx", ".ts", ".tsx"].includes(ext)) continue;
      if (SKIP_EXTS.has(ext)) continue;
      const content = readFileSync(full, "utf8");
      for (const re of SECRET_PATTERNS) {
        const match = content.match(re);
        if (match) {
          console.warn(`  [WARN] ${full}: ${match[0].slice(0, 80)}`);
          failures.push(`Possible secret in ${full}`);
        }
      }
    }
  } catch { /* skip unreadable */ }
}

console.log("Scanning for hardcoded secrets...");
scanDir(join(ROOT, "app"));
scanDir(join(ROOT, "lib"));
scanDir(join(ROOT, "components"));
scanDir(join(ROOT, "worker"));
if (!failures.some(f => f.includes("secret"))) {
  console.log("[PASS] No hardcoded secrets found");
}

if (failures.length) {
  console.error(`\nFAILURES (${failures.length}):\n${failures.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("\nAll security checks passed.");
}
