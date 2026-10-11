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

/** Shared IHostShell contract (contracts/host-ports.md). */
export function defineHostShellContract(
  name: string,
  makeShell: () => Promise<HostShellContractHarness>,
  api: ContractTestApi,
): void {
  api.describe(`IHostShell contract: ${name}`, () => {
    void makeShell;
  });
}
