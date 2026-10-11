/** Places where a reference may be inserted (FR-001a). */
export type InsertionLocation = "main" | "footnote" | "endnote" | "tableCellInMain";

/**
 * `inline`: within one paragraph, replaced without warning.
 * `extended`: more than one paragraph, or a picture, shape or content control;
 * replaced only after confirmation (FR-008a).
 * `field`: inside an existing field; the whole field is replaced only after confirmation (FR-008b).
 */
export type SelectionExtent = "none" | "inline" | "extended" | "field";

/** What `classifySelection` decides: an extent, or a table selection, which is declined (FR-008a). */
export type SelectionClass = SelectionExtent | "table";

export interface InsertionPoint {
  readonly kind: "insertionPoint";
  readonly location: InsertionLocation;
  readonly selection: SelectionExtent;
  /** Order of the heading paragraph containing the cursor (only when headings are allowed). */
  readonly inHeadingOrder: number | null;
  /** Order of the heading just before the cursor; used for the above/below preview. */
  readonly precedingHeadingOrder: number | null;
}

export type DeclinedReason =
  | "header"
  | "footer"
  | "comment"
  | "textBox"
  | "headingParagraph"
  | "titleParagraph"
  | "selfReference"
  | "protected"
  | "tableSelected"
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
 * so FakeGateway and OfficeJsGateway cannot disagree on the rules.
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
  /** Order of the heading paragraph containing the cursor, if it is a listed heading. */
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
  /** The cursor or selection lies inside an existing field's result or code. */
  readonly insideField: boolean;
}
