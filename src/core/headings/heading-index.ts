import { headingFingerprint } from "./key";
import type { Heading, HeadingKey, HeadingSnapshot } from "./types";

/**
 * Caches the document's heading snapshot so the palette can show it at once and refresh in the
 * background (research R7: a full read takes about 450 ms at 300 headings). One index per add-in
 * runtime, which Word gives each document.
 */
export class HeadingIndex {
  private snapshot: HeadingSnapshot | null = null;
  private pending: Promise<HeadingSnapshot> | null = null;

  constructor(private readonly load: () => Promise<HeadingSnapshot>) {}

  /** The cached snapshot, or null before the first read. */
  cached(): HeadingSnapshot | null {
    return this.snapshot;
  }

  /** The cached snapshot, reading the document only if there is none yet. */
  async get(): Promise<HeadingSnapshot> {
    return this.snapshot ?? this.refresh();
  }

  /** Read the document again; concurrent calls share one read. */
  refresh(): Promise<HeadingSnapshot> {
    this.pending ??= this.load()
      .then((snapshot) => {
        this.snapshot = snapshot;
        return snapshot;
      })
      .finally(() => {
        this.pending = null;
      });
    return this.pending;
  }

  /**
   * The heading for a key in the current snapshot. A provisional key matches only if the heading
   * at its order still has the same fingerprint.
   */
  byKey(key: HeadingKey): Heading | null {
    const headings = this.snapshot?.headings ?? [];
    if (key.kind === "bookmark") {
      const name = key.name.toLowerCase();
      return headings.find((h) => h.bookmark?.toLowerCase() === name) ?? null;
    }
    const found = headings[key.order];
    return found && headingFingerprint(found) === key.fingerprint ? found : null;
  }
}
