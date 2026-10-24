import type { ISettingsStore } from "../../core/ports/settings-store";
import { readStoredRecents, withDocumentRecents } from "../../core/recents/recent-headings";
import type { UserSettings } from "../../core/settings/types";

/** The one versioned key the settings live under (the version is inside the value). */
export const SETTINGS_KEY = "radcut.settings";
/** Every document's recents in one list, so the core can keep it to 50 documents (data-model RecentHeadings). */
export const RECENTS_KEY = "radcut.recents";

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
 * back to the core, which validates them. The keys are changed only by the contract run, so it
 * never touches the user's own settings or recents.
 */
export class OfficeSettingsStore implements ISettingsStore {
  constructor(
    private readonly key: string = SETTINGS_KEY,
    private readonly recentsKey: string = RECENTS_KEY,
  ) {}

  async loadSettings(): Promise<unknown> {
    return parseRaw(await OfficeRuntime.storage.getItem(this.key));
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    await OfficeRuntime.storage.setItem(this.key, JSON.stringify(settings));
  }

  async loadRecents(documentId: string): Promise<string[]> {
    const entry = (await this.storedRecents()).find((e) => e.documentId === documentId);
    return entry ? [...entry.bookmarks] : [];
  }

  async saveRecents(documentId: string, bookmarks: readonly string[]): Promise<void> {
    const entries = withDocumentRecents(await this.storedRecents(), documentId, bookmarks);
    await OfficeRuntime.storage.setItem(this.recentsKey, JSON.stringify(entries));
  }

  private async storedRecents() {
    return readStoredRecents(parseRaw(await OfficeRuntime.storage.getItem(this.recentsKey)));
  }
}
