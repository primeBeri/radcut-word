import "../ui/theme/tokens.css";
import "../ui/theme/base.css";
import "../ui/theme/motion.css";
import { startOfficeHost } from "../adapters/office/bootstrap";
import { OfficeHostShell } from "../adapters/office/office-host-shell";
import { OfficeJsGateway } from "../adapters/office/office-js-gateway";
import { OfficeSettingsStore } from "../adapters/office/office-settings-store";
import { createApp, type AppPorts } from "./create-app";

const target = document.getElementById("app");
try {
  await startOfficeHost();
  if (!target) throw new Error("Task pane markup is missing #app.");
  let ports: AppPorts = { gateway: new OfficeJsGateway(), shell: new OfficeHostShell(), settings: new OfficeSettingsStore() };
  // The performance runner (T096) times the dev server's app only; the release build drops this.
  // A fault in it must not stop the app, or every harness category would fail at start-up.
  if (import.meta.env.DEV) {
    try {
      ports = (await import("../dev/perf-pane")).installPerfRecorder(ports, target);
    } catch (error) {
      console.error("[radcut:perf-install]", error);
    }
  }
  createApp(ports, target);
} catch (error) {
  // Without this the shortcut would silently do nothing: say so in the pane, and log it locally.
  console.error("[radcut:start]", error);
  if (target) target.textContent = "XRef couldn't start. Close the pane and reopen the document to try again.";
}
