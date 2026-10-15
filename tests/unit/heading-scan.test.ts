import { describe, expect, it } from "vitest";
import { isRemovedByTrackedDeletions, withoutLinkedCopies } from "../../src/core/headings/scan";
import { headingPositions } from "../../src/core/location/positions";

describe("isRemovedByTrackedDeletions", () => {
  it("removes a heading a deletion covers, whatever else the deletion takes", () => {
    expect(isRemovedByTrackedDeletions("Deleted heading", [{ covers: true, text: "Deleted heading and more" }])).toBe(true);
  });

  it("removes a heading whose text several deletions spell together (Word may split one deletion)", () => {
    const parts = [
      { covers: false, text: "Deleted " },
      { covers: false, text: "heading" },
    ];
    expect(isRemovedByTrackedDeletions("Deleted heading", parts)).toBe(true);
  });

  it("keeps a heading with no deletion, or one that only removes part of it", () => {
    expect(isRemovedByTrackedDeletions("Kept heading", [])).toBe(false);
    expect(isRemovedByTrackedDeletions("Kept heading", [{ covers: false, text: "Kept" }])).toBe(false);
  });

  it("never removes an empty heading by spelling", () => {
    expect(isRemovedByTrackedDeletions("", [{ covers: false, text: "anything" }])).toBe(false);
  });
});

describe("withoutLinkedCopies", () => {
  it("keeps the first story of each signature and every story without one", () => {
    const stories = [
      { id: "main", signature: null },
      { id: "header 1", signature: "header:[\"Title\"]" },
      { id: "header 2 (linked)", signature: "header:[\"Title\"]" },
      { id: "footer 1", signature: "footer:[\"Title\"]" },
      { id: "header 3 (own)", signature: "header:[\"Other\"]" },
      { id: "footnote", signature: null },
    ];
    expect(withoutLinkedCopies(stories, (s) => s.signature).map((s) => s.id)).toEqual([
      "main",
      "header 1",
      "footer 1",
      "header 3 (own)",
      "footnote",
    ]);
  });
});

describe("headingPositions", () => {
  const body = { heading: false, deleted: false };
  const heading = { heading: true, deleted: false };
  const deleted = { heading: true, deleted: true };

  it("counts live headings before the cursor's paragraph, which comes last", () => {
    expect(headingPositions([heading, body, heading, body])).toEqual({ headingOrder: null, precedingHeadingOrder: 1 });
  });

  it("reports the cursor's own heading and the one before it", () => {
    expect(headingPositions([heading, body, heading])).toEqual({ headingOrder: 1, precedingHeadingOrder: 0 });
    expect(headingPositions([heading])).toEqual({ headingOrder: 0, precedingHeadingOrder: null });
  });

  it("skips tracked-deleted headings, as the heading list does", () => {
    expect(headingPositions([heading, deleted, heading, body])).toEqual({ headingOrder: null, precedingHeadingOrder: 1 });
    expect(headingPositions([heading, deleted])).toEqual({ headingOrder: null, precedingHeadingOrder: 0 });
  });

  it("gives nulls with no heading before the cursor", () => {
    expect(headingPositions([body, body])).toEqual({ headingOrder: null, precedingHeadingOrder: null });
    expect(headingPositions([])).toEqual({ headingOrder: null, precedingHeadingOrder: null });
  });
});
