import { describe, expect, it } from "vitest";
import { BUILT_IN_FORMATS } from "../../src/core/formats/built-ins";
import { HeadingIndex } from "../../src/core/headings/heading-index";
import { messageText } from "../../src/core/messages";
import { RecentHeadings } from "../../src/core/recents/recent-headings";
import { openPalette, type OpenPaletteOptions } from "../../src/core/use-cases/open-palette";
import { FakeSettingsStore } from "../fakes/fake-settings-store";
import { fakeDocument, fakeFixtures } from "../fakes/fake-documents";
import { FakeGateway } from "../fakes/fake-gateway";

const defaults: OpenPaletteOptions = {
  policy: { allowInHeadings: false },
  showHeadingsOutsideMainText: true,
  startFormatId: null,
};

function setup(gateway = new FakeGateway(fakeFixtures["spec-300"]())) {
  return { gateway, index: new HeadingIndex(() => gateway.readHeadings()) };
}

/** An index over `gateway` that counts its reads, with the cache already filled. */
async function countedIndex(gateway: FakeGateway) {
  let reads = 0;
  const index = new HeadingIndex(() => {
    reads++;
    return gateway.readHeadings();
  });
  await index.get();
  return { index, reads: () => reads };
}

/** A go-ahead the test settles. */
function goAhead() {
  let settle!: (go: boolean) => void;
  const settled = new Promise<boolean>((resolve) => (settle = resolve));
  return { mayRefresh: () => settled, settle };
}

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

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

  it("opens with headings in order, the first format and the preceding heading", async () => {
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

  it("opens on the first format when the remembered one is unknown", async () => {
    const { gateway, index } = setup();
    const state = await openPalette({ gateway, index }, { ...defaults, startFormatId: "tpl:deleted" });
    expect(state.kind === "open" && state.format.id).toBe("sectionNumberText");
  });

  it("opens on the remembered format, with every format given in the cycle, in the main text (FR-015, FR-017a)", async () => {
    const { gateway, index } = setup();
    const state = await openPalette({ gateway, index }, { ...defaults, startFormatId: "number", formats: BUILT_IN_FORMATS });
    if (state.kind !== "open") throw new Error(`expected open, got ${state.kind}`);
    expect(state.format.id).toBe("number");
    expect(state.formats.map((f) => f.id)).toEqual(BUILT_IN_FORMATS.map((f) => f.id));
  });

  it("in a footnote, leaves out the above/below formats and opens on the next one after an above/below default (FR-016a)", async () => {
    const { gateway, index } = setup();
    gateway.select("Footnote text.");
    const state = await openPalette({ gateway, index }, { ...defaults, startFormatId: "textAboveBelow", formats: BUILT_IN_FORMATS });
    if (state.kind !== "open") throw new Error(`expected open, got ${state.kind}`);
    expect(state.formats.map((f) => f.id)).toEqual(["text", "number", "numberText", "sectionNumberText", "page"]);
    expect(state.format.id).toBe("text");
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
    if (first.kind !== "open") throw new Error(first.kind);
    expect(await first.refreshed).toBeNull();

    gateway.setParagraphText("Fire strategy", "Fire safety strategy");
    const second = await openPalette({ gateway, index }, defaults);
    if (second.kind !== "open") throw new Error(second.kind);
    expect(second.headings.some((h) => h.text === "Fire strategy")).toBe(true);
    const fresh = (await second.refreshed) ?? [];
    expect(fresh.some((h) => h.text === "Fire safety strategy")).toBe(true);
    expect(fresh.some((h) => h.text === "Fire strategy")).toBe(false);
  });

  it("starts the background refresh only once allowed (T098: the read would hold up Word)", async () => {
    const gateway = new FakeGateway(fakeFixtures["spec-300"]());
    const { index, reads } = await countedIndex(gateway);
    const { mayRefresh, settle } = goAhead();

    const state = await openPalette({ gateway, index, mayRefresh }, defaults);
    if (state.kind !== "open") throw new Error(state.kind);
    await nextTask();
    expect(reads()).toBe(1);

    settle(true);
    expect(await state.refreshed).not.toBeNull();
    expect(reads()).toBe(2);
  });

  it("skips the background refresh when it is not allowed (the palette has gone, T098)", async () => {
    const gateway = new FakeGateway(fakeFixtures["spec-300"]());
    const { index, reads } = await countedIndex(gateway);

    const state = await openPalette({ gateway, index, mayRefresh: async () => false }, defaults);
    if (state.kind !== "open") throw new Error(state.kind);
    expect(await state.refreshed).toBeNull();
    await state.pruned;
    expect(reads()).toBe(1);
  });

  describe("recents (US5)", () => {
    const docId = "https://example.invalid/spec-300.docx";

    it("returns the document's recents, most recent first", async () => {
      const { gateway, index } = setup();
      const store = new FakeSettingsStore();
      await store.saveRecents(docId, ["_Ref200000001"]);
      const state = await openPalette({ gateway, index, recents: new RecentHeadings(store) }, defaults);
      expect(state.kind === "open" && state.recents).toEqual(["_Ref200000001"]);
    });

    it("returns no recents without a RecentHeadings (the setting is off, FR-022a)", async () => {
      const { gateway, index } = setup();
      const state = await openPalette({ gateway, index }, defaults);
      expect(state.kind === "open" && state.recents).toEqual([]);
    });

    it("opens with no recents when reading them fails", async () => {
      const { gateway, index } = setup();
      const failing = new RecentHeadings({ loadRecents: () => Promise.reject(new Error("storage")), saveRecents: async () => {} });
      const state = await openPalette({ gateway, index, recents: failing }, defaults);
      expect(state.kind === "open" && state.recents).toEqual([]);
    });

    it("drops recents whose heading is gone, against a fresh read only", async () => {
      const { gateway, index } = setup();
      const store = new FakeSettingsStore();
      await store.saveRecents(docId, ["_RCgone", "_Ref200000001"]);
      const recents = new RecentHeadings(store);
      // The first open reads the document, so the list is fresh and pruned.
      const first = await openPalette({ gateway, index, recents }, defaults);
      if (first.kind !== "open") throw new Error(first.kind);
      await first.pruned;
      expect(await store.loadRecents(docId)).toEqual(["_Ref200000001"]);

      // From the cache: a bookmark it does not know is kept until the refresh shows it gone.
      await store.saveRecents(docId, ["_RCnew", "_Ref200000001"]);
      const second = await openPalette({ gateway, index, recents }, defaults);
      if (second.kind !== "open") throw new Error(second.kind);
      expect(second.recents).toEqual(["_RCnew", "_Ref200000001"]);
      expect(await store.loadRecents(docId)).toEqual(["_RCnew", "_Ref200000001"]);
      await second.refreshed;
      await second.pruned;
      expect(await store.loadRecents(docId)).toEqual(["_Ref200000001"]);
    });

    it("prunes once the refresh is allowed, and not at all when it is skipped (T098)", async () => {
      const gateway = new FakeGateway(fakeFixtures["spec-300"]());
      const { index } = await countedIndex(gateway);
      const store = new FakeSettingsStore();
      const recents = new RecentHeadings(store);

      await store.saveRecents(docId, ["_RCgone", "_Ref200000001"]);
      const skipped = await openPalette({ gateway, index, recents, mayRefresh: async () => false }, defaults);
      if (skipped.kind !== "open") throw new Error(skipped.kind);
      await skipped.pruned;
      expect(await store.loadRecents(docId)).toEqual(["_RCgone", "_Ref200000001"]);

      const { mayRefresh, settle } = goAhead();
      const allowed = await openPalette({ gateway, index, recents, mayRefresh }, defaults);
      if (allowed.kind !== "open") throw new Error(allowed.kind);
      await nextTask();
      expect(await store.loadRecents(docId)).toEqual(["_RCgone", "_Ref200000001"]);
      settle(true);
      await allowed.pruned;
      expect(await store.loadRecents(docId)).toEqual(["_Ref200000001"]);
    });

    it("keeps a recent recorded while the background refresh was reading (an insertion before it arrived)", async () => {
      const gateway = new FakeGateway(fakeFixtures["spec-300"]());
      let gate: Promise<void> | null = null;
      const index = new HeadingIndex(async () => (await gate, gateway.readHeadings()));
      const store = new FakeSettingsStore();
      const recents = new RecentHeadings(store);
      const first = await openPalette({ gateway, index, recents }, defaults);
      if (first.kind !== "open") throw new Error(first.kind);
      await first.pruned;
      const target = first.headings.find((h) => h.bookmark === null)!;

      let release!: () => void;
      gate = new Promise((resolve) => (release = resolve));
      const second = await openPalette({ gateway, index, recents }, defaults);
      if (second.kind !== "open") throw new Error(second.kind);
      // What InsertReference does after writing a new bookmark, while the read above is under way.
      index.noteBookmark(target, "_RCnew");
      await recents.record(docId, "_RCnew");
      release();
      await second.pruned;
      expect(await store.loadRecents(docId)).toEqual(["_RCnew"]);
      expect(index.byKey({ kind: "bookmark", name: "_RCnew" })?.order).toBe(target.order);
    });
  });
});
