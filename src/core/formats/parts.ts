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
