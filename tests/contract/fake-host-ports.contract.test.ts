import { FakeHostShell } from "../fakes/fake-host-shell";
import { FakeSettingsStore } from "../fakes/fake-settings-store";
import { defineHostShellContract, defineSettingsStoreContract } from "./host-ports.contract";
import { vitestApi } from "./vitest-api";

defineSettingsStoreContract("FakeSettingsStore", async () => new FakeSettingsStore(), vitestApi);

defineHostShellContract(
  "FakeHostShell",
  async () => {
    const shell = new FakeHostShell();
    return {
      shell,
      pressShortcut: async () => shell.pressShortcut(),
      clickCrossReferenceButton: async () => shell.clickCrossReferenceButton(),
    };
  },
  vitestApi,
);
