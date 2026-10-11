import { describe, expect, it } from "vitest";
import { HeadingIndex } from "../../src/core/headings/heading-index";
import { headingFingerprint, headingKeyFor } from "../../src/core/headings/key";
import { normaliseHeadingText } from "../../src/core/headings/normalise-text";
import type { Heading, HeadingSnapshot } from "../../src/core/headings/types";

function heading(order: number, text: string, bookmark: string | null = null, number: string | null = null): Heading {
  const base = { level: 2 as const, text, number, order, location: "main" as const, bookmark };
  return { ...base, key: headingKeyFor(base) };
}

function snapshot(takenAt: number, ...headings: Heading[]): HeadingSnapshot {
  return { documentId: "doc", headings, takenAt };
}

describe("HeadingIndex", () => {
  it("builds from a snapshot and finds headings by bookmark key, case-insensitively", async () => {
    const index = new HeadingIndex(async () => snapshot(1, heading(0, "Scope", "_Ref1"), heading(1, "Fire")));
    await index.get();
    expect(index.byKey({ kind: "bookmark", name: "_REF1" })?.text).toBe("Scope");
    expect(index.byKey({ kind: "bookmark", name: "_Ref2" })).toBeNull();
  });

  it("finds headings by provisional key within the snapshot", async () => {
    const fire = heading(1, "Fire");
    const index = new HeadingIndex(async () => snapshot(1, heading(0, "Scope"), fire));
    await index.get();
    expect(index.byKey(fire.key)).toEqual(fire);
  });

  it("invalidates a provisional key against a newer snapshot whose fingerprint differs", async () => {
    let text = "Fire strategy";
    const index = new HeadingIndex(async () => snapshot(Date.now(), heading(0, text)));
    const first = (await index.get()).headings[0]!;
    text = "Fire strategies";
    await index.refresh();
    expect(index.byKey(first.key)).toBeNull();
    expect(index.byKey({ kind: "provisional", order: 0, fingerprint: headingFingerprint({ level: 2, location: "main", text }) })?.text).toBe(
      "Fire strategies",
    );
  });

  it("uses the host's number as is (it is already the full number) and null for unnumbered", async () => {
    const index = new HeadingIndex(async () => snapshot(1, heading(0, "Fire strategy", null, "4.3"), heading(1, "Note")));
    const { headings } = await index.get();
    expect(headings.map((h) => h.number)).toEqual(["4.3", null]);
  });

  it("returns the cached snapshot immediately and replaces it on refresh without changing bookmarked keys", async () => {
    let calls = 0;
    const index = new HeadingIndex(async () => {
      calls++;
      return snapshot(calls, heading(0, "Scope", "_Ref1"), heading(1, `Changing ${calls}`));
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
