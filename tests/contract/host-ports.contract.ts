import shortcutsJson from "../../src/app/shortcuts.json";
import type { IHostShell } from "../../src/core/ports/host-shell";
import { displayShortcut, parseCombo } from "../../src/core/settings/shortcut-rules";
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
  /** Node only: make the host refuse customising, as Word does when signed out. */
  signOut?(): Promise<void>;
}

/** The manifest default (src/app/shortcuts.json), which `replace(null)` restores. */
const MANIFEST_DEFAULT = shortcutsJson.shortcuts.find((s) => s.action === "OpenPalette")?.key.default ?? "";
/** Taken by Word (research R4), and the next free choice after the default. */
const WORDS_OWN = "Ctrl+Alt+K";
const FREE = "Ctrl+Alt+J";

/** A store with nothing in it, and a way to put raw data where it keeps settings. */
export interface SettingsStoreContractHarness {
  readonly store: ISettingsStore;
  /** Store `text` as the settings value, as a damaged or future version would leave it. */
  writeRaw(text: string): Promise<void>;
  /** Node only: the paired FakeGateway's state, to show saving never touches the document. */
  documentState?(): Promise<unknown>;
}

const SETTINGS: UserSettings = {
  schemaVersion: 2,
  formatOrder: ["number", "tpl:0d6c1f3e-0000-4000-8000-000000000001", "page"],
  templates: [{ id: "tpl:0d6c1f3e-0000-4000-8000-000000000001", label: "See § number", source: "see § {number}" }],
  rememberLastFormat: true,
  lastFormatId: "page",
  allowReferencesInHeadings: true,
  showHeadingsOutsideMainText: false,
  showRecentHeadings: false,
};

/** Recents of at most this many documents are kept (contracts/host-ports.md behaviour 6). */
const MAX_DOCUMENTS = 50;

/** Shared ISettingsStore contract (contracts/host-ports.md, behaviours 1, 3, 5 and 6). */
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
      const other: UserSettings = { ...SETTINGS, formatOrder: ["text"], templates: [], rememberLastFormat: false, lastFormatId: null };
      await store.saveSettings(other);
      expect(await store.loadSettings()).toEqual(other);
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

    it("R1. saved recents load back as they were, most recent first", async () => {
      const { store } = await makeStore();
      await store.saveRecents("https://example.invalid/a.docx", ["_RCb", "_Ref1"]);
      expect(await store.loadRecents("https://example.invalid/a.docx")).toEqual(["_RCb", "_Ref1"]);
      await store.saveRecents("https://example.invalid/a.docx", ["_RCc"]);
      expect(await store.loadRecents("https://example.invalid/a.docx")).toEqual(["_RCc"]);
    });

    it("R2. recents of different documents are independent", async () => {
      const { store } = await makeStore();
      await store.saveRecents("https://example.invalid/a.docx", ["_RCa"]);
      await store.saveRecents("https://example.invalid/b.docx", ["_RCb"]);
      expect(await store.loadRecents("https://example.invalid/a.docx")).toEqual(["_RCa"]);
      expect(await store.loadRecents("https://example.invalid/b.docx")).toEqual(["_RCb"]);
    });

    it("R3. an unknown document has no recents", async () => {
      const { store } = await makeStore();
      expect(await store.loadRecents("https://example.invalid/never.docx")).toEqual([]);
    });

    it(`R4. recents of a ${MAX_DOCUMENTS + 1}st document drop the one saved longest ago`, async () => {
      const { store } = await makeStore();
      const doc = (i: number) => `https://example.invalid/doc-${i}.docx`;
      for (let i = 0; i <= MAX_DOCUMENTS; i++) await store.saveRecents(doc(i), [`_RC${i}`]);
      expect(await store.loadRecents(doc(0))).toEqual([]);
      expect(await store.loadRecents(doc(1))).toEqual(["_RC1"]);
      expect(await store.loadRecents(doc(MAX_DOCUMENTS))).toEqual([`_RC${MAX_DOCUMENTS}`]);
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

    it("K1. shortcut.current() is a combination the core can read, or null; manifestDefault is the shortcuts.json default", async () => {
      const { shell } = await makeShell();
      const current = await shell.shortcut.current();
      if (current !== null) expect(parseCombo(current)).not.toBeNull();
      expect(shell.shortcut.manifestDefault).toBe(MANIFEST_DEFAULT);
    });

    it("K2. shortcut.canCustomise() returns a boolean", async () => {
      const { shell } = await makeShell();
      expect(typeof (await shell.shortcut.canCustomise())).toBe("boolean");
    });

    (api.environment === "node" ? it : api.skip)("K3. canCustomise() is false when signed out (Node only)", async () => {
      const h = await makeShell();
      if (!h.signOut) throw new Error("No way to sign out.");
      await h.signOut();
      expect(await h.shell.shortcut.canCustomise()).toBe(false);
    });

    it(`K4. isInUse() is true for ${WORDS_OWN}, which Word uses, and false for ${FREE}`, async () => {
      const { shell } = await makeShell();
      expect(await shell.shortcut.isInUse(WORDS_OWN)).toBe(true);
      expect(await shell.shortcut.isInUse(FREE)).toBe(false);
    });

    it(`K5. replace(combo) then current() gives it, or the host refuses and nothing changes; replace(null) restores ${MANIFEST_DEFAULT}`, async () => {
      const { shell } = await makeShell();
      // In Word this is the signed-in user's own setting, roaming with their account.
      if (!(await shell.shortcut.canCustomise())) throw new Error("Sign in to Word to run this case.");
      const shown = async () => displayShortcut((await shell.shortcut.current()) ?? "null");
      const before = await shown();
      try {
        const outcome = await shell.shortcut.replace(FREE);
        expect(await shown()).toBe(outcome === "replaced" ? FREE : before);
      } finally {
        await shell.shortcut.replace(null);
      }
      // Refused (Word 2609, research R4), the shortcut is still the one it was.
      expect([MANIFEST_DEFAULT, before]).toContain(await shown());
    });

    (api.environment === "node" ? it : api.skip)("K6. a host that accepts changes takes the combination, and null restores the default (Node only)", async () => {
      const { shell } = await makeShell();
      expect(await shell.shortcut.replace(FREE)).toBe("replaced");
      expect(displayShortcut((await shell.shortcut.current()) ?? "null")).toBe(FREE);
      expect(await shell.shortcut.replace(null)).toBe("replaced");
      expect(displayShortcut((await shell.shortcut.current()) ?? "null")).toBe(MANIFEST_DEFAULT);
    });
  });
}
