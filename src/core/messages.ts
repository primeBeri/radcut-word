import type { Confirmation, DeclinedReason } from "./location/types";

/** Every message the palette can show, in its one polite live region (contracts/palette-ui.md). */
export type MessageId =
  | DeclinedReason
  | "noHeadings"
  | "noMatches"
  | "noNumber"
  | "staleTarget"
  | "hostError"
  | "hostErrorPartial"
  | "selectionWarning"
  | "fieldWarning";

const ELSEWHERE = "Put the cursor in the main text, a footnote or endnote, a header or footer, or a text box.";
const HEADINGS =
  "References can't go in headings or titles. To allow them, turn on “Allow cross references in headings” in Settings.";

const TEXTS: Record<MessageId, string> = {
  comment: `References can't go in comments. ${ELSEWHERE}`,
  headingParagraph: HEADINGS,
  titleParagraph: HEADINGS,
  selfReference: "A heading can't refer to itself.",
  protected: "This document is protected, so references can't be inserted.",
  tableSelected: "References can't replace a table. Select text, or put the cursor where the reference should go.",
  plainTextControl:
    "References can't go inside a plain text content control. Put the cursor outside it, or select the whole control to replace it.",
  unknown: `References can't go here. ${ELSEWHERE}`,
  noHeadings:
    "This document has no headings. Headings are listed when they use Word's Heading 1–9 styles or an outline level.",
  noMatches: "No headings match.",
  noNumber: "This heading has no number. Press Tab for another format.",
  staleTarget: "That heading has changed since the list was shown. The list has been refreshed; choose again.",
  hostError: "The reference couldn't be inserted. The document hasn't been changed.",
  hostErrorPartial: "Word stopped part-way through inserting the reference. Press Ctrl+Z once to remove anything it wrote.",
  selectionWarning:
    "The selection covers more than one paragraph, a picture or a content control. Press Enter again to replace it, or Esc to keep it.",
  fieldWarning: "The cursor is inside a field. Press Enter again to replace the whole field, or Esc to keep it.",
};

/** A warning that a second Enter confirms (FR-008a, FR-008b). */
export type ConfirmationWarning = Extract<MessageId, "selectionWarning" | "fieldWarning">;

export function warningFor(confirmation: Confirmation): ConfirmationWarning {
  return confirmation === "field" ? "fieldWarning" : "selectionWarning";
}

export function isWarning(id: MessageId | null): id is ConfirmationWarning {
  return id === "selectionWarning" || id === "fieldWarning";
}

export function messageText(id: MessageId): string {
  return TEXTS[id];
}
