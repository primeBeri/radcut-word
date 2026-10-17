import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../../src/core/settings/defaults";
import type { UserSettings } from "../../src/core/settings/types";
import { loadUserSettings } from "../../src/core/settings/user-settings";
import { saveSettings } from "../../src/core/use-cases/save-settings";
import { FakeSettingsStore } from "../fakes/fake-settings-store";

const saved: UserSettings = {
  schemaVersion: 1,
  defaultFormatId: "number",
  templates: [],
  allowReferencesInHeadings: true,
  showHeadingsOutsideMainText: false,
};

describe("settings defaults (data-model UserSettings)", () => {
  it("are version 1, § number text, no templates, no references in headings, headings outside the main text shown", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      schemaVersion: 1,
      defaultFormatId: "sectionNumberText",
      templates: [],
      allowReferencesInHeadings: false,
      showHeadingsOutsideMainText: true,
    });
  });
});

describe("loadUserSettings", () => {
  it("gives the defaults, without a notice, when nothing is stored", () => {
    expect(loadUserSettings(null)).toEqual({ settings: DEFAULT_SETTINGS, notice: null });
  });

  it("keeps valid version 1 settings as they are", () => {
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
    ["a non-string default", { ...saved, defaultFormatId: 4 }],
    ["templates that are not a list", { ...saved, templates: {} }],
    ["a template without a source", { ...saved, templates: [{ id: "tpl:a", label: "A" }] }],
    ["more than 20 templates", { ...saved, templates: Array.from({ length: 21 }, (_, i) => ({ id: `tpl:${i}`, label: `T${i}`, source: "{text}" })) }],
  ])("resets corrupt data (%s) to the defaults with a notice", (_name, raw) => {
    expect(loadUserSettings(raw)).toEqual({ settings: DEFAULT_SETTINGS, notice: "settingsReset" });
  });

  it("falls back to § number text when the default names a format that no longer exists", () => {
    expect(loadUserSettings({ ...saved, defaultFormatId: "tpl:deleted" })).toEqual({
      settings: { ...saved, defaultFormatId: "sectionNumberText" },
      notice: null,
    });
  });

  it("accepts a template as the default", () => {
    const templates = [{ id: "tpl:a", label: "See", source: "see {text}" }];
    expect(loadUserSettings({ ...saved, templates, defaultFormatId: "tpl:a" }).settings.defaultFormatId).toBe("tpl:a");
  });

  it("drops fields it does not know", () => {
    expect(loadUserSettings({ ...saved, extra: 1 })).toEqual({ settings: saved, notice: null });
  });
});

describe("SaveSettings", () => {
  it("persists valid settings through the store, and they load back the same", async () => {
    const store = new FakeSettingsStore();
    expect(await saveSettings(store, saved)).toEqual({ ok: true });
    expect(loadUserSettings(await store.loadSettings())).toEqual({ settings: saved, notice: null });
  });

  it("refuses a default that names no format, writing nothing", async () => {
    const store = new FakeSettingsStore();
    expect(await saveSettings(store, { ...saved, defaultFormatId: "tpl:nothing" })).toEqual({
      ok: false,
      errors: [{ field: "defaultFormatId", message: "Choose a default format." }],
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
