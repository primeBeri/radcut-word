import type { CharRange } from "../../core/matching/types";

export interface Segment {
  readonly text: string;
  readonly matched: boolean;
}

/** Split `text` into matched and unmatched runs for `<mark>` highlighting (FR-005a). */
export function segments(text: string, ranges: readonly CharRange[]): Segment[] {
  const result: Segment[] = [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) result.push({ text: text.slice(at, start), matched: false });
    result.push({ text: text.slice(start, end), matched: true });
    at = end;
  }
  if (at < text.length) result.push({ text: text.slice(at), matched: false });
  return result;
}
