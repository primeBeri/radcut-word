import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { describe, expect, it, vi } from "vitest";
import { formatById } from "../../src/core/formats/built-ins";
import { headingKeyFor } from "../../src/core/headings/key";
import type { Heading, HeadingLevel, HeadingLocation } from "../../src/core/headings/types";
import type { InsertionPoint } from "../../src/core/location/types";
import { messageText } from "../../src/core/messages";
import Palette from "../../src/ui/palette/Palette.svelte";
import type { PaletteFeedback, PaletteProps } from "../../src/ui/palette/types";

function heading(
  order: number,
  text: string,
  options: { level?: HeadingLevel; number?: string | null; location?: HeadingLocation } = {},
): Heading {
  const base = {
    level: options.level ?? 1,
    text,
    number: options.number ?? null,
    order,
    location: options.location ?? "main",
    bookmark: null,
  };
  return { ...base, key: headingKeyFor(base) };
}

const HEADINGS: Heading[] = [
  heading(0, "Introduction", { number: "1" }),
  heading(1, "Scope", { level: 2, number: "1.1" }),
  heading(2, "Fire strategy", { level: 2, number: "4.3" }),
  heading(3, "Means of escape", { level: 2, number: "4.1" }),
  heading(4, "Deep heading", { level: 9, number: "4.1.1.1.1.1.1.1.1" }),
  heading(5, "Summary", { location: "textBox" }),
  heading(6, "In a cell", { location: "tableCell" }),
  heading(7, "In a footnote", { location: "footnote" }),
  heading(8, "In an endnote", { location: "endnote" }),
  heading(9, "In the header", { location: "header" }),
  heading(10, "In the footer", { location: "footer" }),
];

const POINT: InsertionPoint = {
  kind: "insertionPoint",
  location: "main",
  selection: "none",
  inHeadingOrder: null,
  precedingHeadingOrder: 2,
};

function setup(overrides: Partial<PaletteProps> = {}) {
  const insert = vi.fn<PaletteProps["insert"]>(async (): Promise<PaletteFeedback> => ({ kind: "closed" }));
  const cancel = vi.fn();
  const props: PaletteProps = {
    headings: HEADINGS,
    format: formatById("sectionNumberText")!,
    point: POINT,
    insert,
    cancel,
    ...overrides,
  };
  const result = render(Palette, { props });
  const input = screen.getByRole("combobox");
  const options = () => screen.queryAllByRole("option");
  const selected = () => options().find((o) => o.getAttribute("aria-selected") === "true");
  const type = (value: string) => fireEvent.input(input, { target: { value } });
  const key = (k: string) => fireEvent.keyDown(input, { key: k });
  return { ...result, input, options, selected, type, key, insert: props.insert as typeof insert, cancel };
}

describe("Palette structure and ARIA", () => {
  it("focuses the search input on mount", () => {
    const { input } = setup();
    expect(input).toHaveFocus();
  });

  it("is a combobox wired to a listbox of options with the selected row active", () => {
    const { input, selected } = setup();
    const listbox = screen.getByRole("listbox");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).toHaveAttribute("aria-controls", listbox.id);
    expect(input).toHaveAttribute("aria-activedescendant", selected()!.id);
    expect(within(listbox).getAllByRole("option")).toHaveLength(HEADINGS.length);
  });

  it("names each option by number, text and level, plus location outside the main text", () => {
    setup();
    expect(screen.getByRole("option", { name: "4.3 Fire strategy, level 2" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Summary, level 1, in text box" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "In a cell, level 1, in table" })).toBeInTheDocument();
  });

  it.each([
    ["In a cell", "Table"],
    ["Summary", "Text box"],
    ["In a footnote", "Footnote"],
    ["In an endnote", "Endnote"],
    ["In the header", "Header"],
    ["In the footer", "Footer"],
  ])("shows a text badge for %s: %s", (text, badge) => {
    setup();
    const row = screen.getAllByRole("option").find((o) => o.textContent?.includes(text))!;
    expect(within(row).getByText(badge)).toBeInTheDocument();
  });

  it("shows no badge for main-text headings", () => {
    setup();
    const row = screen.getByRole("option", { name: "4.3 Fire strategy, level 2" });
    expect(row.querySelector(".badge")).toBeNull();
  });

  it("indents one step per level, capped at level 6", () => {
    setup();
    const indent = (name: RegExp) => screen.getByRole("option", { name }).style.getPropertyValue("--indent-steps");
    expect(indent(/^1 Introduction/)).toBe("0");
    expect(indent(/Fire strategy/)).toBe("1");
    expect(indent(/Deep heading/)).toBe("5");
  });

  it("puts the full text in the row title so truncated text is still readable", () => {
    const long = "A very long heading ".repeat(10).trim();
    setup({ headings: [heading(0, long, { number: "7" })] });
    expect(screen.getByRole("option")).toHaveAttribute("title", `7 ${long}`);
  });

  it("names an empty heading", () => {
    setup({ headings: [heading(0, "", { number: "2" })] });
    expect(screen.getByRole("option", { name: "2 (untitled heading), level 1" })).toBeInTheDocument();
  });
});

describe("Palette keyboard", () => {
  it("re-ranks on typing and selects the first row", async () => {
    const { type, options, selected } = setup();
    await type("fstrat");
    expect(options()[0]).toHaveAccessibleName("4.3 Fire strategy, level 2");
    expect(selected()).toBe(options()[0]);
  });

  it("wraps matched characters in <mark>", async () => {
    const { type, options } = setup();
    await type("fstrat");
    const marks = [...options()[0]!.querySelectorAll("mark")].map((m) => m.textContent);
    expect(marks).toEqual(["F", "strat"]);
  });

  it("moves with ↑/↓ without wrapping and keeps the row in view", async () => {
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
    const { key, selected, options } = setup();
    await key("ArrowUp");
    expect(selected()).toBe(options()[0]);
    await key("ArrowDown");
    expect(selected()).toBe(options()[1]);
    expect(scroll).toHaveBeenCalled();
    for (let i = 0; i < 20; i++) await key("ArrowDown");
    expect(selected()).toBe(options().at(-1));
  });

  it("moves by a page with Page Down and Page Up", async () => {
    const { key, selected, options } = setup();
    await key("PageDown");
    expect(options().indexOf(selected()!)).toBeGreaterThan(1);
    await key("PageUp");
    expect(selected()).toBe(options()[0]);
  });

  it("inserts the selected heading on Enter", async () => {
    const { key, insert } = setup();
    await key("ArrowDown");
    await key("Enter");
    expect(insert).toHaveBeenCalledWith(HEADINGS[1], false);
  });

  it("cancels on Esc", async () => {
    const { key, cancel, insert } = setup();
    await key("Escape");
    expect(cancel).toHaveBeenCalledOnce();
    expect(insert).not.toHaveBeenCalled();
  });

  it("shows the empty state in the live region and ignores Enter when nothing matches", async () => {
    const { type, key, insert } = setup();
    await type("zzzzqqq");
    expect(screen.getByRole("status")).toHaveTextContent(messageText("noMatches"));
    await key("Enter");
    expect(insert).not.toHaveBeenCalled();
  });

  it("applies keystrokes immediately; no input handler waits on a transition (FR-026)", () => {
    const { input, options } = setup();
    for (const value of ["f", "fs", "fst", "fstrat"]) {
      input.setAttribute("value", value);
      (input as HTMLInputElement).value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      flushSync();
      expect(options()[0]).toBeDefined();
    }
    expect(options()[0]).toHaveAccessibleName("4.3 Fire strategy, level 2");
  });
});

describe("Palette selection warning (FR-008a)", () => {
  const extended = { ...POINT, selection: "extended" as const };

  it("first Enter shows the warning verbatim and does not insert; second Enter inserts confirmed", async () => {
    const { key, insert } = setup({ point: extended });
    await key("Enter");
    expect(insert).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(messageText("selectionWarning"));
    await key("Enter");
    expect(insert).toHaveBeenCalledWith(HEADINGS[0], true);
  });

  it("Esc dismisses only the warning", async () => {
    const { key, cancel, insert } = setup({ point: extended });
    await key("Enter");
    await key("Escape");
    expect(cancel).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).not.toHaveTextContent(messageText("selectionWarning"));
    await key("Enter");
    expect(insert).not.toHaveBeenCalled();
  });

  it("typing dismisses the warning and applies the key", async () => {
    const { key, type, options } = setup({ point: extended });
    await key("Enter");
    await type("fstrat");
    expect(screen.getByRole("status")).not.toHaveTextContent(messageText("selectionWarning"));
    expect(options()[0]).toHaveAccessibleName("4.3 Fire strategy, level 2");
  });

  it("shows the warning when the gateway asks for confirmation at Enter", async () => {
    const insert = vi.fn<PaletteProps["insert"]>()
      .mockResolvedValueOnce({ kind: "needsConfirmation", message: "selectionWarning" })
      .mockResolvedValueOnce({ kind: "closed" });
    const { key } = setup({ insert });
    await key("Enter");
    expect(screen.getByRole("status")).toHaveTextContent(messageText("selectionWarning"));
    await key("Enter");
    expect(insert).toHaveBeenLastCalledWith(HEADINGS[0], true);
  });

  it("shows the warning visibly under the selected row, hidden from screen readers (the live region speaks it)", async () => {
    const { key } = setup({ point: extended });
    expect(screen.queryByTestId("warning-popover")).toBeNull();
    await key("Enter");
    const popover = screen.getByTestId("warning-popover");
    expect(popover).toHaveTextContent(messageText("selectionWarning"));
    expect(popover).toHaveAttribute("aria-hidden", "true");
    await key("Escape");
    expect(screen.queryByTestId("warning-popover")).toBeNull();
  });
});

describe("Palette field warning (FR-008b)", () => {
  const inField = { ...POINT, selection: "field" as const };

  it("first Enter warns that the field will be replaced; second Enter inserts confirmed", async () => {
    const { key, insert } = setup({ point: inField });
    await key("Enter");
    expect(insert).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(messageText("fieldWarning"));
    expect(screen.getByTestId("warning-popover")).toHaveTextContent(messageText("fieldWarning"));
    await key("Enter");
    expect(insert).toHaveBeenCalledWith(HEADINGS[0], true);
  });

  it("shows the field warning when the gateway asks for it at Enter", async () => {
    const insert = vi.fn<PaletteProps["insert"]>()
      .mockResolvedValueOnce({ kind: "needsConfirmation", message: "fieldWarning" })
      .mockResolvedValueOnce({ kind: "closed" });
    const { key } = setup({ insert });
    await key("Enter");
    expect(screen.getByRole("status")).toHaveTextContent(messageText("fieldWarning"));
  });
});

describe("Palette messages and format strip", () => {
  it("shows a message returned by insert in the live region and stays open", async () => {
    const insert = vi.fn<PaletteProps["insert"]>().mockResolvedValue({ kind: "message", message: "hostError" });
    const { key } = setup({ insert });
    await key("Enter");
    expect(screen.getByRole("status")).toHaveTextContent(messageText("hostError"));
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows the format label and the preview of the selected heading in a polite live region", async () => {
    const { type } = setup();
    await type("fstrat");
    const strip = screen.getByTestId("format-strip");
    expect(strip).toHaveAttribute("aria-live", "polite");
    expect(strip).toHaveTextContent("§ number text");
    expect(strip).toHaveTextContent("§ 4.3 Fire strategy");
  });

  it("keeps the selection when the heading list is refreshed", async () => {
    const { key, selected, rerender } = setup();
    await key("ArrowDown");
    await key("ArrowDown");
    expect(selected()).toHaveAccessibleName("4.3 Fire strategy, level 2");
    await rerender({ headings: [heading(0, "New first heading"), ...HEADINGS.map((h) => ({ ...h, order: h.order + 1 }))] });
    expect(selected()).toHaveAccessibleName("4.3 Fire strategy, level 2");
  });

  it("offers settings by a cog with its shortcut announced, and Ctrl+, opens it", async () => {
    const openSettings = vi.fn();
    const { input } = setup({ openSettings });
    const cog = screen.getByRole("button", { name: "Settings" });
    expect(cog).toHaveAttribute("aria-keyshortcuts", "Control+Comma");
    await fireEvent.keyDown(input, { key: ",", ctrlKey: true });
    expect(openSettings).toHaveBeenCalledOnce();
  });
});
