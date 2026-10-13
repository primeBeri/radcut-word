import type { Heading } from "../headings/types";
import type { InsertionLocation, InsertionPoint } from "../location/types";
import type { FormatPart, PreviewWarning, ReferencePreview } from "./types";

/** From the insertion point: where the cursor is, and the heading just before it. */
export type PreviewContext = Pick<InsertionPoint, "precedingHeadingOrder" | "location">;

/** Word decides above/below for targets here itself; the add-in cannot tell before inserting. */
const POSITION_UNKNOWN: ReadonlySet<Heading["location"]> = new Set(["textBox", "header", "footer"]);

/** Cursor places where the gateways do not count headings, so above/below is not known. */
const CURSOR_POSITION_UNKNOWN: ReadonlySet<InsertionLocation> = new Set(["footnote", "endnote"]);

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
          if (POSITION_UNKNOWN.has(target.location) || CURSOR_POSITION_UNKNOWN.has(context.location)) {
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
