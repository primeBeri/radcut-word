import type { ISettingsStore } from "../ports/settings-store";
import type { UserSettings } from "../settings/types";

/** The format the palette opens on if it is listed (FR-017a): the last used while remembered, else null for the first. */
export function startFormatId(settings: UserSettings): string | null {
  return settings.rememberLastFormat ? settings.lastFormatId : null;
}

/**
 * After an insertion in format `formatId`: while "Remember the last used format" is on, store it
 * (FR-017a). Returns the settings now stored; writes nothing when off or already remembered.
 */
export async function rememberFormat(store: ISettingsStore, settings: UserSettings, formatId: string): Promise<UserSettings> {
  if (!settings.rememberLastFormat || settings.lastFormatId === formatId) return settings;
  const next = { ...settings, lastFormatId: formatId };
  await store.saveSettings(next);
  return next;
}
