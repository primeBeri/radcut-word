import { readFileSync } from "node:fs";
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
 * In the `devpane` mode the task pane URL from the manifest opens the dev launcher instead of
 * the app, so contract, spike and performance panes can be reached inside Word.
 */
function devPaneLauncher(): Plugin {
  return {
    name: "radcut-dev-pane-launcher",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? "";
        // `?app` opens the real app from the launcher.
        if (url.startsWith("/app/taskpane.html") && !url.includes("app=1")) {
          req.url = "/dev/index.html";
        }
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
      svelte({ configFile: resolve(import.meta.dirname, "svelte.config.js") }),
      shortcutsJson(),
      ...(mode === "devpane" ? [devPaneLauncher()] : []),
    ],
    server: { host, port: 3000, strictPort: true, ...(https ? { https } : {}) },
    preview: { host, port: 3000, strictPort: true },
    build: {
      outDir: resolve(import.meta.dirname, "dist"),
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
