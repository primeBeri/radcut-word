import { headingFingerprint } from "./key";
import type { Heading } from "./types";

export interface HeadingFilterOptions {
  /** FR-003a: when false, only headings whose location is `main` are kept. */
  readonly showHeadingsOutsideMainText: boolean;
  /** FR-001b: the heading containing the cursor is never a target. */
  readonly inHeadingOrder: number | null;
  /** The same heading by fingerprint, used where its order is unknown (a heading in a note). */
  readonly inHeadingFingerprint?: string | null;
}

/** The headings the palette offers, in story order. Ranking and recents apply to these only. */
export function filterHeadings(headings: readonly Heading[], options: HeadingFilterOptions): Heading[] {
  const { inHeadingOrder, inHeadingFingerprint = null } = options;
  const isCursorHeading = (h: Heading) =>
    inHeadingOrder !== null
      ? h.order === inHeadingOrder
      : inHeadingFingerprint !== null && headingFingerprint(h) === inHeadingFingerprint;
  return headings.filter(
    (h) => !isCursorHeading(h) && (options.showHeadingsOutsideMainText || h.location === "main"),
  );
}
