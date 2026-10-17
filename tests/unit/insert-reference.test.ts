import { describe, expect, it, vi } from "vitest";
import { formatById } from "../../src/core/formats/built-ins";
import { HeadingIndex } from "../../src/core/headings/heading-index";
import type { Heading } from "../../src/core/headings/types";
import { messageText } from "../../src/core/messages";
import { insertReference, type InsertReferenceInput } from "../../src/core/use-cases/insert-reference";
import { fakeFixtures } from "../fakes/fake-documents";
import { FakeGateway } from "../fakes/fake-gateway";
import { FakeHostShell } from "../fakes/fake-host-shell";

const parts = formatById("sectionNumberText")!.parts;

async function setup() {
  const gateway = new FakeGateway(fakeFixtures["spec-300"]());
  const index = new HeadingIndex(() => gateway.readHeadings());
  const { headings } = await index.get();
  const byText = (text: string): Heading => headings.find((h) => h.text === text)!;
  const input = (text: string, overrides: Partial<InsertReferenceInput> = {}): InsertReferenceInput => ({
    target: byText(text),
    parts,
    policy: { allowInHeadings: false },
    confirmed: null,
    ...overrides,
  });
  const shell = new FakeHostShell();
  shell.visible = true;
  // Deterministic names: 0.5 gives "_RCssssssssss".
  return { gateway, index, input, shell, deps: { gateway, index, shell, random: () => 0.5 } };
}

describe("InsertReference", () => {
  it("reuses a usable bookmark and leaves the bookmark count unchanged", async () => {
    const { gateway, deps, input } = await setup();
    const before = gateway.bookmarks().length;
    const result = await insertReference(deps, input("Scope"));
    expect(result).toMatchObject({ kind: "inserted", bookmark: "_Ref200000001", bookmarkCreated: false });
    expect(gateway.bookmarks()).toHaveLength(before);
  });

  it("creates exactly one bookmark with a fresh unique name when none is usable, leaving _Toc untouched", async () => {
    const { gateway, deps, input } = await setup();
    const before = gateway.bookmarks();
    const result = await insertReference(deps, input("Fire strategy"));
    expect(result).toMatchObject({ kind: "inserted", bookmark: "_RCssssssssss", bookmarkCreated: true });
    const after = gateway.bookmarks();
    expect(after).toHaveLength(before.length + 1);
    expect(after.filter((b) => !before.some((o) => o.name === b.name)).map((b) => b.name)).toEqual(["_RCssssssssss"]);
    expect(after.find((b) => b.name === "_Toc100000002")).toEqual(before.find((b) => b.name === "_Toc100000002"));
  });

  it("passes the format's parts, so the reference reads as the preview", async () => {
    const { gateway, deps, input } = await setup();
    const result = await insertReference(deps, input("Fire strategy"));
    if (result.kind !== "inserted") throw new Error(result.kind);
    expect(gateway.insertionText(result.reference.id)).toBe("§ 4.3 Fire strategy");
  });

  it("leaves the number out for an unnumbered heading, keeping the §, as the preview does (T145)", async () => {
    const { gateway, deps, input } = await setup();
    const result = await insertReference(deps, input("Heading in a footnote"));
    if (result.kind !== "inserted") throw new Error(result.kind);
    expect(gateway.insertionText(result.reference.id)).toBe("§ Heading in a footnote");
  });

  it("inserts nothing and says so for a number-only format and an unnumbered heading (T145)", async () => {
    const { gateway, deps, input, shell } = await setup();
    const before = gateway.bookmarks();
    const result = await insertReference(deps, input("Heading in a footnote", { parts: [{ kind: "number" }] }));
    expect(result).toEqual({ kind: "message", message: "noNumber" });
    expect(gateway.bookmarks()).toEqual(before);
    expect(shell.visible).toBe(true);
  });

  it("maps staleTarget to a refreshed index, returning the fresh headings", async () => {
    const { gateway, index, deps, input } = await setup();
    const request = input("Fire strategy");
    gateway.setParagraphText("Fire strategy", "Fire safety strategy");
    const result = await insertReference(deps, request);
    if (result.kind !== "stale") throw new Error(result.kind);
    expect(result.headings?.some((h) => h.text === "Fire safety strategy")).toBe(true);
    expect(index.cached()?.headings).toEqual(result.headings);
  });

  it("returns no headings for a stale target when the refresh fails", async () => {
    const { gateway, deps, input } = await setup();
    const request = input("Fire strategy");
    gateway.setParagraphText("Fire strategy", "Fire safety strategy");
    gateway.readHeadings = () => Promise.reject(new Error("Word is busy."));
    expect(await insertReference(deps, request)).toEqual({ kind: "stale", headings: null });
  });

  it("maps declined (cursor moved into a heading, or protection turned on) to a message with no change", async () => {
    const { gateway, deps, input } = await setup();
    const request = input("Scope");
    const unchanged = gateway.documentState();
    gateway.select("Means of escape");
    expect(await insertReference(deps, request)).toEqual({ kind: "message", message: "headingParagraph" });
    gateway.select("The fire strategy is described here.");
    gateway.setProtected(true);
    expect(await insertReference(deps, request)).toEqual({ kind: "message", message: "protected" });
    gateway.setProtected(false);
    expect(gateway.documentState()).toEqual(unchanged);
  });

  it("maps hostError to a message with the document unchanged (FR-014)", async () => {
    const { gateway, deps, input } = await setup();
    const unchanged = gateway.documentState();
    gateway.failNextWrite();
    expect(await insertReference(deps, input("Fire strategy"))).toMatchObject({ kind: "message", message: "hostError" });
    expect(gateway.documentState()).toEqual(unchanged);
    expect(messageText("hostError")).toMatch(/hasn't been changed/);
  });

  it("keeps Word's detail of a host error and logs it locally", async () => {
    const { gateway, deps, input } = await setup();
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      gateway.failNextWrite();
      expect(await insertReference(deps, input("Fire strategy"))).toEqual({
        kind: "message",
        message: "hostError",
        detail: "Simulated host failure.",
      });
      gateway.listBookmarkNames = () => Promise.reject(new Error("Word is busy."));
      expect(await insertReference(deps, input("Fire strategy"))).toMatchObject({ detail: "Word is busy." });
      expect(logged.mock.calls.map(([tag]) => tag)).toEqual(["[radcut:insert-host-error]", "[radcut:insert-host-error]"]);
    } finally {
      logged.mockRestore();
    }
  });

  it("maps a failure listing bookmarks, before anything is written, to hostError", async () => {
    const { gateway, deps, input } = await setup();
    const unchanged = gateway.documentState();
    gateway.listBookmarkNames = () => Promise.reject(new Error("Word is busy."));
    expect(await insertReference(deps, input("Fire strategy"))).toMatchObject({ kind: "message", message: "hostError" });
    expect(gateway.documentState()).toEqual(unchanged);
  });

  it("maps a gateway that throws instead of returning hostError to hostError", async () => {
    const { gateway, deps, input } = await setup();
    gateway.insertReference = () => Promise.reject(new Error("Unexpected."));
    expect(await insertReference(deps, input("Fire strategy"))).toMatchObject({ kind: "message", message: "hostError" });
  });

  it("never claims the document is unchanged when Word failed during the write (FR-014)", async () => {
    const { gateway, deps, input } = await setup();
    const unchanged = gateway.documentState();
    gateway.failNextWrite({ duringWrite: true });
    expect(await insertReference(deps, input("Fire strategy"))).toMatchObject({ kind: "message", message: "hostErrorPartial" });
    expect(gateway.documentState()).not.toEqual(unchanged);
    expect(messageText("hostErrorPartial")).not.toMatch(/hasn't been changed/);
    expect(messageText("hostErrorPartial")).toMatch(/Ctrl\+Z/);
  });

  it("does not ask for Ctrl+Z when the failed write batch changed nothing (it would undo the user's own edit)", async () => {
    const { gateway, deps, input } = await setup();
    const unchanged = gateway.documentState();
    gateway.failNextWrite({ duringWrite: true, landed: false });
    expect(await insertReference(deps, input("Fire strategy"))).toMatchObject({ kind: "message", message: "hostError" });
    expect(gateway.documentState()).toEqual(unchanged);
  });

  it("declines a selection containing a table, confirmed or not (FR-008a)", async () => {
    const { gateway, deps, input } = await setup();
    gateway.select("First of two paragraphs.", { tables: 1, paragraphs: 2 });
    const unchanged = gateway.documentState();
    for (const confirmed of [null, "selection"] as const) {
      expect(await insertReference(deps, input("Scope", { confirmed }))).toEqual({
        kind: "message",
        message: "tableSelected",
      });
    }
    expect(gateway.documentState()).toEqual(unchanged);
  });

  it("asks before replacing the field the cursor is in, then replaces it (FR-008b)", async () => {
    const { gateway, deps, input } = await setup();
    const paragraph = "References made by Word: see section and heading.";
    gateway.select(paragraph, { inField: true });
    const fieldsBefore = gateway.fields().filter((f) => !f.insertedByAddin);
    expect(await insertReference(deps, input("Scope"))).toEqual({ kind: "needsConfirmation", confirm: "field", message: "fieldWarning" });
    expect(gateway.insertions()).toHaveLength(0);
    const confirmed = await insertReference(deps, input("Scope", { confirmed: "field" }));
    expect(confirmed.kind).toBe("inserted");
    expect(gateway.fields().filter((f) => !f.insertedByAddin)).toHaveLength(fieldsBefore.length - 1);
    expect(gateway.insertionParagraph(gateway.insertions()[0]!.id)).toBe(paragraph);
  });

  it("asks again with the field warning when the selection warning was confirmed but the cursor is now in a field", async () => {
    const { gateway, deps, input } = await setup();
    gateway.select("References made by Word: see section and heading.", { inField: true });
    const result = await insertReference(deps, input("Scope", { confirmed: "selection" }));
    expect(result).toEqual({ kind: "needsConfirmation", confirm: "field", message: "fieldWarning" });
    expect(gateway.insertions()).toHaveLength(0);
  });

  it("asks for confirmation of an extended selection, and inserts when confirmed", async () => {
    const { gateway, deps, input } = await setup();
    gateway.select("First of two paragraphs.", { length: 5, paragraphs: 2 });
    expect(await insertReference(deps, input("Scope"))).toEqual({ kind: "needsConfirmation", confirm: "selection", message: "selectionWarning" });
    expect(gateway.insertions()).toHaveLength(0);
    const confirmed = await insertReference(deps, input("Scope", { confirmed: "selection" }));
    expect(confirmed.kind).toBe("inserted");
  });

  it("maps selfReference to its message", async () => {
    const { gateway, deps, input } = await setup();
    gateway.select("Fire strategy");
    const result = await insertReference(deps, input("Fire strategy", { policy: { allowInHeadings: true } }));
    expect(result).toEqual({ kind: "message", message: "selfReference" });
    expect(messageText("selfReference")).toBe("A heading can't refer to itself.");
  });

  it("declines a confirmed selection that runs into the target heading, changing nothing", async () => {
    const { gateway, deps, input } = await setup();
    gateway.select("The fire strategy is described here.", { length: 5, paragraphs: 2 });
    const unchanged = gateway.documentState();
    const result = await insertReference(deps, input("Heading with bold word", { confirmed: "selection" }));
    expect(result).toEqual({ kind: "message", message: "selfReference" });
    expect(gateway.documentState()).toEqual(unchanged);
  });

  it("never touches a bookmark it did not choose or create (FR-011a)", async () => {
    const { gateway, deps, input } = await setup();
    const before = gateway.bookmarks();
    await insertReference(deps, input("Standards"));
    await insertReference(deps, input("Definitions"));
    const after = gateway.bookmarks();
    for (const b of before) expect(after).toContainEqual(b);
    expect(gateway.fields().filter((f) => !f.insertedByAddin)).toEqual(
      fakeFixtures["spec-300"]().fields.filter((f) => !f.insertedByAddin),
    );
  });

  it("on success hides the pane, then returns focus after the reference", async () => {
    const { gateway, shell, deps, input } = await setup();
    let hiddenWhenFocusReturned: boolean | null = null;
    const returnFocus = gateway.returnFocus.bind(gateway);
    gateway.returnFocus = async (after) => {
      hiddenWhenFocusReturned = !shell.visible;
      await returnFocus(after);
    };
    const result = await insertReference(deps, input("Fire strategy"));
    if (result.kind !== "inserted") throw new Error(result.kind);
    expect(gateway.focusReturned).toEqual({ after: result.reference.id });
    expect(hiddenWhenFocusReturned).toBe(true);
  });

  it("still reports the insert when hiding the pane or returning focus fails afterwards", async () => {
    for (const fail of ["hidePane", "returnFocus"] as const) {
      const { gateway, shell, deps, input } = await setup();
      if (fail === "hidePane") shell.hidePane = () => Promise.reject(new Error("Word is busy."));
      else gateway.returnFocus = () => Promise.reject(new Error("Word is busy."));
      const result = await insertReference(deps, input("Fire strategy"));
      expect(result.kind).toBe("inserted");
      expect(gateway.insertions()).toHaveLength(1);
    }
  });

  it("returns focus even when hiding the pane failed", async () => {
    const { gateway, shell, deps, input } = await setup();
    shell.hidePane = () => Promise.reject(new Error("Word is busy."));
    const result = await insertReference(deps, input("Fire strategy"));
    if (result.kind !== "inserted") throw new Error(result.kind);
    expect(gateway.focusReturned).toEqual({ after: result.reference.id });
  });

  it("keeps the pane open when nothing was inserted", async () => {
    const { gateway, shell, deps, input } = await setup();
    gateway.failNextWrite();
    await insertReference(deps, input("Fire strategy"));
    expect(shell.visible).toBe(true);
    expect(gateway.focusReturned).toBeNull();
  });
});
