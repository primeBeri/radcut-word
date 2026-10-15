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
  /** Caret this many characters into the paragraph instead of at its start (with no selection). */
  caretOffset?: number;
  /** Paragraphs the selection touches. */
  paragraphs?: number;
  tables?: number;
  pictures?: number;
  shapes?: number;
  /** Select the paragraph's content control whole (as by clicking its title tab). */
  contentControls?: number;
  /** Put the cursor (or, with `length`, a selection) inside the paragraph's content control. */
  inContentControl?: boolean;
  /** Put the cursor inside a field of the paragraph: the first, or the one at `fieldIndex`. */
  inField?: boolean;
  /** 0-based, among the paragraph's fields. */
  fieldIndex?: number;
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
  /**
   * Make the next insertReference fail after its checks: before any write, or with
   * `duringWrite` inside the write batch, where Word may have applied part of it.
   */
  failNextWrite(options?: { duringWrite?: boolean }): Promise<void>;
  setParagraphText(currentText: string, newText: string): Promise<void>;
  bookmarks(): Promise<BookmarkInfo[]>;
  fields(): Promise<FieldInfo[]>;
  /** Displayed text of an inserted reference (literals and field results). */
  insertionText(reference: InsertedReference): Promise<string>;
  /**
   * Text of the paragraph the reference went into, without the reference. In Word it is read after
   * the insertion, so text the reference replaced is gone and other fields' results are included.
   */
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
const ABOVE_BELOW = formatById("aboveBelow")!.parts;

/**
 * A Word-only case checked by hand. It fails with the steps instead of passing silently, so the
 * dev pane never shows it as checked; record the outcome in docs/acceptance-checklist.md.
 */
function manual(steps: string): never {
  throw new Error(`Manual check: ${steps}.`);
}

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
    confirmed: null,
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
    if (!result.ok) {
      const detail = result.reason === "hostError" ? `: ${result.detail ?? "no detail"}` : "";
      throw new Error(`Insert of "${text}" failed: ${result.reason}${detail}`);
    }
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

    it("1b. a heading that opens a footnote is listed and referenced even when long or containing ^", async () => {
      for (const text of [`Long footnote heading ${"x".repeat(280)}`, "Footnote heading with ^p and ^ in it"]) {
        const h = await setup("spec-300");
        await h.setParagraphText("Heading in a footnote", text);
        const heading = await headingByText(h.gateway, text);
        expect(heading.location).toBe("footnote");
        await h.select(BODY);
        const result = await insertOk(h, text, { parts: TEXT });
        expect(await h.insertionText(result.reference)).toBe(text);
        expect((await h.bookmarks()).find((b) => b.name === result.bookmark)?.paragraphText).toBe(text);
      }
    });

    // One fixture per case: in Word the harness can only use the document that is open.
    it("2. look-alike headings are not returned; outline-level headings are", async () => {
      const plain = (await (await setup("plain-headings")).gateway.readHeadings()).headings.map((x) => x.text);
      expect(plain).not.toContain("Bold fake heading");
      expect(plain).toContain("Outline-level heading");
    });

    it("2a. tracked deletions are not returned; tracked insertions are", async () => {
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
        // Allowed from 2026-10-14 (FR-001a), as in Word's own cross-reference dialog.
        ["Header text.", "header"],
        ["Footer text.", "footer"],
        ["Text box body.", "textBox"],
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
        ["A comment.", "comment"],
        ["Fire strategy", "headingParagraph"],
        ["Heading in the header", "headingParagraph"],
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

    it("5d. inside a plain-text content control is declined plainTextControl, unchanged; a rich-text one takes the reference", async () => {
      // Rich text first: in Word the plain-text control is a manual check (the restore drops it).
      const rich = await setup("spec-300");
      await rich.select("Rich text control body.", { inContentControl: true, caretOffset: 4 });
      const result = await insertOk(rich, "Fire strategy");
      const added = (await rich.fields()).filter((f) => f.bookmark === result.bookmark);
      expect(added.map((f) => f.switches)).toEqual([fieldFor("number").switches, fieldFor("text").switches]);
      for (const selection of [{ inContentControl: true }, { inContentControl: true, length: 5 }]) {
        const h = await setup("spec-300");
        await h.select("Plain text control body.", selection);
        const before = await h.documentState();
        expect(await h.gateway.checkInsertionPoint(OFF)).toEqual({ kind: "declined", reason: "plainTextControl" });
        const target = await headingByText(h.gateway, "Scope");
        for (const confirmed of [null, "selection"] as const) {
          expect(await h.gateway.insertReference(await request(h.gateway, target, { confirmed }))).toEqual({
            ok: false,
            reason: "declined",
            declined: { kind: "declined", reason: "plainTextControl" },
          });
        }
        expect(await h.documentState()).toEqual(before);
      }
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

      it("allows a heading in a header, footer or text box with no order, but the heading's fingerprint", async () => {
        for (const text of ["Heading in the header", "Heading in the footer", "Heading in a text box"]) {
          const h = await setup("spec-300");
          await h.select(text);
          const point = await h.gateway.checkInsertionPoint(ON);
          if (point.kind !== "insertionPoint") throw new Error(`${text}: declined ${point.reason}`);
          expect(point.inHeadingOrder).toBeNull();
          expect(point.inHeadingFingerprint).toBe(headingFingerprint(await headingByText(h.gateway, text)));
        }
      });

      it("still declines comment and protected", async () => {
        const h = await setup("spec-300");
        await h.select("A comment.");
        expect(await h.gateway.checkInsertionPoint(ON)).toEqual({ kind: "declined", reason: "comment" });
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
        // Mid-text: at the very start of a paragraph Word takes no surrounding formatting, as with
        // its own cross-reference dialog (FR-012a, in-Word contract run).
        await h.select(text, { caretOffset: 4 });
        const result = await insertOk(h, "Heading with bold word");
        // Word lists fields in document order, so find the new ones by their (new) bookmark.
        const added = (await h.fields()).filter((f) => f.bookmark === result.bookmark);
        expect(added).toHaveLength(2);
        for (const field of added) expect(field.format).toEqual(format);
      }
    });

    wordOnly("7a (after update). formatting is kept after F9", async () => {
      manual("insert into bold and italic text, select all, press F9, and check each reference keeps that formatting");
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
      // Word lists fields in document order, so the new ones may sit anywhere among the old.
      const afterFields = await h.fields();
      for (const f of fields) expect(afterFields).toContainEqual(f);
    });

    it("7c. headings in every other story get a bookmark and a resolving reference", async () => {
      for (const text of [
        "Heading in a table cell",
        "Heading in a text box",
        "Heading in a footnote",
        "Heading in an endnote",
        "Heading in the header",
        "Heading in the footer",
      ]) {
        // Fresh document each time: in Word the previous reference changes BODY's text.
        const h = await setup("spec-300");
        await h.select(BODY);
        const result = await insertOk(h, text, { parts: TEXT });
        expect(await h.insertionText(result.reference)).toBe(text);
        expect((await h.bookmarks()).find((b) => b.name === result.bookmark)?.paragraphText).toBe(text);
      }
    });

    it("7d. a second reference to the same heading reuses the bookmark the first one created, in every story", async () => {
      for (const text of [
        "Fire strategy",
        "Heading in a table cell",
        "Heading in a text box",
        "Heading in a footnote",
        "Heading in an endnote",
      ]) {
        const h = await setup("spec-300");
        const before = (await h.bookmarks()).length;
        await h.select(BODY);
        const first = await insertOk(h, text, { parts: TEXT });
        expect(first.bookmarkCreated).toBe(true);
        // Listed again, as the palette would after the first insert. BODY's text has changed in
        // Word, so the second reference goes elsewhere.
        await h.select("Scope body.");
        const second = await insertOk(h, text, { parts: TEXT });
        expect({ text, created: second.bookmarkCreated, bookmark: second.bookmark }).toEqual({
          text,
          created: false,
          bookmark: first.bookmark,
        });
        expect(await h.bookmarks()).toHaveLength(before + 1);
      }
    });

    wordOnly("7c (jump). Ctrl+click on each reference jumps to its heading", async () => {
      manual("Ctrl+click each reference from case 7c and check it jumps to its heading");
    });

    it("8. inserted content is the literals plus one hyperlinked field per part, with the R5 switches", async () => {
      const h = await setup("spec-300");
      // Placed explicitly: in Word the cursor is otherwise wherever the previous case left it.
      await h.select(BODY);
      const result = await insertOk(h, "Fire strategy");
      const added = (await h.fields()).filter((f) => f.bookmark === result.bookmark);
      expect(added.map((f) => ({ type: f.type, bookmark: f.bookmark, switches: f.switches }))).toEqual([
        { type: "ref", bookmark: result.bookmark, switches: fieldFor("number").switches },
        { type: "ref", bookmark: result.bookmark, switches: fieldFor("text").switches },
      ]);
      expect(await h.insertionText(result.reference)).toBe("§ 4.3 Fire strategy");
    });

    it("9. each field's result equals the core's preview for every built-in format", async () => {
      for (const format of BUILT_IN_FORMATS) {
        const h = await setup("spec-300");
        await h.select(BODY);
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

    describe("9b. writing with the cursor in a footnote, an endnote or a table cell", () => {
      for (const place of ["Footnote text.", "Endnote text.", "Cell text in the main table."]) {
        it(`at "${place}": the R5 fields, showing what the preview said`, async () => {
          for (const id of ["sectionNumberText", "textAboveBelow"]) {
            const parts = formatById(id)!.parts;
            const h = await setup("spec-300");
            await h.select(place);
            const point = await h.gateway.checkInsertionPoint(OFF);
            if (point.kind !== "insertionPoint") throw new Error(`Declined: ${point.reason}`);
            // No usable bookmark yet, so only this reference's fields point at the new one.
            const target = await headingByText(h.gateway, "Fire strategy");
            const result = await insertOk(h, "Fire strategy", { parts });
            const added = (await h.fields()).filter((f) => f.bookmark === result.bookmark);
            const expected = parts.flatMap((p) => (p.kind === "literal" ? [] : [fieldFor(p.kind)]));
            expect(added.map((f) => ({ type: f.type, switches: f.switches }))).toEqual(expected);
            const shown = await h.insertionText(result.reference);
            const preview = previewReference(parts, target, point);
            // In a note Word shows the heading text for \\p, not above/below (in-Word contract run,
            // 2026-10-12); the preview warns that it cannot tell.
            if (preview.warnings.includes("positionUnknown")) expect(shown).toMatch(/^Fire strategy (above|below|Fire strategy)$/);
            else expect(shown).toBe(preview.text);
          }
        });
      }
    });

    describe("9c. writing with the cursor in a header, a footer or a text box", () => {
      for (const place of ["Header text.", "Footer text.", "Text box body."]) {
        it(`at "${place}": the R5 fields, resolving, with no heading orders`, async () => {
          for (const id of ["sectionNumberText", "textAboveBelow"]) {
            const parts = formatById(id)!.parts;
            const h = await setup("spec-300");
            await h.select(place);
            const point = await h.gateway.checkInsertionPoint(OFF);
            if (point.kind !== "insertionPoint") throw new Error(`Declined: ${point.reason}`);
            expect({ preceding: point.precedingHeadingOrder, own: point.inHeadingOrder }).toEqual({ preceding: null, own: null });
            const target = await headingByText(h.gateway, "Fire strategy");
            const result = await insertOk(h, "Fire strategy", { parts });
            const added = (await h.fields()).filter((f) => f.bookmark === result.bookmark);
            const expected = parts.flatMap((p) => (p.kind === "literal" ? [] : [fieldFor(p.kind)]));
            expect(added.map((f) => ({ type: f.type, switches: f.switches }))).toEqual(expected);
            const shown = await h.insertionText(result.reference);
            const preview = previewReference(parts, target, point);
            // Outside the main text the preview cannot tell above/below; what Word shows for \p
            // there is recorded by spike 4 (research R8).
            expect(preview.warnings.includes("positionUnknown") || !parts.some((p) => p.kind === "aboveBelow")).toBe(true);
            if (preview.warnings.includes("positionUnknown")) expect(shown).toMatch(/^Fire strategy (above|below|Fire strategy)$/);
            else expect(shown).toBe(preview.text);
          }
        });
      }
    });

    describe("9a. heading orders index the readHeadings snapshot in the main text and are null outside it", () => {
      it("in a table cell of the main text: the preceding heading's order, and above/below as Word shows it", async () => {
        const h = await setup("spec-300");
        const { headings } = await h.gateway.readHeadings();
        await h.select("Cell text in the main table.");
        const point = await h.gateway.checkInsertionPoint(OFF);
        if (point.kind !== "insertionPoint") throw new Error(`Declined: ${point.reason}`);
        expect(point.precedingHeadingOrder).toBe(headings.find((x) => x.text === "Heading with bold word")!.order);
        for (const text of ["Heading in a table cell", "Scope"]) {
          const target = headings.find((x) => x.text === text)!;
          const h2 = await setup("spec-300");
          await h2.select("Cell text in the main table.");
          const result = await insertOk(h2, text, { parts: ABOVE_BELOW });
          expect(await h2.insertionText(result.reference)).toBe(previewReference(ABOVE_BELOW, target, point).text);
        }
      });

      it("in a note: no orders, and the preview does not guess above/below", async () => {
        const h = await setup("spec-300");
        for (const text of ["Footnote text.", "Endnote text."]) {
          await h.select(text);
          const point = await h.gateway.checkInsertionPoint(OFF);
          if (point.kind !== "insertionPoint") throw new Error(`Declined: ${point.reason}`);
          expect([point.precedingHeadingOrder, point.inHeadingOrder]).toEqual([null, null]);
          const scope = await headingByText(h.gateway, "Scope");
          expect(previewReference(ABOVE_BELOW, scope, point).warnings).toContain("positionUnknown");
        }
      });

      it("in a heading in a note (headings allowed): no order, but the heading's fingerprint", async () => {
        const h = await setup("spec-300");
        await h.select("Heading in a footnote");
        const point = await h.gateway.checkInsertionPoint(ON);
        if (point.kind !== "insertionPoint") throw new Error(`Declined: ${point.reason}`);
        expect(point.inHeadingOrder).toBeNull();
        expect(point.inHeadingFingerprint).toBe(headingFingerprint(await headingByText(h.gateway, "Heading in a footnote")));
      });

      it("after a tracked-deleted heading: the deleted heading is not counted", async () => {
        const h = await setup("tracked");
        const { headings } = await h.gateway.readHeadings();
        await h.select("Body under the inserted heading.");
        const point = await h.gateway.checkInsertionPoint(OFF);
        if (point.kind !== "insertionPoint") throw new Error(`Declined: ${point.reason}`);
        expect(point.precedingHeadingOrder).toBe(headings.find((x) => x.text === "Inserted heading")!.order);
      });
    });

    it("10. an inline selection is replaced without confirmation", async () => {
      const h = await setup("spec-300");
      await h.select(BODY, { length: 4 });
      const result = await insertOk(h, "Scope");
      expect(await h.replacedText(result.reference)).toBe("The ");
    });

    it("10a. an extended selection needs confirmation; once confirmed it is replaced", async () => {
      // A content control selected whole is case 10f.
      for (const extended of [{ paragraphs: 2, length: 5 }, { pictures: 1 }, { shapes: 1 }]) {
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
        const confirmed = await h.gateway.insertReference(await request(h.gateway, target, { confirmed: "selection" }));
        if (!confirmed.ok) throw new Error(`Confirmed insert failed for ${JSON.stringify(extended)}: ${JSON.stringify(confirmed)}`);
        // Replacing the selection never takes the target's bookmark with it.
        expect((await h.bookmarks()).find((b) => b.name === confirmed.bookmark)?.paragraphText).toBe("Scope");
      }
    });

    it("10f. a plain-text content control selected whole needs confirmation; once confirmed it is replaced", async () => {
      const h = await setup("spec-300");
      await h.select("Plain text control body.", { contentControls: 1 });
      const before = await h.documentState();
      const target = await headingByText(h.gateway, "Scope");
      expect(await h.gateway.insertReference(await request(h.gateway, target))).toEqual({
        ok: false,
        reason: "needsConfirmation",
        confirm: "selection",
      });
      expect(await h.documentState()).toEqual(before);
      const confirmed = await insertOk(h, "Scope", { confirmed: "selection" });
      expect(await h.replacedText(confirmed.reference)).toBe("Plain text control body.");
      expect(await h.insertionText(confirmed.reference)).toBe("§ 1.1 Scope");
    });

    it("10d. a selection that covers the target heading is declined selfReference, confirmed or not, unchanged", async () => {
      const h = await setup("spec-300");
      // BODY is followed by the heading "Heading with bold word"; the selection runs into it.
      await h.select(BODY, { paragraphs: 2, length: 5 });
      const before = await h.documentState();
      const target = await headingByText(h.gateway, "Heading with bold word");
      for (const confirmed of [null, "selection"] as const) {
        expect(await h.gateway.insertReference(await request(h.gateway, target, { confirmed }))).toEqual({
          ok: false,
          reason: "declined",
          declined: { kind: "declined", reason: "selfReference" },
        });
      }
      expect(await h.documentState()).toEqual(before);
    });

    it("10b. a selection containing a table is declined tableSelected, confirmed or not, unchanged", async () => {
      const h = await setup("spec-300");
      await h.select("First of two paragraphs.", { tables: 1, paragraphs: 2 });
      const before = await h.documentState();
      expect(await h.gateway.checkInsertionPoint(OFF)).toEqual({ kind: "declined", reason: "tableSelected" });
      const target = await headingByText(h.gateway, "Scope");
      for (const confirmed of [null, "selection"] as const) {
        expect(await h.gateway.insertReference(await request(h.gateway, target, { confirmed }))).toEqual({
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
        await request(h.gateway, target, { parts: TEXT, confirmed: "field" }),
      );
      if (!confirmed.ok) throw new Error(`Insert failed: ${JSON.stringify(confirmed)}`);
      // One field out (the old one), one in (the new text reference).
      expect(await h.fields()).toHaveLength(fieldsBefore);
      // In Word the paragraph text also shows the remaining field's result, so match its start.
      expect(await h.insertionParagraph(confirmed.reference)).toMatch(/^References made by Word: see section/);
    });

    it("10e. confirming the selection warning does not confirm replacing a field; the field the cursor is in is replaced", async () => {
      const h = await setup("spec-300");
      const paragraph = "References made by Word: see section and heading.";
      // The second of the paragraph's two fields: the plain heading-text reference.
      await h.select(paragraph, { inField: true, fieldIndex: 1 });
      const before = await h.documentState();
      // Word names its own cross-reference bookmark (_Ref + a number of its choosing), so take it
      // from Scope. In Word, case 10c has already replaced the paragraph's first field in the open
      // document, so compare with what is there now rather than with the fresh fixture.
      const wordBookmark = (await headingByText(h.gateway, "Scope")).bookmark;
      const oldBefore = (await h.fields()).filter((f) => f.bookmark === wordBookmark).map((f) => f.switches);
      const target = await headingByText(h.gateway, "Fire strategy");
      expect(await h.gateway.insertReference(await request(h.gateway, target, { parts: TEXT, confirmed: "selection" }))).toEqual({
        ok: false,
        reason: "needsConfirmation",
        confirm: "field",
      });
      expect(await h.documentState()).toEqual(before);
      await insertOk(h, "Fire strategy", { parts: TEXT, confirmed: "field" });
      // Only the heading-text field the cursor was in has gone; the section-number one stays.
      const oldAfter = (await h.fields()).filter((f) => f.bookmark === wordBookmark).map((f) => f.switches);
      expect(oldBefore).toContainEqual(["\\h"]);
      expect(oldAfter).toEqual(oldBefore.filter((s) => JSON.stringify(s) !== JSON.stringify(["\\h"])));
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

    it("12. a failure before the write leaves no new bookmark and no partial reference", async () => {
      const h = await setup("spec-300");
      const before = await h.documentState();
      await h.failNextWrite();
      const result = await h.gateway.insertReference(await request(h.gateway, await headingByText(h.gateway, "Fire strategy")));
      if (result.ok || result.reason !== "hostError") throw new Error(`Expected hostError: ${JSON.stringify(result)}`);
      expect(result.partialWrite).toBe(false);
      expect(await h.documentState()).toEqual(before);
    });

    it("12a. a failure inside the write batch reports partialWrite exactly when the document changed", async () => {
      const h = await setup("spec-300");
      const before = JSON.stringify(await h.documentState());
      await h.failNextWrite({ duringWrite: true });
      const result = await h.gateway.insertReference(await request(h.gateway, await headingByText(h.gateway, "Fire strategy")));
      if (result.ok || result.reason !== "hostError") throw new Error(`Expected hostError: ${JSON.stringify(result)}`);
      expect(result.partialWrite).toBe(JSON.stringify(await h.documentState()) !== before);
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

    it("13a. readReferences finds references in footnotes and endnotes with their location", async () => {
      for (const [text, location] of [
        ["Footnote text.", "footnote"],
        ["Endnote text.", "endnote"],
      ] as const) {
        const h = await setup("spec-300");
        await h.select(text);
        const result = await insertOk(h, "Fire strategy", { parts: TEXT });
        const ours = (await h.gateway.readReferences()).filter((r) => r.bookmark === result.bookmark);
        expect(ours.map((r) => ({ fieldType: r.fieldType, location: r.location }))).toEqual([{ fieldType: "ref", location }]);
      }
    });

    wordOnly("14. after F9 and moving the heading the references update, and one Undo restores the document", async () => {
      manual("follow docs/spike-runbook.md and the acceptance checklist (FR-013): F9, move the heading, F9, one Undo");
    });
  });
}
