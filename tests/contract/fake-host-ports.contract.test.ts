import { FakeHostShell } from "../fakes/fake-host-shell";
import { fakeSettingsStoreHarness } from "./fake-harness";
import { defineHostShellContract, defineSettingsStoreContract } from "./host-ports.contract";
import { vitestApi } from "./vitest-api";

defineSettingsStoreContract("FakeSettingsStore", fakeSettingsStoreHarness, vitestApi);

defineHostShellContract(
  "FakeHostShell",
  async () => {
    const shell = new FakeHostShell();
    // As Word reports it (research R4).
    shell.inUse.add("ctrl+alt+k");
    return {
      shell,
      pressShortcut: async () => shell.pressShortcut(),
      clickCrossReferenceButton: async () => shell.clickCrossReferenceButton(),
      paneVisible: async () => shell.visible,
      closePaneByUser: async () => shell.closePaneByUser(),
      signOut: async () => {
        shell.customisable = false;
      },
    };
  },
  vitestApi,
);
