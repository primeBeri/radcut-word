import type { ISettingsStore } from "../../src/core/ports/settings-store";
import { withDocumentRecents, type DocumentRecents } from "../../src/core/recents/recent-headings";
import type { UserSettings } from "../../src/core/settings/types";

/**
 * In-memory ISettingsStore. `raw` can be set to corrupt data to test the core's loader. Recents
 * are kept as OfficeSettingsStore keeps them: one list, at most 50 documents, by the core's rule.
 */
export class FakeSettingsStore implements ISettingsStore {
  raw: unknown = null;
  recents: DocumentRecents[] = [];

  async loadSettings(): Promise<unknown> {
    return structuredClone(this.raw);
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    this.raw = structuredClone(settings);
  }

  async loadRecents(documentId: string): Promise<string[]> {
    return [...(this.recents.find((e) => e.documentId === documentId)?.bookmarks ?? [])];
  }

  async saveRecents(documentId: string, bookmarks: readonly string[]): Promise<void> {
    this.recents = withDocumentRecents(this.recents, documentId, bookmarks);
  }
}
