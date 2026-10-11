/** Word's note reference mark, which starts the first paragraph of every footnote and endnote. */
const NOTE_REFERENCE_MARK = "\u0002";

/**
 * Heading text as listed and fingerprinted: trimmed, and without a note's leading reference
 * mark (research R7: a heading that opens a footnote reads as "\u0002 Heading…"). Gateways call
 * this when they read headings, so the fake and Word agree.
 */
export function normaliseHeadingText(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith(NOTE_REFERENCE_MARK) ? trimmed.slice(NOTE_REFERENCE_MARK.length).trim() : trimmed;
}
