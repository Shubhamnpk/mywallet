import { execSync } from "child_process";
import { readFileSync } from "fs";
import { globSync } from "fs";
import { readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const failures = [];

// Advisories fixed locally via pnpm patch but still reported because no patched
// version exists on the registry. Remove an entry here if the override/patch
// becomes unnecessary (i.e. a fixed upstream release is installed).
// - GHSA-jmr9-qjv8-65gv: extract-zip symlink traversal; symlink targets are now
//   validated in patches/extract-zip@2.0.1.patch.
const PATCHED_GHSA_ALLOWLIST = new Set(["GHSA-jmr9-qjv8-65gv"]);

// 1. pnpm audit (high / critical), minus advisories fixed via local patches
let raw = "";
try {
  raw = execSync("pnpm audit --json", { cwd: ROOT, encoding: "utf8" });
} catch (err) {
  // pnpm exits non-zero when vulnerabilities are found; stdout still has the report
  raw = err.stdout ?? "";
}
try {
  const advisories = Object.values(JSON.parse(raw).advisories ?? {});
  const unpatched = advisories.filter(
    (a) => ["high", "critical"].includes(a.severity) && !PATCHED_GHSA_ALLOWLIST.has(a.github_advisory_id)
  );
  if (unpatched.length) {
    for (const a of unpatched) {
      console.error(`[FAIL] ${a.github_advisory_id ?? a.id} ${a.module_name}: ${a.title}`);
    }
    failures.push(`pnpm audit found ${unpatched.length} unpatched high/critical vulnerabilities`);
  } else {
    console.log("[PASS] pnpm audit");
  }
} catch {
  failures.push("pnpm audit could not run");
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
