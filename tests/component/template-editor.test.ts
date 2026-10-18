import { fireEvent, render, screen, waitFor, within } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { BUILT_IN_FORMATS, formatById } from "../../src/core/formats/built-ins";
import { headingKeyFor } from "../../src/core/headings/key";
import type { Heading } from "../../src/core/headings/types";
import { DEFAULT_SETTINGS } from "../../src/core/settings/defaults";
import { formatsFor } from "../../src/core/settings/templates";
import type { UserSettings } from "../../src/core/settings/types";
import { saveSettings } from "../../src/core/use-cases/save-settings";
import Palette from "../../src/ui/palette/Palette.svelte";
import { shortcutControl } from "../fakes/fake-host-shell";
import Settings from "../../src/ui/settings/Settings.svelte";
import { SETTINGS_TEXT } from "../../src/ui/settings/labels";
import type { SettingsProps } from "../../src/ui/settings/types";
import { FakeSettingsStore } from "../fakes/fake-settings-store";

const HOUSE = { id: "tpl:house", label: "House style", source: "see §{number} {text}, {abovebelow}" };

function setup(overrides: Partial<SettingsProps> = {}) {
  // The real validation, through a fake store, so errors are the ones the core gives.
  const store = new FakeSettingsStore();
  const save = vi.fn<SettingsProps["save"]>((settings) => saveSettings(store, settings));
  let next = 0;
  const props: SettingsProps = {
    settings: DEFAULT_SETTINGS,
    notice: null,
    save,
    close: vi.fn(),
    shortcut: shortcutControl(),
    newId: () => `id-${++next}`,
    ...overrides,
  };
  const result = render(Settings, { props });
  const section = () => screen.getByRole("region", { name: "Templates" });
  const templates = () => within(section()).queryAllByRole("group");
  const nameOf = (group: HTMLElement) => within(group).getByRole("textbox", { name: "Template name" });
  const textOf = (group: HTMLElement) => within(group).getByRole("textbox", { name: "Template text" });
  const add = () => fireEvent.click(screen.getByRole("button", { name: "Add template" }));
  const type = (input: HTMLElement, value: string) => fireEvent.input(input, { target: { value } });
  const saveButton = () => screen.getByRole("button", { name: "Save" });
  return { ...result, save, store, section, templates, nameOf, textOf, add, type, saveButton };
}

describe("templates in the settings view (FR-018, contracts/palette-ui.md)", () => {
  it("has a labelled Templates section, empty to start with", () => {
    const { section, templates } = setup();
    expect(section()).toHaveTextContent(SETTINGS_TEXT.noTemplates);
    expect(templates()).toHaveLength(0);
  });

  it("Add template adds a blank one and focuses its name; both inputs have programmatic labels", async () => {
    const { add, templates, nameOf, textOf } = setup();
    await add();
    const [group] = templates();
    expect(group).toBeDefined();
    expect(nameOf(group!)).toHaveFocus();
    expect(nameOf(group!)).toHaveValue("");
    expect(textOf(group!)).toHaveAccessibleDescription(new RegExp(SETTINGS_TEXT.templateHelp.replace(/[{}().]/g, "\\$&")));
  });

  it("shows a live preview against the sample heading, in a polite live region", async () => {
    const { add, templates, textOf, type } = setup();
    await add();
    const group = templates()[0]!;
    const preview = within(group).getByTestId("template-preview");
    expect(preview).toHaveAttribute("aria-live", "polite");
    await type(textOf(group), "see §{number} {text}, {abovebelow}");
    expect(preview).toHaveTextContent("see §4.3 Fire strategy, above");
    await type(textOf(group), "{text} (p. {page})");
    expect(preview).toHaveTextContent("Fire strategy (p. 12)");
  });

  it("saves a new template, which can then be the default", async () => {
    const { add, templates, nameOf, textOf, type, saveButton, save } = setup();
    await add();
    const group = templates()[0]!;
    await type(nameOf(group), "House style");
    await type(textOf(group), HOUSE.source);
    const radio = screen.getByRole("radio", { name: "House style" });
    expect(radio).toHaveAccessibleDescription("see §4.3 Fire strategy, above");
    await fireEvent.click(radio);
    await fireEvent.click(saveButton());
    expect(save).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, defaultFormatId: "tpl:id-1", templates: [{ ...HOUSE, id: "tpl:id-1" }] });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(SETTINGS_TEXT.saved));
  });

  it("rejects {num} with the contract's message next to the field, linked, invalid and announced, with focus on it", async () => {
    const { add, templates, nameOf, textOf, type, saveButton } = setup();
    await add();
    const group = templates()[0]!;
    await type(nameOf(group), "Broken");
    await type(textOf(group), "{num}");
    await fireEvent.click(saveButton());
    const message = "Unknown placeholder {num}. Use {number}, {text}, {page} or {abovebelow}.";
    await waitFor(() => expect(textOf(group)).toHaveFocus());
    expect(textOf(group)).toHaveAttribute("aria-invalid", "true");
    expect(textOf(group)).toHaveAccessibleDescription(expect.stringContaining(message));
    expect(within(group).getByRole("alert")).toHaveTextContent(message);
    expect(nameOf(group)).not.toHaveAttribute("aria-invalid", "true");
  });

  it("moves focus to the first error in the view's order: a name before its text", async () => {
    const { add, templates, nameOf, textOf, type, saveButton } = setup();
    await add();
    const group = templates()[0]!;
    await type(textOf(group), "see section");
    await fireEvent.click(saveButton());
    await waitFor(() => expect(nameOf(group)).toHaveFocus());
    expect(nameOf(group)).toHaveAccessibleDescription(expect.stringContaining("Give the template a name."));
    expect(textOf(group)).toHaveAccessibleDescription(expect.stringContaining("Add at least one of"));
  });

  it("rejects a name another format has", async () => {
    const { add, templates, nameOf, textOf, type, saveButton } = setup();
    await add();
    const group = templates()[0]!;
    await type(nameOf(group), "number");
    await type(textOf(group), "{number}");
    await fireEvent.click(saveButton());
    await waitFor(() => expect(nameOf(group)).toHaveAccessibleDescription(expect.stringContaining("A format with this name already exists.")));
  });

  it("clears a field's error once it is edited", async () => {
    const { add, templates, nameOf, textOf, type, saveButton } = setup();
    await add();
    const group = templates()[0]!;
    await type(nameOf(group), "Broken");
    await type(textOf(group), "{num}");
    await fireEvent.click(saveButton());
    await waitFor(() => expect(textOf(group)).toHaveAttribute("aria-invalid", "true"));
    await type(textOf(group), "{number}");
    expect(textOf(group)).not.toHaveAttribute("aria-invalid", "true");
    expect(within(group).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("edits and deletes saved templates; deleting the default makes § number text the default", async () => {
    const settings: UserSettings = { ...DEFAULT_SETTINGS, defaultFormatId: "tpl:house", templates: [HOUSE] };
    const { templates, nameOf, type, saveButton, save } = setup({ settings });
    const group = templates()[0]!;
    expect(nameOf(group)).toHaveValue("House style");
    await type(nameOf(group), "House");
    expect(screen.getByRole("radio", { name: "House" })).toBeChecked();
    await fireEvent.click(within(group).getByRole("button", { name: "Delete template House" }));
    expect(templates()).toHaveLength(0);
    expect(screen.getByRole("radio", { name: "§ number text" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Add template" })).toHaveFocus();
    await fireEvent.click(saveButton());
    expect(save).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, defaultFormatId: "sectionNumberText", templates: [] });
  });

  it("after deleting one of several, focus goes to the next template's name", async () => {
    const settings: UserSettings = { ...DEFAULT_SETTINGS, templates: [HOUSE, { id: "tpl:b", label: "B", source: "{text}" }] };
    const { templates, nameOf } = setup({ settings });
    await fireEvent.click(within(templates()[0]!).getByRole("button", { name: "Delete template House style" }));
    expect(nameOf(templates()[0]!)).toHaveFocus();
  });

  it("counts template edits as unsaved changes", async () => {
    const { add } = setup();
    await add();
    await fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.getByRole("alertdialog")).toHaveTextContent(SETTINGS_TEXT.unsavedTitle);
  });

  it("stops at 20 templates and says why", async () => {
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      templates: Array.from({ length: 20 }, (_, i) => ({ id: `tpl:${i}`, label: `T${i}`, source: "{text}" })),
    };
    const { add, templates } = setup({ settings });
    await add();
    expect(templates()).toHaveLength(20);
    expect(screen.getByRole("region", { name: "Templates" })).toHaveTextContent("There can be at most 20 templates.");
  });

  it("says when a stored template was left out", () => {
    setup({ notice: "templateDropped" });
    expect(screen.getByRole("status")).toHaveTextContent(SETTINGS_TEXT.templateDropped);
  });
});

describe("templates in the palette (FR-015, FR-018)", () => {
  const heading = (() => {
    const base = { level: 2 as const, text: "Fire strategy", number: "4.3", order: 0, location: "main" as const, bookmark: null };
    return { ...base, key: headingKeyFor(base) } satisfies Heading;
  })();

  it("come after the built-ins in the Tab cycle, with their preview, and Enter inserts them", async () => {
    const formats = formatsFor({ templates: [HOUSE] });
    const insert = vi.fn(async () => ({ kind: "closed" as const }));
    render(Palette, {
      props: {
        headings: [heading],
        format: formatById("textAboveBelow")!,
        formats,
        point: { kind: "insertionPoint", location: "main", selection: "none", inHeadingOrder: null, inHeadingFingerprint: null, precedingHeadingOrder: 5 },
        insert,
        cancel: vi.fn(),
      },
    });
    const input = screen.getByRole("combobox");
    await fireEvent.keyDown(input, { key: "Tab" });
    const line = screen.getByTestId("format-preview");
    expect(line.querySelector(".label")).toHaveTextContent("House style");
    expect(line.querySelector(".preview")).toHaveTextContent("see §4.3 Fire strategy, above");
    await fireEvent.keyDown(input, { key: "Tab" });
    expect(screen.getByTestId("format-preview").querySelector(".label")).toHaveTextContent(BUILT_IN_FORMATS[0]!.label);
    await fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
    await fireEvent.keyDown(input, { key: "Enter" });
    expect(insert).toHaveBeenCalledWith(heading, formats.at(-1), null);
  });
});
