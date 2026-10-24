import { fireEvent, render, screen, waitFor, within } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../../src/core/settings/defaults";
import type { UserSettings } from "../../src/core/settings/types";
import type { SaveSettingsResult } from "../../src/core/use-cases/save-settings";
import { shortcutControl } from "../fakes/fake-host-shell";
import Settings from "../../src/ui/settings/Settings.svelte";
import { SETTINGS_TEXT } from "../../src/ui/settings/labels";
import type { SettingsProps } from "../../src/ui/settings/types";

/** How an explanation reads as an accessible description: its line breaks collapse to spaces. */
const asDescription = (text: string) => text.replace(/\s+/g, " ");

function setup(overrides: Partial<SettingsProps> = {}) {
  const save = vi.fn<SettingsProps["save"]>(async (): Promise<SaveSettingsResult> => ({ ok: true }));
  const close = vi.fn();
  const props: SettingsProps = { settings: DEFAULT_SETTINGS, notice: null, save, close, shortcut: shortcutControl(), ...overrides };
  const result = render(Settings, { props });
  const toggle = (name: string) => screen.getByRole("button", { name });
  const list = () => screen.getByRole("list", { name: SETTINGS_TEXT.formatList });
  const rows = () => within(list()).getAllByRole("listitem");
  const names = () => rows().map((row) => row.querySelector(".name")?.textContent);
  const button = (name: string) => screen.getByRole("button", { name });
  const allow = () => screen.getByRole("checkbox", { name: "Allow cross references in headings" });
  const outside = () => screen.getByRole("checkbox", { name: "Show headings outside of the main text" });
  const remember = () => screen.getByRole("checkbox", { name: SETTINGS_TEXT.rememberLastFormat });
  const recent = () => screen.getByRole("checkbox", { name: "Show recently used headings" });
  const saveButton = () => button("Save");
  const closeButton = () => button("Close");
  const esc = () => fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
  return { ...result, save, close, toggle, list, rows, names, button, allow, outside, remember, recent, saveButton, closeButton, esc };
}

describe("settings view sections (FR-021a, contracts/palette-ui.md)", () => {
  it("has three collapsible sections, Formats open and focused on opening, the others closed", () => {
    const { toggle } = setup();
    expect(toggle("Cross Reference Formats")).toHaveFocus();
    expect(toggle("Cross Reference Formats")).toHaveAttribute("aria-expanded", "true");
    expect(toggle("Shortcut")).toHaveAttribute("aria-expanded", "false");
    expect(toggle("Headings")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("region", { name: "Cross Reference Formats" })).toBeInTheDocument();
  });

  it("opens and closes a section with its button, keeping what is in it", async () => {
    const { toggle, allow } = setup();
    expect(screen.queryByRole("checkbox", { name: "Allow cross references in headings" })).toBeNull();
    await fireEvent.click(toggle("Headings"));
    expect(toggle("Headings")).toHaveAttribute("aria-expanded", "true");
    await fireEvent.click(allow());
    await fireEvent.click(toggle("Headings"));
    expect(screen.queryByRole("checkbox", { name: "Allow cross references in headings" })).toBeNull();
    await fireEvent.click(toggle("Headings"));
    expect(allow()).toBeChecked();
  });

  it("opens a closed Formats section when Save reports an error in it", async () => {
    const save = vi.fn(async (): Promise<SaveSettingsResult> => ({ ok: false, errors: [{ field: "formats", message: "Keep at least one format." }] }));
    const { toggle, saveButton, list } = setup({ save });
    await fireEvent.click(toggle("Cross Reference Formats"));
    await fireEvent.click(saveButton());
    await waitFor(() => expect(toggle("Cross Reference Formats")).toHaveAttribute("aria-expanded", "true"));
    expect(screen.getByRole("alert")).toHaveTextContent("Keep at least one format.");
    expect(list()).toHaveAccessibleDescription("Keep at least one format.");
    expect(toggle("Cross Reference Formats")).toHaveFocus();
  });
});

describe("the format list (FR-015–FR-017, contracts/palette-ui.md)", () => {
  it("lists the formats in Tab order, each with its sample preview and its buttons", () => {
    const { rows, names } = setup();
    expect(names()).toEqual(["§ Number & Text", "Number Only", "Text Only", "Number & Text"]);
    expect(rows().map((row) => row.querySelector(".sample")?.textContent)).toEqual(["§ 4.3 Fire strategy", "4.3", "Fire strategy", "4.3 Fire strategy"]);
    const first = within(rows()[0]!);
    expect(first.getByRole("button", { name: "Move § Number & Text up" })).toBeDisabled();
    expect(first.getByRole("button", { name: "Move § Number & Text down" })).toBeEnabled();
    expect(first.getByRole("button", { name: "Remove § Number & Text" })).toBeEnabled();
    expect(within(rows()[3]!).getByRole("button", { name: "Move Number & Text down" })).toBeDisabled();
  });

  it("moves a format, announces its new place and keeps focus on the button, or the other one at an end", async () => {
    const { names, button } = setup();
    button("Move Text Only up").focus();
    await fireEvent.click(button("Move Text Only up"));
    expect(names()).toEqual(["§ Number & Text", "Text Only", "Number Only", "Number & Text"]);
    expect(screen.getByRole("status")).toHaveTextContent("Text Only is now 2 of 4.");
    await waitFor(() => expect(button("Move Text Only up")).toHaveFocus());
    await fireEvent.click(button("Move Text Only up"));
    expect(names()[0]).toBe("Text Only");
    await waitFor(() => expect(button("Move Text Only down")).toHaveFocus());
  });

  it("badges the first format, where the palette opens, and the badge follows a move", async () => {
    const { rows, button } = setup();
    const badges = () => rows().map((row) => row.querySelector(".name")?.getAttribute("data-badge") ?? null);
    expect(badges()).toEqual([SETTINGS_TEXT.firstFormatBadge, null, null, null]);
    await fireEvent.click(button("Move Number Only up"));
    expect(badges()).toEqual([SETTINGS_TEXT.firstFormatBadge, null, null, null]);
    expect(rows()[0]!.querySelector(".name")).toHaveTextContent(/^Number Only$/);
  });

  it("moves a format dragged onto another row to that place", async () => {
    const { rows, names } = setup();
    const grip = rows()[3]!.querySelector(".grip")!;
    await fireEvent.dragStart(grip);
    await fireEvent.dragOver(rows()[0]!);
    await fireEvent.drop(rows()[0]!);
    expect(names()).toEqual(["Number & Text", "§ Number & Text", "Number Only", "Text Only"]);
    expect(screen.getByRole("status")).toHaveTextContent("Number & Text is now 1 of 4.");
  });

  it("removes a format, focusing the next row's Remove, and never the last one", async () => {
    const settings: UserSettings = { ...DEFAULT_SETTINGS, formatOrder: ["number", "text"] };
    const { names, button } = setup({ settings });
    await fireEvent.click(button("Remove Number Only"));
    expect(names()).toEqual(["Text Only"]);
    expect(screen.getByRole("status")).toHaveTextContent("Number Only removed.");
    expect(button("Remove Text Only")).toBeDisabled();
    await waitFor(() => expect(button(SETTINGS_TEXT.newTemplate)).toHaveFocus());
  });

  it("adds a built-in format from the Add format menu, at the end", async () => {
    const { names, button } = setup();
    const add = button(SETTINGS_TEXT.addFormat);
    expect(add).toHaveAttribute("aria-haspopup", "menu");
    await fireEvent.click(add);
    expect(add).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByRole("menu");
    const items = within(menu).getAllByRole("menuitem");
    expect(items.map((item) => item.firstElementChild?.textContent)).toEqual(["Page Number", "Above/Below", "Text + Above/Below"]);
    await waitFor(() => expect(items[0]).toHaveFocus());
    await fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(items[1]).toHaveFocus();
    await fireEvent.keyDown(menu, { key: "End" });
    expect(items[2]).toHaveFocus();
    await fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(items[0]).toHaveFocus();
    await fireEvent.click(items[1]!);
    expect(names().at(-1)).toBe("Above/Below");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Above/Below added at the end.");
  });

  it("Esc closes the Add format menu without leaving settings", async () => {
    const { button, close } = setup();
    await fireEvent.click(button(SETTINGS_TEXT.addFormat));
    await fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(button(SETTINGS_TEXT.addFormat)).toHaveFocus();
    expect(close).not.toHaveBeenCalled();
  });

  it("hides Add format when every built-in is in the list", () => {
    const settings: UserSettings = { ...DEFAULT_SETTINGS, formatOrder: ["text", "number", "numberText", "sectionNumberText", "page", "aboveBelow", "textAboveBelow"] };
    setup({ settings });
    expect(screen.queryByRole("button", { name: SETTINGS_TEXT.addFormat })).toBeNull();
  });

  it("has the remember checkbox, off, explained by its info button", () => {
    const { remember } = setup();
    expect(remember()).not.toBeChecked();
    expect(remember()).toHaveAccessibleDescription(asDescription(SETTINGS_TEXT.rememberLastFormatInfo));
  });
});

describe("settings view controls and saving", () => {
  it("has the two heading checkboxes, off and on, each described by its explanation", async () => {
    const { toggle, allow, outside } = setup();
    await fireEvent.click(toggle("Headings"));
    expect(allow()).not.toBeChecked();
    expect(outside()).toBeChecked();
    expect(allow()).toHaveAccessibleDescription(asDescription(SETTINGS_TEXT.allowReferencesInHeadings));
    expect(outside()).toHaveAccessibleDescription(asDescription(SETTINGS_TEXT.showHeadingsOutsideMainText));
    expect(SETTINGS_TEXT.allowReferencesInHeadings).toMatch(/^Not recommended /);
  });

  it("has the recently used headings checkbox, on, explained by its info button (FR-022a)", async () => {
    const { toggle, recent } = setup();
    await fireEvent.click(toggle("Headings"));
    expect(recent()).toBeChecked();
    expect(recent()).toHaveAccessibleDescription(asDescription(SETTINGS_TEXT.showRecentHeadings));
    expect(screen.getByRole("button", { name: "About recently used headings" })).toBeInTheDocument();
  });

  it("counts turning off recently used headings as an unsaved change, and saves it", async () => {
    const { toggle, recent, closeButton, close, saveButton, save } = setup();
    await fireEvent.click(toggle("Headings"));
    await fireEvent.click(recent());
    await fireEvent.click(closeButton());
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: SETTINGS_TEXT.unsavedTitle })).toBeInTheDocument();
    await fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Keep editing" }));
    await fireEvent.click(saveButton());
    expect(save).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, showRecentHeadings: false });
  });

  it("gives every control a programmatic label", async () => {
    const { toggle } = setup();
    await fireEvent.click(toggle("Shortcut"));
    await fireEvent.click(toggle("Headings"));
    for (const control of [...screen.getAllByRole("checkbox"), ...screen.getAllByRole("button")]) {
      expect(control).toHaveAccessibleName();
    }
  });

  it("saves the edited settings, keeping the remembered format, and says so", async () => {
    const settings: UserSettings = { ...DEFAULT_SETTINGS, lastFormatId: "text" };
    const { toggle, button, remember, allow, outside, saveButton, save } = setup({ settings });
    await fireEvent.click(button("Move Number Only up"));
    await fireEvent.click(button("Remove Number & Text"));
    await fireEvent.click(remember());
    await fireEvent.click(toggle("Headings"));
    await fireEvent.click(allow());
    await fireEvent.click(outside());
    await fireEvent.click(saveButton());
    const expected: UserSettings = {
      ...DEFAULT_SETTINGS,
      formatOrder: ["number", "sectionNumberText", "text"],
      rememberLastFormat: true,
      lastFormatId: "text",
      allowReferencesInHeadings: true,
      showHeadingsOutsideMainText: false,
    };
    expect(save).toHaveBeenCalledWith(expected);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(SETTINGS_TEXT.saved));
  });

  it("says when the settings could not be stored", async () => {
    const save = vi.fn(async (): Promise<SaveSettingsResult> => ({ ok: false, errors: [], failed: true }));
    const { remember, saveButton } = setup({ save });
    await fireEvent.click(remember());
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

  it("counts a reordered list as an unsaved change", async () => {
    const { button, closeButton, close } = setup();
    await fireEvent.click(button("Move Text Only up"));
    await fireEvent.click(closeButton());
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: SETTINGS_TEXT.unsavedTitle })).toBeInTheDocument();
  });

  it("with unsaved changes, asks in the pane first; Keep editing stays, Discard leaves", async () => {
    const { remember, closeButton, close } = setup();
    await fireEvent.click(remember());
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
    const { remember, esc, close } = setup();
    await fireEvent.click(remember());
    await esc();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await esc();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(close).not.toHaveBeenCalled();
  });

  it("leaves without asking once the changes are saved", async () => {
    const { remember, saveButton, closeButton, close } = setup();
    await fireEvent.click(remember());
    await fireEvent.click(saveButton());
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(SETTINGS_TEXT.saved));
    await fireEvent.click(closeButton());
    expect(close).toHaveBeenCalledOnce();
  });
});
