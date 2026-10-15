/** Word's note reference mark, which starts the first paragraph of every footnote and endnote. */
export const NOTE_REFERENCE_MARK = "\u0002";

/** True for a note's first paragraph as Word reads it (the mark, maybe after whitespace). */
export function startsWithNoteMark(raw: string): boolean {
  return raw.trimStart().startsWith(NOTE_REFERENCE_MARK);
}

/**
 * Heading text as listed and fingerprinted: trimmed, and without a note's leading reference
 * mark (research R7: a heading that opens a footnote reads as "\u0002 Heading…"). Gateways call
 * this when they read headings, so the fake and Word agree.
 */
export function normaliseHeadingText(raw: string): string {
  const trimmed = raw.trim();
  return startsWithNoteMark(trimmed) ? trimmed.slice(NOTE_REFERENCE_MARK.length).trim() : trimmed;
}
