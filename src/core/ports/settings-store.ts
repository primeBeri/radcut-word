import type { UserSettings } from "../settings/types";

/**
 * Per-user storage outside the document (contracts/host-ports.md). The adapter stores and
 * returns raw values; validation and migration are core logic, so `loadSettings` returns the
 * stored value unvalidated (possibly corrupt or of an unknown version), or null when nothing is
 * stored.
 */
export interface ISettingsStore {
  loadSettings(): Promise<unknown>;
  saveSettings(settings: UserSettings): Promise<void>;
  /** [] for an unknown document. Unsaved documents never reach the store. */
  loadRecents(documentId: string): Promise<string[]>;
  saveRecents(documentId: string, bookmarks: readonly string[]): Promise<void>;
}
