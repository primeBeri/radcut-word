import { DEFAULT_FORMAT_ID, formatById } from "../formats/built-ins";
import { DEFAULT_SETTINGS } from "./defaults";
import type { TemplateDefinition, UserSettings } from "./types";

/** At most this many templates (data-model UserSettings). */
export const MAX_TEMPLATES = 20;

export interface LoadedSettings {
  readonly settings: UserSettings;
  /** "settingsReset" when stored settings were unreadable or of an unknown version and the defaults are used. */
  readonly notice: "settingsReset" | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function readTemplate(value: unknown): TemplateDefinition | null {
  if (!isRecord(value)) return null;
  const { id, label, source } = value;
  if (typeof id !== "string" || typeof label !== "string" || typeof source !== "string") return null;
  return { id, label, source };
}

/** Whether `id` names a built-in format or one of `templates`. */
export function formatExists(id: string, templates: readonly TemplateDefinition[]): boolean {
  return formatById(id) !== undefined || templates.some((t) => t.id === id);
}

/** Version 1 settings from `raw`, or null if it is not a valid version 1 value. */
function readVersion1(raw: Record<string, unknown>): UserSettings | null {
  const { defaultFormatId, templates, allowReferencesInHeadings, showHeadingsOutsideMainText } = raw;
  if (typeof defaultFormatId !== "string" || !Array.isArray(templates) || templates.length > MAX_TEMPLATES) return null;
  if (typeof allowReferencesInHeadings !== "boolean" || typeof showHeadingsOutsideMainText !== "boolean") return null;
  const read = templates.map(readTemplate);
  if (read.some((t) => t === null)) return null;
  const valid = read as TemplateDefinition[];
  return {
    schemaVersion: 1,
    // A deleted template leaves the default pointing nowhere: fall back quietly (data-model).
    defaultFormatId: formatExists(defaultFormatId, valid) ? defaultFormatId : DEFAULT_FORMAT_ID,
    templates: valid,
    allowReferencesInHeadings,
    showHeadingsOutsideMainText,
  };
}

/**
 * The user's settings from what the store returned (FR-021, contracts/host-ports.md): validated
 * here, not in the adapter. Nothing stored gives the defaults; unreadable data or an unknown
 * version gives the defaults with a notice. Version 1 is the only version so far, so there is
 * nothing to migrate yet; an older version would be migrated here. Template sources are checked
 * when templates arrive (US3).
 */
export function loadUserSettings(raw: unknown): LoadedSettings {
  if (raw === null || raw === undefined) return { settings: DEFAULT_SETTINGS, notice: null };
  const settings = isRecord(raw) && raw.schemaVersion === 1 ? readVersion1(raw) : null;
  return settings ? { settings, notice: null } : { settings: DEFAULT_SETTINGS, notice: "settingsReset" };
}
