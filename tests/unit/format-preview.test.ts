import { describe, expect, it } from "vitest";
import { BUILT_IN_FORMATS, DEFAULT_FORMAT_ID, formatById } from "../../src/core/formats/built-ins";
import { fieldFor } from "../../src/core/formats/fields";
import { normaliseParts } from "../../src/core/formats/parts";
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

  it("warns noNumber for an unnumbered heading", () => {
    const preview = previewReference(sectionNumberText, { ...fireStrategy, number: null }, { precedingHeadingOrder: 20, location: "main" });
    expect(preview.warnings).toEqual(["noNumber"]);
    expect(preview.text).toBe("§  Fire strategy");
  });

  it("shows page as ? with pageUnknown", () => {
    expect(previewReference([{ kind: "page" }], fireStrategy, { precedingHeadingOrder: 20, location: "main" })).toEqual({
      text: "?",
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
    ).toEqual({ text: "above/below ?", warnings: ["positionUnknown"] });
  });

  it.each(["footnote", "endnote"] as const)("cannot tell above/below with the cursor in a %s", (location) => {
    expect(previewReference([{ kind: "aboveBelow" }], fireStrategy, { precedingHeadingOrder: null, location })).toEqual({
      text: "above/below ?",
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
