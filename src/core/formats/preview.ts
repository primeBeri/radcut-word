import type { Heading } from "../headings/types";
import type { InsertionLocation, InsertionPoint } from "../location/types";
import { partsForHeading } from "./parts";
import type { FormatPart, PreviewWarning, ReferencePreview } from "./types";

/** From the insertion point: where the cursor is, and the heading just before it. */
export type PreviewContext = Pick<InsertionPoint, "precedingHeadingOrder" | "location">;

/** Word decides above/below for targets here itself; the add-in cannot tell before inserting. */
const POSITION_UNKNOWN: ReadonlySet<Heading["location"]> = new Set(["textBox", "header", "footer"]);

/** Shown for a page part: Word only knows the page once the field is in the document. */
export const PAGE_PLACEHOLDER = "{page}";

/** Shown for above/below where the add-in cannot tell which; Word decides once the field is in. */
export const POSITION_PLACEHOLDER = "{above/below}";

/** Cursor places outside the main text, where the gateways do not count headings, so above/below is not known. */
const CURSOR_POSITION_UNKNOWN: ReadonlySet<InsertionLocation> = new Set(["footnote", "endnote", "header", "footer", "textBox"]);

/**
 * What a reference will display now (FR-015). Page cannot be known before insertion, so it shows
 * as its template placeholder, {page}; above/below
 * compares the target with the heading before the cursor. An unnumbered heading's number and its
 * padding are left out, as they are when inserting (partsForHeading, T145).
 */
export function previewReference(
  parts: readonly FormatPart[],
  target: Heading,
  context: PreviewContext,
): ReferencePreview {
  const warnings = new Set<PreviewWarning>();
  if (target.number === null && parts.some((part) => part.kind === "number")) warnings.add("noNumber");
  const text = partsForHeading(parts, target.number)
    .map((part) => {
      switch (part.kind) {
        case "literal":
          return part.text;
        case "text":
          return target.text;
        case "number":
          return target.number ?? "";
        case "page":
          warnings.add("pageUnknown");
          return PAGE_PLACEHOLDER;
        case "aboveBelow":
          if (POSITION_UNKNOWN.has(target.location) || CURSOR_POSITION_UNKNOWN.has(context.location)) {
            warnings.add("positionUnknown");
            return POSITION_PLACEHOLDER;
          }
          return context.precedingHeadingOrder !== null && target.order <= context.precedingHeadingOrder
            ? "above"
            : "below";
      }
    })
    .join("");
  return { text, warnings: [...warnings] };
}
