import type { ISettingsStore } from "../ports/settings-store";
import { KEEP_ONE_FORMAT, templateProblems, TOO_MANY_TEMPLATES, type TemplateProblem } from "../settings/format-list";
import type { UserSettings } from "../settings/types";
import { MAX_TEMPLATES } from "../settings/user-settings";

/** A reason a setting cannot be saved, shown next to its field (a template's name or text: `templateId` says which). */
export type SettingsError =
  | { readonly field: "formats" | "templates"; readonly message: string }
  | TemplateProblem;

export type SaveSettingsResult =
  | { readonly ok: true }
  /** `failed`: valid, but the store could not write them (logged locally). */
  | { readonly ok: false; readonly errors: readonly SettingsError[]; readonly failed?: true };

/** Names as they will be shown and compared: without surrounding spaces. */
const trimmed = (settings: UserSettings): UserSettings => ({
  ...settings,
  templates: settings.templates.map((t) => ({ ...t, label: t.label.trim() })),
});

/** Every reason `settings` cannot be saved, templates first in their order; empty when they can. */
export function validateSettings(settings: UserSettings): SettingsError[] {
  const errors: SettingsError[] = templateProblems(settings.templates);
  if (settings.formatOrder.length === 0) {
    errors.push({ field: "formats", message: KEEP_ONE_FORMAT });
  }
  if (settings.templates.length > MAX_TEMPLATES) {
    errors.push({ field: "templates", message: TOO_MANY_TEMPLATES });
  }
  return errors;
}

/** Validate, then persist through the store (FR-021); nothing is written if anything is invalid. */
export async function saveSettings(store: ISettingsStore, unsaved: UserSettings): Promise<SaveSettingsResult> {
  const settings = trimmed(unsaved);
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
