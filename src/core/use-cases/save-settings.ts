import type { ISettingsStore } from "../ports/settings-store";
import type { UserSettings } from "../settings/types";
import { formatExists, MAX_TEMPLATES } from "../settings/user-settings";

/** A reason a setting cannot be saved, shown next to its field. */
export interface SettingsError {
  readonly field: "defaultFormatId" | "templates";
  readonly message: string;
}

export type SaveSettingsResult =
  | { readonly ok: true }
  /** `failed`: valid, but the store could not write them (logged locally). */
  | { readonly ok: false; readonly errors: readonly SettingsError[]; readonly failed?: true };

/** Every reason `settings` cannot be saved; empty when they can. */
export function validateSettings(settings: UserSettings): SettingsError[] {
  const errors: SettingsError[] = [];
  if (!formatExists(settings.defaultFormatId, settings.templates)) {
    errors.push({ field: "defaultFormatId", message: "Choose a default format." });
  }
  if (settings.templates.length > MAX_TEMPLATES) {
    errors.push({ field: "templates", message: `There can be at most ${MAX_TEMPLATES} templates.` });
  }
  return errors;
}

/** Validate, then persist through the store (FR-021); nothing is written if anything is invalid. */
export async function saveSettings(store: ISettingsStore, settings: UserSettings): Promise<SaveSettingsResult> {
  const errors = validateSettings(settings);
  if (errors.length > 0) return { ok: false, errors };
  try {
    await store.saveSettings(settings);
    return { ok: true };
  } catch (error) {
    console.error("[radcut:save-settings]", error);
    return { ok: false, errors: [], failed: true };
  }
}
