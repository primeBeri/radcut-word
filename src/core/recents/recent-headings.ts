import { sameBookmarkName } from "../bookmarks/naming";
import type { Heading } from "../headings/types";
import type { ISettingsStore } from "../ports/settings-store";

/** Recents per document (data-model RecentHeadings). */
export const MAX_RECENTS = 5;
/** Documents whose recents are kept; past that, the one saved longest ago is dropped. */
export const MAX_RECENT_DOCUMENTS = 50;

/** One document's recents, as the store keeps them. */
export interface DocumentRecents {
  readonly documentId: string;
  /** Bookmark names, most recent first. */
  readonly bookmarks: readonly string[];
}

/** Each bookmark once, case-insensitively, keeping the first (most recent); at most 5. */
function uniqueRecents(bookmarks: readonly string[]): string[] {
  return bookmarks.filter((b, i) => bookmarks.findIndex((other) => sameBookmarkName(other, b)) === i).slice(0, MAX_RECENTS);
}

/** `bookmarks` with `bookmark` first: most recent first, unique case-insensitively, at most 5. */
export function withRecent(bookmarks: readonly string[], bookmark: string): string[] {
  return uniqueRecents([bookmark, ...bookmarks]);
}

const headingWith = (headings: readonly Heading[], bookmark: string) =>
  headings.find((h) => h.bookmark !== null && sameBookmarkName(h.bookmark, bookmark));

/** The listed headings the recents name, most recent first; a bookmark no longer on one is left out. */
export function recentHeadings(bookmarks: readonly string[], headings: readonly Heading[]): Heading[] {
  return bookmarks.map((b) => headingWith(headings, b)).filter((h): h is Heading => h !== undefined);
}

/** The stored list with `documentId`'s recents first, as the most recently used, and at most 50 documents. */
export function withDocumentRecents(
  entries: readonly DocumentRecents[],
  documentId: string,
  bookmarks: readonly string[],
): DocumentRecents[] {
  const others = entries.filter((e) => e.documentId !== documentId);
  return [{ documentId, bookmarks: [...bookmarks] }, ...others].slice(0, MAX_RECENT_DOCUMENTS);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The stored list from raw data, held to the same rules as a write: entries that are not one are
 * left out, a document listed again is dropped, each keeps at most 5 unique bookmarks, and at most
 * 50 documents are kept. Anything else gives [].
 */
export function readStoredRecents(raw: unknown): DocumentRecents[] {
  if (!Array.isArray(raw)) return [];
  const entries = raw.flatMap((entry): DocumentRecents[] => {
    if (!isRecord(entry) || typeof entry.documentId !== "string" || !Array.isArray(entry.bookmarks)) return [];
    const bookmarks = uniqueRecents(entry.bookmarks.filter((b): b is string => typeof b === "string"));
    return [{ documentId: entry.documentId, bookmarks }];
  });
  return entries.filter((e, i) => entries.findIndex((other) => other.documentId === e.documentId) === i).slice(0, MAX_RECENT_DOCUMENTS);
}

type RecentsStore = Pick<ISettingsStore, "loadRecents" | "saveRecents">;

/**
 * The recently referenced headings of each document (FR-022), by bookmark name. Saved documents
 * keep them in the store; an unsaved one (no document id), or any document without a store,
 * keeps them in memory for this runtime only, so they never reach the store. Writes run one at a
 * time, so a background prune and an insertion's record never overwrite each other.
 */
export class RecentHeadings {
  private readonly memory = new Map<string | null, string[]>();
  private writes: Promise<unknown> = Promise.resolve();

  constructor(private readonly store: RecentsStore | null) {}

  async load(documentId: string | null): Promise<string[]> {
    if (documentId === null || !this.store) return [...(this.memory.get(documentId) ?? [])];
    return this.store.loadRecents(documentId);
  }

  /** After an insertion that used `bookmark`. */
  record(documentId: string | null, bookmark: string): Promise<void> {
    return this.queued(async () => this.save(documentId, withRecent(await this.load(documentId), bookmark)));
  }

  /**
   * Drop the recents among `judged` that are on no heading of `headings`, which must come from a
   * fresh read. `judged` is the list loaded before that read began: a bookmark recorded since may
   * be missing from the read, so it is never judged by it.
   */
  prune(documentId: string | null, headings: readonly Heading[], judged: readonly string[]): Promise<void> {
    const gone = judged.filter((b) => headingWith(headings, b) === undefined);
    if (gone.length === 0) return Promise.resolve();
    return this.queued(async () => {
      const bookmarks = await this.load(documentId);
      const kept = bookmarks.filter((b) => !gone.some((g) => sameBookmarkName(g, b)));
      if (kept.length < bookmarks.length) await this.save(documentId, kept);
    });
  }

  private queued(write: () => Promise<void>): Promise<void> {
    const done = this.writes.then(write);
    this.writes = done.catch(() => undefined);
    return done;
  }

  private async save(documentId: string | null, bookmarks: string[]): Promise<void> {
    if (documentId === null || !this.store) this.memory.set(documentId, bookmarks);
    else await this.store.saveRecents(documentId, bookmarks);
  }
}
