import { describe, expect, it } from "vitest";
import { classifyLocation } from "../../src/core/location/rules";
import { classifySelection } from "../../src/core/location/selection";
import type { LocationFacts, SelectionFacts } from "../../src/core/location/types";

const body: LocationFacts = {
  story: "main",
  inTable: false,
  styleBuiltIn: "Normal",
  outlineLevel: 10,
  protected: false,
  headingOrder: null,
  precedingHeadingOrder: 3,
};

const off = { allowInHeadings: false };
const on = { allowInHeadings: true };

describe("classifyLocation with allowInHeadings off", () => {
  it.each([
    ["main", { story: "main" }, "main"],
    ["footnote", { story: "footnote" }, "footnote"],
    ["endnote", { story: "endnote" }, "endnote"],
    ["table cell in the main text", { inTable: true }, "tableCellInMain"],
  ] as const)("allows %s", (_name, facts, location) => {
    expect(classifyLocation({ ...body, ...facts }, "none", off)).toEqual({
      kind: "insertionPoint",
      location,
      selection: "none",
      inHeadingOrder: null,
      precedingHeadingOrder: 3,
    });
  });

  it.each(["Quote", "Caption", "ListParagraph", null])("allows non-heading paragraphs of any style (%s)", (style) => {
    expect(classifyLocation({ ...body, styleBuiltIn: style }, "inline", off)).toMatchObject({
      kind: "insertionPoint",
      selection: "inline",
    });
  });

  it.each([
    ["Heading 1", { styleBuiltIn: "Heading1", outlineLevel: 1, headingOrder: 0 }, "headingParagraph"],
    ["Heading 9", { styleBuiltIn: "Heading9", outlineLevel: 9, headingOrder: 0 }, "headingParagraph"],
    ["outline level 2", { styleBuiltIn: "Normal", outlineLevel: 2, headingOrder: 0 }, "headingParagraph"],
    ["Title", { styleBuiltIn: "Title" }, "titleParagraph"],
    ["Subtitle", { styleBuiltIn: "Subtitle" }, "titleParagraph"],
    ["header", { story: "header" }, "header"],
    ["footer", { story: "footer" }, "footer"],
    ["comment", { story: "comment" }, "comment"],
    ["text box", { story: "textBox" }, "textBox"],
    ["unknown story", { story: "unknown" }, "unknown"],
    ["protected document", { protected: true }, "protected"],
  ] as const)("declines %s", (_name, facts, reason) => {
    expect(classifyLocation({ ...body, ...facts }, "none", off)).toEqual({ kind: "declined", reason });
  });

  it("declines a heading inside a footnote as a heading paragraph", () => {
    expect(
      classifyLocation({ ...body, story: "footnote", styleBuiltIn: "Heading1", outlineLevel: 1 }, "none", off),
    ).toEqual({ kind: "declined", reason: "headingParagraph" });
  });

  it("declines protected before anything else", () => {
    expect(classifyLocation({ ...body, story: "header", protected: true }, "none", off)).toEqual({
      kind: "declined",
      reason: "protected",
    });
  });
});

describe("classifyLocation with allowInHeadings on", () => {
  it("allows a heading paragraph and reports it as inHeadingOrder", () => {
    expect(
      classifyLocation({ ...body, styleBuiltIn: "Heading2", outlineLevel: 2, headingOrder: 7 }, "none", on),
    ).toEqual({
      kind: "insertionPoint",
      location: "main",
      selection: "none",
      inHeadingOrder: 7,
      precedingHeadingOrder: 3,
    });
  });

  it.each(["Title", "Subtitle"])("allows %s with inHeadingOrder null", (style) => {
    expect(classifyLocation({ ...body, styleBuiltIn: style }, "none", on)).toMatchObject({
      kind: "insertionPoint",
      inHeadingOrder: null,
    });
  });

  it.each([
    [{ story: "header" }, "header"],
    [{ story: "footer" }, "footer"],
    [{ story: "comment" }, "comment"],
    [{ story: "textBox" }, "textBox"],
    [{ protected: true }, "protected"],
  ] as const)("still declines %o", (facts, reason) => {
    expect(classifyLocation({ ...body, ...facts }, "none", on)).toEqual({ kind: "declined", reason });
  });
});

describe("classifySelection", () => {
  const caret: SelectionFacts = {
    isEmpty: true,
    paragraphCount: 1,
    tableCount: 0,
    pictureCount: 0,
    shapeCount: 0,
    contentControlCount: 0,
    insideField: false,
  };
  const words = { ...caret, isEmpty: false };

  it("no selection is none", () => expect(classifySelection(caret)).toBe("none"));
  it("text within one paragraph is inline", () => expect(classifySelection(words)).toBe("inline"));
  it("a whole paragraph including its mark is inline (spike 1: counts as one)", () =>
    expect(classifySelection({ ...words, paragraphCount: 1 })).toBe("inline"));

  it.each([
    ["two paragraphs", { paragraphCount: 2 }],
    ["a picture", { pictureCount: 1 }],
    ["a shape", { shapeCount: 1 }],
    ["a content control", { contentControlCount: 1 }],
  ] as const)("%s is extended", (_name, facts) => {
    expect(classifySelection({ ...words, ...facts })).toBe("extended");
  });

  it.each([
    ["a whole table", { tableCount: 1, paragraphCount: 2 }],
    ["text and a table", { tableCount: 1, paragraphCount: 5, pictureCount: 1 }],
    ["a table inside a field selection", { tableCount: 1, insideField: true }],
  ] as const)("%s is a table selection (FR-008a: declined)", (_name, facts) => {
    expect(classifySelection({ ...words, ...facts })).toBe("table");
  });

  it.each([
    ["a caret", caret],
    ["words", words],
  ] as const)("%s inside a field is a field selection (FR-008b)", (_name, facts) => {
    expect(classifySelection({ ...facts, insideField: true })).toBe("field");
  });
});

describe("classifyLocation with a table selection", () => {
  it("declines tableSelected in an allowed place", () => {
    expect(classifyLocation(body, "table", off)).toEqual({ kind: "declined", reason: "tableSelected" });
  });

  it("reports the place first when the place itself is not allowed", () => {
    expect(classifyLocation({ ...body, story: "header" }, "table", off)).toEqual({ kind: "declined", reason: "header" });
    expect(classifyLocation({ ...body, protected: true }, "table", off)).toEqual({ kind: "declined", reason: "protected" });
  });

  it("passes a field selection through for confirmation", () => {
    expect(classifyLocation(body, "field", off)).toMatchObject({ kind: "insertionPoint", selection: "field" });
  });
});
