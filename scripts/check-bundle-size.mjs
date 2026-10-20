// Release-build checks, run after `vite build`:
// - no dev-only page (src/dev/**, src/adapters/office/spikes/**) in the output (Constitution V);
// - no desktop-harness hook (the contract pane's results, the desktop bridge) in any output file;
// - the task pane JavaScript within the 150 KB min+gzip budget (Constitution IV).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGET_BYTES = 150 * 1024; // 153,600
const dist = join(import.meta.dirname, "..", "dist");
const assets = join(dist, "assets");

if (!existsSync(assets)) {
  console.error("check-bundle-size: dist/assets does not exist. Run `vite build` first.");
  process.exit(1);
}

const devPages = readdirSync(dist, { recursive: true })
  .map((name) => relative(dist, join(dist, String(name))).split(sep).join("/"))
  .filter((path) => path.startsWith("dev/") || path.includes("/spikes/"));
if (devPages.length > 0) {
  console.error(`check-bundle-size: dev-only files in the release output: ${devPages.join(", ")}`);
  process.exit(1);
}

// Hooks the desktop harness relies on (specs/002-desktop-test-harness) live only in dev code:
// the dev pages, and the performance runner the dev server's app loads.
const HARNESS_HOOKS = ["__radcutContractResults", "contract-results", "__radcutDesktop", "__radcutPerf"];
const outputFiles = readdirSync(dist, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile());
const leaks = outputFiles.flatMap((entry) => {
  const path = join(entry.parentPath, entry.name);
  const text = readFileSync(path, "latin1");
  return HARNESS_HOOKS.filter((hook) => text.includes(hook)).map((hook) => `${relative(dist, path)} (${hook})`);
});
if (leaks.length > 0) {
  console.error(`check-bundle-size: desktop-harness hooks in the release output: ${leaks.join(", ")}`);
  process.exit(1);
}

const files = readdirSync(assets).filter((name) => name.endsWith(".js"));
if (files.length === 0) {
  console.error("check-bundle-size: no JavaScript found in dist/assets. Run `vite build` first.");
  process.exit(1);
}

let total = 0;
for (const name of files) {
  const size = gzipSync(readFileSync(join(assets, name)), { level: 9 }).length;
  total += size;
  console.log(`  ${name}: ${size.toLocaleString("en-GB")} bytes gzip`);
}

const verdict = total <= BUDGET_BYTES ? "within" : "OVER";
console.log(
  `check-bundle-size: ${total.toLocaleString("en-GB")} of ${BUDGET_BYTES.toLocaleString("en-GB")} bytes (${verdict} budget)`,
);
if (total > BUDGET_BYTES) process.exit(1);
