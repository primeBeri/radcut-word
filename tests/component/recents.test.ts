import { cleanup, fireEvent, render, screen, within } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { formatById } from "../../src/core/formats/built-ins";
import { headingKeyFor } from "../../src/core/headings/key";
import type { Heading } from "../../src/core/headings/types";
import type { InsertionPoint } from "../../src/core/location/types";
import Palette from "../../src/ui/palette/Palette.svelte";
import type { PaletteFeedback, PaletteProps } from "../../src/ui/palette/types";

function heading(order: number, text: string, number: string, bookmark: string | null = null): Heading {
  const base = { level: 2 as const, text, number, order, location: "main" as const, bookmark };
  return { ...base, key: headingKeyFor(base) };
}

const HEADINGS: Heading[] = [
  heading(0, "Introduction", "1"),
  heading(1, "Scope", "1.1", "_Ref1"),
  heading(2, "Concrete", "3.1", "_RCconcrete"),
  heading(3, "Fire strategy", "4.3", "_RCfire"),
];

const POINT: InsertionPoint = {
  kind: "insertionPoint",
  location: "main",
  selection: "none",
  inHeadingOrder: null,
  inHeadingFingerprint: null,
  precedingHeadingOrder: 3,
};

function setup(recents: readonly string[]) {
  const insert = vi.fn<PaletteProps["insert"]>(async (): Promise<PaletteFeedback> => ({ kind: "closed" }));
  render(Palette, { props: { headings: HEADINGS, format: formatById("sectionNumberText")!, point: POINT, recents, insert, cancel: vi.fn() } });
  const input = screen.getByRole("combobox");
  const names = (group: HTMLElement) => withinOptions(group).map((o) => o.getAttribute("aria-label"));
  const selected = () => screen.getAllByRole("option").find((o) => o.getAttribute("aria-selected") === "true");
  return { input, insert, names, selected };
}

const withinOptions = (element: HTMLElement) => within(element).getAllByRole("option");

describe("palette recents (US5, FR-022)", () => {
  it("with an empty query, lists the recents under Recent, most recent first, then every heading under All headings", () => {
    const { names } = setup(["_RCfire", "_Ref1"]);
    const recent = screen.getByRole("group", { name: "Recent" });
    const all = screen.getByRole("group", { name: "All headings" });
    expect(names(recent)).toEqual(["4.3 Fire strategy, level 2", "1.1 Scope, level 2"]);
    expect(names(all)).toEqual(["1 Introduction, level 2", "1.1 Scope, level 2", "3.1 Concrete, level 2", "4.3 Fire strategy, level 2"]);
    expect(recent.compareDocumentPosition(all) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Recent")).toBeVisible();
    expect(screen.getByText("All headings")).toBeVisible();
  });

  it("selects the most recent heading first, and Enter inserts it", async () => {
    const { input, insert, selected } = setup(["_RCfire", "_Ref1"]);
    expect(selected()).toHaveAccessibleName("4.3 Fire strategy, level 2");
    await fireEvent.keyDown(input, { key: "Enter" });
    expect(insert.mock.calls[0]?.[0].text).toBe("Fire strategy");
  });

  it("moves across the groups as one list with the arrow keys", async () => {
    const { input, selected } = setup(["_RCfire", "_Ref1"]);
    await fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(selected()).toHaveAccessibleName("1.1 Scope, level 2");
    expect(selected()?.closest("[role=group]")).toHaveAccessibleName("Recent");
    await fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(selected()).toHaveAccessibleName("1 Introduction, level 2");
    expect(selected()?.closest("[role=group]")).toHaveAccessibleName("All headings");
    await fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(selected()?.closest("[role=group]")).toHaveAccessibleName("Recent");
    expect(input.getAttribute("aria-activedescendant")).toBe(selected()?.id);
    expect(new Set(screen.getAllByRole("option").map((o) => o.id)).size).toBe(6);
  });

  it("gives a recent heading no boost once a query is typed (US5 scenario 2)", async () => {
    const ranked = async (recents: readonly string[]) => {
      const { input } = setup(recents);
      await fireEvent.input(input, { target: { value: "c" } });
      const names = screen.getAllByRole("option").map((o) => o.getAttribute("aria-label"));
      cleanup();
      return names;
    };
    const without = await ranked([]);
    // The recent is the lowest-ranked match with a bookmark, so a boost would move it up.
    const recent = [...HEADINGS].filter((h) => h.bookmark !== null).sort((a, b) => without.findIndex((n) => n?.includes(a.text)) - without.findIndex((n) => n?.includes(b.text))).at(-1)!;
    expect(without.findIndex((n) => n?.includes(recent.text))).toBeGreaterThan(0);
    expect(await ranked([recent.bookmark!])).toEqual(without);
  });

  it("typing removes the groups and ranks by match only (US5 scenario 2)", async () => {
    const { input } = setup(["_RCfire"]);
    await fireEvent.input(input, { target: { value: "sc" } });
    expect(screen.queryByRole("group")).toBeNull();
    expect(screen.getAllByRole("option")[0]).toHaveAccessibleName("1.1 Scope, level 2");
    await fireEvent.input(input, { target: { value: "" } });
    expect(screen.getByRole("group", { name: "Recent" })).toBeInTheDocument();
  });

  it("has no groups without recents, or when none of them is listed", () => {
    setup(["_RCgone"]);
    expect(screen.queryByRole("group")).toBeNull();
    expect(screen.getAllByRole("option")).toHaveLength(4);
  });
});
