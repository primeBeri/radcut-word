import { headingFingerprint } from "../headings/key";
import type { HeadingLevel } from "../headings/types";
import type {
  Confirmation,
  Declined,
  DeclinedReason,
  InsertionLocation,
  InsertionPoint,
  LocationFacts,
  LocationPolicy,
  SelectionClass,
  SelectionExtent,
} from "./types";

/** The level of a Heading 1–9 style, else of an outline level 1–9; null for anything else (FR-003). */
export function headingLevelOf(styleBuiltIn: string | null, outlineLevel: number | null): HeadingLevel | null {
  const styled = styleBuiltIn === null ? null : /^Heading([1-9])$/.exec(styleBuiltIn);
  if (styled) return Number(styled[1]) as HeadingLevel;
  return outlineLevel !== null && outlineLevel >= 1 && outlineLevel <= 9 ? (outlineLevel as HeadingLevel) : null;
}

/** True for a Heading 1–9 style or an outline level 1–9 (FR-003). */
export function isHeadingParagraph(styleBuiltIn: string | null, outlineLevel: number | null): boolean {
  return headingLevelOf(styleBuiltIn, outlineLevel) !== null;
}

/** What the user must confirm before the selection is replaced, if anything (FR-008a, FR-008b). */
export function confirmationFor(selection: SelectionExtent): Confirmation | null {
  if (selection === "field") return "field";
  return selection === "extended" ? "selection" : null;
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

  const level = headingLevelOf(facts.styleBuiltIn, facts.outlineLevel);
  const title = facts.styleBuiltIn === "Title" || facts.styleBuiltIn === "Subtitle";
  if (level !== null && !policy.allowInHeadings) return declined("headingParagraph");
  if (title && !policy.allowInHeadings) return declined("titleParagraph");
  // The place is fine; what is selected is not (FR-008a).
  if (selection === "table") return declined("tableSelected");

  const headingLocation = location === "tableCellInMain" ? "tableCell" : location;
  return {
    kind: "insertionPoint",
    location,
    selection,
    inHeadingOrder: level !== null ? facts.headingOrder : null,
    inHeadingFingerprint: level !== null ? headingFingerprint({ level, location: headingLocation, text: facts.text }) : null,
    precedingHeadingOrder: facts.precedingHeadingOrder,
  };
}
