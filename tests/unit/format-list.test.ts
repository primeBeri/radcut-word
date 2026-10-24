import { describe, expect, it, vi } from "vitest";
import { formatById } from "../../src/core/formats/built-ins";
import { offeredFormats } from "../../src/core/formats/cycle";
import { DEFAULT_SETTINGS } from "../../src/core/settings/defaults";
import {
  addableBuiltIns,
  addBuiltIn,
  addTemplate,
  formatList,
  formatsFor,
  moveFormat,
  removeFormat,
  updateTemplate,
} from "../../src/core/settings/format-list";
import type { TemplateDefinition, UserSettings } from "../../src/core/settings/types";
import { loadUserSettings, MAX_TEMPLATES } from "../../src/core/settings/user-settings";
import { saveSettings, validateSettings } from "../../src/core/use-cases/save-settings";
import { FakeSettingsStore } from "../fakes/fake-settings-store";

const HOUSE = { id: "tpl:house", label: "House style", source: "see §{number} {text}, {abovebelow}" };
const PAGE = { id: "tpl:page", label: "Text and page", source: "{text} (p. {page})" };
/** The default list with `templates` after it. */
const withTemplates = (...templates: TemplateDefinition[]): UserSettings => ({
  ...DEFAULT_SETTINGS,
  formatOrder: [...DEFAULT_SETTINGS.formatOrder, ...templates.map((t) => t.id)],
  templates,
});
const ids = (settings: UserSettings) => formatsFor(settings).map((f) => f.id);

describe("the format list (FR-015, FR-016, FR-017)", () => {
  it("gives the formats in the list's order, which is the Tab cycle", () => {
    expect(ids(DEFAULT_SETTINGS)).toEqual(["sectionNumberText", "number", "text", "numberText"]);
    expect(ids({ ...withTemplates(HOUSE, PAGE), formatOrder: ["tpl:page", "page", "tpl:house", "text"] })).toEqual([
      "tpl:page",
      "page",
      "tpl:house",
      "text",
    ]);
  });

  it("gives templates their parts and names", () => {
    expect(formatsFor(withTemplates(PAGE)).at(-1)).toEqual({
      id: "tpl:page",
      label: "Text and page",
      builtIn: false,
      parts: [{ kind: "text" }, { kind: "literal", text: " (p. " }, { kind: "page" }, { kind: "literal", text: ")" }],
    });
  });

  it("never offers a template that does not parse, but keeps it in the list to finish editing", () => {
    const settings = withTemplates({ ...HOUSE, source: "{num}" });
    expect(ids(settings)).toEqual(DEFAULT_SETTINGS.formatOrder);
    expect(formatList(settings).map((entry) => entry.id)).toEqual([...DEFAULT_SETTINGS.formatOrder, "tpl:house"]);
    expect(formatList(settings).at(-1)).toEqual({ id: "tpl:house", template: { ...HOUSE, source: "{num}" }, format: null });
    expect(formatList(settings)[0]).toEqual({ id: "sectionNumberText", template: null, format: formatById("sectionNumberText") });
  });

  it("offers the built-ins not in the list to add, in FR-016 order, and adds one at the end", () => {
    expect(addableBuiltIns(DEFAULT_SETTINGS).map((f) => f.id)).toEqual(["page", "aboveBelow", "textAboveBelow"]);
    const added = addBuiltIn(DEFAULT_SETTINGS, "aboveBelow");
    expect(added.formatOrder).toEqual([...DEFAULT_SETTINGS.formatOrder, "aboveBelow"]);
    expect(addableBuiltIns(added).map((f) => f.id)).toEqual(["page", "textAboveBelow"]);
    expect(addBuiltIn(added, "aboveBelow")).toBe(added);
    expect(addBuiltIn(added, "tpl:house")).toBe(added);
  });

  it("removes a built-in from the list; it can be added again", () => {
    const removed = removeFormat(DEFAULT_SETTINGS, "number");
    expect(removed.formatOrder).toEqual(["sectionNumberText", "text", "numberText"]);
    expect(addableBuiltIns(removed).map((f) => f.id)).toContain("number");
  });

  it("deletes a template when it is removed from the list", () => {
    expect(removeFormat(withTemplates(HOUSE, PAGE), "tpl:house")).toEqual(withTemplates(PAGE));
  });

  it("forgets the last used format when it is removed", () => {
    const settings = { ...DEFAULT_SETTINGS, rememberLastFormat: true, lastFormatId: "text" };
    expect(removeFormat(settings, "text").lastFormatId).toBeNull();
    expect(removeFormat(settings, "number").lastFormatId).toBe("text");
  });

  it("never removes the last format", () => {
    const one = { ...DEFAULT_SETTINGS, formatOrder: ["text"] };
    expect(removeFormat(one, "text")).toBe(one);
  });

  it("moves a format to another place, kept within the list", () => {
    expect(moveFormat(DEFAULT_SETTINGS, "text", 0).formatOrder).toEqual(["text", "sectionNumberText", "number", "numberText"]);
    expect(moveFormat(DEFAULT_SETTINGS, "sectionNumberText", 2).formatOrder).toEqual(["number", "text", "sectionNumberText", "numberText"]);
    expect(moveFormat(DEFAULT_SETTINGS, "number", 99).formatOrder).toEqual(["sectionNumberText", "text", "numberText", "number"]);
    expect(moveFormat(DEFAULT_SETTINGS, "number", -3).formatOrder).toEqual(["number", "sectionNumberText", "text", "numberText"]);
    expect(moveFormat(DEFAULT_SETTINGS, "tpl:none", 0)).toBe(DEFAULT_SETTINGS);
  });

  it("leaves a template with an above/below part out of the cycle in a footnote, like the built-ins (FR-016a)", () => {
    const offered = offeredFormats(formatsFor(withTemplates(HOUSE, PAGE)), "footnote").map((f) => f.id);
    expect(offered).toContain("tpl:page");
    expect(offered).not.toContain("tpl:house");
  });
});

describe("template management (FR-018)", () => {
  it("adds a blank template at the end of the list, ready to fill in", () => {
    const result = addTemplate(withTemplates(HOUSE), "tpl:new");
    expect(result).toEqual({ ok: true, settings: withTemplates(HOUSE, { id: "tpl:new", label: "", source: "" }) });
  });

  it(`refuses a template past ${MAX_TEMPLATES}`, () => {
    const full = withTemplates(...Array.from({ length: MAX_TEMPLATES }, (_, i) => ({ ...HOUSE, id: `tpl:${i}`, label: `T${i}` })));
    expect(addTemplate(full, "tpl:new")).toEqual({ ok: false, error: "There can be at most 20 templates." });
  });

  it("edits a template's name or text, leaving the others", () => {
    const settings = withTemplates(HOUSE, PAGE);
    expect(updateTemplate(settings, "tpl:page", { label: "Page ref" }).templates).toEqual([HOUSE, { ...PAGE, label: "Page ref" }]);
    expect(updateTemplate(settings, "tpl:house", { source: "{text}" }).templates).toEqual([{ ...HOUSE, source: "{text}" }, PAGE]);
  });
});

describe("saving templates", () => {
  it("names each problem next to its template and field", () => {
    const errors = validateSettings(
      withTemplates(
        { id: "tpl:a", label: "", source: "see section" },
        { id: "tpl:b", label: "Number Only", source: "{num}" },
        { id: "tpl:c", label: "Fine", source: "{text}" },
        { id: "tpl:d", label: "fine", source: "{text" },
      ),
    );
    expect(errors).toEqual([
      { field: "templateLabel", templateId: "tpl:a", message: "Give the template a name." },
      { field: "templateSource", templateId: "tpl:a", message: "Add at least one of {number}, {text}, {page} or {abovebelow}." },
      { field: "templateLabel", templateId: "tpl:b", message: "A format with this name already exists." },
      { field: "templateSource", templateId: "tpl:b", message: "Unknown placeholder {num}. Use {number}, {text}, {page} or {abovebelow}." },
      { field: "templateLabel", templateId: "tpl:d", message: "A format with this name already exists." },
      { field: "templateSource", templateId: "tpl:d", message: "Unmatched { or }. Write {{ or }} for a literal brace." },
    ]);
  });

  it("refuses a built-in's name for a template even when that built-in is not in the list", () => {
    const errors = validateSettings(withTemplates({ id: "tpl:a", label: "Page Number", source: "{page}" }));
    expect(errors).toEqual([{ field: "templateLabel", templateId: "tpl:a", message: "A format with this name already exists." }]);
  });

  it("accepts a template first in the list", () => {
    expect(validateSettings({ ...withTemplates(HOUSE), formatOrder: ["tpl:house", "text"] })).toEqual([]);
  });

  it("stores names trimmed, so the palette shows what uniqueness compared", async () => {
    const store = new FakeSettingsStore();
    await saveSettings(store, withTemplates({ ...HOUSE, label: "  House style " }));
    expect(loadUserSettings(await store.loadSettings()).settings.templates).toEqual([HOUSE]);
  });

  it("editing or removing a template is a settings change only: nothing reaches a document", async () => {
    // The settings use cases take only the store; no gateway is involved, so inserted references cannot change.
    const store = new FakeSettingsStore();
    const write = vi.spyOn(store, "saveSettings");
    const edited = updateTemplate(withTemplates(HOUSE), "tpl:house", { source: "{text}" });
    await saveSettings(store, removeFormat(edited, "tpl:house"));
    expect(write).toHaveBeenCalledOnce();
    expect(write.mock.calls[0]![0].templates).toEqual([]);
  });
});

describe("loading templates", () => {
  const stored = (templates: TemplateDefinition[]) => withTemplates(...templates);

  it("keeps valid templates", () => {
    expect(loadUserSettings(stored([HOUSE, PAGE]))).toEqual({ settings: withTemplates(HOUSE, PAGE), notice: null });
  });

  it("leaves out a template that no longer parses or repeats a name, and says so", () => {
    const loaded = loadUserSettings(stored([HOUSE, { ...PAGE, source: "{num}" }, { ...PAGE, id: "tpl:x", label: "house STYLE" }]));
    expect(loaded).toEqual({ settings: withTemplates(HOUSE), notice: "templateDropped" });
  });
});
