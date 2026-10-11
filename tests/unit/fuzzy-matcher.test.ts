import fuzzysort from "fuzzysort";
import { beforeAll, describe, expect, it } from "vitest";
import { headingKeyFor } from "../../src/core/headings/key";
import type { Heading } from "../../src/core/headings/types";
import { matchCandidate, rankHeadings } from "../../src/core/matching/fuzzy-matcher";
import { fakeFixtures } from "../fakes/fake-documents";
import { FakeGateway } from "../fakes/fake-gateway";

let spec300: readonly Heading[];

beforeAll(async () => {
  spec300 = (await new FakeGateway(fakeFixtures["spec-300"]()).readHeadings()).headings;
});

function heading(order: number, text: string, number: string | null = null): Heading {
  const base = { level: 1 as const, text, number, order, location: "main" as const, bookmark: null };
  return { ...base, key: headingKeyFor(base) };
}

const top = (query: string, headings = spec300) => rankHeadings(query, headings)[0]?.heading.text;

describe("rankHeadings", () => {
  it('ranks "Fire strategy" first for "fstrat"', () => {
    expect(top("fstrat")).toBe("Fire strategy");
  });

  it("matches across number and text", () => {
    const [first] = rankHeadings("4.3 fire", spec300);
    expect(first?.heading.text).toBe("Fire strategy");
    expect(first?.match.numberRanges).toEqual([[0, 3]]);
    expect(first?.match.textRanges).toEqual([[0, 4]]);
  });

  it("returns matched ranges separately for number and text, merged into runs", () => {
    const [first] = rankHeadings("fstrat", [heading(0, "Fire strategy", "4.3")]);
    expect(first?.match.numberRanges).toEqual([]);
    expect(first?.match.textRanges).toEqual([
      [0, 1],
      [5, 10],
    ]);
  });

  it("prefers word starts and consecutive runs over scattered matches", () => {
    const headings = [heading(0, "Pseudo crude tolerances"), heading(1, "Scope of tests")];
    expect(top("scte", headings)).toBe("Scope of tests");
    const runs = [heading(0, "Mast connection"), heading(1, "Masonry")];
    expect(top("mason", runs)).toBe("Masonry");
  });

  it("breaks ties by document order", () => {
    const headings = [heading(0, "Scope"), heading(1, "Scope")];
    expect(rankHeadings("scope", headings).map((r) => r.heading.order)).toEqual([0, 1]);
  });

  it("returns every heading in document order with no ranges for an empty query", () => {
    const ranked = rankHeadings("   ", spec300);
    expect(ranked.map((r) => r.heading.order)).toEqual(spec300.map((h) => h.order));
    expect(ranked.every((r) => r.match.numberRanges.length === 0 && r.match.textRanges.length === 0)).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(top("FSTRAT")).toBe("Fire strategy");
    expect(rankHeadings("FiRe StRaT", spec300)[0]?.heading.text).toBe("Fire strategy");
  });

  it("leaves out headings that do not contain the query in order", () => {
    expect(rankHeadings("zzzq", spec300)).toEqual([]);
    expect(matchCandidate("abc", "cba")).toBeNull();
  });

  it("carries the heading key in the match result", () => {
    const [first] = rankHeadings("fstrat", spec300);
    expect(first?.match.key).toEqual(first?.heading.key);
  });
});

describe("dev-only comparison with fuzzysort", () => {
  const abbreviations = [
    "fstrat",
    "intro",
    "scope",
    "defin",
    "genera",
    "standa",
    "materi",
    "concre",
    "safety",
    "meansesc",
    "structfire",
    "boldword",
    "tablecell",
    "textbox",
    "endnote",
    "inheader",
    "infooter",
    "chapter 12",
    "topic 40.2",
    "topic 76.3",
  ];

  it.each(abbreviations)("our top result for %s equals fuzzysort's", (query) => {
    const targets = spec300.map((h) => ({ h, s: h.number ? `${h.number} ${h.text}` : h.text }));
    const theirs = fuzzysort.go(query, targets, { key: "s" })[0]?.obj.h.text;
    expect(theirs).toBeDefined();
    expect(top(query)).toBe(theirs);
  });
});
