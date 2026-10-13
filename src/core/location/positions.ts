/** A paragraph of the main text, as far as heading positions are concerned. */
export interface PositionParagraph {
  /** Heading 1–9 style or outline level 1–9. */
  readonly heading: boolean;
  /** Shown as a tracked deletion, so not in the heading list. */
  readonly deleted: boolean;
}

export interface HeadingPositions {
  /** Snapshot order of the heading containing the cursor, or null. */
  readonly headingOrder: number | null;
  /** Snapshot order of the last heading before the cursor's paragraph, or null. */
  readonly precedingHeadingOrder: number | null;
}

/**
 * Heading orders around the cursor, from the main text's paragraphs from its start through the
 * cursor's own paragraph (the last item). Counted as the heading list counts: tracked-deleted
 * headings are skipped, so the orders index the `readHeadings` snapshot. Main-text headings come
 * first in that snapshot, so no other story affects them.
 */
export function headingPositions(paragraphs: readonly PositionParagraph[]): HeadingPositions {
  const live = (p: PositionParagraph | undefined) => p !== undefined && p.heading && !p.deleted;
  const own = live(paragraphs.at(-1));
  const before = paragraphs.slice(0, -1).filter(live).length;
  return { headingOrder: own ? before : null, precedingHeadingOrder: before > 0 ? before - 1 : null };
}
