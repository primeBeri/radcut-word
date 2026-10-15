import type { ISettingsStore } from "../../src/core/ports/settings-store";
import type { UserSettings } from "../../src/core/settings/types";

/** In-memory ISettingsStore. `raw` can be set to corrupt data to test the core's loader. */
export class FakeSettingsStore implements ISettingsStore {
  raw: unknown = null;
  readonly recents = new Map<string, string[]>();

  async loadSettings(): Promise<unknown> {
    return structuredClone(this.raw);
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    this.raw = structuredClone(settings);
  }

  async loadRecents(documentId: string): Promise<string[]> {
    return [...(this.recents.get(documentId) ?? [])];
  }

  async saveRecents(documentId: string, bookmarks: readonly string[]): Promise<void> {
    this.recents.set(documentId, [...bookmarks]);
  }
}
