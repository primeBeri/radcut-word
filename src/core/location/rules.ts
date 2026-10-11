import type {
  Declined,
  DeclinedReason,
  InsertionLocation,
  InsertionPoint,
  LocationFacts,
  LocationPolicy,
  SelectionClass,
} from "./types";

/** True for a Heading 1–9 style or an outline level 1–9 (FR-003). */
export function isHeadingParagraph(styleBuiltIn: string | null, outlineLevel: number | null): boolean {
  if (styleBuiltIn !== null && /^Heading[1-9]$/.test(styleBuiltIn)) return true;
  return outlineLevel !== null && outlineLevel >= 1 && outlineLevel <= 9;
}

const declined = (reason: DeclinedReason): Declined => ({ kind: "declined", reason });

/**
 * Decide whether a reference may go at the cursor (FR-001a, FR-001b). Both gateways read raw
 * facts and call this, so the rules exist once.
 */
export function classifyLocation(
  facts: LocationFacts,
  selection: SelectionClass,
  policy: LocationPolicy,
): InsertionPoint | Declined {
  if (facts.protected) return declined("protected");

  let location: InsertionLocation;
  switch (facts.story) {
    case "main":
      location = facts.inTable ? "tableCellInMain" : "main";
      break;
    case "footnote":
    case "endnote":
      location = facts.story;
      break;
    default:
      return declined(facts.story);
  }

  const heading = isHeadingParagraph(facts.styleBuiltIn, facts.outlineLevel);
  const title = facts.styleBuiltIn === "Title" || facts.styleBuiltIn === "Subtitle";
  if (heading && !policy.allowInHeadings) return declined("headingParagraph");
  if (title && !policy.allowInHeadings) return declined("titleParagraph");
  // The place is fine; what is selected is not (FR-008a).
  if (selection === "table") return declined("tableSelected");

  return {
    kind: "insertionPoint",
    location,
    selection,
    inHeadingOrder: heading ? facts.headingOrder : null,
    precedingHeadingOrder: facts.precedingHeadingOrder,
  };
}
