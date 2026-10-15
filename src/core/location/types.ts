/**
 * Places where a reference may be inserted (FR-001a). Headers, footers and text boxes from
 * 2026-10-14, as Word's own cross-reference dialog allows; a table cell in one of them reports
 * that story.
 */
export type InsertionLocation = "main" | "footnote" | "endnote" | "tableCellInMain" | "header" | "footer" | "textBox";

/**
 * `inline`: within one paragraph, replaced without warning.
 * `extended`: more than one paragraph, or a picture, shape or content control;
 * replaced only after confirmation (FR-008a).
 * `field`: inside an existing field; the whole field is replaced only after confirmation (FR-008b).
 */
export type SelectionExtent = "none" | "inline" | "extended" | "field";

/** What the user confirms before a selection (FR-008a) or a field (FR-008b) is replaced. */
export type Confirmation = "selection" | "field";

/**
 * What `classifySelection` decides: an extent, or a selection that is declined: one containing a
 * table (FR-008a), or one inside a plain-text content control, where Word allows no fields (FR-001a).
 */
export type SelectionClass = SelectionExtent | "table" | "plainTextControl";

export interface InsertionPoint {
  readonly kind: "insertionPoint";
  readonly location: InsertionLocation;
  readonly selection: SelectionExtent;
  /**
   * Snapshot order of the heading paragraph containing the cursor (only when headings are
   * allowed); null outside the main text, where the gateways do not count headings.
   */
  readonly inHeadingOrder: number | null;
  /**
   * Fingerprint of the heading containing the cursor, in any story, so the palette can leave it
   * out where its order is unknown (FR-001b).
   */
  readonly inHeadingFingerprint: string | null;
  /**
   * Snapshot order of the last heading before the cursor's paragraph, for the above/below
   * preview; null with none before it, and always null outside the main text.
   */
  readonly precedingHeadingOrder: number | null;
}

export type DeclinedReason =
  | "comment"
  | "headingParagraph"
  | "titleParagraph"
  | "selfReference"
  | "protected"
  | "tableSelected"
  | "plainTextControl"
  | "unknown";

export interface Declined {
  readonly kind: "declined";
  readonly reason: DeclinedReason;
}

/** From user settings (FR-001b). */
export interface LocationPolicy {
  readonly allowInHeadings: boolean;
}

/** The story Word reports for the selection (`parentBody.type` and its chain). */
export type SelectionStory =
  | "main"
  | "footnote"
  | "endnote"
  | "header"
  | "footer"
  | "comment"
  | "textBox"
  | "unknown";

/**
 * Raw facts a gateway reads about the cursor position. The core's `classifyLocation` decides,
 * so FakeGateway and OfficeJsGateway cannot disagree on the rules (the facts themselves are
 * checked by the contract suite).
 */
export interface LocationFacts {
  readonly story: SelectionStory;
  /** True when the selection is in a table cell (its story is then the one the table is in). */
  readonly inTable: boolean;
  /** Built-in style of the first selected paragraph, e.g. "Heading2", "Title", "Normal"; null if custom. */
  readonly styleBuiltIn: string | null;
  /** Outline level of the first selected paragraph, 1–9 for headings; null or 10 for body text. */
  readonly outlineLevel: number | null;
  readonly protected: boolean;
  /** Text of the first selected paragraph as headings are listed (`normaliseHeadingText`). */
  readonly text: string;
  /**
   * Main text only (else null): snapshot orders of the heading containing the cursor and of the
   * last heading before the cursor's paragraph, as `headingPositions` counts them.
   */
  readonly headingOrder: number | null;
  readonly precedingHeadingOrder: number | null;
}

/** Raw counts a gateway reads about the selection, for `classifySelection`. */
export interface SelectionFacts {
  readonly isEmpty: boolean;
  readonly paragraphCount: number;
  readonly tableCount: number;
  readonly pictureCount: number;
  readonly shapeCount: number;
  readonly contentControlCount: number;
  /**
   * The innermost content control the selection sits in, and whether the selection is that whole
   * control. Word may report a whole selected control here rather than in `contentControlCount`
   * (hand check, 2026-10-13).
   */
  readonly containingControl: ContainingControl | null;
  /** The cursor or selection lies inside an existing field's result or code. */
  readonly insideField: boolean;
}

/** Word allows no fields in a plain-text content control; a rich-text one takes them. */
export interface ContainingControl {
  readonly kind: "plainText" | "richText" | "other";
  readonly whole: boolean;
}
