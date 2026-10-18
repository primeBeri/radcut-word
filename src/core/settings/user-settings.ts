import { BUILT_IN_FORMATS, DEFAULT_FORMAT_ID, formatById } from "../formats/built-ins";
import { DEFAULT_SETTINGS } from "./defaults";
import { formatsFor, MAX_TEMPLATES, templateProblems } from "./format-list";
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

/** The templates that are valid each in turn: a later one repeating an earlier name is left out. */
function usableTemplates(templates: readonly TemplateDefinition[]): TemplateDefinition[] {
  const kept: TemplateDefinition[] = [];
  for (const template of templates) {
    if (templateProblems([...kept, template]).length === 0) kept.push(template);
  }
  return kept;
}

/** What every version stores alike, read and checked; null if any of it is invalid. */
function readShared(raw: Record<string, unknown>) {
  const { templates, allowReferencesInHeadings, showHeadingsOutsideMainText } = raw;
  if (!Array.isArray(templates) || templates.length > MAX_TEMPLATES) return null;
  if (typeof allowReferencesInHeadings !== "boolean" || typeof showHeadingsOutsideMainText !== "boolean") return null;
  const read = templates.map(readTemplate);
  if (read.some((t) => t === null)) return null;
  const valid = usableTemplates(read as TemplateDefinition[]);
  return {
    templates: valid,
    allowReferencesInHeadings,
    showHeadingsOutsideMainText,
    notice: valid.length < templates.length ? ("templateDropped" as const) : null,
  };
}

const isStringList = (value: unknown): value is string[] => Array.isArray(value) && value.every((v) => typeof v === "string");

/**
 * `order` without unknown ids or repeats, with any template it misses at the end (every template
 * is in the list once); the default list if nothing is left (data-model UserSettings).
 */
function usableOrder(order: readonly string[], templates: readonly TemplateDefinition[]): string[] {
  const known = (id: string) => formatById(id) !== undefined || templates.some((t) => t.id === id);
  const kept = [...new Set(order)].filter(known);
  for (const template of templates) if (!kept.includes(template.id)) kept.push(template.id);
  return kept.length > 0 ? kept : [...DEFAULT_SETTINGS.formatOrder];
}

function readVersion2(raw: Record<string, unknown>): LoadedSettings | null {
  const shared = readShared(raw);
  const { formatOrder, rememberLastFormat, lastFormatId } = raw;
  if (!shared || !isStringList(formatOrder) || typeof rememberLastFormat !== "boolean") return null;
  if (lastFormatId !== null && typeof lastFormatId !== "string") return null;
  const order = usableOrder(formatOrder, shared.templates);
  const settings: UserSettings = {
    schemaVersion: 2,
    formatOrder: order,
    templates: shared.templates,
    rememberLastFormat,
    lastFormatId: lastFormatId !== null && order.includes(lastFormatId) ? lastFormatId : null,
    allowReferencesInHeadings: shared.allowReferencesInHeadings,
    showHeadingsOutsideMainText: shared.showHeadingsOutsideMainText,
  };
  return { settings, notice: shared.notice };
}

/**
 * Version 1 had a default format and always every built-in (data-model "Migration from version
 * 1"): keep every format, the default first, then the built-ins and templates in their old order.
 */
function migrateVersion1(raw: Record<string, unknown>): LoadedSettings | null {
  const shared = readShared(raw);
  const { defaultFormatId } = raw;
  if (!shared || typeof defaultFormatId !== "string") return null;
  const all = [...BUILT_IN_FORMATS.map((f) => f.id), ...shared.templates.map((t) => t.id)];
  // A deleted template left the default pointing nowhere: § number text was used then too.
  const first = formatsFor({ formatOrder: all, templates: shared.templates }).some((f) => f.id === defaultFormatId)
    ? defaultFormatId
    : DEFAULT_FORMAT_ID;
  const settings: UserSettings = {
    schemaVersion: 2,
    formatOrder: [first, ...all.filter((id) => id !== first)],
    templates: shared.templates,
    rememberLastFormat: false,
    lastFormatId: null,
    allowReferencesInHeadings: shared.allowReferencesInHeadings,
    showHeadingsOutsideMainText: shared.showHeadingsOutsideMainText,
  };
  return { settings, notice: shared.notice };
}

/**
 * The user's settings from what the store returned (FR-021, contracts/host-ports.md): validated
 * here, not in the adapter. Nothing stored gives the defaults; unreadable data or an unknown
 * version gives the defaults with a notice. Version 1 is migrated. Templates are checked as on
 * save, and one that fails is left out (FR-018).
 */
export function loadUserSettings(raw: unknown): LoadedSettings {
  if (raw === null || raw === undefined) return { settings: DEFAULT_SETTINGS, notice: null };
  let loaded: LoadedSettings | null = null;
  if (isRecord(raw) && raw.schemaVersion === 2) loaded = readVersion2(raw);
  else if (isRecord(raw) && raw.schemaVersion === 1) loaded = migrateVersion1(raw);
  return loaded ?? { settings: DEFAULT_SETTINGS, notice: "settingsReset" };
}
