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

/** The built-in formats in FR-016 order, the order they are offered in to add to the format list. */
export const BUILT_IN_FORMATS: readonly ReferenceFormat[] = [
  builtIn("text", "Text Only", [TEXT]),
  builtIn("number", "Number Only", [NUMBER]),
  builtIn("numberText", "Number & Text", [NUMBER, literal(" "), TEXT]),
  builtIn("sectionNumberText", "§ Number & Text", [literal("§ "), NUMBER, literal(" "), TEXT]),
  builtIn("page", "Page Number", [PAGE]),
  builtIn("aboveBelow", "Above/Below", [ABOVE_BELOW]),
  builtIn("textAboveBelow", "Text + Above/Below", [TEXT, literal(" "), ABOVE_BELOW]),
];

/** The format the palette opens on out of the box (FR-017): the first in the default list. */
export const DEFAULT_FORMAT_ID = "sectionNumberText";

/** The format list out of the box (FR-016); the other built-ins are added on request. */
export const DEFAULT_FORMAT_ORDER: readonly string[] = [DEFAULT_FORMAT_ID, "number", "text", "numberText"];

export function formatById(id: string): ReferenceFormat | undefined {
  return BUILT_IN_FORMATS.find((f) => f.id === id);
}

/** The default list's formats, in order. */
export const DEFAULT_FORMATS: readonly ReferenceFormat[] = DEFAULT_FORMAT_ORDER.map((id) => formatById(id)!);
