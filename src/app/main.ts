import "../ui/theme/tokens.css";
import "../ui/theme/base.css";
import "../ui/theme/motion.css";
import { startOfficeHost } from "../adapters/office/bootstrap";
import { OfficeHostShell } from "../adapters/office/office-host-shell";
import { OfficeJsGateway } from "../adapters/office/office-js-gateway";
import { OfficeSettingsStore } from "../adapters/office/office-settings-store";
import { createApp } from "./create-app";

const target = document.getElementById("app");
try {
  await startOfficeHost();
  if (!target) throw new Error("Task pane markup is missing #app.");
  createApp({ gateway: new OfficeJsGateway(), shell: new OfficeHostShell(), settings: new OfficeSettingsStore() }, target);
} catch (error) {
  // Without this the shortcut would silently do nothing: say so in the pane, and log it locally.
  console.error("[radcut:start]", error);
  if (target) target.textContent = "RAD·CUT couldn't start. Close the pane and reopen the document to try again.";
}
