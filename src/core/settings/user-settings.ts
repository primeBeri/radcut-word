import { DEFAULT_FORMAT_ID, formatById } from "../formats/built-ins";
import { DEFAULT_SETTINGS } from "./defaults";
import { formatsFor, MAX_TEMPLATES, templateProblems } from "./templates";
import type { TemplateDefinition, UserSettings } from "./types";

export { MAX_TEMPLATES };

export interface LoadedSettings {
  readonly settings: UserSettings;
  /**
   * "settingsReset" when stored settings were unreadable or of an unknown version and the defaults
   * are used; "templateDropped" when a stored template no longer parses or repeats a name and is left out.
   */
  readonly notice: "settingsReset" | "templateDropped" | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function readTemplate(value: unknown): TemplateDefinition | null {
  if (!isRecord(value)) return null;
  const { id, label, source } = value;
  if (typeof id !== "string" || typeof label !== "string" || typeof source !== "string") return null;
  return { id, label, source };
}

/** Whether `id` names a built-in format or one of `templates` that parses. */
export function formatExists(id: string, templates: readonly TemplateDefinition[]): boolean {
  return formatById(id) !== undefined || formatsFor({ templates }).some((f) => f.id === id);
}

/** The templates that are valid each in turn: a later one repeating an earlier name is left out. */
function usableTemplates(templates: readonly TemplateDefinition[]): TemplateDefinition[] {
  const kept: TemplateDefinition[] = [];
  for (const template of templates) {
    if (templateProblems([...kept, template]).length === 0) kept.push(template);
  }
  return kept;
}

/** Version 1 settings from `raw`, or null if it is not a valid version 1 value. */
function readVersion1(raw: Record<string, unknown>): LoadedSettings | null {
  const { defaultFormatId, templates, allowReferencesInHeadings, showHeadingsOutsideMainText } = raw;
  if (typeof defaultFormatId !== "string" || !Array.isArray(templates) || templates.length > MAX_TEMPLATES) return null;
  if (typeof allowReferencesInHeadings !== "boolean" || typeof showHeadingsOutsideMainText !== "boolean") return null;
  const read = templates.map(readTemplate);
  if (read.some((t) => t === null)) return null;
  const valid = usableTemplates(read as TemplateDefinition[]);
  const settings: UserSettings = {
    schemaVersion: 1,
    // A deleted template leaves the default pointing nowhere: fall back quietly (data-model).
    defaultFormatId: formatExists(defaultFormatId, valid) ? defaultFormatId : DEFAULT_FORMAT_ID,
    templates: valid,
    allowReferencesInHeadings,
    showHeadingsOutsideMainText,
  };
  return { settings, notice: valid.length < templates.length ? "templateDropped" : null };
}

/**
 * The user's settings from what the store returned (FR-021, contracts/host-ports.md): validated
 * here, not in the adapter. Nothing stored gives the defaults; unreadable data or an unknown
 * version gives the defaults with a notice. Version 1 is the only version so far, so there is
 * nothing to migrate yet; an older version would be migrated here. Templates are checked as on
 * save, and one that fails is left out (FR-018).
 */
export function loadUserSettings(raw: unknown): LoadedSettings {
  if (raw === null || raw === undefined) return { settings: DEFAULT_SETTINGS, notice: null };
  const loaded = isRecord(raw) && raw.schemaVersion === 1 ? readVersion1(raw) : null;
  return loaded ?? { settings: DEFAULT_SETTINGS, notice: "settingsReset" };
}
