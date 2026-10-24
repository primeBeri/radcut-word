// Runs office-addin-debugging start/stop against an ASCII-path copy of manifest.xml.
// Word silently ignores a sideloaded manifest whose path contains non-ASCII characters
// (found when the repository folder was "RAD·CUT"), so the registration points at a copy, wherever
// the repository was cloned.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [command, ...rest] = process.argv.slice(2);
if (command !== "start" && command !== "stop") {
  console.error("usage: node scripts/office-debug.mjs start|stop [office-addin-debugging args]");
  process.exit(2);
}

const dir = join(process.env.LOCALAPPDATA ?? tmpdir(), "xref-dev");
// The copy's own path must be ASCII too (a user name can carry an accent), or Word ignores it again.
if (!/^[ -~]*$/.test(dir)) {
  console.error(`office-debug: ${dir} contains non-ASCII characters, which Word ignores. Set LOCALAPPDATA to an ASCII path.`);
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
const manifest = join(dir, "manifest.xml");
copyFileSync(new URL("../manifest.xml", import.meta.url), manifest);

const cli = createRequire(import.meta.url).resolve("office-addin-debugging/cli.js");
const result = spawnSync(process.execPath, [cli, command, manifest, ...rest], { stdio: "inherit" });
if (result.error) console.error("office-debug: could not run office-addin-debugging:", result.error);
if (result.signal) console.error(`office-debug: office-addin-debugging was stopped by ${result.signal}`);
process.exit(result.status ?? 1);
