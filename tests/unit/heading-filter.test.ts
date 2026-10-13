import { describe, expect, it } from "vitest";
import { filterHeadings } from "../../src/core/headings/filter";
import { headingFingerprint, headingKeyFor } from "../../src/core/headings/key";
import type { Heading, HeadingLocation } from "../../src/core/headings/types";

function heading(order: number, location: HeadingLocation): Heading {
  const base = { level: 1 as const, text: `H${order}`, number: null, order, location, bookmark: null };
  return { ...base, key: headingKeyFor(base) };
}

const all = [
  heading(0, "main"),
  heading(1, "tableCell"),
  heading(2, "main"),
  heading(3, "textBox"),
  heading(4, "footnote"),
  heading(5, "endnote"),
  heading(6, "header"),
  heading(7, "footer"),
];

describe("filterHeadings", () => {
  it("keeps every heading in story order when headings outside the main text are shown", () => {
    expect(filterHeadings(all, { showHeadingsOutsideMainText: true, inHeadingOrder: null }).map((h) => h.order)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it("leaves out every heading whose location is not main, table cells included", () => {
    expect(filterHeadings(all, { showHeadingsOutsideMainText: false, inHeadingOrder: null }).map((h) => h.order)).toEqual([
      0, 2,
    ]);
  });

  it("always leaves out the heading containing the cursor", () => {
    expect(filterHeadings(all, { showHeadingsOutsideMainText: true, inHeadingOrder: 2 }).map((h) => h.order)).toEqual([
      0, 1, 3, 4, 5, 6, 7,
    ]);
    expect(filterHeadings(all, { showHeadingsOutsideMainText: false, inHeadingOrder: 0 }).map((h) => h.order)).toEqual([
      2,
    ]);
  });

  it("leaves out the heading containing the cursor by its fingerprint where its order is unknown (a note)", () => {
    const options = { showHeadingsOutsideMainText: true, inHeadingOrder: null, inHeadingFingerprint: headingFingerprint(all[4]!) };
    expect(filterHeadings(all, options).map((h) => h.order)).toEqual([0, 1, 2, 3, 5, 6, 7]);
  });
});
