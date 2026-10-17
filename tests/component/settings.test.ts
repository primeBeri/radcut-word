import { fireEvent, render, screen, waitFor, within } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { BUILT_IN_FORMATS } from "../../src/core/formats/built-ins";
import { DEFAULT_SETTINGS } from "../../src/core/settings/defaults";
import type { UserSettings } from "../../src/core/settings/types";
import type { SaveSettingsResult } from "../../src/core/use-cases/save-settings";
import Settings from "../../src/ui/settings/Settings.svelte";
import { SETTINGS_TEXT } from "../../src/ui/settings/labels";
import type { SettingsProps } from "../../src/ui/settings/types";

function setup(overrides: Partial<SettingsProps> = {}) {
  const save = vi.fn<SettingsProps["save"]>(async (): Promise<SaveSettingsResult> => ({ ok: true }));
  const close = vi.fn();
  const props: SettingsProps = { settings: DEFAULT_SETTINGS, formats: BUILT_IN_FORMATS, notice: null, save, close, ...overrides };
  const result = render(Settings, { props });
  const group = screen.getByRole("radiogroup", { name: "Default format" });
  const radio = (name: string) => within(group).getByRole("radio", { name });
  const allow = () => screen.getByRole("checkbox", { name: "Allow references in headings" });
  const outside = () => screen.getByRole("checkbox", { name: "Show headings outside the main text" });
  const saveButton = () => screen.getByRole("button", { name: "Save" });
  const closeButton = () => screen.getByRole("button", { name: "Close" });
  const esc = () => fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
  return { ...result, save, close, group, radio, allow, outside, saveButton, closeButton, esc };
}

describe("settings view (FR-021a, contracts/palette-ui.md)", () => {
  it("focuses its first control, the checked default format, on open", () => {
    const { radio } = setup();
    expect(radio("§ number text")).toHaveFocus();
    expect(radio("§ number text")).toBeChecked();
  });

  it("lists every format in a labelled radio group, each with a sample preview", () => {
    const { group, radio } = setup();
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(BUILT_IN_FORMATS.length);
    expect(radio("§ number text")).toHaveAccessibleDescription("§ 4.3 Fire strategy");
    expect(radio("Text + above/below")).toHaveAccessibleDescription("Fire strategy above");
    expect(radio("Page")).toHaveAccessibleDescription("12");
  });

  it("has the two heading checkboxes, off and on, each described by its explanation", () => {
    const { allow, outside } = setup();
    expect(allow()).not.toBeChecked();
    expect(outside()).toBeChecked();
    expect(allow()).toHaveAccessibleDescription(SETTINGS_TEXT.allowReferencesInHeadings);
    expect(outside()).toHaveAccessibleDescription(SETTINGS_TEXT.showHeadingsOutsideMainText);
    expect(SETTINGS_TEXT.allowReferencesInHeadings).toMatch(/^Not recommended\./);
  });

  it("gives every control a programmatic label", () => {
    setup();
    for (const control of [...screen.getAllByRole("radio"), ...screen.getAllByRole("checkbox"), ...screen.getAllByRole("button")]) {
      expect(control).toHaveAccessibleName();
    }
  });

  it("saves the edited settings and says so", async () => {
    const { radio, allow, outside, saveButton, save } = setup();
    await fireEvent.click(radio("Number"));
    await fireEvent.click(allow());
    await fireEvent.click(outside());
    await fireEvent.click(saveButton());
    const expected: UserSettings = {
      ...DEFAULT_SETTINGS,
      defaultFormatId: "number",
      allowReferencesInHeadings: true,
      showHeadingsOutsideMainText: false,
    };
    expect(save).toHaveBeenCalledWith(expected);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(SETTINGS_TEXT.saved));
  });

  it("shows a field's error next to it, linked and announced, with focus on it", async () => {
    const save = vi.fn(async (): Promise<SaveSettingsResult> => ({
      ok: false,
      errors: [{ field: "defaultFormatId", message: "Choose a default format." }],
    }));
    const { group, saveButton, radio } = setup({ save });
    await fireEvent.click(radio("Number"));
    await fireEvent.click(saveButton());
    const error = await screen.findByText("Choose a default format.");
    expect(error).toHaveAttribute("role", "alert");
    expect(group).toHaveAccessibleDescription("Choose a default format.");
    expect(radio("Number")).toHaveFocus();
  });

  it("says when the settings could not be stored", async () => {
    const save = vi.fn(async (): Promise<SaveSettingsResult> => ({ ok: false, errors: [], failed: true }));
    const { saveButton, radio } = setup({ save });
    await fireEvent.click(radio("Number"));
    await fireEvent.click(saveButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(SETTINGS_TEXT.saveFailed);
  });

  it("says when stored settings could not be read and the defaults are in use", () => {
    setup({ notice: "settingsReset" });
    expect(screen.getByRole("status")).toHaveTextContent(SETTINGS_TEXT.settingsReset);
  });

  it("Close and Esc leave at once when nothing has changed", async () => {
    const first = setup();
    await fireEvent.click(first.closeButton());
    expect(first.close).toHaveBeenCalledOnce();
    first.unmount();
    const second = setup();
    await second.esc();
    expect(second.close).toHaveBeenCalledOnce();
  });

  it("with unsaved changes, asks in the pane first; Keep editing stays, Discard leaves", async () => {
    const { radio, closeButton, close } = setup();
    await fireEvent.click(radio("Number"));
    await fireEvent.click(closeButton());
    expect(close).not.toHaveBeenCalled();
    const prompt = screen.getByRole("alertdialog", { name: SETTINGS_TEXT.unsavedTitle });
    const keep = within(prompt).getByRole("button", { name: "Keep editing" });
    expect(keep).toHaveFocus();
    await fireEvent.click(keep);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(close).not.toHaveBeenCalled();
    await fireEvent.click(closeButton());
    await fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Discard changes" }));
    expect(close).toHaveBeenCalledOnce();
  });

  it("Esc with the prompt up keeps editing; Esc again asks again", async () => {
    const { radio, esc, close } = setup();
    await fireEvent.click(radio("Number"));
    await esc();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await esc();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(close).not.toHaveBeenCalled();
  });

  it("leaves without asking once the changes are saved", async () => {
    const { radio, saveButton, closeButton, close } = setup();
    await fireEvent.click(radio("Number"));
    await fireEvent.click(saveButton());
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(SETTINGS_TEXT.saved));
    await fireEvent.click(closeButton());
    expect(close).toHaveBeenCalledOnce();
  });
});
