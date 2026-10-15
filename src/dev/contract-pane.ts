/** Dev-only page: runs a registered contract suite in Word and prints pass/fail per case. */
import { defineDocumentGatewayContract } from "../../tests/contract/document-gateway.contract";
import { fakeGatewayHarness } from "../../tests/contract/fake-harness";
import {
  defineHostShellContract,
  defineSettingsStoreContract,
} from "../../tests/contract/host-ports.contract";
import { FakeHostShell } from "../../tests/fakes/fake-host-shell";
import { FakeSettingsStore } from "../../tests/fakes/fake-settings-store";
import { registerOfficeContracts } from "../adapters/office/dev-registration";
import { registerContract, registeredContracts } from "./contract-registry";
import { formatResultLine, formatSummary, MiniTest } from "./mini-test";

await registerOfficeContracts();

// The fakes run here too, which checks the in-browser shim against the Node results.
registerContract({
  label: "IDocumentGateway: FakeGateway (shim check)",
  define: (api) => defineDocumentGatewayContract("FakeGateway", fakeGatewayHarness, api),
});
registerContract({
  label: "ISettingsStore: FakeSettingsStore (shim check)",
  define: (api) =>
    defineSettingsStoreContract("FakeSettingsStore", async () => new FakeSettingsStore(), api),
});
registerContract({
  label: "IHostShell: FakeHostShell (shim check)",
  define: (api) =>
    defineHostShellContract(
      "FakeHostShell",
      async () => {
        const shell = new FakeHostShell();
        return {
          shell,
          pressShortcut: async () => shell.pressShortcut(),
          clickCrossReferenceButton: async () => shell.clickCrossReferenceButton(),
          paneVisible: async () => shell.visible,
          closePaneByUser: async () => shell.closePaneByUser(),
        };
      },
      api,
    ),
});

const suite = document.querySelector<HTMLSelectElement>("#suite");
const run = document.querySelector<HTMLButtonElement>("#run");
const summary = document.querySelector<HTMLParagraphElement>("#summary");
const list = document.querySelector<HTMLOListElement>("#results");
if (!suite || !run || !summary || !list) throw new Error("Contract pane markup is incomplete.");

registeredContracts().forEach((registration, index) => {
  const option = document.createElement("option");
  option.value = String(index);
  option.textContent = registration.fixture
    ? `${registration.label} (open ${registration.fixture})`
    : registration.label;
  suite.append(option);
});

run.addEventListener("click", async () => {
  const registration = registeredContracts()[Number(suite.value)];
  if (!registration) return;
  list.replaceChildren();
  summary.textContent = "Running…";
  run.disabled = true;
  const runner = new MiniTest();
  registration.define(runner.api);
  const results = await runner.run(
    (result) => {
      const item = document.createElement("li");
      item.className = result.status;
      item.textContent = formatResultLine(result);
      if (result.error) {
        const detail = document.createElement("pre");
        detail.textContent = result.error;
        item.append(detail);
      }
      list.append(item);
    },
    { suite: registration.label, fixture: registration.fixture ?? null },
  );
  // Counts and total, then the slowest cases, one per line.
  summary.replaceChildren(
    ...formatSummary(results).flatMap((line, i) => (i === 0 ? [line] : [document.createElement("br"), line])),
  );
  run.disabled = false;
});
