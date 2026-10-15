import { describe, expect, it } from "vitest";
import { HeadingIndex } from "../../src/core/headings/heading-index";
import { messageText } from "../../src/core/messages";
import { openPalette, type OpenPaletteOptions } from "../../src/core/use-cases/open-palette";
import { fakeDocument, fakeFixtures } from "../fakes/fake-documents";
import { FakeGateway } from "../fakes/fake-gateway";

const defaults: OpenPaletteOptions = {
  policy: { allowInHeadings: false },
  showHeadingsOutsideMainText: true,
  defaultFormatId: "sectionNumberText",
};

function setup(gateway = new FakeGateway(fakeFixtures["spec-300"]())) {
  return { gateway, index: new HeadingIndex(() => gateway.readHeadings()) };
}

describe("OpenPalette", () => {
  it("returns a message and loads no headings when the location is declined", async () => {
    const { gateway, index } = setup();
    gateway.select("Fire strategy");
    const state = await openPalette({ gateway, index }, defaults);
    expect(state).toEqual({ kind: "message", message: "headingParagraph" });
    expect(index.cached()).toBeNull();
  });

  it("returns the no-headings message for a document without headings", async () => {
    const { gateway, index } = setup(new FakeGateway(fakeDocument().para("Only body text.").build()));
    expect(await openPalette({ gateway, index }, defaults)).toEqual({ kind: "message", message: "noHeadings" });
    expect(messageText("noHeadings")).toMatch(/Heading 1–9/);
  });

  it("opens with headings in order, the default format and the preceding heading", async () => {
    const { gateway, index } = setup();
    const state = await openPalette({ gateway, index }, defaults);
    if (state.kind !== "open") throw new Error(`expected open, got ${state.kind}`);
    const orders = state.headings.map((h) => h.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(state.headings[0]?.text).toBe("Introduction");
    expect(state.format.id).toBe("sectionNumberText");
    const fire = state.headings.find((h) => h.text === "Fire strategy")!;
    expect(state.point.precedingHeadingOrder).toBe(fire.order);
  });

  it("falls back to § number text when the default format is unknown", async () => {
    const { gateway, index } = setup();
    const state = await openPalette({ gateway, index }, { ...defaults, defaultFormatId: "tpl:deleted" });
    expect(state.kind === "open" && state.format.id).toBe("sectionNumberText");
  });

  it("passes the location policy, so a heading is allowed with the setting on and is not listed", async () => {
    const { gateway, index } = setup();
    gateway.select("Fire strategy");
    const state = await openPalette({ gateway, index }, { ...defaults, policy: { allowInHeadings: true } });
    if (state.kind !== "open") throw new Error(`expected open, got ${state.kind}`);
    expect(state.point.inHeadingOrder).not.toBeNull();
    expect(state.headings.some((h) => h.text === "Fire strategy")).toBe(false);
  });

  it("applies the outside-main-text filter", async () => {
    const { gateway, index } = setup();
    const shown = await openPalette({ gateway, index }, defaults);
    const hidden = await openPalette({ gateway, index }, { ...defaults, showHeadingsOutsideMainText: false });
    if (shown.kind !== "open" || hidden.kind !== "open") throw new Error("expected open");
    expect(shown.headings.some((h) => h.location === "footnote")).toBe(true);
    expect(hidden.headings.every((h) => h.location === "main")).toBe(true);
  });

  it("shows the cached index at once, then refreshes it", async () => {
    const { gateway, index } = setup();
    const first = await openPalette({ gateway, index }, defaults);
    expect(first.kind === "open" && first.refreshed).toBeNull();

    gateway.setParagraphText("Fire strategy", "Fire safety strategy");
    const second = await openPalette({ gateway, index }, defaults);
    if (second.kind !== "open" || !second.refreshed) throw new Error("expected open with a refresh");
    expect(second.headings.some((h) => h.text === "Fire strategy")).toBe(true);
    const fresh = await second.refreshed;
    expect(fresh.some((h) => h.text === "Fire safety strategy")).toBe(true);
    expect(fresh.some((h) => h.text === "Fire strategy")).toBe(false);
  });
});
