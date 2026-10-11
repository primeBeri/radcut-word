import type { IHostShell } from "../../src/core/ports/host-shell";
import type { ISettingsStore } from "../../src/core/ports/settings-store";
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

/** Shared ISettingsStore contract (contracts/host-ports.md). */
export function defineSettingsStoreContract(
  name: string,
  makeStore: () => Promise<ISettingsStore>,
  api: ContractTestApi,
): void {
  api.describe(`ISettingsStore contract: ${name}`, () => {
    void makeStore;
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
      await h.pressShortcut();
      expect(calls).toBe(1);
      await h.clickCrossReferenceButton();
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
