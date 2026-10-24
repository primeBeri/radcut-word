import { describe, expect, it } from "vitest";
import { BUILT_IN_FORMATS, DEFAULT_FORMAT_ID, formatById } from "../../src/core/formats/built-ins";
import { fieldFor } from "../../src/core/formats/fields";
import { normaliseParts, partsForHeading } from "../../src/core/formats/parts";
import { previewReference } from "../../src/core/formats/preview";
import type { Heading } from "../../src/core/headings/types";

const fireStrategy: Heading = {
  key: { kind: "bookmark", name: "_RCaaaaaaaaaa" },
  level: 2,
  text: "Fire strategy",
  number: "4.3",
  order: 17,
  location: "main",
  bookmark: "_RCaaaaaaaaaa",
};

describe("built-in formats", () => {
  it("lists the seven built-ins in FR-016 order", () => {
    expect(BUILT_IN_FORMATS.map((f) => f.id)).toEqual([
      "text",
      "number",
      "numberText",
      "sectionNumberText",
      "page",
      "aboveBelow",
      "textAboveBelow",
    ]);
    expect(BUILT_IN_FORMATS.every((f) => f.builtIn)).toBe(true);
  });

  it("defaults to § number text, made of literal \"§ \", number, literal \" \", text", () => {
    expect(DEFAULT_FORMAT_ID).toBe("sectionNumberText");
    expect(formatById(DEFAULT_FORMAT_ID)?.parts).toEqual([
      { kind: "literal", text: "§ " },
      { kind: "number" },
      { kind: "literal", text: " " },
      { kind: "text" },
    ]);
  });
});

describe("previewReference", () => {
  const sectionNumberText = formatById("sectionNumberText")!.parts;

  it('previews "§ 4.3 Fire strategy"', () => {
    expect(previewReference(sectionNumberText, fireStrategy, { precedingHeadingOrder: 20, location: "main" })).toEqual({
      text: "§ 4.3 Fire strategy",
      warnings: [],
    });
  });

  it("leaves the number out for an unnumbered heading but keeps the § mark, and warns noNumber (T145)", () => {
    const preview = previewReference(sectionNumberText, { ...fireStrategy, number: null }, { precedingHeadingOrder: 20, location: "main" });
    expect(preview).toEqual({ text: "§ Fire strategy", warnings: ["noNumber"] });
  });

  it("previews nothing for a number-only format and an unnumbered heading", () => {
    const preview = previewReference([{ kind: "number" }], { ...fireStrategy, number: null }, { precedingHeadingOrder: 20, location: "main" });
    expect(preview).toEqual({ text: "", warnings: ["noNumber"] });
  });

  it("shows page as its placeholder, {page}, with pageUnknown", () => {
    expect(previewReference([{ kind: "page" }], fireStrategy, { precedingHeadingOrder: 20, location: "main" })).toEqual({
      text: "{page}",
      warnings: ["pageUnknown"],
    });
  });

  it("computes above/below from the preceding heading", () => {
    const parts = [{ kind: "aboveBelow" } as const];
    expect(previewReference(parts, fireStrategy, { precedingHeadingOrder: 20, location: "main" }).text).toBe("above");
    expect(previewReference(parts, fireStrategy, { precedingHeadingOrder: 17, location: "main" }).text).toBe("above");
    expect(previewReference(parts, fireStrategy, { precedingHeadingOrder: 3, location: "main" }).text).toBe("below");
    expect(previewReference(parts, fireStrategy, { precedingHeadingOrder: null, location: "main" }).text).toBe("below");
  });

  it.each(["textBox", "header", "footer"] as const)("cannot tell above/below for a target in a %s", (location) => {
    expect(
      previewReference([{ kind: "aboveBelow" }], { ...fireStrategy, location }, { precedingHeadingOrder: 20, location: "main" }),
    ).toEqual({ text: "{above/below}", warnings: ["positionUnknown"] });
  });

  it.each(["footnote", "endnote", "header", "footer", "textBox"] as const)("cannot tell above/below with the cursor in a %s", (location) => {
    expect(previewReference([{ kind: "aboveBelow" }], fireStrategy, { precedingHeadingOrder: null, location })).toEqual({
      text: "{above/below}",
      warnings: ["positionUnknown"],
    });
  });

  it("tells above/below with the cursor in a table cell of the main text", () => {
    const context = { precedingHeadingOrder: 20, location: "tableCellInMain" } as const;
    expect(previewReference([{ kind: "aboveBelow" }], fireStrategy, context).text).toBe("above");
  });

  it("names an empty heading text in the preview", () => {
    expect(previewReference([{ kind: "text" }], { ...fireStrategy, text: "" }, { precedingHeadingOrder: 0, location: "main" }).text).toBe(
      "",
    );
  });
});

describe("normaliseParts", () => {
  it("merges adjacent literals and drops empty ones", () => {
    expect(
      normaliseParts([
        { kind: "literal", text: "" },
        { kind: "literal", text: "see " },
        { kind: "literal", text: "§ " },
        { kind: "number" },
        { kind: "literal", text: "" },
        { kind: "text" },
      ]),
    ).toEqual([{ kind: "literal", text: "see § " }, { kind: "number" }, { kind: "text" }]);
  });
});

describe("partsForHeading (T145: an unnumbered heading loses the number, keeping the mark before it)", () => {
  const lit = (text: string) => ({ kind: "literal", text }) as const;
  const NUMBER = { kind: "number" } as const;
  const TEXT = { kind: "text" } as const;
  const ABOVE = { kind: "aboveBelow" } as const;

  it("keeps every part for a numbered heading", () => {
    const parts = [lit("§ "), NUMBER, lit(" "), TEXT];
    expect(partsForHeading(parts, "4.3")).toEqual(parts);
  });

  it.each([
    ["§ number text keeps the §", [lit("§ "), NUMBER, lit(" "), TEXT], [lit("§ "), TEXT]],
    ["§number text, no space after the mark", [lit("§"), NUMBER, lit(" "), TEXT], [lit("§ "), TEXT]],
    ["number + text", [NUMBER, lit(" "), TEXT], [TEXT]],
    ["number. text", [NUMBER, lit(". "), TEXT], [TEXT]],
    ["text (number) loses the brackets", [TEXT, lit(" ("), NUMBER, lit(")")], [TEXT]],
    ["text [§ number] loses everything in the brackets", [TEXT, lit(" [§ "), NUMBER, lit("]")], [TEXT]],
    ["a label before the number stays", [TEXT, lit(", section "), NUMBER, lit(" "), ABOVE], [TEXT, lit(", section "), ABOVE]],
    ["no space is added where the padding had none", [TEXT, lit("–"), NUMBER, lit("–"), ABOVE], [TEXT, lit("–"), ABOVE]],
    ["two number parts", [NUMBER, lit(" "), TEXT, lit(" "), NUMBER], [TEXT]],
  ] as const)("%s", (_name, parts, expected) => {
    expect(partsForHeading(parts, null)).toEqual(expected);
  });

  it("leaves nothing when the number was the only field", () => {
    expect(partsForHeading([lit("section "), NUMBER], null)).toEqual([]);
  });

  it("keeps a format without a number part as it is", () => {
    const parts = [TEXT, lit(" "), ABOVE];
    expect(partsForHeading(parts, null)).toEqual(parts);
  });
});

describe("fieldFor (research R5 mapping, shared by both gateways)", () => {
  it.each([
    ["number", "ref", ["\\w", "\\h", "\\* CHARFORMAT"]],
    ["text", "ref", ["\\h", "\\* CHARFORMAT"]],
    ["page", "pageRef", ["\\h", "\\* CHARFORMAT"]],
    ["aboveBelow", "ref", ["\\p", "\\h", "\\* CHARFORMAT"]],
  ] as const)("%s → %s with %o", (kind, type, switches) => {
    expect(fieldFor(kind)).toEqual({ type, switches });
  });
});
