import { describe, expect, it } from "vitest";
import { BUILT_IN_FORMATS } from "../../src/core/formats/built-ins";
import { DEFAULT_SETTINGS } from "../../src/core/settings/defaults";
import type { UserSettings } from "../../src/core/settings/types";
import { loadUserSettings } from "../../src/core/settings/user-settings";
import { saveSettings } from "../../src/core/use-cases/save-settings";
import { FakeSettingsStore } from "../fakes/fake-settings-store";

const HOUSE = { id: "tpl:house", label: "House style", source: "see §{number} {text}" };

const saved: UserSettings = {
  schemaVersion: 2,
  formatOrder: ["number", "tpl:house", "page"],
  templates: [HOUSE],
  rememberLastFormat: true,
  lastFormatId: "page",
  allowReferencesInHeadings: true,
  showHeadingsOutsideMainText: false,
};

describe("settings defaults (data-model UserSettings)", () => {
  it("are version 2, the four starter formats, nothing remembered, no references in headings, headings outside the main text shown", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      schemaVersion: 2,
      formatOrder: ["sectionNumberText", "number", "text", "numberText"],
      templates: [],
      rememberLastFormat: false,
      lastFormatId: null,
      allowReferencesInHeadings: false,
      showHeadingsOutsideMainText: true,
    });
  });
});

describe("loadUserSettings", () => {
  it("gives the defaults, without a notice, when nothing is stored", () => {
    expect(loadUserSettings(null)).toEqual({ settings: DEFAULT_SETTINGS, notice: null });
  });

  it("keeps valid version 2 settings as they are", () => {
    expect(loadUserSettings(structuredClone(saved))).toEqual({ settings: saved, notice: null });
  });

  it("resets an unknown version to the defaults with a notice", () => {
    expect(loadUserSettings({ ...saved, schemaVersion: 7 })).toEqual({ settings: DEFAULT_SETTINGS, notice: "settingsReset" });
  });

  it.each([
    ["a string", "not json"],
    ["a number", 3],
    ["an array", []],
    ["no version", { ...saved, schemaVersion: undefined }],
    ["a non-boolean setting", { ...saved, allowReferencesInHeadings: "yes" }],
    ["a non-boolean remember setting", { ...saved, rememberLastFormat: 1 }],
    ["a format list that is not a list", { ...saved, formatOrder: "number" }],
    ["a format list with a non-string", { ...saved, formatOrder: ["number", 4] }],
    ["a last format that is not a string", { ...saved, lastFormatId: 4 }],
    ["templates that are not a list", { ...saved, templates: {} }],
    ["a template without a source", { ...saved, templates: [{ id: "tpl:a", label: "A" }] }],
    ["more than 20 templates", { ...saved, templates: Array.from({ length: 21 }, (_, i) => ({ id: `tpl:${i}`, label: `T${i}`, source: "{text}" })) }],
  ])("resets corrupt data (%s) to the defaults with a notice", (_name, raw) => {
    expect(loadUserSettings(raw)).toEqual({ settings: DEFAULT_SETTINGS, notice: "settingsReset" });
  });

  it("drops unknown formats and repeats from the list, and adds a template missing from it at the end", () => {
    const loaded = loadUserSettings({ ...saved, formatOrder: ["page", "tpl:deleted", "page", "number"] });
    expect(loaded).toEqual({ settings: { ...saved, formatOrder: ["page", "number", "tpl:house"] }, notice: null });
  });

  it("uses the default list when nothing in the list is left", () => {
    const loaded = loadUserSettings({ ...saved, templates: [], formatOrder: ["tpl:deleted"], lastFormatId: null });
    expect(loaded.settings.formatOrder).toEqual(DEFAULT_SETTINGS.formatOrder);
  });

  it("forgets a last used format that is no longer in the list", () => {
    expect(loadUserSettings({ ...saved, lastFormatId: "text" }).settings.lastFormatId).toBeNull();
  });

  it("drops fields it does not know", () => {
    expect(loadUserSettings({ ...saved, extra: 1 })).toEqual({ settings: saved, notice: null });
  });
});

describe("migrating version 1 settings (data-model, 2026-10-18)", () => {
  const version1 = {
    schemaVersion: 1,
    defaultFormatId: "number",
    templates: [HOUSE],
    allowReferencesInHeadings: true,
    showHeadingsOutsideMainText: false,
  };
  const builtIns = BUILT_IN_FORMATS.map((f) => f.id);

  it("keeps every format, the old default first, then the built-ins and templates in their old order", () => {
    expect(loadUserSettings(version1)).toEqual({
      settings: {
        schemaVersion: 2,
        formatOrder: ["number", ...builtIns.filter((id) => id !== "number"), "tpl:house"],
        templates: [HOUSE],
        rememberLastFormat: false,
        lastFormatId: null,
        allowReferencesInHeadings: true,
        showHeadingsOutsideMainText: false,
      },
      notice: null,
    });
  });

  it("puts a template default first", () => {
    expect(loadUserSettings({ ...version1, defaultFormatId: "tpl:house" }).settings.formatOrder).toEqual(["tpl:house", ...builtIns]);
  });

  it("starts on § number text when the old default named no format", () => {
    const order = loadUserSettings({ ...version1, defaultFormatId: "tpl:deleted" }).settings.formatOrder;
    expect(order[0]).toBe("sectionNumberText");
    expect(order).toHaveLength(builtIns.length + 1);
  });

  it("resets corrupt version 1 data with a notice", () => {
    expect(loadUserSettings({ ...version1, defaultFormatId: 4 })).toEqual({ settings: DEFAULT_SETTINGS, notice: "settingsReset" });
  });
});

describe("SaveSettings", () => {
  it("persists valid settings through the store, and they load back the same", async () => {
    const store = new FakeSettingsStore();
    expect(await saveSettings(store, saved)).toEqual({ ok: true });
    expect(loadUserSettings(await store.loadSettings())).toEqual({ settings: saved, notice: null });
  });

  it("refuses an empty format list, writing nothing", async () => {
    const store = new FakeSettingsStore();
    expect(await saveSettings(store, { ...saved, formatOrder: [], templates: [], lastFormatId: null })).toEqual({
      ok: false,
      errors: [{ field: "formats", message: "Keep at least one format." }],
    });
    expect(await store.loadSettings()).toBeNull();
  });

  it("reports a failure to store, so the view can say the settings were not saved", async () => {
    const store = new FakeSettingsStore();
    store.saveSettings = async () => {
      throw new Error("quota");
    };
    expect(await saveSettings(store, saved)).toEqual({ ok: false, errors: [], failed: true });
  });
});
