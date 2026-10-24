import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type Plugin } from "vite";

const root = resolve(import.meta.dirname, "src");
const shortcutsFile = resolve(root, "app/shortcuts.json");

/**
 * Serves `src/app/shortcuts.json` at `/shortcuts.json` in dev and emits it there in builds,
 * because the manifest's `<ExtendedOverrides>` points at the site root.
 */
function shortcutsJson(): Plugin {
  return {
    name: "radcut-shortcuts-json",
    configureServer(server) {
      server.middlewares.use("/shortcuts.json", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.end(readFileSync(shortcutsFile));
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "shortcuts.json",
        source: readFileSync(shortcutsFile),
      });
    },
  };
}

/**
 * Emits `THIRD-PARTY-NOTICES.txt` with the licence of every npm package whose code is in the
 * bundle (Svelte's runtime and what it imports), as their licences require copies to carry it.
 * Fails the build for a bundled package without a licence file rather than shipping without it.
 */
function thirdPartyNotices(): Plugin {
  return {
    name: "radcut-third-party-notices",
    generateBundle(_options, bundle) {
      const packageDirs = new Set<string>();
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;
        for (const id of output.moduleIds) {
          const path = id.replace(/^\0/, "").split("?")[0]!.replaceAll("\\", "/");
          const match = /^(.*\/node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(path);
          if (match) packageDirs.add(match[1]!);
        }
      }
      const notices = [...packageDirs]
        .map((dir) => {
          const pkg = JSON.parse(readFileSync(`${dir}/package.json`, "utf8")) as { name: string; version: string; license?: string };
          const licenceFile = readdirSync(dir).find((name) => /^(licen[cs]e|copying)(\.|$)/i.test(name));
          if (!licenceFile) throw new Error(`third-party-notices: ${pkg.name} is bundled but has no licence file`);
          const text = readFileSync(`${dir}/${licenceFile}`, "utf8").trim();
          return { name: pkg.name, text: `${pkg.name} ${pkg.version} (${pkg.license ?? "see below"})\n\n${text}` };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      const rule = `\n\n${"-".repeat(72)}\n\n`;
      this.emitFile({
        type: "asset",
        fileName: "THIRD-PARTY-NOTICES.txt",
        source: `This add-in includes the following third-party software.${rule}${notices.map((n) => n.text).join(rule)}\n`,
      });
    },
  };
}

/**
 * In the `devpane` mode the task pane URL from the manifest opens the dev launcher instead of
 * the app, so contract, spike and performance panes can be reached inside Word.
 */
function devPaneLauncher(): Plugin {
  return {
    name: "radcut-dev-pane-launcher",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? "";
        // `?app=1` opens the real app from the launcher.
        if (url.startsWith("/app/taskpane.html") && !url.includes("app=1")) {
          req.url = "/dev/index.html";
        }
        next();
      });
    },
  };
}

/**
 * With `RADCUT_LOG_REQUESTS=1` (set by the desktop harness), logs every request with its status
 * and time, so a failed add-in install ("failed to download a required resource") shows what
 * Word asked for.
 */
function requestLog(): Plugin {
  return {
    name: "radcut-request-log",
    configureServer(server) {
      if (process.env.RADCUT_LOG_REQUESTS !== "1") return;
      server.middlewares.use((req, res, next) => {
        const started = performance.now();
        const url = req.url ?? "";
        res.on("close", () => {
          const ms = Math.round(performance.now() - started);
          const ended = res.writableFinished ? "" : " (closed before the response ended)";
          console.log(`[request] ${new Date().toISOString()} ${req.method} ${url} ${res.statusCode} ${ms} ms${ended}`);
        });
        next();
      });
    },
  };
}

export default defineConfig(async ({ command, mode }) => {
  // Dev-only pages (launcher, contract pane, spike pane) are entry points only in the `devpane` mode,
  // so the release build never contains src/dev/** or src/adapters/office/spikes/**.
  const devPages: Record<string, string> =
    mode === "devpane"
      ? {
          devLauncher: resolve(root, "dev/index.html"),
          contractPane: resolve(root, "dev/contract-pane.html"),
          spikePane: resolve(root, "adapters/office/spikes/spike-pane.html"),
          spikeDialog: resolve(root, "adapters/office/spikes/spike-dialog.html"),
        }
      : {};

  // Office add-ins must be served over HTTPS; the dev certificate is created by
  // office-addin-dev-certs and bound to localhost only (Constitution V). Listen on
  // 127.0.0.1 rather than "localhost": Node may resolve that to ::1 only, and
  // Office fetches the manifest's resources over IPv4.
  const host = "127.0.0.1";
  const https =
    command === "serve"
      ? await (await import("office-addin-dev-certs")).getHttpsServerOptions()
      : undefined;

  return {
    root,
    publicDir: resolve(root, "app/public"),
    plugins: [
      requestLog(),
      svelte({ configFile: resolve(import.meta.dirname, "svelte.config.js") }),
      shortcutsJson(),
      thirdPartyNotices(),
      ...(mode === "devpane" ? [devPaneLauncher()] : []),
    ],
    server: { host, port: 3000, strictPort: true, ...(https ? { https } : {}) },
    preview: { host, port: 3000, strictPort: true },
    build: {
      // Never the same folder: a dev-pane build left in dist/ would ship the dev pages.
      outDir: resolve(import.meta.dirname, mode === "devpane" ? "dist-dev" : "dist"),
      emptyOutDir: true,
      target: "es2022",
      rolldownOptions: {
        input: {
          taskpane: resolve(root, "app/taskpane.html"),
          ...devPages,
        },
      },
    },
  };
});
