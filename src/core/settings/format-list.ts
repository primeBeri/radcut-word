import { BUILT_IN_FORMATS, formatById } from "../formats/built-ins";
import { parseTemplate, validateTemplateLabel } from "../formats/template-parser";
import type { ReferenceFormat } from "../formats/types";
import type { TemplateDefinition, UserSettings } from "./types";

/** At most this many templates (data-model UserSettings). */
export const MAX_TEMPLATES = 20;

export const TOO_MANY_TEMPLATES = `There can be at most ${MAX_TEMPLATES} templates.`;

export const KEEP_ONE_FORMAT = "Keep at least one format.";

/** A template's problem, for the field it belongs next to. */
export interface TemplateProblem {
  readonly field: "templateLabel" | "templateSource";
  readonly templateId: string;
  readonly message: string;
}

/**
 * Every problem with `templates`, in order: each template's name, then its text (FR-018). Names
 * must differ from every built-in's, listed or not, so adding one back never clashes.
 */
export function templateProblems(templates: readonly TemplateDefinition[]): TemplateProblem[] {
  const problems: TemplateProblem[] = [];
  const names: string[] = BUILT_IN_FORMATS.map((f) => f.label);
  for (const template of templates) {
    const label = validateTemplateLabel(template.label, names);
    if (label) problems.push({ field: "templateLabel", templateId: template.id, message: label });
    names.push(template.label);
    const parsed = parseTemplate(template.source);
    if (!parsed.ok) problems.push({ field: "templateSource", templateId: template.id, message: parsed.error });
  }
  return problems;
}

/** A template as a format, or null while it does not parse. */
function templateFormat(template: TemplateDefinition): ReferenceFormat | null {
  const parsed = parseTemplate(template.source);
  return parsed.ok ? { id: template.id, label: template.label, parts: parsed.parts, builtIn: false } : null;
}

/** One row of the format list: a built-in (`template` null) or a template, with its format once it parses. */
export interface FormatListEntry {
  readonly id: string;
  readonly template: TemplateDefinition | null;
  readonly format: ReferenceFormat | null;
}

/** The format list's rows in order, including templates still being written. */
export function formatList(settings: Pick<UserSettings, "formatOrder" | "templates">): FormatListEntry[] {
  return settings.formatOrder.flatMap((id): FormatListEntry[] => {
    const builtIn = formatById(id);
    if (builtIn) return [{ id, template: null, format: builtIn }];
    const template = settings.templates.find((t) => t.id === id);
    return template ? [{ id, template, format: templateFormat(template) }] : [];
  });
}

/** The Tab cycle (FR-015, FR-017): the list's formats in order; a template that does not parse is never offered. */
export function formatsFor(settings: Pick<UserSettings, "formatOrder" | "templates">): readonly ReferenceFormat[] {
  return formatList(settings).flatMap((entry) => (entry.format ? [entry.format] : []));
}

/** The built-ins not in the list, in FR-016 order, for "Add format". */
export function addableBuiltIns(settings: Pick<UserSettings, "formatOrder">): readonly ReferenceFormat[] {
  return BUILT_IN_FORMATS.filter((f) => !settings.formatOrder.includes(f.id));
}

/** `settings` with built-in `id` at the end of the list; unchanged if it is listed or not a built-in. */
export function addBuiltIn(settings: UserSettings, id: string): UserSettings {
  if (!formatById(id) || settings.formatOrder.includes(id)) return settings;
  return { ...settings, formatOrder: [...settings.formatOrder, id] };
}

export type AddTemplateResult =
  | { readonly ok: true; readonly settings: UserSettings }
  | { readonly ok: false; readonly error: string };

/** A blank template at the end of the list, with `id` (`tpl:<uuid>`), to be filled in and saved. */
export function addTemplate(settings: UserSettings, id: string): AddTemplateResult {
  if (settings.templates.length >= MAX_TEMPLATES) return { ok: false, error: TOO_MANY_TEMPLATES };
  return {
    ok: true,
    settings: {
      ...settings,
      formatOrder: [...settings.formatOrder, id],
      templates: [...settings.templates, { id, label: "", source: "" }],
    },
  };
}

/** `settings` with template `id`'s name or text changed. */
export function updateTemplate(
  settings: UserSettings,
  id: string,
  change: Partial<Pick<TemplateDefinition, "label" | "source">>,
): UserSettings {
  return { ...settings, templates: settings.templates.map((t) => (t.id === id ? { ...t, ...change } : t)) };
}

/**
 * `settings` without format `id` in the list; a template is deleted with it, and a remembered
 * format forgotten. The last format is never removed. References already inserted are plain
 * fields and stay as they are.
 */
export function removeFormat(settings: UserSettings, id: string): UserSettings {
  if (!settings.formatOrder.includes(id) || settings.formatOrder.length <= 1) return settings;
  return {
    ...settings,
    formatOrder: settings.formatOrder.filter((f) => f !== id),
    templates: settings.templates.filter((t) => t.id !== id),
    lastFormatId: settings.lastFormatId === id ? null : settings.lastFormatId,
  };
}

/** `settings` with format `id` moved to position `to`, kept within the list. */
export function moveFormat(settings: UserSettings, id: string, to: number): UserSettings {
  const from = settings.formatOrder.indexOf(id);
  if (from < 0) return settings;
  const order = settings.formatOrder.filter((f) => f !== id);
  order.splice(Math.min(Math.max(0, to), order.length), 0, id);
  return { ...settings, formatOrder: order };
}

/** A new template id; `uuid` is injected so the core stays free of host APIs. */
export const templateId = (uuid: string): string => `tpl:${uuid}`;
