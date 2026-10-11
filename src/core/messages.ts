import type { DeclinedReason } from "./location/types";

/** Every message the palette can show, in its one polite live region (contracts/palette-ui.md). */
export type MessageId =
  | DeclinedReason
  | "noHeadings"
  | "noMatches"
  | "staleTarget"
  | "hostError"
  | "hostErrorPartial"
  | "selectionWarning"
  | "fieldWarning";

const ELSEWHERE = "Put the cursor in the main text, a footnote or an endnote.";
const HEADINGS =
  "References can't go in headings or titles. To allow them, turn on “Allow references in headings” in Settings.";

const TEXTS: Record<MessageId, string> = {
  header: `References can't go in headers. ${ELSEWHERE}`,
  footer: `References can't go in footers. ${ELSEWHERE}`,
  comment: `References can't go in comments. ${ELSEWHERE}`,
  textBox: `References can't go in text boxes. ${ELSEWHERE}`,
  headingParagraph: HEADINGS,
  titleParagraph: HEADINGS,
  selfReference: "A heading can't refer to itself.",
  protected: "This document is protected, so references can't be inserted.",
  tableSelected: "References can't replace a table. Select text, or put the cursor where the reference should go.",
  unknown: `References can't go here. ${ELSEWHERE}`,
  noHeadings:
    "This document has no headings. Headings are listed when they use Word's Heading 1–9 styles or an outline level.",
  noMatches: "No headings match.",
  staleTarget: "That heading has changed since the list was shown. The list has been refreshed; choose again.",
  hostError: "The reference couldn't be inserted. The document hasn't been changed.",
  hostErrorPartial: "Word stopped part-way through inserting the reference. Press Ctrl+Z once to remove anything it wrote.",
  selectionWarning:
    "The selection covers more than one paragraph or a picture. Press Enter again to replace it, or Esc to keep it.",
  fieldWarning: "The cursor is inside a field. Press Enter again to replace the whole field, or Esc to keep it.",
};

export function messageText(id: MessageId): string {
  return TEXTS[id];
}
