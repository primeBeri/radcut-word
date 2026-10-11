// Runs office-addin-debugging start/stop against an ASCII-path copy of manifest.xml.
// Word silently ignores a sideloaded manifest whose path contains non-ASCII characters
// (the repository folder is "RAD·CUT"), so the registration must point elsewhere.
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

const dir = join(process.env.LOCALAPPDATA ?? tmpdir(), "radcut-dev");
mkdirSync(dir, { recursive: true });
const manifest = join(dir, "manifest.xml");
copyFileSync(new URL("../manifest.xml", import.meta.url), manifest);

const cli = createRequire(import.meta.url).resolve("office-addin-debugging/cli.js");
const result = spawnSync(process.execPath, [cli, command, manifest, ...rest], { stdio: "inherit" });
process.exit(result.status ?? 1);
