import type { FormatPart } from "./types";

/** Merge adjacent literals and drop empty ones (data-model "FormatPart"). */
export function normaliseParts(parts: readonly FormatPart[]): FormatPart[] {
  const result: FormatPart[] = [];
  for (const part of parts) {
    if (part.kind !== "literal") {
      result.push(part);
      continue;
    }
    if (part.text === "") continue;
    const last = result.at(-1);
    if (last?.kind === "literal") result[result.length - 1] = { kind: "literal", text: last.text + part.text };
    else result.push(part);
  }
  return result;
}

const isField = (part: FormatPart): boolean => part.kind !== "literal";
const textOf = (parts: readonly FormatPart[]): string => parts.map((p) => (p.kind === "literal" ? p.text : "")).join("");

/**
 * The parts to insert for a heading with this number (T145). Word shows "0" for the number of an
 * unnumbered heading, so for one each number part goes, with what pads it: the literal text from
 * it to the next field (or the end), and an opening bracket before it with all that follows the
 * bracket. Text before the number, such as "§" or "section", stays as a visual cue; it is followed
 * by one space if the padding had whitespace and a field comes next. Empty when the number was
 * the only field.
 */
export function partsForHeading(parts: readonly FormatPart[], number: string | null): readonly FormatPart[] {
  if (number !== null) return parts;
  const result = [...parts];
  for (let i = result.findIndex((p) => p.kind === "number"); i >= 0; i = result.findIndex((p) => p.kind === "number")) {
    let start = i;
    while (start > 0 && !isField(result[start - 1]!)) start--;
    let end = i + 1;
    while (end < result.length && !isField(result[end]!)) end++;
    const before = textOf(result.slice(start, i));
    const bracket = before.search(/[([{][^([{]*$/);
    const kept = (bracket >= 0 ? before.slice(0, bracket) : before).trimEnd();
    const padded = /\s/.test(before.slice(kept.length) + textOf(result.slice(i + 1, end)));
    const join = padded && end < result.length && (kept !== "" || start > 0) ? " " : "";
    result.splice(start, end - start, { kind: "literal", text: kept + join });
  }
  return result.some(isField) ? normaliseParts(result) : [];
}
