import { sameBookmarkName } from "../bookmarks/naming";
import { atProvisionalKey, headingKeyFor } from "./key";
import type { Heading, HeadingKey, HeadingSnapshot } from "./types";

/**
 * Caches the document's heading snapshot so the palette can show it at once and refresh in the
 * background (research R7: a full read takes about 450 ms at 300 headings). One index per add-in
 * runtime, which Word gives each document.
 */
export class HeadingIndex {
  private snapshot: HeadingSnapshot | null = null;
  private pending: Promise<HeadingSnapshot> | null = null;
  /** Bookmarks noted while `pending` was under way, which that read may predate. */
  private notes: { readonly heading: Heading; readonly name: string }[] = [];

  constructor(private readonly load: () => Promise<HeadingSnapshot>) {}

  /** The cached snapshot, or null before the first read. */
  cached(): HeadingSnapshot | null {
    return this.snapshot;
  }

  /** The cached snapshot, reading the document only if there is none yet. */
  async get(): Promise<HeadingSnapshot> {
    return this.snapshot ?? this.refresh();
  }

  /**
   * Read the document again; concurrent calls share one read. A bookmark noted while the read was
   * under way is applied to its result too, since the read may have begun before the insertion.
   */
  refresh(): Promise<HeadingSnapshot> {
    this.pending ??= this.load()
      .then((read) => {
        const snapshot = this.notes.reduce((s, note) => withBookmark(s, note.heading, note.name), read);
        this.snapshot = snapshot;
        return snapshot;
      })
      .finally(() => {
        this.pending = null;
        this.notes = [];
      });
    return this.pending;
  }

  /**
   * An insertion gave `heading` the bookmark `name`: let the cached snapshot know it at once, so
   * the next palette finds the heading by that bookmark (as a recent, FR-022) before the
   * background refresh arrives. Nothing changes if the heading is not in the snapshot.
   */
  noteBookmark(heading: Heading, name: string): void {
    if (this.pending) this.notes.push({ heading, name });
    if (this.snapshot) this.snapshot = withBookmark(this.snapshot, heading, name);
  }

  /**
   * The heading for a key in the current snapshot. A provisional key matches only if the heading
   * at its order still has the same fingerprint.
   */
  byKey(key: HeadingKey): Heading | null {
    return headingAt(this.snapshot?.headings ?? [], key);
  }
}

function headingAt(headings: readonly Heading[], key: HeadingKey): Heading | null {
  if (key.kind === "bookmark") return headings.find((h) => h.bookmark !== null && sameBookmarkName(h.bookmark, key.name)) ?? null;
  return atProvisionalKey(headings, key);
}

/** `snapshot` with `heading` given the bookmark `name` and its bookmark key; the same snapshot if it is not there. */
function withBookmark(snapshot: HeadingSnapshot, heading: Heading, name: string): HeadingSnapshot {
  const found = headingAt(snapshot.headings, heading.key);
  if (!found) return snapshot;
  const named = { ...found, bookmark: name };
  const updated = { ...named, key: headingKeyFor(named) };
  return { ...snapshot, headings: snapshot.headings.map((h) => (h === found ? updated : h)) };
}
