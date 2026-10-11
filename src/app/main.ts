import "../ui/theme/tokens.css";
import "../ui/theme/base.css";
import "../ui/theme/motion.css";
import { startOfficeHost } from "../adapters/office/bootstrap";
import { OfficeHostShell } from "../adapters/office/office-host-shell";
import { OfficeJsGateway } from "../adapters/office/office-js-gateway";
import { createApp } from "./create-app";

await startOfficeHost();

const target = document.getElementById("app");
if (!target) throw new Error("Task pane markup is missing #app.");
createApp({ gateway: new OfficeJsGateway(), shell: new OfficeHostShell() }, target);
