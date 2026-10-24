import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../../src/core/settings/defaults";
import { rememberFormat, startFormatId } from "../../src/core/use-cases/remember-format";
import { FakeSettingsStore } from "../fakes/fake-settings-store";

const remembering = { ...DEFAULT_SETTINGS, rememberLastFormat: true };

describe("remembering the last used format (FR-017a)", () => {
  it("stores the inserted format while the setting is on, and returns the settings now stored", async () => {
    const store = new FakeSettingsStore();
    const next = await rememberFormat(store, remembering, "number");
    expect(next).toEqual({ ...remembering, lastFormatId: "number" });
    expect(store.raw).toEqual(next);
  });

  it("writes nothing while the setting is off", async () => {
    const store = new FakeSettingsStore();
    const write = vi.spyOn(store, "saveSettings");
    expect(await rememberFormat(store, DEFAULT_SETTINGS, "number")).toBe(DEFAULT_SETTINGS);
    expect(write).not.toHaveBeenCalled();
  });

  it("writes nothing when the format is already the one remembered", async () => {
    const store = new FakeSettingsStore();
    const write = vi.spyOn(store, "saveSettings");
    const settings = { ...remembering, lastFormatId: "number" };
    expect(await rememberFormat(store, settings, "number")).toBe(settings);
    expect(write).not.toHaveBeenCalled();
  });

  it("opens on the remembered format only while the setting is on", () => {
    expect(startFormatId({ ...remembering, lastFormatId: "text" })).toBe("text");
    expect(startFormatId({ ...DEFAULT_SETTINGS, lastFormatId: "text" })).toBeNull();
    expect(startFormatId(remembering)).toBeNull();
  });
});
