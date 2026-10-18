import { describe, expect, it } from "vitest";
import { BUILT_IN_FORMATS } from "../../src/core/formats/built-ins";
import { parseTemplate, TEMPLATE_TEXT, validateTemplateLabel } from "../../src/core/formats/template-parser";

const ok = (source: string) => {
  const result = parseTemplate(source);
  if (!result.ok) throw new Error(`expected "${source}" to parse: ${result.error}`);
  return result.parts;
};
const error = (source: string) => {
  const result = parseTemplate(source);
  if (result.ok) throw new Error(`expected "${source}" to be rejected`);
  return result.error;
};

describe("parseTemplate (contracts/format-templates.md)", () => {
  it.each([
    [
      "see §{number} {text}, {abovebelow}",
      [{ kind: "literal", text: "see §" }, { kind: "number" }, { kind: "literal", text: " " }, { kind: "text" }, { kind: "literal", text: ", " }, { kind: "aboveBelow" }],
    ],
    ["{text} (p. {page})", [{ kind: "text" }, { kind: "literal", text: " (p. " }, { kind: "page" }, { kind: "literal", text: ")" }]],
    ["{{draft}} {number}", [{ kind: "literal", text: "{draft} " }, { kind: "number" }]],
  ])("the contract's example %j", (source, parts) => {
    expect(ok(source)).toEqual(parts);
  });

  it("rejects the contract's error examples with their messages", () => {
    expect(error("see section")).toBe("Add at least one of {number}, {text}, {page} or {abovebelow}.");
    expect(error("{num}")).toBe("Unknown placeholder {num}. Use {number}, {text}, {page} or {abovebelow}.");
  });

  it("reads placeholder names case-insensitively", () => {
    expect(ok("{Number} {TEXT} {Page} {AboveBelow}")).toEqual([
      { kind: "number" },
      { kind: "literal", text: " " },
      { kind: "text" },
      { kind: "literal", text: " " },
      { kind: "page" },
      { kind: "literal", text: " " },
      { kind: "aboveBelow" },
    ]);
  });

  it("makes a separate part of each repeated placeholder", () => {
    expect(ok("{text}{text}")).toEqual([{ kind: "text" }, { kind: "text" }]);
    expect(ok("{number} {number}").filter((p) => p.kind === "number")).toHaveLength(2);
  });

  it("reads {{ and }} as literal braces, next to placeholders too", () => {
    expect(ok("{{{number}}}")).toEqual([{ kind: "literal", text: "{" }, { kind: "number" }, { kind: "literal", text: "}" }]);
    expect(ok("}}{text}")).toEqual([{ kind: "literal", text: "}" }, { kind: "text" }]);
  });

  it.each(["{text", "text}", "{text} }", "{te{xt}", "{{text}", "{}"])("rejects unbalanced braces in %j", (source) => {
    expect(error(source)).toBe(source === "{}" ? "Unknown placeholder {}. Use {number}, {text}, {page} or {abovebelow}." : "Unmatched { or }. Write {{ or }} for a literal brace.");
  });

  it("names the unknown placeholder as typed, spaces included", () => {
    expect(error("{ number }")).toBe("Unknown placeholder { number }. Use {number}, {text}, {page} or {abovebelow}.");
  });

  it("needs a placeholder: an empty template and only literal braces are rejected", () => {
    expect(error("")).toBe(TEMPLATE_TEXT.noPlaceholder);
    expect(error("{{number}}")).toBe(TEMPLATE_TEXT.noPlaceholder);
  });

  it("accepts 200 characters and rejects 201", () => {
    const at200 = "{text}" + "x".repeat(194);
    expect(at200).toHaveLength(200);
    expect(parseTemplate(at200).ok).toBe(true);
    expect(error(at200 + "x")).toBe("Templates can be up to 200 characters.");
  });

  it("reports the length before anything else", () => {
    expect(error("{".repeat(201))).toBe(TEMPLATE_TEXT.tooLong);
  });
});

describe("validateTemplateLabel", () => {
  const builtInLabels = BUILT_IN_FORMATS.map((f) => f.label);

  it("accepts a new name of 1 to 40 characters", () => {
    expect(validateTemplateLabel("House style", builtInLabels)).toBeNull();
    expect(validateTemplateLabel("x".repeat(40), builtInLabels)).toBeNull();
  });

  it("rejects a name another format has, ignoring case and surrounding spaces", () => {
    expect(validateTemplateLabel("text only", builtInLabels)).toBe("A format with this name already exists.");
    expect(validateTemplateLabel(" § NUMBER & TEXT ", builtInLabels)).toBe("A format with this name already exists.");
    expect(validateTemplateLabel("House style", [...builtInLabels, "house style"])).toBe(TEMPLATE_TEXT.duplicateLabel);
  });

  it("rejects an empty name and one over 40 characters", () => {
    expect(validateTemplateLabel("", builtInLabels)).toBe("Give the template a name.");
    expect(validateTemplateLabel("   ", builtInLabels)).toBe(TEMPLATE_TEXT.noLabel);
    expect(validateTemplateLabel("x".repeat(41), builtInLabels)).toBe("Names can be up to 40 characters.");
  });
});
