import { chooseUsableBookmark } from "../../src/core/bookmarks/selection";
import type { FormatPart } from "../../src/core/formats/types";
import { headingFingerprint, headingKeyFor } from "../../src/core/headings/key";
import type { Heading, HeadingLevel, HeadingLocation, HeadingSnapshot } from "../../src/core/headings/types";
import { classifyLocation } from "../../src/core/location/rules";
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

/** Field switches per part (research R5). */
const FIELD_FOR_PART: Record<Exclude<FormatPart["kind"], "literal">, Pick<FakeField, "type" | "switches">> = {
  number: { type: "ref", switches: ["\\w", "\\h"] },
  text: { type: "ref", switches: ["\\h"] },
  page: { type: "pageRef", switches: ["\\h"] },
  aboveBelow: { type: "ref", switches: ["\\p", "\\h"] },
};

interface ListedHeading {
  readonly heading: Heading;
  readonly paragraph: FakeParagraph;
}

/**
 * In-memory IDocumentGateway. Writes are all-or-nothing; location and selection decisions go
 * through the core's classifyLocation/classifySelection, and the usable-bookmark choice through
 * chooseUsableBookmark, so the fake cannot disagree with Word on the rules.
 */
export class FakeGateway implements IDocumentGateway {
  private state: FakeDocumentState;
  private failNext = false;
  private snapshotClock = 0;
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
      takenAt: ++this.snapshotClock,
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
    if (point.inHeadingOrder !== null && point.inHeadingOrder === target.heading.order) {
      return { ok: false, reason: "declined", declined: { kind: "declined", reason: "selfReference" } };
    }
    if (point.selection === "extended" && !request.confirmExtendedSelection) {
      return { ok: false, reason: "needsConfirmation" };
    }

    // Everything below happens on a copy, committed only if every step succeeds.
    const draft = structuredClone(this.state);
    try {
      if (this.failNext) {
        this.failNext = false;
        throw new Error("Simulated host failure.");
      }
      const reused = target.heading.bookmark;
      let bookmark = reused;
      if (bookmark === null) {
        const taken = draft.bookmarks.some(
          (b) => b.name.toLowerCase() === request.newBookmarkName.toLowerCase(),
        );
        if (taken) throw new Error(`Bookmark ${request.newBookmarkName} already exists.`);
        draft.bookmarks.push({
          name: request.newBookmarkName,
          paragraphId: target.paragraph.id,
          extent: "text",
          createdByAddin: true,
        });
        bookmark = request.newBookmarkName;
      }

      const at = paragraphById(draft, draft.selection.paragraphId);
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
          ...structuredClone(FIELD_FOR_PART[part.kind]),
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
        replacedText: point.selection === "none" ? "" : selectedText(draft),
        charFormat: at.charFormat,
      });
      draft.selection = emptySelection(at.id);

      this.state = draft;
      return { ok: true, reference: { id }, bookmark, bookmarkCreated: reused === null };
    } catch (error) {
      return { ok: false, reason: "hostError", detail: (error as Error).message };
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

  /** The next insertReference fails with hostError after its checks, changing nothing. */
  failNextWrite(): void {
    this.failNext = true;
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
    const bookmark = this.state.bookmarks.find((b) => b.name.toLowerCase() === name.toLowerCase());
    return bookmark ? paragraphById(this.state, bookmark.paragraphId).text : null;
  }

  /** Displayed text of an insertion: literals plus field results. */
  insertionText(id: string): string {
    const insertion = this.state.insertions.find((i) => i.id === id);
    if (!insertion) throw new Error(`No insertion ${id}.`);
    return insertion.content
      .map((c) => (c.kind === "literal" ? c.text : this.fieldById(c.fieldId).result))
      .join("");
  }

  // ---- Internals --------------------------------------------------------------------------

  private listHeadings(): ListedHeading[] {
    const ordered = this.orderedParagraphs().filter(
      (p) => p.story !== "comment" && !p.trackedDeletion && headingLevelOf(p) !== null,
    );
    return ordered.map((paragraph, order) => {
      const bookmark = chooseUsableBookmark(
        this.state.bookmarks
          .filter((b) => b.paragraphId === paragraph.id)
          .map((b) => ({ name: b.name, spansHeadingText: b.extent === "text" })),
      );
      const base = {
        level: headingLevelOf(paragraph) as HeadingLevel,
        text: paragraph.text.trim(),
        number: paragraph.number,
        order,
        location: headingLocationOf(paragraph),
        bookmark,
      };
      return { heading: { ...base, key: headingKeyFor(base) }, paragraph };
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

    const locationFacts: LocationFacts = {
      story: paragraph.story,
      inTable: paragraph.inTable,
      styleBuiltIn: paragraph.style,
      outlineLevel: paragraph.outlineLevel,
      protected: this.state.protected,
      headingOrder: own?.heading.order ?? null,
      precedingHeadingOrder: preceding?.heading.order ?? null,
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
    };
    return classifyLocation(locationFacts, classifySelection(selectionFacts), policy);
  }

  private resolveTarget(request: InsertReferenceRequest): ListedHeading | null {
    const headings = this.listHeadings();
    const key = request.target;
    if (key.kind === "provisional") {
      const found = headings[key.order];
      return found && headingFingerprint(found.heading) === key.fingerprint ? found : null;
    }
    const bookmark = this.state.bookmarks.find((b) => b.name.toLowerCase() === key.name.toLowerCase());
    if (!bookmark) return null;
    return headings.find((h) => h.paragraph.id === bookmark.paragraphId) ?? null;
  }

  private fieldResult(
    kind: Exclude<FormatPart["kind"], "literal">,
    target: ListedHeading,
    at: FakeParagraph,
  ): string {
    switch (kind) {
      case "number":
        return target.heading.number ?? "";
      case "text":
        return target.heading.text;
      case "page":
        return String(1 + Math.floor(this.orderedParagraphs().indexOf(target.paragraph) / PARAGRAPHS_PER_PAGE));
      case "aboveBelow": {
        const ordered = this.orderedParagraphs();
        return ordered.indexOf(target.paragraph) < ordered.indexOf(at) ? "above" : "below";
      }
    }
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

function headingLevelOf(paragraph: FakeParagraph): number | null {
  const styled = /^Heading([1-9])$/.exec(paragraph.style);
  if (styled) return Number(styled[1]);
  const level = paragraph.outlineLevel;
  return level !== null && level >= 1 && level <= 9 ? level : null;
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
