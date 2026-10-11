import type { Heading } from "../headings/types";
import type { FormatPart, PreviewWarning, ReferencePreview } from "./types";

export interface PreviewContext {
  /** From the insertion point: the heading just before the cursor, or null if none. */
  readonly precedingHeadingOrder: number | null;
}

/** Word decides above/below for these itself; the add-in cannot tell before inserting. */
const POSITION_UNKNOWN: ReadonlySet<Heading["location"]> = new Set(["textBox", "header", "footer"]);

/**
 * What a reference will display now (FR-015). Page cannot be known before insertion; above/below
 * compares the target with the heading before the cursor.
 */
export function previewReference(
  parts: readonly FormatPart[],
  target: Heading,
  context: PreviewContext,
): ReferencePreview {
  const warnings = new Set<PreviewWarning>();
  const text = parts
    .map((part) => {
      switch (part.kind) {
        case "literal":
          return part.text;
        case "text":
          return target.text;
        case "number":
          if (target.number === null) warnings.add("noNumber");
          return target.number ?? "";
        case "page":
          warnings.add("pageUnknown");
          return "?";
        case "aboveBelow":
          if (POSITION_UNKNOWN.has(target.location)) {
            warnings.add("positionUnknown");
            return "above/below ?";
          }
          return context.precedingHeadingOrder !== null && target.order <= context.precedingHeadingOrder
            ? "above"
            : "below";
      }
    })
    .join("");
  return { text, warnings: [...warnings] };
}
