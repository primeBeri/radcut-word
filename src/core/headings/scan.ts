import { normaliseHeadingText } from "./normalise-text";

/** One tracked deletion on a heading's paragraph, as a gateway reads it. */
export interface TrackedDeletion {
  /** The deletion's range covers the heading's text. */
  readonly covers: boolean;
  readonly text: string;
}

/**
 * True when tracked deletions remove a heading, so it is not listed (FR-003, research R9).
 * Position decides first: a deletion that covers the heading's text removes it, whatever else it
 * takes. As a fallback, deletions that together spell the heading also remove it, because Word may
 * split one deletion into several changes.
 */
export function isRemovedByTrackedDeletions(headingText: string, deletions: readonly TrackedDeletion[]): boolean {
  if (deletions.some((d) => d.covers)) return true;
  return headingText !== "" && normaliseHeadingText(deletions.map((d) => d.text).join("")).includes(headingText);
}

/**
 * The stories to list headings from, without the copies a linked header or footer shows: a header
 * linked to the previous section reads the same as it, so only the first of each signature is
 * kept. A null signature (any story but a header or footer) is always kept.
 */
export function withoutLinkedCopies<T>(stories: readonly T[], signatureOf: (story: T) => string | null): T[] {
  const seen = new Set<string>();
  return stories.filter((story) => {
    const signature = signatureOf(story);
    if (signature === null) return true;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}
