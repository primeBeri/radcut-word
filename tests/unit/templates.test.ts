import { describe, expect, it, vi } from "vitest";
import { BUILT_IN_FORMATS, DEFAULT_FORMAT_ID } from "../../src/core/formats/built-ins";
import { offeredFormats } from "../../src/core/formats/cycle";
import { DEFAULT_SETTINGS } from "../../src/core/settings/defaults";
import { addTemplate, deleteTemplate, formatsFor, updateTemplate } from "../../src/core/settings/templates";
import type { UserSettings } from "../../src/core/settings/types";
import { loadUserSettings, MAX_TEMPLATES } from "../../src/core/settings/user-settings";
import { saveSettings, validateSettings } from "../../src/core/use-cases/save-settings";
import { FakeSettingsStore } from "../fakes/fake-settings-store";

const HOUSE = { id: "tpl:house", label: "House style", source: "see §{number} {text}, {abovebelow}" };
const PAGE = { id: "tpl:page", label: "Text and page", source: "{text} (p. {page})" };
const withTemplates = (...templates: UserSettings["templates"]): UserSettings => ({ ...DEFAULT_SETTINGS, templates });

describe("template management (FR-018)", () => {
  it("adds a blank template at the end, ready to fill in", () => {
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

  it("deletes a template; if it was the default, the default falls back to § number text", () => {
    const settings = { ...withTemplates(HOUSE, PAGE), defaultFormatId: "tpl:house" };
    expect(deleteTemplate(settings, "tpl:house")).toEqual({ ...withTemplates(PAGE), defaultFormatId: DEFAULT_FORMAT_ID });
    expect(deleteTemplate({ ...settings, defaultFormatId: "number" }, "tpl:house").defaultFormatId).toBe("number");
  });

  it("puts templates after the built-ins in the cycle, in the order they were made", () => {
    const formats = formatsFor(withTemplates(HOUSE, PAGE));
    expect(formats.slice(0, BUILT_IN_FORMATS.length)).toEqual(BUILT_IN_FORMATS);
    expect(formats.slice(BUILT_IN_FORMATS.length)).toEqual([
      { id: "tpl:house", label: "House style", builtIn: false, parts: expect.arrayContaining([{ kind: "aboveBelow" }]) },
      { id: "tpl:page", label: "Text and page", builtIn: false, parts: [{ kind: "text" }, { kind: "literal", text: " (p. " }, { kind: "page" }, { kind: "literal", text: ")" }] },
    ]);
  });

  it("leaves a template with an above/below part out of the cycle in a footnote, like the built-ins (FR-016a)", () => {
    const ids = offeredFormats(formatsFor(withTemplates(HOUSE, PAGE)), "footnote").map((f) => f.id);
    expect(ids).toContain("tpl:page");
    expect(ids).not.toContain("tpl:house");
  });

  it("never offers a template that does not parse", () => {
    expect(formatsFor(withTemplates({ ...HOUSE, source: "{num}" }))).toEqual(BUILT_IN_FORMATS);
  });
});

describe("saving templates", () => {
  it("names each problem next to its template and field", () => {
    const errors = validateSettings(
      withTemplates(
        { id: "tpl:a", label: "", source: "see section" },
        { id: "tpl:b", label: "Number", source: "{num}" },
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

  it("accepts a template as the default", () => {
    expect(validateSettings({ ...withTemplates(HOUSE), defaultFormatId: "tpl:house" })).toEqual([]);
  });

  it("refuses a default that names an invalid template", () => {
    const errors = validateSettings({ ...withTemplates({ ...HOUSE, source: "{num}" }), defaultFormatId: "tpl:house" });
    expect(errors.map((e) => e.field)).toEqual(["templateSource", "defaultFormatId"]);
  });

  it("stores names trimmed, so the palette shows what uniqueness compared", async () => {
    const store = new FakeSettingsStore();
    await saveSettings(store, withTemplates({ ...HOUSE, label: "  House style " }));
    expect(loadUserSettings(await store.loadSettings()).settings.templates).toEqual([HOUSE]);
  });

  it("editing or deleting a template is a settings change only: nothing reaches a document", async () => {
    // The settings use cases take only the store; no gateway is involved, so inserted references cannot change.
    const store = new FakeSettingsStore();
    const write = vi.spyOn(store, "saveSettings");
    const edited = updateTemplate(withTemplates(HOUSE), "tpl:house", { source: "{text}" });
    await saveSettings(store, deleteTemplate(edited, "tpl:house"));
    expect(write).toHaveBeenCalledOnce();
    expect(write.mock.calls[0]![0].templates).toEqual([]);
  });
});

describe("loading templates", () => {
  const stored = (templates: unknown[]) => ({ ...DEFAULT_SETTINGS, templates });

  it("keeps valid templates", () => {
    expect(loadUserSettings(stored([HOUSE, PAGE]))).toEqual({ settings: withTemplates(HOUSE, PAGE), notice: null });
  });

  it("leaves out a template that no longer parses or repeats a name, and says so", () => {
    const loaded = loadUserSettings(stored([HOUSE, { ...PAGE, source: "{num}" }, { ...PAGE, id: "tpl:x", label: "house STYLE" }]));
    expect(loaded).toEqual({ settings: withTemplates(HOUSE), notice: "templateDropped" });
  });

  it("falls back to § number text if the default was a template that was left out", () => {
    const loaded = loadUserSettings({ ...stored([{ ...HOUSE, source: "{num}" }]), defaultFormatId: "tpl:house" });
    expect(loaded.settings.defaultFormatId).toBe(DEFAULT_FORMAT_ID);
  });
});
