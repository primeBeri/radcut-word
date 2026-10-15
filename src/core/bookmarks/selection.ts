/** A bookmark found on a heading paragraph, as a gateway reads it. */
export interface BookmarkCandidate {
  readonly name: string;
  /** Range equals the heading text exactly, without the paragraph mark. */
  readonly spansHeadingText: boolean;
}

/**
 * Bookmarks Word manages itself and may delete or move (research R6), matched case-insensitively:
 * table-of-contents entries, hyperlink targets and the last edit position.
 */
export const WORD_MANAGED_BOOKMARKS: readonly { readonly match: "prefix" | "exact"; readonly value: string }[] = [
  { match: "prefix", value: "_toc" },
  { match: "prefix", value: "_hlk" },
  { match: "exact", value: "_goback" },
];

export function isWordManaged(name: string): boolean {
  const lower = name.toLowerCase();
  return WORD_MANAGED_BOOKMARKS.some((rule) =>
    rule.match === "prefix" ? lower.startsWith(rule.value) : lower === rule.value,
  );
}

/**
 * The usable bookmark to reuse for a heading, or null to create one (FR-011, research R6).
 * Usable = spans exactly the heading text and is not Word-managed; among those, the first by
 * case-insensitive name order, so the choice is the same every time.
 */
export function chooseUsableBookmark(candidates: readonly BookmarkCandidate[]): string | null {
  const usable = candidates
    .filter((c) => c.spansHeadingText && !isWordManaged(c.name))
    .map((c) => c.name)
    .sort((a, b) => {
      const x = a.toLowerCase();
      const y = b.toLowerCase();
      return x < y ? -1 : x > y ? 1 : 0;
    });
  return usable[0] ?? null;
}
