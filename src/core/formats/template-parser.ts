import { normaliseParts } from "./parts";
import type { FormatPart } from "./types";

/** Longest template and template name (contracts/format-templates.md). */
export const MAX_TEMPLATE_LENGTH = 200;
export const MAX_LABEL_LENGTH = 40;

const NAMES = "{number}, {text}, {page} or {abovebelow}";

/** The fixed error texts (contracts/format-templates.md; the two name-length texts fill a gap there). */
export const TEMPLATE_TEXT = {
  noPlaceholder: `Add at least one of ${NAMES}.`,
  unknownPlaceholder: (name: string) => `Unknown placeholder {${name}}. Use ${NAMES}.`,
  unmatchedBrace: "Unmatched { or }. Write {{ or }} for a literal brace.",
  tooLong: `Templates can be up to ${MAX_TEMPLATE_LENGTH} characters.`,
  duplicateLabel: "A format with this name already exists.",
  noLabel: "Give the template a name.",
  labelTooLong: `Names can be up to ${MAX_LABEL_LENGTH} characters.`,
} as const;

const PLACEHOLDERS: Readonly<Record<string, FormatPart>> = {
  number: { kind: "number" },
  text: { kind: "text" },
  page: { kind: "page" },
  abovebelow: { kind: "aboveBelow" },
};

export type ParsedTemplate =
  | { readonly ok: true; readonly parts: readonly FormatPart[] }
  | { readonly ok: false; readonly error: string };

/**
 * A template string as format parts (FR-018): `{name}` is a placeholder, case-insensitive; `{{` and
 * `}}` are literal braces. Each placeholder becomes its own part, so a repeated one is its own field.
 */
export function parseTemplate(source: string): ParsedTemplate {
  if (source.length > MAX_TEMPLATE_LENGTH) return { ok: false, error: TEMPLATE_TEXT.tooLong };
  const parts: FormatPart[] = [];
  let literal = "";
  for (let i = 0; i < source.length; ) {
    const pair = source.slice(i, i + 2);
    if (pair === "{{" || pair === "}}") {
      literal += pair[0];
      i += 2;
    } else if (source[i] === "}") {
      return { ok: false, error: TEMPLATE_TEXT.unmatchedBrace };
    } else if (source[i] === "{") {
      const close = source.indexOf("}", i + 1);
      const name = close < 0 ? null : source.slice(i + 1, close);
      if (name === null || name.includes("{")) return { ok: false, error: TEMPLATE_TEXT.unmatchedBrace };
      const part = PLACEHOLDERS[name.toLowerCase()];
      if (!part) return { ok: false, error: TEMPLATE_TEXT.unknownPlaceholder(name) };
      if (literal) parts.push({ kind: "literal", text: literal });
      literal = "";
      parts.push(part);
      i = close + 1;
    } else {
      literal += source[i];
      i += 1;
    }
  }
  if (literal) parts.push({ kind: "literal", text: literal });
  if (!parts.some((p) => p.kind !== "literal")) return { ok: false, error: TEMPLATE_TEXT.noPlaceholder };
  return { ok: true, parts: normaliseParts(parts) };
}

/** Why `label` cannot name a template, or null: 1–40 characters, unlike every name in `others` (case-insensitive). */
export function validateTemplateLabel(label: string, others: readonly string[]): string | null {
  const name = label.trim();
  if (name === "") return TEMPLATE_TEXT.noLabel;
  if (name.length > MAX_LABEL_LENGTH) return TEMPLATE_TEXT.labelTooLong;
  const key = name.toLowerCase();
  return others.some((other) => other.trim().toLowerCase() === key) ? TEMPLATE_TEXT.duplicateLabel : null;
}
