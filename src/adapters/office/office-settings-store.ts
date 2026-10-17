import type { ISettingsStore } from "../../core/ports/settings-store";
import type { UserSettings } from "../../core/settings/types";

/** The one versioned key the settings live under (the version is inside the value). */
export const SETTINGS_KEY = "radcut.settings";
const RECENTS_PREFIX = "radcut.recents.";

/** The stored text, parsed if it is JSON, else the text itself: the core validates either. */
function parseRaw(text: string | null): unknown {
  if (text === null) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * ISettingsStore on `OfficeRuntime.storage` (contracts/host-ports.md): per user and add-in, kept
 * on this machine, never in the document and never sent anywhere (FR-021, FR-023). Raw values go
 * back to the core, which validates them. `key` is changed only by the contract run, so it never
 * touches the user's own settings.
 */
export class OfficeSettingsStore implements ISettingsStore {
  constructor(private readonly key: string = SETTINGS_KEY) {}

  async loadSettings(): Promise<unknown> {
    return parseRaw(await OfficeRuntime.storage.getItem(this.key));
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    await OfficeRuntime.storage.setItem(this.key, JSON.stringify(settings));
  }

  async loadRecents(documentId: string): Promise<string[]> {
    const raw = parseRaw(await OfficeRuntime.storage.getItem(RECENTS_PREFIX + documentId));
    return Array.isArray(raw) ? raw.filter((b): b is string => typeof b === "string") : [];
  }

  async saveRecents(documentId: string, bookmarks: readonly string[]): Promise<void> {
    await OfficeRuntime.storage.setItem(RECENTS_PREFIX + documentId, JSON.stringify(bookmarks));
  }
}
