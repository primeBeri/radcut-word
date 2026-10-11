import type { Heading } from "./types";

export interface HeadingFilterOptions {
  /** FR-003a: when false, only headings whose location is `main` are kept. */
  readonly showHeadingsOutsideMainText: boolean;
  /** FR-001b: the heading containing the cursor is never a target. */
  readonly inHeadingOrder: number | null;
}

/** The headings the palette offers, in story order. Ranking and recents apply to these only. */
export function filterHeadings(headings: readonly Heading[], options: HeadingFilterOptions): Heading[] {
  return headings.filter(
    (h) =>
      h.order !== options.inHeadingOrder && (options.showHeadingsOutsideMainText || h.location === "main"),
  );
}
