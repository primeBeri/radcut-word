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
  const strip = screen.getByTestId("format-strip");
  const tab = (shiftKey = false) => fireEvent.keyDown(input, { key: "Tab", shiftKey });
  const label = () => strip.querySelector(".label")?.textContent;
  return { ...result, input, strip, tab, label, insert };
}

describe("format strip and Tab cycle (FR-015, FR-016a)", () => {
  it("shows the opening format and the preview for the selected heading, in a polite live region", () => {
    const { strip } = setup();
    expect(strip).toHaveAttribute("aria-live", "polite");
    expect(strip).toHaveTextContent("§ number text");
    expect(strip).toHaveTextContent("§ 1.1 Scope");
  });

  it("Tab moves to the next format and updates the preview; focus stays in the search box", async () => {
    const { strip, tab, label, input } = setup();
    await tab();
    expect(label()).toBe("Page");
    await tab();
    expect(label()).toBe("Above/below");
    expect(strip).toHaveTextContent("above");
    expect(input).toHaveFocus();
  });

  it("Shift+Tab moves back, and both wrap at the ends", async () => {
    const { strip, tab, label } = setup({ format: formatById("text")! });
    await tab(true);
    expect(label()).toBe("Text + above/below");
    await tab();
    expect(label()).toBe("Text");
    expect(strip).toHaveTextContent("Scope");
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
      expect(strip).toHaveTextContent(ABOVE_BELOW_HIDDEN);
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
    expect(strip).not.toHaveTextContent(ABOVE_BELOW_HIDDEN);
  });

  it("when the cursor moves into a note while open, an above/below format gives way to the next offered one", async () => {
    const { label, rerender } = setup({ format: formatById("aboveBelow")! });
    expect(label()).toBe("Above/below");
    await rerender({ point: point("footnote") });
    expect(label()).toBe("Text");
  });
});
