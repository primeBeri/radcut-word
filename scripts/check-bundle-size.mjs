// Fails the build if the task pane JavaScript exceeds the 150 KB min+gzip budget
// (Constitution IV). Run after `vite build`; dev-only panes are not in the release output.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGET_BYTES = 150 * 1024; // 153,600
const assets = join(import.meta.dirname, "..", "dist", "assets");

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
