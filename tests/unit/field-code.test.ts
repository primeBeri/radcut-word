import { describe, expect, it } from "vitest";
import { parseFieldCode } from "../../src/core/references/field-code";

describe("parseFieldCode", () => {
  it("reads the bookmark and switches, joining \\* with its argument", () => {
    expect(parseFieldCode(" REF _XRabc1234567 \\w \\h \\* CHARFORMAT ")).toEqual({
      bookmark: "_XRabc1234567",
      switches: ["\\w", "\\h", "\\* CHARFORMAT"],
    });
  });

  it("ignores the control characters Word leaves in field code text (in-Word contract run)", () => {
    expect(parseFieldCode(" REF _Ref242545576 \\r \\h \u0001")).toEqual({
      bookmark: "_Ref242545576",
      switches: ["\\r", "\\h"],
    });
    expect(parseFieldCode("\u0013 PAGEREF _Toc1 \\h \u0014")).toEqual({ bookmark: "_Toc1", switches: ["\\h"] });
  });

  it("returns a null bookmark for a code with no argument", () => {
    expect(parseFieldCode(" REF ")).toEqual({ bookmark: null, switches: [] });
  });
});
