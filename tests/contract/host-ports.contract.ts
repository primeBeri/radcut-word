import type { IHostShell } from "../../src/core/ports/host-shell";
import type { ISettingsStore } from "../../src/core/ports/settings-store";
import type { UserSettings } from "../../src/core/settings/types";
import type { ContractTestApi } from "./test-api";

/** Host-side controls a shell contract case needs: firing the actions the user would trigger. */
export interface HostShellContractHarness {
  readonly shell: IHostShell;
  /** Fire the "OpenPalette" action as the keyboard shortcut does. */
  pressShortcut(): Promise<void>;
  /** Fire the "OpenPalette" action as the ribbon "Cross-reference" button does. */
  clickCrossReferenceButton(): Promise<void>;
  /** Whether the pane is currently shown, as the host reports it. */
  paneVisible(): Promise<boolean>;
  /** Close the pane as the user does, with its × button. */
  closePaneByUser(): Promise<void>;
}

/** A store with nothing in it, and a way to put raw data where it keeps settings. */
export interface SettingsStoreContractHarness {
  readonly store: ISettingsStore;
  /** Store `text` as the settings value, as a damaged or future version would leave it. */
  writeRaw(text: string): Promise<void>;
  /** Node only: the paired FakeGateway's state, to show saving never touches the document. */
  documentState?(): Promise<unknown>;
}

const SETTINGS: UserSettings = {
  schemaVersion: 1,
  defaultFormatId: "number",
  templates: [{ id: "tpl:0d6c1f3e-0000-4000-8000-000000000001", label: "See § number", source: "see § {number}" }],
  allowReferencesInHeadings: true,
  showHeadingsOutsideMainText: false,
};

/** Shared ISettingsStore contract (contracts/host-ports.md, behaviours 1 and 3). */
export function defineSettingsStoreContract(
  name: string,
  makeStore: () => Promise<SettingsStoreContractHarness>,
  api: ContractTestApi,
): void {
  const { describe, it, expect } = api;
  describe(`ISettingsStore contract: ${name}`, () => {
    it("S1. loadSettings() returns null when nothing is stored", async () => {
      const { store } = await makeStore();
      expect(await store.loadSettings()).toBeNull();
    });

    it("S2. saved settings load back exactly", async () => {
      const { store } = await makeStore();
      await store.saveSettings(SETTINGS);
      expect(await store.loadSettings()).toEqual(SETTINGS);
      await store.saveSettings({ ...SETTINGS, defaultFormatId: "text", templates: [] });
      expect(await store.loadSettings()).toEqual({ ...SETTINGS, defaultFormatId: "text", templates: [] });
    });

    it("S3. an unknown version comes back unvalidated, for the core to judge", async () => {
      const h = await makeStore();
      await h.writeRaw(JSON.stringify({ schemaVersion: 7, colour: "teal" }));
      expect(await h.store.loadSettings()).toEqual({ schemaVersion: 7, colour: "teal" });
    });

    it("S4. data that is not JSON comes back as the stored text", async () => {
      const h = await makeStore();
      await h.writeRaw("{not json");
      expect(await h.store.loadSettings()).toBe("{not json");
    });

    (api.environment === "node" ? it : api.skip)("S5. saving settings leaves the document untouched (Node only)", async () => {
      const h = await makeStore();
      if (!h.documentState) throw new Error("No paired gateway.");
      const before = await h.documentState();
      await h.store.saveSettings(SETTINGS);
      expect(await h.documentState()).toEqual(before);
    });
  });
}

/** Office reports visibility changes asynchronously; give it a moment before asserting. */
async function waitFor(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const until = Date.now() + timeoutMs;
  while (!condition() && Date.now() < until) await new Promise((resolve) => setTimeout(resolve, 20));
}

/** Shared IHostShell contract (contracts/host-ports.md). */
export function defineHostShellContract(
  name: string,
  makeShell: () => Promise<HostShellContractHarness>,
  api: ContractTestApi,
): void {
  const { describe, it, expect } = api;
  describe(`IHostShell contract: ${name}`, () => {
    it("one OpenPalette handler serves both the shortcut and the ribbon button", async () => {
      const h = await makeShell();
      let calls = 0;
      h.shell.onOpenPalette(() => calls++);
      // In Word the host runs the handler after the keystroke or click returns.
      await h.pressShortcut();
      await waitFor(() => calls > 0);
      expect(calls).toBe(1);
      await h.clickCrossReferenceButton();
      await waitFor(() => calls > 1);
      expect(calls).toBe(2);
    });

    it("showPane then hidePane leave the pane hidden", async () => {
      const h = await makeShell();
      await h.shell.showPane();
      expect(await h.paneVisible()).toBe(true);
      await h.shell.hidePane();
      expect(await h.paneVisible()).toBe(false);
    });

    it("onPaneHidden fires when hidePane hides the pane", async () => {
      const h = await makeShell();
      let hidden = 0;
      h.shell.onPaneHidden(() => hidden++);
      await h.shell.showPane();
      await h.shell.hidePane();
      await waitFor(() => hidden > 0);
      expect(hidden).toBe(1);
    });

    it("onPaneHidden fires when the user closes the pane", async () => {
      const h = await makeShell();
      let hidden = 0;
      h.shell.onPaneHidden(() => hidden++);
      await h.shell.showPane();
      await h.closePaneByUser();
      await waitFor(() => hidden > 0);
      expect(hidden).toBe(1);
      expect(await h.paneVisible()).toBe(false);
    });

    it("theme() returns isDark and #rrggbb background and foreground", async () => {
      const { shell } = await makeShell();
      const theme = shell.theme();
      expect(typeof theme.isDark).toBe("boolean");
      expect(theme.background).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.foreground).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("prefersReducedMotion() returns a boolean", async () => {
      const { shell } = await makeShell();
      expect(typeof shell.prefersReducedMotion()).toBe("boolean");
    });
  });
}
