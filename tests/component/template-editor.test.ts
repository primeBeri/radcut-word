import { fireEvent, render, screen, waitFor, within } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { formatById } from "../../src/core/formats/built-ins";
import { headingKeyFor } from "../../src/core/headings/key";
import type { Heading } from "../../src/core/headings/types";
import { DEFAULT_SETTINGS } from "../../src/core/settings/defaults";
import { formatsFor } from "../../src/core/settings/format-list";
import type { TemplateDefinition, UserSettings } from "../../src/core/settings/types";
import { saveSettings } from "../../src/core/use-cases/save-settings";
import Palette from "../../src/ui/palette/Palette.svelte";
import { shortcutControl } from "../fakes/fake-host-shell";
import Settings from "../../src/ui/settings/Settings.svelte";
import { SETTINGS_TEXT } from "../../src/ui/settings/labels";
import type { SettingsProps } from "../../src/ui/settings/types";
import { FakeSettingsStore } from "../fakes/fake-settings-store";

const HOUSE = { id: "tpl:house", label: "House style", source: "see §{number} {text}, {abovebelow}" };
/** The default list with `templates` after it. */
const withTemplates = (...templates: TemplateDefinition[]): UserSettings => ({
  ...DEFAULT_SETTINGS,
  formatOrder: [...DEFAULT_SETTINGS.formatOrder, ...templates.map((t) => t.id)],
  templates,
});

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
  const list = () => screen.getByRole("list", { name: SETTINGS_TEXT.formatList });
  /** The open template editors, each a fieldset named by the template. */
  const editors = () => within(list()).queryAllByRole("group");
  const rowOf = (group: HTMLElement) => group.closest("li")!;
  const nameOf = (group: HTMLElement) => within(group).getByRole("textbox", { name: "Cross reference format name" });
  const textOf = (group: HTMLElement) => within(group).getByRole("textbox", { name: "Cross reference format text" });
  const add = () => fireEvent.click(screen.getByRole("button", { name: SETTINGS_TEXT.newTemplate }));
  const type = (input: HTMLElement, value: string) => fireEvent.input(input, { target: { value } });
  const saveButton = () => screen.getByRole("button", { name: "Save" });
  return { ...result, save, store, list, editors, rowOf, nameOf, textOf, add, type, saveButton };
}

describe("templates in the format list (FR-018, contracts/palette-ui.md)", () => {
  it("New template adds a row at the end with its editor open and focus in its name; both inputs have programmatic labels", async () => {
    const { add, editors, nameOf, textOf, list } = setup();
    await add();
    const [group] = editors();
    expect(group).toBeDefined();
    await waitFor(() => expect(nameOf(group!)).toHaveFocus());
    expect(nameOf(group!)).toHaveValue("");
    expect(within(list()).getAllByRole("listitem").at(-1)).toContainElement(group!);
    expect(textOf(group!)).toHaveAccessibleDescription(new RegExp(SETTINGS_TEXT.templateHelp.replace(/\s+/g, " ").replace(/[{}().]/g, "\\$&")));
  });

  it("shows a live preview in the row, against the sample heading, in a polite live region", async () => {
    const { add, editors, textOf, type, rowOf } = setup();
    await add();
    const group = editors()[0]!;
    const preview = within(rowOf(group)).getByTestId("template-preview");
    expect(preview).toHaveAttribute("aria-live", "polite");
    expect(preview).toHaveTextContent(SETTINGS_TEXT.noPreview);
    await type(textOf(group), "see §{number} {text}, {abovebelow}");
    expect(preview).toHaveTextContent("see §4.3 Fire strategy, above");
    await type(textOf(group), "{text} (p. {page})");
    expect(preview).toHaveTextContent("Fire strategy (p. 12)");
  });

  it("saves a new template, which can then be moved first", async () => {
    const { add, editors, nameOf, textOf, type, saveButton, save } = setup();
    await add();
    const group = editors()[0]!;
    await type(nameOf(group), "House style");
    await type(textOf(group), HOUSE.source);
    for (let step = 0; step < 4; step++) await fireEvent.click(screen.getByRole("button", { name: "Move House style up" }));
    await fireEvent.click(saveButton());
    expect(save).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      formatOrder: ["tpl:id-1", ...DEFAULT_SETTINGS.formatOrder],
      templates: [{ ...HOUSE, id: "tpl:id-1" }],
    });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(SETTINGS_TEXT.saved));
  });

  it("rejects {num} with the contract's message next to the field, linked, invalid and announced, with focus on it", async () => {
    const { add, editors, nameOf, textOf, type, saveButton } = setup();
    await add();
    const group = editors()[0]!;
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

  it("opens a closed editor and the Formats section when Save finds a problem in the template", async () => {
    const settings = withTemplates({ ...HOUSE, source: "{num}" });
    const { editors, textOf, saveButton } = setup({ settings });
    expect(editors()).toHaveLength(0);
    await fireEvent.click(screen.getByRole("button", { name: "Cross Reference Formats" }));
    await fireEvent.click(saveButton());
    await waitFor(() => expect(editors()).toHaveLength(1));
    expect(screen.getByRole("button", { name: "Cross Reference Formats" })).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(textOf(editors()[0]!)).toHaveFocus());
  });

  it("moves focus to the first error in the view's order: a name before its text", async () => {
    const { add, editors, nameOf, textOf, type, saveButton } = setup();
    await add();
    const group = editors()[0]!;
    await type(textOf(group), "see section");
    await fireEvent.click(saveButton());
    await waitFor(() => expect(nameOf(group)).toHaveFocus());
    expect(nameOf(group)).toHaveAccessibleDescription(expect.stringContaining("Give the template a name."));
    expect(textOf(group)).toHaveAccessibleDescription(expect.stringContaining("Add at least one of"));
  });

  it("rejects a name another format has, even one not in the list", async () => {
    const { add, editors, nameOf, textOf, type, saveButton } = setup();
    await add();
    const group = editors()[0]!;
    await type(nameOf(group), "page number");
    await type(textOf(group), "{page}");
    await fireEvent.click(saveButton());
    await waitFor(() => expect(nameOf(group)).toHaveAccessibleDescription(expect.stringContaining("A format with this name already exists.")));
  });

  it("clears a field's error once it is edited", async () => {
    const { add, editors, nameOf, textOf, type, saveButton } = setup();
    await add();
    const group = editors()[0]!;
    await type(nameOf(group), "Broken");
    await type(textOf(group), "{num}");
    await fireEvent.click(saveButton());
    await waitFor(() => expect(textOf(group)).toHaveAttribute("aria-invalid", "true"));
    await type(textOf(group), "{number}");
    expect(textOf(group)).not.toHaveAttribute("aria-invalid", "true");
    expect(within(group).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("edits a saved template with Edit, and removing it deletes it", async () => {
    const { editors, nameOf, type, saveButton, save } = setup({ settings: withTemplates(HOUSE) });
    const edit = screen.getByRole("button", { name: "Edit House style" });
    expect(edit).toHaveAttribute("aria-expanded", "false");
    await fireEvent.click(edit);
    const group = editors()[0]!;
    expect(nameOf(group)).toHaveValue("House style");
    await type(nameOf(group), "House");
    expect(screen.getByRole("button", { name: "Edit House" })).toHaveAttribute("aria-expanded", "true");
    await fireEvent.click(screen.getByRole("button", { name: "Remove House" }));
    expect(editors()).toHaveLength(0);
    await fireEvent.click(saveButton());
    expect(save).toHaveBeenLastCalledWith(DEFAULT_SETTINGS);
  });

  it("counts template edits as unsaved changes", async () => {
    const { add } = setup();
    await add();
    await fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.getByRole("alertdialog")).toHaveTextContent(SETTINGS_TEXT.unsavedTitle);
  });

  it("stops at 20 templates and says why", async () => {
    const settings = withTemplates(...Array.from({ length: 20 }, (_, i) => ({ id: `tpl:${i}`, label: `T${i}`, source: "{text}" })));
    const { add, list } = setup({ settings });
    await add();
    expect(within(list()).getAllByRole("listitem")).toHaveLength(24);
    expect(screen.getByRole("button", { name: SETTINGS_TEXT.newTemplate })).toHaveAccessibleDescription("There can be at most 20 templates.");
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

  it("take their place in the Tab cycle from the format list, with their preview, and Enter inserts them", async () => {
    const formats = formatsFor({ formatOrder: ["number", "tpl:house", "text"], templates: [HOUSE] });
    const insert = vi.fn(async () => ({ kind: "closed" as const }));
    render(Palette, {
      props: {
        headings: [heading],
        format: formatById("number")!,
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
    expect(screen.getByTestId("format-preview").querySelector(".label")).toHaveTextContent("Text Only");
    await fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
    await fireEvent.keyDown(input, { key: "Enter" });
    expect(insert).toHaveBeenCalledWith(heading, formats[1], null);
  });
});
