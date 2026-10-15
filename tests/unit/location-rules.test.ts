import { describe, expect, it } from "vitest";
import { classifyLocation, confirmationFor, headingLevelOf, isHeadingParagraph } from "../../src/core/location/rules";
import { headingFingerprint } from "../../src/core/headings/key";
import { classifySelection } from "../../src/core/location/selection";
import type { LocationFacts, SelectionFacts } from "../../src/core/location/types";

const body: LocationFacts = {
  story: "main",
  inTable: false,
  styleBuiltIn: "Normal",
  outlineLevel: 10,
  protected: false,
  text: "Body text.",
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
      inHeadingFingerprint: null,
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
    ["comment", { story: "comment" }, "comment"],
    ["unknown story", { story: "unknown" }, "unknown"],
    ["protected document", { protected: true }, "protected"],
  ] as const)("declines %s", (_name, facts, reason) => {
    expect(classifyLocation({ ...body, ...facts }, "none", off)).toEqual({ kind: "declined", reason });
  });

  describe("headers, footers and text boxes (FR-001a, allowed from 2026-10-14)", () => {
    const outside = { headingOrder: null, precedingHeadingOrder: null } as const;
    it.each([
      ["header", { story: "header" }, "header"],
      ["footer", { story: "footer" }, "footer"],
      ["text box", { story: "textBox" }, "textBox"],
      ["table cell in a header", { story: "header", inTable: true }, "header"],
      ["table cell in a text box", { story: "textBox", inTable: true }, "textBox"],
    ] as const)("allows %s, with no heading orders", (_name, facts, location) => {
      expect(classifyLocation({ ...body, ...outside, ...facts }, "inline", off)).toEqual({
        kind: "insertionPoint",
        location,
        selection: "inline",
        inHeadingOrder: null,
        inHeadingFingerprint: null,
        precedingHeadingOrder: null,
      });
    });

    it.each(["header", "footer", "textBox"] as const)("still declines a heading, Title or Subtitle in a %s", (story) => {
      const facts = { ...body, ...outside, story };
      expect(classifyLocation({ ...facts, styleBuiltIn: "Heading1", outlineLevel: 1 }, "none", off)).toEqual({
        kind: "declined",
        reason: "headingParagraph",
      });
      expect(classifyLocation({ ...facts, styleBuiltIn: "Title" }, "none", off)).toEqual({ kind: "declined", reason: "titleParagraph" });
    });

    it("declines a table selection or a plain-text control there as anywhere else", () => {
      const facts = { ...body, ...outside, story: "footer" } as const;
      expect(classifyLocation(facts, "table", off)).toEqual({ kind: "declined", reason: "tableSelected" });
      expect(classifyLocation(facts, "plainTextControl", off)).toEqual({ kind: "declined", reason: "plainTextControl" });
    });
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
      classifyLocation(
        { ...body, styleBuiltIn: "Heading2", outlineLevel: 2, text: "Fire strategy", headingOrder: 7 },
        "none",
        on,
      ),
    ).toEqual({
      kind: "insertionPoint",
      location: "main",
      selection: "none",
      inHeadingOrder: 7,
      inHeadingFingerprint: headingFingerprint({ level: 2, location: "main", text: "Fire strategy" }),
      precedingHeadingOrder: 3,
    });
  });

  it("fingerprints the heading containing the cursor where its order is unknown, e.g. in a note", () => {
    const facts = { ...body, story: "footnote", styleBuiltIn: "Heading1", outlineLevel: 1, text: "Note heading" } as const;
    expect(classifyLocation({ ...facts, headingOrder: null, precedingHeadingOrder: null }, "none", on)).toMatchObject({
      inHeadingOrder: null,
      inHeadingFingerprint: headingFingerprint({ level: 1, location: "footnote", text: "Note heading" }),
    });
    expect(classifyLocation({ ...body, inTable: true, styleBuiltIn: "Heading3", text: "Cell heading" }, "none", on)).toMatchObject({
      inHeadingFingerprint: headingFingerprint({ level: 3, location: "tableCell", text: "Cell heading" }),
    });
    const header = { ...body, story: "header", styleBuiltIn: "Heading1", outlineLevel: 1, text: "Header heading" } as const;
    expect(classifyLocation({ ...header, headingOrder: null, precedingHeadingOrder: null }, "none", on)).toMatchObject({
      kind: "insertionPoint",
      location: "header",
      inHeadingOrder: null,
      inHeadingFingerprint: headingFingerprint({ level: 1, location: "header", text: "Header heading" }),
    });
  });

  it.each(["Title", "Subtitle"])("allows %s with inHeadingOrder null", (style) => {
    expect(classifyLocation({ ...body, styleBuiltIn: style }, "none", on)).toMatchObject({
      kind: "insertionPoint",
      inHeadingOrder: null,
    });
  });

  it.each([
    [{ story: "comment" }, "comment"],
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
    containingControl: null,
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

  describe("content controls (FR-001a, FR-008a)", () => {
    const plainInside = { kind: "plainText", whole: false } as const;
    const plainWhole = { kind: "plainText", whole: true } as const;

    it.each([
      ["a caret", caret],
      ["words", words],
    ] as const)("%s inside a plain-text control is declined: Word allows no fields there", (_name, facts) => {
      expect(classifySelection({ ...facts, containingControl: plainInside })).toBe("plainTextControl");
    });

    it("a whole plain-text control selected is extended, though Word reports it as the container, not in the range", () => {
      expect(classifySelection({ ...words, containingControl: plainWhole })).toBe("extended");
    });

    it("a rich-text control takes references like a normal paragraph", () => {
      expect(classifySelection({ ...caret, containingControl: { kind: "richText", whole: false } })).toBe("none");
      expect(classifySelection({ ...words, containingControl: { kind: "richText", whole: false } })).toBe("inline");
      expect(classifySelection({ ...words, containingControl: { kind: "richText", whole: true } })).toBe("extended");
    });

    it("a table still wins", () => {
      expect(classifySelection({ ...words, tableCount: 1, containingControl: plainInside })).toBe("table");
    });
  });
});

describe("classifyLocation with a table selection", () => {
  it("declines tableSelected in an allowed place", () => {
    expect(classifyLocation(body, "table", off)).toEqual({ kind: "declined", reason: "tableSelected" });
  });

  it("reports the place first when the place itself is not allowed", () => {
    expect(classifyLocation({ ...body, story: "comment" }, "table", off)).toEqual({ kind: "declined", reason: "comment" });
    expect(classifyLocation({ ...body, protected: true }, "table", off)).toEqual({ kind: "declined", reason: "protected" });
  });

  it("declines plainTextControl in an allowed place, after the place itself", () => {
    expect(classifyLocation(body, "plainTextControl", off)).toEqual({ kind: "declined", reason: "plainTextControl" });
    expect(classifyLocation({ ...body, story: "comment" }, "plainTextControl", off)).toEqual({ kind: "declined", reason: "comment" });
  });

  it("passes a field selection through for confirmation", () => {
    expect(classifyLocation(body, "field", off)).toMatchObject({ kind: "insertionPoint", selection: "field" });
  });
});

describe("headingLevelOf", () => {
  it.each([
    ["Heading3", null, 3],
    ["Heading1", 10, 1],
    ["Normal", 2, 2],
    ["Normal", 9, 9],
    ["Normal", 10, null],
    ["Normal", null, null],
    ["Title", 10, null],
    [null, 4, 4],
  ] as const)("style %s, outline level %s gives %s", (style, outline, level) => {
    expect(headingLevelOf(style, outline)).toBe(level);
  });

  it("is what isHeadingParagraph tests for", () => {
    expect(isHeadingParagraph("Heading2", null)).toBe(true);
    expect(isHeadingParagraph("Normal", 10)).toBe(false);
  });
});

describe("confirmationFor", () => {
  it.each([
    ["none", null],
    ["inline", null],
    ["extended", "selection"],
    ["field", "field"],
  ] as const)("%s needs %s", (selection, confirmation) => {
    expect(confirmationFor(selection)).toBe(confirmation);
  });
});
