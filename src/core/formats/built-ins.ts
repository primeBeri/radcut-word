import type { FormatPart, ReferenceFormat } from "./types";

const literal = (text: string): FormatPart => ({ kind: "literal", text });
const NUMBER: FormatPart = { kind: "number" };
const TEXT: FormatPart = { kind: "text" };
const PAGE: FormatPart = { kind: "page" };
const ABOVE_BELOW: FormatPart = { kind: "aboveBelow" };

const builtIn = (id: string, label: string, parts: FormatPart[]): ReferenceFormat => ({
  id,
  label,
  parts,
  builtIn: true,
});

/** The built-in formats in FR-016 order, which is also the start of the Tab cycle (FR-015). */
export const BUILT_IN_FORMATS: readonly ReferenceFormat[] = [
  builtIn("text", "Text", [TEXT]),
  builtIn("number", "Number", [NUMBER]),
  builtIn("numberText", "Number + text", [NUMBER, literal(" "), TEXT]),
  builtIn("sectionNumberText", "§ number text", [literal("§ "), NUMBER, literal(" "), TEXT]),
  builtIn("page", "Page", [PAGE]),
  builtIn("aboveBelow", "Above/below", [ABOVE_BELOW]),
  builtIn("textAboveBelow", "Text + above/below", [TEXT, literal(" "), ABOVE_BELOW]),
];

/** The out-of-the-box default (FR-017). */
export const DEFAULT_FORMAT_ID = "sectionNumberText";

export function formatById(id: string): ReferenceFormat | undefined {
  return BUILT_IN_FORMATS.find((f) => f.id === id);
}
