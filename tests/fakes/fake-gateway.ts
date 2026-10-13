import { sameBookmarkName } from "../../src/core/bookmarks/naming";
import { chooseUsableBookmark } from "../../src/core/bookmarks/selection";
import { fieldFor, type FieldPartKind } from "../../src/core/formats/fields";
import { atProvisionalKey, headingFingerprint, makeHeading } from "../../src/core/headings/key";
import { normaliseHeadingText } from "../../src/core/headings/normalise-text";
import type { Heading, HeadingLocation, HeadingSnapshot } from "../../src/core/headings/types";
import { classifyLocation, confirmationFor, headingLevelOf } from "../../src/core/location/rules";
import { classifySelection } from "../../src/core/location/selection";
import type {
  Declined,
  InsertionPoint,
  LocationFacts,
  LocationPolicy,
  SelectionFacts,
} from "../../src/core/location/types";
import type {
  IDocumentGateway,
  InsertedReference,
  InsertReferenceRequest,
  InsertReferenceResult,
  ReferenceRecord,
} from "../../src/core/ports/document-gateway";
import {
  emptySelection,
  type FakeDocumentState,
  type FakeField,
  type FakeInlineContent,
  type FakeInsertion,
  type FakeParagraph,
  type FakeStory,
  type SelectOptions,
} from "./fake-documents";

/** Word's story order: main text (table cells in place), text boxes, notes, headers, footers. */
const STORY_RANK: Record<FakeStory, number> = {
  main: 0,
  textBox: 1,
  footnote: 2,
  endnote: 3,
  header: 4,
  footer: 5,
  comment: 6,
};

/** Paragraphs per page, so PAGEREF results are plausible positive integers. */
const PARAGRAPHS_PER_PAGE = 40;

interface ListedHeading {
  readonly heading: Heading;
  readonly paragraph: FakeParagraph;
}

/**
 * In-memory IDocumentGateway. Writes are all-or-nothing; location and selection decisions go
 * through the core's classifyLocation/classifySelection, and the usable-bookmark choice through
 * chooseUsableBookmark, so the fake cannot disagree with Word on the rules; the facts it
 * gathers are kept in step with Word by the contract suite.
 */
export class FakeGateway implements IDocumentGateway {
  private state: FakeDocumentState;
  private failNext: { duringWrite: boolean; landed: boolean } | null = null;
  private nextInsertion = 1;
  /** Set by returnFocus, for assertions. */
  focusReturned: { after: string | null } | null = null;

  constructor(state: FakeDocumentState) {
    this.state = structuredClone(state);
  }

  // ---- IDocumentGateway -------------------------------------------------------------------

  async readHeadings(): Promise<HeadingSnapshot> {
    return {
      documentId: this.state.documentId,
      headings: this.listHeadings().map((h) => h.heading),
    };
  }

  async checkInsertionPoint(policy: LocationPolicy): Promise<InsertionPoint | Declined> {
    return this.decideInsertionPoint(policy);
  }

  async listBookmarkNames(): Promise<string[]> {
    return this.state.bookmarks.map((b) => b.name);
  }

  async insertReference(request: InsertReferenceRequest): Promise<InsertReferenceResult> {
    const point = this.decideInsertionPoint(request.policy);
    if (point.kind === "declined") return { ok: false, reason: "declined", declined: point };

    const target = this.resolveTarget(request);
    if (!target) return { ok: false, reason: "staleTarget" };
    if (headingFingerprint(target.heading) !== request.expectedFingerprint) {
      return { ok: false, reason: "staleTarget" };
    }
    // The cursor in the heading, or a selection that runs into it: replacing it would delete the target.
    if (this.selectedParagraphIds().includes(target.paragraph.id)) {
      return { ok: false, reason: "declined", declined: { kind: "declined", reason: "selfReference" } };
    }
    const confirm = confirmationFor(point.selection);
    if (confirm !== null && request.confirmed !== confirm) return { ok: false, reason: "needsConfirmation", confirm };

    // Everything below happens on a copy, committed only if every step succeeds.
    const draft = structuredClone(this.state);
    try {
      const failure = this.failNext;
      this.failNext = null;
      if (failure && !failure.duringWrite) {
        return { ok: false, reason: "hostError", partialWrite: false, detail: "Simulated host failure." };
      }
      const reused = target.heading.bookmark;
      let bookmark = reused;
      if (bookmark === null) {
        const taken = draft.bookmarks.some((b) => sameBookmarkName(b.name, request.newBookmarkName));
        if (taken) throw new Error(`Bookmark ${request.newBookmarkName} already exists.`);
        draft.bookmarks.push({
          name: request.newBookmarkName,
          paragraphId: target.paragraph.id,
          extent: "text",
          createdByAddin: true,
        });
        bookmark = request.newBookmarkName;
      }
      if (failure) {
        // Word's write batch is not transactional: what went in before the failure stays, and
        // partialWrite says whether anything did, as OfficeJsGateway checks afterwards.
        const landed = failure.landed && reused === null;
        if (landed) this.state = draft;
        return { ok: false, reason: "hostError", partialWrite: landed, detail: "Simulated host failure." };
      }

      const at = paragraphById(draft, draft.selection.paragraphId);
      // A confirmed field selection replaces the whole field the cursor is in (FR-008b).
      let replaced = point.selection === "none" ? "" : selectedText(draft);
      if (point.selection === "field") {
        const old = draft.fields.filter((f) => f.paragraphId === at.id)[draft.selection.fieldIndex];
        if (!old) throw new Error("The selection is inside a field the paragraph does not have.");
        draft.fields = draft.fields.filter((f) => f !== old);
        replaced = old.result;
      }
      const content: FakeInlineContent[] = [];
      for (const part of request.parts) {
        if (part.kind === "literal") {
          content.push({ kind: "literal", text: part.text });
          continue;
        }
        const id = nextFieldId(draft);
        draft.fields.push({
          id,
          paragraphId: at.id,
          type: fieldFor(part.kind).type,
          switches: [...fieldFor(part.kind).switches],
          bookmark,
          result: this.fieldResult(part.kind, target, at),
          charFormat: at.charFormat,
          insertedByAddin: true,
        });
        content.push({ kind: "field", fieldId: id });
      }

      const id = `ins-${this.nextInsertion++}`;
      draft.insertions.push({
        id,
        paragraphId: at.id,
        content,
        replacedText: replaced,
        charFormat: at.charFormat,
      });
      draft.selection = emptySelection(at.id);

      this.state = draft;
      return { ok: true, reference: { id }, bookmark, bookmarkCreated: reused === null };
    } catch (error) {
      return { ok: false, reason: "hostError", partialWrite: false, detail: (error as Error).message };
    }
  }

  async returnFocus(after?: InsertedReference): Promise<void> {
    this.focusReturned = { after: after?.id ?? null };
  }

  async readReferences(): Promise<ReferenceRecord[]> {
    return this.state.fields.flatMap((field): ReferenceRecord[] => {
      if (field.type === "other" || field.bookmark === null) return [];
      const story = paragraphById(this.state, field.paragraphId).story;
      const location = story === "main" || story === "footnote" || story === "endnote" ? story : "other";
      return [{ bookmark: field.bookmark, fieldType: field.type, switches: [...field.switches], location }];
    });
  }

  // ---- Test controls and inspection --------------------------------------------------------

  /** Move Word's selection to the paragraph whose text is `paragraphText`. */
  select(paragraphText: string, options: SelectOptions = {}): void {
    this.state.selection = { ...emptySelection(this.paragraphByText(paragraphText).id), ...options };
  }

  setProtected(value: boolean): void {
    this.state.protected = value;
  }

  /**
   * The next insertReference fails with hostError after its checks, changing nothing. With
   * `duringWrite` it fails inside the write batch as Word can: by default after the bookmark has
   * gone in (`landed`), or before anything was applied (`landed: false`).
   */
  failNextWrite(options: { duringWrite?: boolean; landed?: boolean } = {}): void {
    this.failNext = { duringWrite: options.duringWrite ?? false, landed: options.landed ?? true };
  }

  /** Edit a paragraph's text (e.g. to make a listed heading stale). */
  setParagraphText(currentText: string, newText: string): void {
    this.paragraphByText(currentText).text = newText;
  }

  /** Deep copy of the whole document, for "document unchanged" assertions. */
  documentState(): FakeDocumentState {
    return structuredClone(this.state);
  }

  bookmarks(): FakeDocumentState["bookmarks"] {
    return structuredClone(this.state.bookmarks);
  }

  fields(): FakeField[] {
    return structuredClone(this.state.fields);
  }

  insertions(): FakeDocumentState["insertions"] {
    return structuredClone(this.state.insertions);
  }

  /** Text of the paragraph holding a bookmark, or null if the bookmark does not exist. */
  bookmarkTarget(name: string): string | null {
    const bookmark = this.state.bookmarks.find((b) => sameBookmarkName(b.name, name));
    return bookmark ? paragraphById(this.state, bookmark.paragraphId).text : null;
  }

  /** Displayed text of an insertion: literals plus field results. */
  insertionText(id: string): string {
    return this.insertionById(id)
      .content.map((c) => (c.kind === "literal" ? c.text : this.fieldById(c.fieldId).result))
      .join("");
  }

  /** Text of the paragraph an insertion went into, without the insertion (the fake keeps text and insertions apart). */
  insertionParagraph(id: string): string {
    return paragraphById(this.state, this.insertionById(id).paragraphId).text;
  }

  /** The selected text an insertion replaced ("" for a caret). */
  replacedText(id: string): string {
    return this.insertionById(id).replacedText;
  }

  // ---- Internals --------------------------------------------------------------------------

  private listHeadings(): ListedHeading[] {
    const ordered = this.orderedParagraphs().filter(
      (p) => p.story !== "comment" && !p.trackedDeletion && headingLevelOf(p.style, p.outlineLevel) !== null,
    );
    return ordered.map((paragraph, order) => {
      const bookmark = chooseUsableBookmark(
        this.state.bookmarks
          .filter((b) => b.paragraphId === paragraph.id)
          .map((b) => ({ name: b.name, spansHeadingText: b.extent === "text" })),
      );
      const heading = makeHeading({
        level: headingLevelOf(paragraph.style, paragraph.outlineLevel)!,
        text: normaliseHeadingText(paragraph.text),
        number: paragraph.number,
        order,
        location: headingLocationOf(paragraph),
        bookmark,
      });
      return { heading, paragraph };
    });
  }

  private orderedParagraphs(): FakeParagraph[] {
    return [...this.state.paragraphs].sort(
      (a, b) => STORY_RANK[a.story] - STORY_RANK[b.story] || a.id - b.id,
    );
  }

  private decideInsertionPoint(policy: LocationPolicy): InsertionPoint | Declined {
    const selection = this.state.selection;
    const paragraph = paragraphById(this.state, selection.paragraphId);
    const headings = this.listHeadings();
    const ordered = this.orderedParagraphs();
    const position = ordered.indexOf(paragraph);
    const own = headings.find((h) => h.paragraph.id === paragraph.id);
    const preceding = headings.filter((h) => ordered.indexOf(h.paragraph) < position).at(-1);
    // As in Word, heading orders are counted in the main text only (data-model.md).
    const inMain = paragraph.story === "main";

    const locationFacts: LocationFacts = {
      story: paragraph.story,
      inTable: paragraph.inTable,
      styleBuiltIn: paragraph.style,
      outlineLevel: paragraph.outlineLevel,
      protected: this.state.protected,
      text: normaliseHeadingText(paragraph.text),
      headingOrder: inMain ? (own?.heading.order ?? null) : null,
      precedingHeadingOrder: inMain ? (preceding?.heading.order ?? null) : null,
    };
    const selectionFacts: SelectionFacts = {
      isEmpty:
        selection.length === 0 &&
        selection.paragraphs <= 1 &&
        selection.tables + selection.pictures + selection.shapes + selection.contentControls === 0,
      paragraphCount: selection.paragraphs,
      tableCount: selection.tables,
      pictureCount: selection.pictures,
      shapeCount: selection.shapes,
      contentControlCount: selection.contentControls,
      insideField: selection.inField,
    };
    return classifyLocation(locationFacts, classifySelection(selectionFacts), policy);
  }

  /** The paragraphs the selection touches, in story order. */
  private selectedParagraphIds(): number[] {
    const ordered = this.orderedParagraphs();
    const start = ordered.findIndex((p) => p.id === this.state.selection.paragraphId);
    return ordered.slice(start, start + Math.max(1, this.state.selection.paragraphs)).map((p) => p.id);
  }

  private resolveTarget(request: InsertReferenceRequest): ListedHeading | null {
    const headings = this.listHeadings();
    const key = request.target;
    if (key.kind === "provisional") {
      return atProvisionalKey(headings.map((h) => h.heading), key) ? headings[key.order]! : null;
    }
    const bookmark = this.state.bookmarks.find((b) => sameBookmarkName(b.name, key.name));
    if (!bookmark) return null;
    return headings.find((h) => h.paragraph.id === bookmark.paragraphId) ?? null;
  }

  private fieldResult(kind: FieldPartKind, target: ListedHeading, at: FakeParagraph): string {
    // Positions by id: `at` may be a paragraph of a draft copy, not of the live state.
    const ordered = this.orderedParagraphs().map((p) => p.id);
    const targetPosition = ordered.indexOf(target.paragraph.id);
    switch (kind) {
      case "number":
        return target.heading.number ?? "";
      case "text":
        return target.heading.text;
      case "page":
        return String(1 + Math.floor(targetPosition / PARAGRAPHS_PER_PAGE));
      case "aboveBelow":
        return targetPosition < ordered.indexOf(at.id) ? "above" : "below";
    }
  }

  private insertionById(id: string): FakeInsertion {
    const insertion = this.state.insertions.find((i) => i.id === id);
    if (!insertion) throw new Error(`No insertion ${id}.`);
    return insertion;
  }

  private fieldById(id: number): FakeField {
    const field = this.state.fields.find((f) => f.id === id);
    if (!field) throw new Error(`No field ${id}.`);
    return field;
  }

  private paragraphByText(text: string): FakeParagraph {
    const found = this.state.paragraphs.find((p) => p.text === text);
    if (!found) throw new Error(`No paragraph with text "${text}".`);
    return found;
  }
}

function headingLocationOf(paragraph: FakeParagraph): HeadingLocation {
  if (paragraph.story === "main") return paragraph.inTable ? "tableCell" : "main";
  if (paragraph.story === "comment") throw new Error("Comments hold no listed headings.");
  return paragraph.story;
}

function paragraphById(state: FakeDocumentState, id: number): FakeParagraph {
  const found = state.paragraphs.find((p) => p.id === id);
  if (!found) throw new Error(`No paragraph ${id}.`);
  return found;
}

function nextFieldId(state: FakeDocumentState): number {
  return state.fields.reduce((max, f) => Math.max(max, f.id), 0) + 1;
}

function selectedText(state: FakeDocumentState): string {
  const { paragraphId, length } = state.selection;
  return paragraphById(state, paragraphId).text.slice(0, length);
}
