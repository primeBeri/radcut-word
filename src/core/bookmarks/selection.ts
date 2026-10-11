/** A bookmark found on a heading paragraph, as a gateway reads it. */
export interface BookmarkCandidate {
  readonly name: string;
  /** Range equals the heading text exactly, without the paragraph mark. */
  readonly spansHeadingText: boolean;
}

/** The usable bookmark to reuse for a heading, or null to create one (FR-011, research R6). */
export function chooseUsableBookmark(_candidates: readonly BookmarkCandidate[]): string | null {
  throw new Error("chooseUsableBookmark is not implemented yet (T042).");
}
