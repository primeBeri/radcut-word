import { describe, expect, it } from "vitest";
import { BUILT_IN_FORMATS, formatById } from "../../src/core/formats/built-ins";
import { hidesAboveBelow, offeredFormats, openingFormat, stepFormat } from "../../src/core/formats/cycle";
import { previewReference } from "../../src/core/formats/preview";
import type { ReferenceFormat } from "../../src/core/formats/types";
import type { Heading } from "../../src/core/headings/types";
import type { InsertionLocation } from "../../src/core/location/types";

const template = (id: string, label: string): ReferenceFormat => ({
  id,
  label,
  parts: [{ kind: "literal", text: "see " }, { kind: "text" }],
  builtIn: false,
});
const tplA = template("tpl:a", "See A");
const tplB = template("tpl:b", "See B");
const ALL = [...BUILT_IN_FORMATS, tplA, tplB];
const ids = (formats: readonly ReferenceFormat[]) => formats.map((f) => f.id);

const fireStrategy: Heading = {
  key: { kind: "bookmark", name: "_RCaaaaaaaaaa" },
  level: 2,
  text: "Fire strategy",
  number: "4.3",
  order: 17,
  location: "main",
  bookmark: "_RCaaaaaaaaaa",
};

const OUTSIDE: readonly InsertionLocation[] = ["footnote", "endnote", "header", "footer", "textBox"];

describe("format cycle (FR-015, FR-016, FR-016a)", () => {
  it("offers the built-ins then the templates in creation order in the main text and its tables", () => {
    for (const location of ["main", "tableCellInMain"] as const) {
      expect(ids(offeredFormats(ALL, location))).toEqual([...ids(BUILT_IN_FORMATS), "tpl:a", "tpl:b"]);
      expect(hidesAboveBelow(location)).toBe(false);
    }
  });

  it.each(OUTSIDE)("leaves out every format with an above/below part with the cursor in a %s", (location) => {
    const withAboveBelow = template("tpl:c", "Text above/below");
    const parts = [{ kind: "text" }, { kind: "literal", text: ", " }, { kind: "aboveBelow" }] as const;
    const offered = offeredFormats([...ALL, { ...withAboveBelow, parts }], location);
    expect(ids(offered)).toEqual(["text", "number", "numberText", "sectionNumberText", "page", "tpl:a", "tpl:b"]);
    expect(hidesAboveBelow(location)).toBe(true);
  });

  it("Tab moves to the next format and wraps from the last to the first", () => {
    expect(stepFormat(ALL, "text", 1).id).toBe("number");
    expect(stepFormat(ALL, "textAboveBelow", 1).id).toBe("tpl:a");
    expect(stepFormat(ALL, "tpl:b", 1).id).toBe("text");
  });

  it("Shift+Tab moves to the previous format and wraps from the first to the last", () => {
    expect(stepFormat(ALL, "number", -1).id).toBe("text");
    expect(stepFormat(ALL, "text", -1).id).toBe("tpl:b");
  });

  it("starts from the first format when the current one is not in the cycle", () => {
    expect(stepFormat(BUILT_IN_FORMATS, "tpl:gone", 1).id).toBe("text");
  });

  it("opens on the first format in the list (FR-017)", () => {
    expect(openingFormat(ALL, "main", null).id).toBe(ALL[0]!.id);
    expect(openingFormat([...ALL].reverse(), "main", null).id).toBe(ALL.at(-1)!.id);
  });

  it("opens on the remembered format when it is in the list (FR-017a)", () => {
    expect(openingFormat(ALL, "main", "number").id).toBe("number");
    expect(openingFormat(ALL, "main", "tpl:b").id).toBe("tpl:b");
  });

  it("opens on the first format when the remembered one is no longer in the list", () => {
    expect(openingFormat(ALL, "main", "tpl:deleted").id).toBe(ALL[0]!.id);
  });

  it.each(OUTSIDE)("in a %s, an opening format with above/below gives way to the next offered one (FR-016a)", (location) => {
    expect(openingFormat(ALL, location, "aboveBelow").id).toBe("tpl:a");
    expect(openingFormat(BUILT_IN_FORMATS, location, "textAboveBelow").id).toBe("text");
    const aboveFirst = [formatById("aboveBelow")!, formatById("number")!];
    expect(openingFormat(aboveFirst, location, null).id).toBe("number");
  });

  it.each(OUTSIDE)("in a %s, a list of only above/below formats offers the out-of-the-box list instead", (location) => {
    const onlyAbove = [formatById("aboveBelow")!, formatById("textAboveBelow")!];
    expect(offeredFormats(onlyAbove, location).map((f) => f.id)).toEqual(["sectionNumberText", "number", "text", "numberText"]);
    expect(openingFormat(onlyAbove, location, "aboveBelow").id).toBe("sectionNumberText");
    expect(offeredFormats(onlyAbove, "main")).toBe(onlyAbove);
  });
});

describe("preview of each built-in format (FR-015)", () => {
  const context = { precedingHeadingOrder: 20, location: "main" } as const;
  it.each([
    ["text", "Fire strategy", []],
    ["number", "4.3", []],
    ["numberText", "4.3 Fire strategy", []],
    ["sectionNumberText", "§ 4.3 Fire strategy", []],
    ["page", "{page}", ["pageUnknown"]],
    ["aboveBelow", "above", []],
    ["textAboveBelow", "Fire strategy above", []],
  ] as const)("%s previews as %j", (id, text, warnings) => {
    const format = BUILT_IN_FORMATS.find((f) => f.id === id)!;
    expect(previewReference(format.parts, fireStrategy, context)).toEqual({ text, warnings });
  });

  it("previews below for a target after the heading before the cursor", () => {
    const format = BUILT_IN_FORMATS.find((f) => f.id === "aboveBelow")!;
    expect(previewReference(format.parts, fireStrategy, { precedingHeadingOrder: 3, location: "main" }).text).toBe("below");
  });
});
