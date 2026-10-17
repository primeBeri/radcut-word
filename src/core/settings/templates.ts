import { BUILT_IN_FORMATS, DEFAULT_FORMAT_ID } from "../formats/built-ins";
import { parseTemplate, validateTemplateLabel } from "../formats/template-parser";
import type { ReferenceFormat } from "../formats/types";
import type { TemplateDefinition, UserSettings } from "./types";

/** At most this many templates (data-model UserSettings). */
export const MAX_TEMPLATES = 20;

export const TOO_MANY_TEMPLATES = `There can be at most ${MAX_TEMPLATES} templates.`;

/** A template's problem, for the field it belongs next to. */
export interface TemplateProblem {
  readonly field: "templateLabel" | "templateSource";
  readonly templateId: string;
  readonly message: string;
}

/** Every problem with `templates`, in order: each template's name, then its text (FR-018). */
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

/** The templates that parse, as formats; ones that do not are never offered. */
function templateFormats(templates: readonly TemplateDefinition[]): ReferenceFormat[] {
  return templates.flatMap((t) => {
    const parsed = parseTemplate(t.source);
    return parsed.ok ? [{ id: t.id, label: t.label, parts: parsed.parts, builtIn: false }] : [];
  });
}

/** Every format in cycle order (FR-015, FR-018): the built-ins, then the templates in the order they were made. */
export function formatsFor(settings: Pick<UserSettings, "templates">): readonly ReferenceFormat[] {
  return settings.templates.length === 0 ? BUILT_IN_FORMATS : [...BUILT_IN_FORMATS, ...templateFormats(settings.templates)];
}

export type AddTemplateResult =
  | { readonly ok: true; readonly settings: UserSettings }
  | { readonly ok: false; readonly error: string };

/** A blank template at the end, with `id` (`tpl:<uuid>`), to be filled in and saved. */
export function addTemplate(settings: UserSettings, id: string): AddTemplateResult {
  if (settings.templates.length >= MAX_TEMPLATES) return { ok: false, error: TOO_MANY_TEMPLATES };
  return { ok: true, settings: { ...settings, templates: [...settings.templates, { id, label: "", source: "" }] } };
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
 * `settings` without template `id`; if it was the default, the default is § number text again
 * (data-model UserSettings). References already inserted with it are plain fields and stay as they are.
 */
export function deleteTemplate(settings: UserSettings, id: string): UserSettings {
  return {
    ...settings,
    templates: settings.templates.filter((t) => t.id !== id),
    defaultFormatId: settings.defaultFormatId === id ? DEFAULT_FORMAT_ID : settings.defaultFormatId,
  };
}

/** A new template id; `uuid` is injected so the core stays free of host APIs. */
export const templateId = (uuid: string): string => `tpl:${uuid}`;
