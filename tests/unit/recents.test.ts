import { describe, expect, it } from "vitest";
import { headingKeyFor } from "../../src/core/headings/key";
import type { Heading } from "../../src/core/headings/types";
import {
  MAX_RECENT_DOCUMENTS,
  MAX_RECENTS,
  readStoredRecents,
  RecentHeadings,
  recentHeadings,
  withDocumentRecents,
  withRecent,
} from "../../src/core/recents/recent-headings";
import { FakeSettingsStore } from "../fakes/fake-settings-store";

function heading(order: number, text: string, bookmark: string | null = null): Heading {
  const base = { level: 2 as const, text, number: null, order, location: "main" as const, bookmark };
  return { ...base, key: headingKeyFor(base) };
}

const headings = [heading(0, "Scope", "_Ref1"), heading(1, "Fire strategy", "_RCa"), heading(2, "Concrete", "_RCb"), heading(3, "Untouched")];

describe("withRecent (data-model RecentHeadings)", () => {
  it("puts the bookmark first, most recent first", () => {
    expect(withRecent(["_RCa", "_RCb"], "_RCc")).toEqual(["_RCc", "_RCa", "_RCb"]);
  });

  it("keeps each bookmark once, case-insensitively, moving a repeat to the front", () => {
    expect(withRecent(["_RCa", "_RCb"], "_rcb")).toEqual(["_rcb", "_RCa"]);
  });

  it(`keeps at most ${MAX_RECENTS}`, () => {
    expect(MAX_RECENTS).toBe(5);
    expect(withRecent(["a", "b", "c", "d", "e"], "f")).toEqual(["f", "a", "b", "c", "d"]);
  });
});

describe("recentHeadings", () => {
  it("gives the listed headings in recency order, matching bookmarks case-insensitively", () => {
    expect(recentHeadings(["_RCB", "_Ref1"], headings).map((h) => h.text)).toEqual(["Concrete", "Scope"]);
  });

  it("drops bookmarks that no longer exist or no longer sit on a heading (US5 scenario 3)", () => {
    expect(recentHeadings(["_RCgone", "_RCa"], headings).map((h) => h.text)).toEqual(["Fire strategy"]);
  });
});

describe("withDocumentRecents and readStoredRecents (one stored list for every document)", () => {
  it("puts the document saved last first, replacing its old entry", () => {
    const entries = withDocumentRecents([{ documentId: "a", bookmarks: ["x"] }, { documentId: "b", bookmarks: ["y"] }], "b", ["z", "y"]);
    expect(entries).toEqual([
      { documentId: "b", bookmarks: ["z", "y"] },
      { documentId: "a", bookmarks: ["x"] },
    ]);
  });

  it(`keeps at most ${MAX_RECENT_DOCUMENTS} documents; the least recently used is dropped`, () => {
    expect(MAX_RECENT_DOCUMENTS).toBe(50);
    let entries = withDocumentRecents([], "doc-0", ["x"]);
    for (let i = 1; i <= MAX_RECENT_DOCUMENTS; i++) entries = withDocumentRecents(entries, `doc-${i}`, ["x"]);
    expect(entries).toHaveLength(MAX_RECENT_DOCUMENTS);
    expect(entries.some((e) => e.documentId === "doc-0")).toBe(false);
    expect(entries[0]?.documentId).toBe(`doc-${MAX_RECENT_DOCUMENTS}`);
  });

  it("reads a stored list, leaving out what is not an entry, and gives [] for anything else", () => {
    expect(readStoredRecents([{ documentId: "a", bookmarks: ["x", 3] }, { documentId: 1 }, "junk"])).toEqual([
      { documentId: "a", bookmarks: ["x"] },
    ]);
    expect(readStoredRecents(null)).toEqual([]);
    expect(readStoredRecents("{not json")).toEqual([]);
    expect(readStoredRecents({ documentId: "a" })).toEqual([]);
  });

  it("holds a stored list to the write rules: unique bookmarks, at most 5, each document once, at most 50", () => {
    const many = Array.from({ length: MAX_RECENT_DOCUMENTS + 1 }, (_, i) => ({ documentId: `doc-${i}`, bookmarks: ["x"] }));
    const read = readStoredRecents([{ documentId: "a", bookmarks: ["_A", "_a", "b", "c", "d", "e", "f"] }, { documentId: "a", bookmarks: ["old"] }, ...many]);
    expect(read[0]).toEqual({ documentId: "a", bookmarks: ["_A", "b", "c", "d", "e"] });
    expect(read.filter((e) => e.documentId === "a")).toHaveLength(1);
    expect(read).toHaveLength(MAX_RECENT_DOCUMENTS);
  });
});

describe("RecentHeadings", () => {
  it("records into the store for a saved document and loads them back", async () => {
    const store = new FakeSettingsStore();
    const recents = new RecentHeadings(store);
    await recents.record("doc", "_RCa");
    await recents.record("doc", "_RCb");
    expect(await recents.load("doc")).toEqual(["_RCb", "_RCa"]);
    expect(await store.loadRecents("doc")).toEqual(["_RCb", "_RCa"]);
  });

  it("keeps an unsaved document's recents in memory only, never sending them to the store", async () => {
    const store = new FakeSettingsStore();
    let calls = 0;
    const counting = {
      loadRecents: async (id: string) => (calls++, store.loadRecents(id)),
      saveRecents: async (id: string, b: readonly string[]) => (calls++, store.saveRecents(id, b)),
    };
    const recents = new RecentHeadings(counting);
    await recents.record(null, "_RCa");
    expect(await recents.load(null)).toEqual(["_RCa"]);
    expect(calls).toBe(0);
  });

  it("works in memory without a store", async () => {
    const recents = new RecentHeadings(null);
    await recents.record("doc", "_RCa");
    expect(await recents.load("doc")).toEqual(["_RCa"]);
    expect(await recents.load("other")).toEqual([]);
  });

  it("prunes against a fresh heading list, writing only when something went", async () => {
    const store = new FakeSettingsStore();
    await store.saveRecents("doc", ["_RCgone", "_RCa"]);
    let saves = 0;
    const recents = new RecentHeadings({ loadRecents: (id) => store.loadRecents(id), saveRecents: async (id, b) => (saves++, store.saveRecents(id, b)) });
    await recents.prune("doc", headings, ["_RCgone", "_RCa"]);
    expect(await store.loadRecents("doc")).toEqual(["_RCa"]);
    await recents.prune("doc", headings, ["_RCa"]);
    expect(saves).toBe(1);
  });

  it("prunes only the bookmarks it was given to judge, keeping one recorded since the read began", async () => {
    const store = new FakeSettingsStore();
    await store.saveRecents("doc", ["_RCgone"]);
    const recents = new RecentHeadings(store);
    await recents.record("doc", "_RCnew");
    await recents.prune("doc", headings, ["_RCgone"]);
    expect(await store.loadRecents("doc")).toEqual(["_RCnew"]);
  });

  it("runs a prune and a record one after the other, so neither overwrites the other", async () => {
    const store = new FakeSettingsStore();
    await store.saveRecents("doc", ["_RCgone", "_RCa"]);
    const slow = {
      // Read, then take a while to answer: an unqueued write would read the same list as the other.
      loadRecents: async (id: string) => {
        const bookmarks = await store.loadRecents(id);
        await new Promise((resolve) => setTimeout(resolve, 5));
        return bookmarks;
      },
      saveRecents: (id: string, b: readonly string[]) => store.saveRecents(id, b),
    };
    const recents = new RecentHeadings(slow);
    await Promise.all([recents.prune("doc", headings, ["_RCgone", "_RCa"]), recents.record("doc", "_RCb")]);
    expect(await store.loadRecents("doc")).toEqual(["_RCb", "_RCa"]);
  });
});
