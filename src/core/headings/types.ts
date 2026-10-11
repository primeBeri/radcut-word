/** Heading level from a built-in Heading 1–9 style or outline level 1–9. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Where a heading sits. Anything but `main` is outside the main text flow (FR-003a). */
export type HeadingLocation =
  | "main"
  | "tableCell"
  | "textBox"
  | "footnote"
  | "endnote"
  | "header"
  | "footer";

/**
 * Stable identity of a heading (Constitution I: keyed by bookmark name, never by position or
 * text). A provisional key is valid only within the snapshot it came from; once a bookmark is
 * created the heading's key becomes the bookmark key.
 */
export type HeadingKey =
  | { readonly kind: "bookmark"; readonly name: string }
  | {
      readonly kind: "provisional";
      readonly order: number;
      /** level + location + text when the snapshot was taken. */
      readonly fingerprint: string;
    };

export interface Heading {
  readonly key: HeadingKey;
  readonly level: HeadingLevel;
  /** Paragraph text, trimmed; may be empty. */
  readonly text: string;
  /** Displayed number such as "4.3"; null if unnumbered. Display and matching only. */
  readonly number: string | null;
  /** 0-based position among headings in document (story) order, valid for one snapshot. */
  readonly order: number;
  readonly location: HeadingLocation;
  /** Usable bookmark already on the heading, if any. */
  readonly bookmark: string | null;
}

export interface HeadingSnapshot {
  /** Document URL, or null for unsaved documents. */
  readonly documentId: string | null;
  /** In document order; `order` is 0..n-1 without gaps. */
  readonly headings: readonly Heading[];
  /** Monotonic timestamp, for cache freshness. */
  readonly takenAt: number;
}
