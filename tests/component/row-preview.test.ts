import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { BUILT_IN_FORMATS, formatById } from "../../src/core/formats/built-ins";
import { headingKeyFor } from "../../src/core/headings/key";
import type { Heading } from "../../src/core/headings/types";
import type { InsertionLocation, InsertionPoint } from "../../src/core/location/types";
import Palette from "../../src/ui/palette/Palette.svelte";
import { ABOVE_BELOW_HIDDEN } from "../../src/ui/palette/labels";
import type { PaletteFeedback, PaletteProps } from "../../src/ui/palette/types";

function heading(order: number, text: string, number: string | null): Heading {
  const base = { level: 2 as const, text, number, order, location: "main" as const, bookmark: null };
  return { ...base, key: headingKeyFor(base) };
}

const HEADINGS = [heading(0, "Scope", "1.1"), heading(1, "Fire strategy", "4.3")];

function point(location: InsertionLocation = "main"): InsertionPoint {
  const outside = location !== "main" && location !== "tableCellInMain";
  return {
    kind: "insertionPoint",
    location,
    selection: "none",
    inHeadingOrder: null,
    inHeadingFingerprint: null,
    precedingHeadingOrder: outside ? null : 5,
  };
}

function setup(overrides: Partial<PaletteProps> = {}) {
  const insert = vi.fn<PaletteProps["insert"]>(async (): Promise<PaletteFeedback> => ({ kind: "closed" }));
  const props: PaletteProps = {
    headings: HEADINGS,
    format: formatById("sectionNumberText")!,
    formats: BUILT_IN_FORMATS,
    point: point(),
    insert,
    cancel: vi.fn(),
    ...overrides,
  };
  const result = render(Palette, { props });
  const input = screen.getByRole("combobox");
  // Re-queried every time: the preview line moves with the selection.
  const strip = () => screen.getByTestId("format-preview");
  const tab = (shiftKey = false) => fireEvent.keyDown(input, { key: "Tab", shiftKey });
  const label = () => strip().querySelector(".label")?.textContent;
  const announcement = () => screen.getByTestId("format-announcement");
  return { ...result, input, strip, tab, label, announcement, insert };
}

describe("preview line and Tab cycle (FR-015, FR-016a)", () => {
  it("shows the opening format and the preview on a second line of the selected row, as its description", () => {
    const { strip } = setup();
    const row = screen.getByRole("option", { selected: true });
    expect(row).toContainElement(strip());
    expect(strip()).toHaveTextContent("§ number text");
    expect(strip()).toHaveTextContent("§ 1.1 Scope");
    expect(row).toHaveAccessibleName("1.1 Scope, level 2");
    expect(row).toHaveAccessibleDescription(/§ 1.1 Scope/);
  });

  it("only the selected row has a preview line, and it follows the selection", async () => {
    const { strip, input } = setup();
    expect(screen.getAllByTestId("format-preview")).toHaveLength(1);
    await fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getAllByTestId("format-preview")).toHaveLength(1);
    expect(screen.getByRole("option", { selected: true })).toContainElement(strip());
    expect(strip()).toHaveTextContent("§ 4.3 Fire strategy");
    expect(screen.getByRole("option", { name: "1.1 Scope, level 2" })).not.toHaveAttribute("aria-describedby");
  });

  it("Tab moves to the next format, updates the preview and announces it politely; focus stays in the search box", async () => {
    const { strip, tab, label, input, announcement } = setup();
    expect(announcement()).toHaveAttribute("aria-live", "polite");
    expect(announcement().textContent).toBe("");
    await tab();
    expect(label()).toBe("Page");
    await tab();
    expect(label()).toBe("Above/below");
    expect(strip()).toHaveTextContent("above");
    expect(announcement()).toHaveTextContent("Above/below: above");
    expect(input).toHaveFocus();
  });

  it("Shift+Tab moves back, and both wrap at the ends", async () => {
    const { strip, tab, label } = setup({ format: formatById("text")! });
    await tab(true);
    expect(label()).toBe("Text + above/below");
    await tab();
    expect(label()).toBe("Text");
    expect(strip()).toHaveTextContent("Scope");
  });

  it("shows a page part as {page}, since Word only knows the page once the field is in", async () => {
    const { strip, tab, label } = setup();
    await tab();
    expect(label()).toBe("Page");
    expect(strip().querySelector(".preview")?.textContent).toBe("{page}");
  });

  it("starts the line with a hook arrow that screen readers skip", () => {
    const { strip } = setup();
    expect(strip().querySelector("svg.hook")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("option", { selected: true })).toHaveAccessibleDescription(/^§ 1.1 Scope/);
  });

  it("has no preview line when nothing matches", async () => {
    const { input } = setup();
    await fireEvent.input(input, { target: { value: "zzzz" } });
    expect(screen.queryByTestId("format-preview")).not.toBeInTheDocument();
  });

  it("Tab never moves focus out of the palette", async () => {
    const { input } = setup();
    const event = new KeyboardEvent("keydown", { key: "Tab", cancelable: true, bubbles: true });
    input.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("Enter inserts in the format shown", async () => {
    const { tab, input, insert } = setup();
    await tab(true);
    await tab(true);
    await fireEvent.keyDown(input, { key: "Enter" });
    expect(insert).toHaveBeenCalledWith(HEADINGS[0], formatById("number"), null);
  });

  it.each(["footnote", "endnote", "header", "footer", "textBox"] as const)(
    "with the cursor in a %s, never shows an above/below format and says why",
    async (location) => {
      const { strip, tab, label } = setup({ point: point(location) });
      expect(strip()).toHaveTextContent(ABOVE_BELOW_HIDDEN);
      const seen = new Set<string>();
      for (let i = 0; i < 6; i++) {
        await tab();
        seen.add(label()!);
      }
      expect([...seen].sort()).toEqual(["Number", "Number + text", "Page", "Text", "§ number text"].sort());
    },
  );

  it("says nothing about above/below in the main text", () => {
    const { strip } = setup();
    expect(strip()).not.toHaveTextContent(ABOVE_BELOW_HIDDEN);
  });

  it("when the cursor moves into a note while open, an above/below format gives way to the next offered one", async () => {
    const { label, rerender } = setup({ format: formatById("aboveBelow")! });
    expect(label()).toBe("Above/below");
    await rerender({ point: point("footnote") });
    expect(label()).toBe("Text");
  });
});
