import { generateBookmarkName } from "../../src/core/bookmarks/naming";
import { BUILT_IN_FORMATS, formatById } from "../../src/core/formats/built-ins";
import { fieldFor } from "../../src/core/formats/fields";
import { previewReference } from "../../src/core/formats/preview";
import type { FormatPart } from "../../src/core/formats/types";
import { headingFingerprint } from "../../src/core/headings/key";
import type { Heading } from "../../src/core/headings/types";
import type { LocationPolicy } from "../../src/core/location/types";
import type {
  IDocumentGateway,
  InsertedReference,
  InsertReferenceRequest,
} from "../../src/core/ports/document-gateway";
import type { ContractTestApi } from "./test-api";

/** Fixture documents both runs know (tests/fixtures/README.md). */
export type ContractFixture = "spec-300" | "guide-500" | "tracked" | "plain-headings";

export interface SelectionRequest {
  /** Selected characters from the start of the paragraph; 0 = caret. */
  length?: number;
  /** Paragraphs the selection touches. */
  paragraphs?: number;
  tables?: number;
  pictures?: number;
  shapes?: number;
  contentControls?: number;
  /** Put the cursor inside the first field of the paragraph. */
  inField?: boolean;
}

export interface BookmarkInfo {
  name: string;
  /** Text of the paragraph the bookmark is in. */
  paragraphText: string;
  extent: "text" | "paragraph" | "partial";
}

export interface FieldInfo {
  type: "ref" | "pageRef" | "other";
  bookmark: string | null;
  switches: string[];
  result: string;
  /** Character formatting of the field result. */
  format: { bold: boolean; italic: boolean };
}

/**
 * What a contract case needs besides the gateway: steering Word's selection and reading the
 * document back. FakeGateway implements it in memory; the Word run against the open fixture.
 */
export interface GatewayContractHarness {
  readonly gateway: IDocumentGateway;
  select(paragraphText: string, selection?: SelectionRequest): Promise<void>;
  setProtected(on: boolean): Promise<void>;
  /** Make the next insertReference fail after its checks. */
  failNextWrite(): Promise<void>;
  setParagraphText(currentText: string, newText: string): Promise<void>;
  bookmarks(): Promise<BookmarkInfo[]>;
  fields(): Promise<FieldInfo[]>;
  /** Displayed text of an inserted reference (literals and field results). */
  insertionText(reference: InsertedReference): Promise<string>;
  /** Text of the paragraph the reference went into, as it was before the insertion. */
  insertionParagraph(reference: InsertedReference): Promise<string>;
  /** The selected text the reference replaced ("" for a caret). */
  replacedText(reference: InsertedReference): Promise<string>;
  /** Comparable snapshot of the whole document for "unchanged" assertions. */
  documentState(): Promise<unknown>;
}

export type GatewayContractSetup = (fixture: ContractFixture) => Promise<GatewayContractHarness>;

const OFF: LocationPolicy = { allowInHeadings: false };
const ON: LocationPolicy = { allowInHeadings: true };
const BODY = "The fire strategy is described here.";
const SECTION_NUMBER_TEXT = formatById("sectionNumberText")!.parts;
const TEXT = formatById("text")!.parts;

async function headingByText(gateway: IDocumentGateway, text: string): Promise<Heading> {
  const found = (await gateway.readHeadings()).headings.find((h) => h.text === text);
  if (!found) throw new Error(`No heading "${text}".`);
  return found;
}

async function request(
  gateway: IDocumentGateway,
  target: Heading,
  overrides: Partial<InsertReferenceRequest> & { parts?: readonly FormatPart[] } = {},
): Promise<InsertReferenceRequest> {
  return {
    target: target.key,
    expectedFingerprint: headingFingerprint(target),
    parts: SECTION_NUMBER_TEXT,
    newBookmarkName: generateBookmarkName(await gateway.listBookmarkNames()),
    policy: OFF,
    confirmExtendedSelection: false,
    ...overrides,
  };
}

/**
 * The shared IDocumentGateway contract (contracts/document-gateway.md). Each numbered behaviour
 * there is at least one case here; Word-only cases use `api.environment`.
 */
export function defineDocumentGatewayContract(
  name: string,
  setup: GatewayContractSetup,
  api: ContractTestApi,
): void {
  const { describe, it, expect } = api;
  const wordOnly = api.environment === "word" ? api.it : api.skip;

  async function insertOk(h: GatewayContractHarness, text: string, overrides: Parameters<typeof request>[2] = {}) {
    const result = await h.gateway.insertReference(await request(h.gateway, await headingByText(h.gateway, text), overrides));
    if (!result.ok) throw new Error(`Insert failed: ${result.reason}`);
    return result;
  }

  describe(`IDocumentGateway contract: ${name}`, () => {
    it("1. readHeadings returns only headings, in order, with level, text, number, location and order", async () => {
      const h = await setup("spec-300");
      const { headings } = await h.gateway.readHeadings();
      expect(headings.map((x) => x.order)).toEqual(headings.map((_, i) => i));
      const fire = headings.find((x) => x.text === "Fire strategy");
      expect(fire && { level: fire.level, number: fire.number, location: fire.location }).toEqual({
        level: 2,
        number: "4.3",
        location: "main",
      });
      const texts = headings.map((x) => x.text);
      expect(texts).not.toContain(BODY);
      expect(texts).not.toContain("Title of the document");
      expect(texts).not.toContain("A quotation.");
      expect(texts.indexOf("Introduction")).toBe(0);
      expect(texts.indexOf("Scope")).toBeGreaterThan(texts.indexOf("Introduction"));
    });

    it("1a. headings outside the main text come with their location, in story order, each once", async () => {
      const h = await setup("spec-300");
      const { headings } = await h.gateway.readHeadings();
      const locationOf = (text: string) => headings.filter((x) => x.text === text).map((x) => x.location);
      expect(locationOf("Heading in a table cell")).toEqual(["tableCell"]);
      expect(locationOf("Heading in a text box")).toEqual(["textBox"]);
      expect(locationOf("Heading in a footnote")).toEqual(["footnote"]);
      expect(locationOf("Heading in an endnote")).toEqual(["endnote"]);
      expect(locationOf("Heading in the header")).toEqual(["header"]);
      expect(locationOf("Heading in the footer")).toEqual(["footer"]);
      const order = headings.filter((x) => x.location !== "main" && x.location !== "tableCell").map((x) => x.location);
      expect(order).toEqual(["textBox", "footnote", "endnote", "header", "footer"]);
      const cell = headings.find((x) => x.location === "tableCell")!;
      const lastMain = headings.filter((x) => x.location === "main").at(-1)!;
      expect(lastMain.order).toBeGreaterThan(cell.order);
    });

    it("2. look-alike headings and tracked deletions are not returned; tracked insertions are", async () => {
      const plain = (await (await setup("plain-headings")).gateway.readHeadings()).headings.map((x) => x.text);
      expect(plain).not.toContain("Bold fake heading");
      expect(plain).toContain("Outline-level heading");
      const tracked = (await (await setup("tracked")).gateway.readHeadings()).headings.map((x) => x.text);
      expect(tracked).not.toContain("Deleted heading");
      expect(tracked).toContain("Inserted heading");
    });

    it("3. a usable bookmark is reported; whole-paragraph, partial and Word-managed ones are not", async () => {
      const h = await setup("spec-300");
      const bookmarkOf = async (text: string) => (await headingByText(h.gateway, text)).bookmark;
      expect(await bookmarkOf("Scope")).toMatch(/^_Ref/);
      expect(await bookmarkOf("Definitions")).toBeNull();
      expect(await bookmarkOf("Structural fire resistance")).toBeNull();
      expect(await bookmarkOf("Introduction")).toBeNull();
      expect(await bookmarkOf("Means of escape")).toBeNull();
    });

    it("4. with several usable bookmarks, the first by case-insensitive name order, every time", async () => {
      const h = await setup("spec-300");
      expect((await headingByText(h.gateway, "Standards")).bookmark).toBe("Alpha");
      expect((await headingByText(h.gateway, "Standards")).bookmark).toBe("Alpha");
    });

    describe("5. checkInsertionPoint with allowInHeadings off", () => {
      const allowed = [
        [BODY, "main"],
        ["Footnote text.", "footnote"],
        ["Endnote text.", "endnote"],
        ["Cell text in the main table.", "tableCellInMain"],
      ] as const;
      for (const [text, location] of allowed) {
        it(`allows "${text}" as ${location}`, async () => {
          const h = await setup("spec-300");
          await h.select(text);
          const point = await h.gateway.checkInsertionPoint(OFF);
          expect(point.kind === "insertionPoint" && point.location).toBe(location);
        });
      }

      const declined = [
        ["Header text.", "header"],
        ["Footer text.", "footer"],
        ["A comment.", "comment"],
        ["Text box body.", "textBox"],
        ["Fire strategy", "headingParagraph"],
        ["Title of the document", "titleParagraph"],
        ["Subtitle of the document", "titleParagraph"],
      ] as const;
      for (const [text, reason] of declined) {
        it(`declines "${text}" as ${reason}`, async () => {
          const h = await setup("spec-300");
          await h.select(text);
          expect(await h.gateway.checkInsertionPoint(OFF)).toEqual({ kind: "declined", reason });
        });
      }

      it("declines a protected document and never changes the document", async () => {
        const h = await setup("spec-300");
        await h.setProtected(true);
        const before = await h.documentState();
        expect(await h.gateway.checkInsertionPoint(OFF)).toEqual({ kind: "declined", reason: "protected" });
        expect(await h.documentState()).toEqual(before);
      });
    });

    describe("5b. checkInsertionPoint with allowInHeadings on", () => {
      it("allows a heading with inHeadingOrder set, and Title and Subtitle with null", async () => {
        const h = await setup("spec-300");
        const fire = await headingByText(h.gateway, "Fire strategy");
        await h.select("Fire strategy");
        const point = await h.gateway.checkInsertionPoint(ON);
        expect(point.kind === "insertionPoint" && point.inHeadingOrder).toBe(fire.order);
        await h.select("Title of the document");
        const title = await h.gateway.checkInsertionPoint(ON);
        expect(title.kind === "insertionPoint" && title.inHeadingOrder).toBeNull();
      });

      it("still declines header, footer, comment, text box and protected", async () => {
        const h = await setup("spec-300");
        for (const [text, reason] of [
          ["Header text.", "header"],
          ["Footer text.", "footer"],
          ["A comment.", "comment"],
          ["Text box body.", "textBox"],
        ] as const) {
          await h.select(text);
          expect(await h.gateway.checkInsertionPoint(ON)).toEqual({ kind: "declined", reason });
        }
        await h.select(BODY);
        await h.setProtected(true);
        expect(await h.gateway.checkInsertionPoint(ON)).toEqual({ kind: "declined", reason: "protected" });
      });
    });

    it("5c. referring to the heading containing the cursor is declined as selfReference, unchanged", async () => {
      const h = await setup("spec-300");
      await h.select("Fire strategy");
      const before = await h.documentState();
      const result = await h.gateway.insertReference(
        await request(h.gateway, await headingByText(h.gateway, "Fire strategy"), { policy: ON }),
      );
      expect(result).toEqual({ ok: false, reason: "declined", declined: { kind: "declined", reason: "selfReference" } });
      expect(await h.documentState()).toEqual(before);
    });

    it("5a. the reference goes to the selection at insert time; a now-disallowed one is declined", async () => {
      const h = await setup("spec-300");
      await h.gateway.checkInsertionPoint(OFF);
      await h.select("Scope body.");
      const moved = await insertOk(h, "Fire strategy");
      expect(await h.insertionParagraph(moved.reference)).toBe("Scope body.");

      const req = await request(h.gateway, await headingByText(h.gateway, "Concrete"));
      await h.select("Concrete");
      const before = await h.documentState();
      expect(await h.gateway.insertReference(req)).toEqual({
        ok: false,
        reason: "declined",
        declined: { kind: "declined", reason: "headingParagraph" },
      });
      await h.select(BODY);
      await h.setProtected(true);
      const protectedResult = await h.gateway.insertReference(req);
      expect(!protectedResult.ok && protectedResult.reason).toBe("declined");
      await h.setProtected(false);
      await h.select("Concrete");
      expect(await h.documentState()).toEqual(before);
    });

    it("6. a usable bookmark is reused: none created, count unchanged", async () => {
      const h = await setup("spec-300");
      const before = await h.bookmarks();
      const result = await insertOk(h, "Scope");
      expect(result.bookmarkCreated).toBe(false);
      expect(result.bookmark).toMatch(/^_Ref/);
      expect(await h.bookmarks()).toHaveLength(before.length);
    });

    it("7. with no usable bookmark, exactly one is created over the heading text; others untouched", async () => {
      const h = await setup("spec-300");
      const before = await h.bookmarks();
      const req = await request(h.gateway, await headingByText(h.gateway, "Fire strategy"));
      const result = await h.gateway.insertReference(req);
      expect(result.ok && result.bookmarkCreated).toBe(true);
      const after = await h.bookmarks();
      expect(after).toHaveLength(before.length + 1);
      const created = after.find((b) => b.name === req.newBookmarkName);
      expect(created).toEqual({ name: req.newBookmarkName, paragraphText: "Fire strategy", extent: "text" });
      for (const b of before) expect(after).toContainEqual(b);
    });

    it("7a. the reference takes the formatting of the text at the insertion point", async () => {
      for (const [text, format] of [
        ["Bold body text.", { bold: true, italic: false }],
        ["Italic body text.", { bold: false, italic: true }],
      ] as const) {
        const h = await setup("spec-300");
        await h.select(text);
        const before = (await h.fields()).length;
        await insertOk(h, "Heading with bold word");
        const added = (await h.fields()).slice(before);
        expect(added).toHaveLength(2);
        for (const field of added) expect(field.format).toEqual(format);
      }
    });

    wordOnly("7a (after update). formatting is kept after F9", async () => {
      // Run by hand in Word: select all, F9, then re-read fields (manual step in the dev pane).
    });

    it("7b. no insertion changes bookmarks or fields the add-in did not make", async () => {
      const h = await setup("spec-300");
      const bookmarks = await h.bookmarks();
      const fields = await h.fields();
      await insertOk(h, "Scope");
      await insertOk(h, "Standards");
      await insertOk(h, "Definitions");
      const afterBookmarks = await h.bookmarks();
      for (const b of bookmarks) expect(afterBookmarks).toContainEqual(b);
      expect((await h.fields()).slice(0, fields.length)).toEqual(fields);
    });

    it("7c. headings in every other story get a bookmark and a resolving reference", async () => {
      const h = await setup("spec-300");
      for (const text of [
        "Heading in a table cell",
        "Heading in a text box",
        "Heading in a footnote",
        "Heading in an endnote",
        "Heading in the header",
        "Heading in the footer",
      ]) {
        await h.select(BODY);
        const result = await insertOk(h, text, { parts: TEXT });
        expect(await h.insertionText(result.reference)).toBe(text);
        expect((await h.bookmarks()).find((b) => b.name === result.bookmark)?.paragraphText).toBe(text);
      }
    });

    wordOnly("7c (jump). Ctrl+click on each reference jumps to its heading", async () => {
      // Checked by hand in Word.
    });

    it("8. inserted content is the literals plus one hyperlinked field per part, with the R5 switches", async () => {
      const h = await setup("spec-300");
      const before = (await h.fields()).length;
      const result = await insertOk(h, "Fire strategy");
      const added = (await h.fields()).slice(before);
      expect(added.map((f) => ({ type: f.type, bookmark: f.bookmark, switches: f.switches }))).toEqual([
        { type: "ref", bookmark: result.bookmark, switches: fieldFor("number").switches },
        { type: "ref", bookmark: result.bookmark, switches: fieldFor("text").switches },
      ]);
      expect(await h.insertionText(result.reference)).toBe("§ 4.3 Fire strategy");
    });

    it("9. each field's result equals the core's preview for every built-in format", async () => {
      for (const format of BUILT_IN_FORMATS) {
        const h = await setup("spec-300");
        const point = await h.gateway.checkInsertionPoint(OFF);
        if (point.kind !== "insertionPoint") throw new Error("expected an insertion point");
        const target = await headingByText(h.gateway, "Scope");
        const result = await insertOk(h, "Scope", { parts: format.parts });
        const shown = await h.insertionText(result.reference);
        const preview = previewReference(format.parts, target, point).text;
        if (format.id === "page") expect(shown).toMatch(/^[1-9][0-9]*$/);
        else expect(shown).toBe(preview);
      }
    });

    it("10. an inline selection is replaced without confirmation", async () => {
      const h = await setup("spec-300");
      await h.select(BODY, { length: 4 });
      const result = await insertOk(h, "Scope");
      expect(await h.replacedText(result.reference)).toBe("The ");
    });

    it("10a. an extended selection needs confirmation; once confirmed it is replaced", async () => {
      for (const extended of [{ paragraphs: 2, length: 5 }, { pictures: 1 }, { shapes: 1 }, { contentControls: 1 }]) {
        const h = await setup("spec-300");
        await h.select("First of two paragraphs.", extended);
        const before = await h.documentState();
        const target = await headingByText(h.gateway, "Scope");
        expect(await h.gateway.insertReference(await request(h.gateway, target))).toEqual({
          ok: false,
          reason: "needsConfirmation",
          confirm: "selection",
        });
        expect(await h.documentState()).toEqual(before);
        const confirmed = await h.gateway.insertReference(await request(h.gateway, target, { confirmExtendedSelection: true }));
        expect(confirmed.ok).toBe(true);
      }
    });

    it("10b. a selection containing a table is declined tableSelected, confirmed or not, unchanged", async () => {
      const h = await setup("spec-300");
      await h.select("First of two paragraphs.", { tables: 1, paragraphs: 2 });
      const before = await h.documentState();
      expect(await h.gateway.checkInsertionPoint(OFF)).toEqual({ kind: "declined", reason: "tableSelected" });
      const target = await headingByText(h.gateway, "Scope");
      for (const confirmExtendedSelection of [false, true]) {
        expect(await h.gateway.insertReference(await request(h.gateway, target, { confirmExtendedSelection }))).toEqual({
          ok: false,
          reason: "declined",
          declined: { kind: "declined", reason: "tableSelected" },
        });
      }
      expect(await h.documentState()).toEqual(before);
    });

    it("10c. inside a field: needsConfirmation first; once confirmed the field is replaced in place", async () => {
      const h = await setup("spec-300");
      const paragraph = "References made by Word: see section and heading.";
      await h.select(paragraph, { inField: true });
      const before = await h.documentState();
      const fieldsBefore = (await h.fields()).length;
      const target = await headingByText(h.gateway, "Scope");
      expect(await h.gateway.insertReference(await request(h.gateway, target, { parts: TEXT }))).toEqual({
        ok: false,
        reason: "needsConfirmation",
        confirm: "field",
      });
      expect(await h.documentState()).toEqual(before);
      const confirmed = await h.gateway.insertReference(
        await request(h.gateway, target, { parts: TEXT, confirmExtendedSelection: true }),
      );
      if (!confirmed.ok) throw new Error(`Insert failed: ${JSON.stringify(confirmed)}`);
      // One field out (the old one), one in (the new text reference).
      expect(await h.fields()).toHaveLength(fieldsBefore);
      expect(await h.insertionParagraph(confirmed.reference)).toBe(paragraph);
    });

    it("11. a stale fingerprint gives staleTarget and changes nothing", async () => {
      const h = await setup("spec-300");
      const req = await request(h.gateway, await headingByText(h.gateway, "Fire strategy"));
      await h.setParagraphText("Fire strategy", "Fire safety strategy");
      const before = await h.documentState();
      const result = await h.gateway.insertReference(req);
      expect(!result.ok && result.reason).toBe("staleTarget");
      expect(await h.documentState()).toEqual(before);
    });

    it("12. a failure at any step leaves no new bookmark and no partial reference", async () => {
      const h = await setup("spec-300");
      const before = await h.documentState();
      await h.failNextWrite();
      const result = await h.gateway.insertReference(await request(h.gateway, await headingByText(h.gateway, "Fire strategy")));
      if (result.ok || result.reason !== "hostError") throw new Error(`Expected hostError: ${JSON.stringify(result)}`);
      expect(result.partialWrite).toBe(false);
      expect(await h.documentState()).toEqual(before);
    });

    it("13. readReferences returns one record per REF/PAGEREF field with bookmark and switches", async () => {
      const h = await setup("spec-300");
      const before = await h.gateway.readReferences();
      expect(before.filter((r) => /^_Ref/.test(r.bookmark))).toHaveLength(2);
      const result = await insertOk(h, "Fire strategy");
      const after = await h.gateway.readReferences();
      const ours = after.filter((r) => r.bookmark === result.bookmark);
      expect(ours.map((r) => ({ fieldType: r.fieldType, switches: r.switches, location: r.location }))).toEqual([
        { fieldType: "ref", switches: fieldFor("number").switches, location: "main" },
        { fieldType: "ref", switches: fieldFor("text").switches, location: "main" },
      ]);
    });

    wordOnly("14. after F9 and moving the heading the references update, and one Undo restores the document", async () => {
      // Checked by hand in Word per docs/spike-runbook.md and the acceptance checklist (FR-013).
    });
  });
}
