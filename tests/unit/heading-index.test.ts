import { describe, expect, it } from "vitest";
import { HeadingIndex } from "../../src/core/headings/heading-index";
import { headingFingerprint, headingKeyFor } from "../../src/core/headings/key";
import { normaliseHeadingText } from "../../src/core/headings/normalise-text";
import type { Heading, HeadingSnapshot } from "../../src/core/headings/types";

function heading(order: number, text: string, bookmark: string | null = null, number: string | null = null): Heading {
  const base = { level: 2 as const, text, number, order, location: "main" as const, bookmark };
  return { ...base, key: headingKeyFor(base) };
}

function snapshot(...headings: Heading[]): HeadingSnapshot {
  return { documentId: "doc", headings };
}

describe("HeadingIndex", () => {
  it("builds from a snapshot and finds headings by bookmark key, case-insensitively", async () => {
    const index = new HeadingIndex(async () => snapshot(heading(0, "Scope", "_Ref1"), heading(1, "Fire")));
    await index.get();
    expect(index.byKey({ kind: "bookmark", name: "_REF1" })?.text).toBe("Scope");
    expect(index.byKey({ kind: "bookmark", name: "_Ref2" })).toBeNull();
  });

  it("finds headings by provisional key within the snapshot", async () => {
    const fire = heading(1, "Fire");
    const index = new HeadingIndex(async () => snapshot(heading(0, "Scope"), fire));
    await index.get();
    expect(index.byKey(fire.key)).toEqual(fire);
  });

  it("invalidates a provisional key against a newer snapshot whose fingerprint differs", async () => {
    let text = "Fire strategy";
    const index = new HeadingIndex(async () => snapshot(heading(0, text)));
    const first = (await index.get()).headings[0]!;
    text = "Fire strategies";
    await index.refresh();
    expect(index.byKey(first.key)).toBeNull();
    expect(index.byKey({ kind: "provisional", order: 0, fingerprint: headingFingerprint({ level: 2, location: "main", text }) })?.text).toBe(
      "Fire strategies",
    );
  });

  it("uses the host's number as is (it is already the full number) and null for unnumbered", async () => {
    const index = new HeadingIndex(async () => snapshot(heading(0, "Fire strategy", null, "4.3"), heading(1, "Note")));
    const { headings } = await index.get();
    expect(headings.map((h) => h.number)).toEqual(["4.3", null]);
  });

  it("returns the cached snapshot immediately and replaces it on refresh without changing bookmarked keys", async () => {
    let calls = 0;
    const index = new HeadingIndex(async () => {
      calls++;
      return snapshot(heading(0, "Scope", "_Ref1"), heading(1, `Changing ${calls}`));
    });
    expect(index.cached()).toBeNull();
    const first = await index.get();
    const again = await index.get();
    expect(again).toBe(first);
    expect(calls).toBe(1);
    expect(index.cached()).toBe(first);

    const fresh = await index.refresh();
    expect(calls).toBe(2);
    expect(index.cached()).toBe(fresh);
    expect(fresh.headings[0]!.key).toEqual(first.headings[0]!.key);
    expect(fresh.headings[1]!.text).toBe("Changing 2");
  });

  it("shares one document read between refreshes that overlap", async () => {
    let calls = 0;
    let release!: () => void;
    const index = new HeadingIndex(async () => {
      calls++;
      await new Promise<void>((resolve) => (release = resolve));
      return snapshot(heading(0, "Scope"));
    });
    const a = index.refresh();
    const b = index.refresh();
    release();
    expect(await a).toBe(await b);
    expect(calls).toBe(1);
  });

  it("reads again after a failed read, keeping the last good snapshot meanwhile", async () => {
    let fail = false;
    const index = new HeadingIndex(async () => {
      if (fail) throw new Error("Word is busy.");
      return snapshot(heading(0, "Scope"));
    });
    const good = await index.get();
    fail = true;
    await expect(index.refresh()).rejects.toThrow("Word is busy.");
    expect(index.cached()).toBe(good);
    fail = false;
    await expect(index.refresh()).resolves.toMatchObject({ headings: [{ text: "Scope" }] });
  });
});

describe("HeadingIndex.noteBookmark", () => {
  it("gives the cached heading a new bookmark and its bookmark key, leaving the others", async () => {
    const fire = heading(1, "Fire");
    const index = new HeadingIndex(async () => snapshot(heading(0, "Scope", "_Ref1"), fire));
    const before = await index.get();
    index.noteBookmark(fire, "_XRnew");
    const after = index.cached()!;
    expect(after).not.toBe(before);
    expect(after.headings[1]).toMatchObject({ bookmark: "_XRnew", key: { kind: "bookmark", name: "_XRnew" } });
    expect(after.headings[0]).toBe(before.headings[0]);
    expect(index.byKey({ kind: "bookmark", name: "_xrnew" })?.text).toBe("Fire");
  });

  it("keeps a bookmark noted while a refresh was under way, which that read may predate", async () => {
    const fire = heading(1, "Fire");
    let release!: () => void;
    let gate: Promise<void> | null = null;
    const index = new HeadingIndex(async () => {
      await gate;
      return snapshot(heading(0, "Scope", "_Ref1"), heading(1, "Fire"));
    });
    await index.get();
    gate = new Promise((resolve) => (release = resolve));
    const refreshing = index.refresh();
    index.noteBookmark(fire, "_XRnew");
    release();
    expect((await refreshing).headings[1]).toMatchObject({ bookmark: "_XRnew" });
    expect(index.byKey({ kind: "bookmark", name: "_XRnew" })?.text).toBe("Fire");
    // The note was for that read only.
    expect((await index.refresh()).headings[1]?.bookmark).toBeNull();
  });

  it("changes nothing for a heading that is not in the snapshot, or before any read", async () => {
    const index = new HeadingIndex(async () => snapshot(heading(0, "Scope")));
    index.noteBookmark(heading(0, "Scope"), "_XRx");
    expect(index.cached()).toBeNull();
    const before = await index.get();
    index.noteBookmark(heading(0, "Elsewhere"), "_XRx");
    expect(index.cached()).toBe(before);
  });
});

describe("normaliseHeadingText", () => {
  it("strips a note's leading reference mark and the whitespace after it (research R7)", () => {
    expect(normaliseHeadingText("\u0002 Heading in a footnote")).toBe("Heading in a footnote");
    expect(normaliseHeadingText("\u0002Heading")).toBe("Heading");
  });

  it("trims surrounding whitespace and leaves other text alone", () => {
    expect(normaliseHeadingText("  Fire strategy \t")).toBe("Fire strategy");
    expect(normaliseHeadingText("A \u0002 B")).toBe("A \u0002 B");
    expect(normaliseHeadingText("")).toBe("");
  });
});
