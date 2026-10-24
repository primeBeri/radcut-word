import { describe, expect, it } from "vitest";
import { BUILT_IN_FORMATS, formatById } from "../../src/core/formats/built-ins";
import type { FormatPart } from "../../src/core/formats/types";

const lit = (text: string): FormatPart => ({ kind: "literal", text });
const NUMBER: FormatPart = { kind: "number" };
const TEXT: FormatPart = { kind: "text" };
const PAGE: FormatPart = { kind: "page" };
const ABOVE_BELOW: FormatPart = { kind: "aboveBelow" };

describe("built-in format catalogue (FR-016, research R5)", () => {
  it("lists the seven built-ins in FR-016 order, all built in", () => {
    expect(BUILT_IN_FORMATS.map((f) => [f.id, f.builtIn])).toEqual([
      ["text", true],
      ["number", true],
      ["numberText", true],
      ["sectionNumberText", true],
      ["page", true],
      ["aboveBelow", true],
      ["textAboveBelow", true],
    ]);
  });

  it.each([
    ["text", [TEXT]],
    ["number", [NUMBER]],
    ["numberText", [NUMBER, lit(" "), TEXT]],
    ["sectionNumberText", [lit("§ "), NUMBER, lit(" "), TEXT]],
    ["page", [PAGE]],
    ["aboveBelow", [ABOVE_BELOW]],
    ["textAboveBelow", [TEXT, lit(" "), ABOVE_BELOW]],
  ] as const)("%s is made of the R5 parts", (id, parts) => {
    expect(formatById(id)?.parts).toEqual(parts);
  });

  it("gives every built-in a label and at least one field", () => {
    for (const format of BUILT_IN_FORMATS) {
      expect(format.label).not.toBe("");
      expect(format.parts.some((p) => p.kind !== "literal")).toBe(true);
    }
  });

  it("finds no format for an unknown id", () => {
    expect(formatById("tpl:missing")).toBeUndefined();
  });
});
