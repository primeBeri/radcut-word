/** Half-open character range `[start, end)`. */
export type CharRange = readonly [start: number, end: number];

export interface MatchResult {
  /** Higher is better; ties broken by document order. */
  readonly score: number;
  /** Matched ranges in the heading's number, for highlighting. */
  readonly numberRanges: readonly CharRange[];
  /** Matched ranges in the heading's text. */
  readonly textRanges: readonly CharRange[];
}
