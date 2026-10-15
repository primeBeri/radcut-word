import type { Heading } from "../headings/types";
import type { CharRange, MatchResult } from "./types";

/*
 * fzy-style scorer (research R12): dynamic programming over query × candidate with bonuses for
 * matches at word starts, after separators and in consecutive runs, and small penalties for gaps.
 * The candidate is "number text", so one query can span both; ranges are split back afterwards.
 */

const GAP_LEADING = -0.005;
const GAP_TRAILING = -0.005;
const GAP_INNER = -0.01;
const MATCH_CONSECUTIVE = 1.0;
const MATCH_SLASH = 0.9;
const MATCH_WORD = 0.8;
const MATCH_CAPITAL = 0.7;
const MATCH_DOT = 0.6;
/** Longer candidates are not scored (fzy's limit); headings are far shorter. */
const MAX_CANDIDATE = 1024;

export interface CandidateMatch {
  readonly score: number;
  /** Candidate index of each query character. */
  readonly positions: readonly number[];
}

export interface RankedHeading {
  readonly heading: Heading;
  readonly match: MatchResult;
}

function bonusAt(candidate: string, i: number): number {
  const prev = i === 0 ? "/" : candidate[i - 1]!;
  const ch = candidate[i]!;
  if (prev === "/" || prev === "\\") return MATCH_SLASH;
  if (prev === " " || prev === "-" || prev === "_" || prev === "\t") return MATCH_WORD;
  if (prev === ".") return MATCH_DOT;
  if (prev === prev.toLowerCase() && prev !== prev.toUpperCase() && ch !== ch.toLowerCase()) return MATCH_CAPITAL;
  return 0;
}

function hasMatch(query: string, candidate: string): boolean {
  let at = 0;
  for (const ch of query) {
    at = candidate.indexOf(ch, at);
    if (at < 0) return false;
    at++;
  }
  return true;
}

/**
 * Lower case one character at a time, keeping the length: "İ" lower-cases to two characters,
 * which would shift every later position and so the highlights. A character whose lower case is
 * longer keeps only its first character ("İ" → "i").
 */
function foldCase(text: string): string {
  let folded = "";
  for (let i = 0; i < text.length; i++) {
    const lower = text[i]!.toLowerCase();
    folded += lower.length === 1 ? lower : lower[0]!;
  }
  return folded;
}

/**
 * Score `query` against `candidate` (both compared case-insensitively), or null if the query's
 * characters do not all appear in order, or the candidate is longer than 1024 characters.
 * `query` must be non-empty.
 */
export function matchCandidate(query: string, candidate: string): CandidateMatch | null {
  const q = foldCase(query);
  const c = foldCase(candidate);
  const n = q.length;
  const m = c.length;
  if (n === 0 || n > m || m > MAX_CANDIDATE || !hasMatch(q, c)) return null;

  const bonus = Array.from({ length: m }, (_, j) => bonusAt(candidate, j));
  // D[i][j]: best score with query[i] matched exactly at j. M[i][j]: best score for query[0..i] within candidate[0..j].
  const D: number[][] = [];
  const M: number[][] = [];
  for (let i = 0; i < n; i++) {
    const d = new Array<number>(m);
    const best = new Array<number>(m);
    const gap = i === n - 1 ? GAP_TRAILING : GAP_INNER;
    let prev = -Infinity;
    for (let j = 0; j < m; j++) {
      if (q[i] === c[j]) {
        let score = -Infinity;
        if (i === 0) score = j * GAP_LEADING + bonus[j]!;
        else if (j > 0) score = Math.max(M[i - 1]![j - 1]! + bonus[j]!, D[i - 1]![j - 1]! + MATCH_CONSECUTIVE);
        d[j] = score;
        prev = Math.max(score, prev + gap);
      } else {
        d[j] = -Infinity;
        prev = prev + gap;
      }
      best[j] = prev;
    }
    D.push(d);
    M.push(best);
  }

  const positions = new Array<number>(n);
  let matchRequired = false;
  for (let i = n - 1, j = m - 1; i >= 0; i--) {
    for (; j >= 0; j--) {
      const d = D[i]![j]!;
      if (d !== -Infinity && (matchRequired || d === M[i]![j])) {
        matchRequired = i > 0 && j > 0 && M[i]![j] === D[i - 1]![j - 1]! + MATCH_CONSECUTIVE;
        positions[i] = j--;
        break;
      }
    }
  }
  return { score: M[n - 1]![m - 1]!, positions };
}

/** Consecutive positions in [from, to) as half-open ranges relative to `from`. */
function toRanges(positions: readonly number[], from: number, to: number): CharRange[] {
  const ranges: [number, number][] = [];
  for (const p of positions) {
    if (p < from || p >= to) continue;
    const last = ranges.at(-1);
    if (last && last[1] === p - from) last[1]++;
    else ranges.push([p - from, p - from + 1]);
  }
  return ranges;
}

/**
 * Headings matching `query`, best first, ties in document order (FR-005). An empty or blank
 * query returns every heading in document order with no ranges.
 */
export function rankHeadings(query: string, headings: readonly Heading[]): RankedHeading[] {
  const trimmed = query.trim();
  if (trimmed === "") {
    return headings.map((heading) => ({
      heading,
      match: { score: 0, numberRanges: [], textRanges: [] },
    }));
  }
  const ranked: RankedHeading[] = [];
  for (const heading of headings) {
    const prefix = heading.number ? `${heading.number} ` : "";
    const found = matchCandidate(trimmed, prefix + heading.text);
    if (!found) continue;
    const numberLength = heading.number?.length ?? 0;
    ranked.push({
      heading,
      match: {
        score: found.score,
        numberRanges: toRanges(found.positions, 0, numberLength),
        textRanges: toRanges(found.positions, prefix.length, Infinity),
      },
    });
  }
  return ranked.sort((a, b) => b.match.score - a.match.score || a.heading.order - b.heading.order);
}
