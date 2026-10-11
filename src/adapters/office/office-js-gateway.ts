import { chooseUsableBookmark } from "../../core/bookmarks/selection";
import { fieldFor } from "../../core/formats/fields";
import { headingFingerprint, headingKeyFor } from "../../core/headings/key";
import { normaliseHeadingText } from "../../core/headings/normalise-text";
import type { Heading, HeadingLevel, HeadingLocation, HeadingSnapshot } from "../../core/headings/types";
import { classifyLocation, isHeadingParagraph } from "../../core/location/rules";
import { classifySelection } from "../../core/location/selection";
import type {
  Declined,
  InsertionPoint,
  LocationFacts,
  LocationPolicy,
  SelectionStory,
} from "../../core/location/types";
import type {
  IDocumentGateway,
  InsertedReference,
  InsertReferenceRequest,
  InsertReferenceResult,
  ReferenceRecord,
} from "../../core/ports/document-gateway";

/*
 * IDocumentGateway on Office.js (contracts/document-gateway.md). Thin by design: it reads raw
 * facts and leaves every decision to the core (classifyLocation, classifySelection,
 * chooseUsableBookmark, fieldFor, normaliseHeadingText). Spike outcomes it relies on are in
 * research.md R5–R9.
 */

const HEADER_TYPES = ["Primary", "FirstPage", "EvenPages"] as const;
const NOTE_REFERENCE_MARK = "\u0002";

/** A heading paragraph found by the light scan: enough to list, order and fingerprint it. */
interface HeadingCandidate {
  readonly paragraph: Word.Paragraph;
  readonly location: HeadingLocation;
  readonly level: HeadingLevel;
  readonly text: string;
  /** Exactly the heading text: no paragraph mark, no note reference mark. */
  readonly textRange: Word.Range;
  readonly order: number;
}

/** A heading paragraph as read from Word, with the proxies insertion needs. */
interface StoryHeading {
  readonly heading: Heading;
  readonly paragraph: Word.Paragraph;
  readonly textRange: Word.Range;
  /** Every bookmark on the paragraph (hidden ones included), usable or not. */
  readonly bookmarkNames: readonly string[];
}

interface StoryParagraphs {
  readonly location: HeadingLocation | "mainOrCell";
  readonly paragraphs: Word.ParagraphCollection;
}

/** What the heading test needs; text is loaded afterwards for heading paragraphs only. */
const STYLE_FIELDS = "items/styleBuiltIn,items/outlineLevel,items/tableNestingLevel";
const PARAGRAPH_FIELDS = `${STYLE_FIELDS},items/text`;

/**
 * Relations of a field's result to the selection that put the selection inside the field. A
 * field wholly inside the selection ("Inside…") is simply replaced with it, so it does not count.
 */
const INSIDE_FIELD = new Set<string>(["Equal", "Contains", "ContainsStart", "ContainsEnd", "OverlapsBefore", "OverlapsAfter"]);

/** A tracked deletion that covers the heading text removes the heading (FR-003, research R9). */
const COVERS = new Set<string>(["Equal", "Contains"]);

function supports(set: string, version: string): boolean {
  return Office.context.requirements.isSetSupported(set, version);
}

function headingLevel(paragraph: Word.Paragraph): HeadingLevel {
  const styled = /^Heading([1-9])$/.exec(paragraph.styleBuiltIn);
  return Number(styled ? styled[1] : paragraph.outlineLevel) as HeadingLevel;
}

function isAccessDenied(error: unknown): boolean {
  return error instanceof OfficeExtension.Error && error.code === "AccessDenied";
}

/** Paragraph texts of a body, to tell a header linked to the previous section from its own. */
function bodySignature(paragraphs: Word.ParagraphCollection): string {
  return JSON.stringify(paragraphs.items.map((p) => p.text));
}

/** Dev-pane hooks for the in-Word contract run (src/adapters/office/dev-registration.ts). */
export interface OfficeJsGatewayDebugHooks {
  /** Called after every check, just before the write batch; throw to simulate a host failure. */
  beforeWrite?(): void;
  /** Called after a successful insertion with the tracked range it occupies and the text it replaced. */
  onInserted?(id: string, span: Word.Range, replacedText: string): void;
}

interface SelectionReading {
  readonly point: InsertionPoint | Declined;
  readonly selection: Word.Range;
  /** The selection's first paragraph, for the self-reference check at insert time. */
  readonly paragraph: Word.Paragraph | null;
  /** The field the selection is inside, if any (FR-008b). */
  readonly field: Word.Field | null;
}

export class OfficeJsGateway implements IDocumentGateway {
  private nextInsertion = 1;

  constructor(private readonly debug: OfficeJsGatewayDebugHooks = {}) {}

  async readHeadings(): Promise<HeadingSnapshot> {
    return Word.run(async (context) => {
      const headings = await this.describe(context, await this.scanHeadings(context), { numbers: true });
      return {
        documentId: Office.context.document.url || null,
        headings: headings.map((h) => h.heading),
        takenAt: performance.now(),
      };
    });
  }

  async checkInsertionPoint(policy: LocationPolicy): Promise<InsertionPoint | Declined> {
    return Word.run(async (context) => (await this.readInsertionPoint(context, policy, { positions: true })).point);
  }

  async listBookmarkNames(): Promise<string[]> {
    return Word.run(async (context) => {
      const names = context.document.body.getRange("Whole").getBookmarks(true, true);
      await context.sync();
      return names.value;
    });
  }

  async insertReference(request: InsertReferenceRequest): Promise<InsertReferenceResult> {
    /** Set just before the write batch: Office.js batches are not transactional (FR-014). */
    let writing = false;
    try {
      return await Word.run(async (context) => {
        // Reads: as many syncs as needed. Nothing is written until every check has passed.
        const { point, selection, paragraph, field } = await this.readInsertionPoint(context, request.policy, {
          positions: false,
        });
        if (point.kind === "declined") return { ok: false, reason: "declined", declined: point };

        const target = await this.resolveTarget(context, request);
        if (!target) return { ok: false, reason: "staleTarget" };
        if (paragraph) {
          const self = target.paragraph.getRange("Whole").compareLocationWith(paragraph.getRange("Whole"));
          await context.sync();
          if (self.value === "Equal") {
            return { ok: false, reason: "declined", declined: { kind: "declined", reason: "selfReference" } };
          }
        }
        if ((point.selection === "extended" || point.selection === "field") && !request.confirmExtendedSelection) {
          return { ok: false, reason: "needsConfirmation", confirm: point.selection === "field" ? "field" : "selection" };
        }
        const replacing = point.selection === "field" ? field : null;

        let replacedText = "";
        if (this.debug.onInserted) {
          const replaced = replacing ? replacing.result.load("text") : selection.load("text");
          await context.sync();
          replacedText = replaced.text;
        }
        this.debug.beforeWrite?.();

        // Writes: bookmark first, then literals and fields before the selection (or the whole
        // field being replaced), then clear what they replace, all in ONE sync so the insertion
        // is one Undo step (research R5, FR-013).
        let anchor = selection;
        if (replacing) {
          // Selecting a field selects all of it, so "Before" lands outside it.
          replacing.select();
          anchor = context.document.getSelection();
        }
        const reused = target.heading.bookmark;
        const bookmark = reused ?? request.newBookmarkName;
        if (reused === null) target.textRange.insertBookmark(bookmark);
        const fields: Word.Field[] = [];
        let first: Word.Range | null = null;
        for (const part of request.parts) {
          if (part.kind === "literal") {
            const inserted = anchor.insertText(part.text, "Before");
            first ??= inserted;
            continue;
          }
          const spec = fieldFor(part.kind);
          const type = spec.type === "ref" ? Word.FieldType.ref : Word.FieldType.pageRef;
          const inserted = anchor.insertField("Before", type, `${bookmark} ${spec.switches.join(" ")}`, true);
          first ??= inserted.result;
          fields.push(inserted);
        }
        if (replacing && supports("WordApi", "1.5")) replacing.delete();
        else if (point.selection !== "none") anchor.insertText("", "Replace");
        fields.forEach((f) => f.updateResult());
        const span = this.debug.onInserted && first ? first.expandTo(anchor.getRange("Start")).track() : null;
        writing = true;
        await context.sync();

        const id = `ins-${this.nextInsertion++}`;
        if (span) this.debug.onInserted?.(id, span, replacedText);
        return { ok: true, reference: { id }, bookmark, bookmarkCreated: reused === null };
      });
    } catch (error) {
      if (isAccessDenied(error)) {
        return { ok: false, reason: "declined", declined: { kind: "declined", reason: "protected" } };
      }
      const detail = error instanceof Error ? error.message : String(error);
      return { ok: false, reason: "hostError", partialWrite: writing, detail };
    }
  }

  async returnFocus(after?: InsertedReference): Promise<void> {
    await Word.run(async (context) => {
      // After an insertion the selection sits just after the reference; collapse to its end.
      context.document.getSelection().select(after ? "End" : "Select");
      await context.sync();
    });
  }

  async readReferences(): Promise<ReferenceRecord[]> {
    return Word.run(async (context) => {
      const fields = context.document.body.fields.getByTypes([Word.FieldType.ref, Word.FieldType.pageRef]);
      fields.load("items/code,items/type");
      await context.sync();
      return fields.items.flatMap((field): ReferenceRecord[] => {
        // " REF _RC… \w \h \* CHARFORMAT " → bookmark and switches ("\*" joins its argument).
        const tokens = field.code.trim().split(/\s+/);
        const bookmark = tokens[1];
        if (!bookmark) return [];
        const switches: string[] = [];
        for (let i = 2; i < tokens.length; i++) {
          const token = tokens[i]!;
          switches.push(token === "\\*" && tokens[i + 1] ? `${token} ${tokens[++i]}` : token);
        }
        return [
          {
            bookmark,
            fieldType: field.type === Word.FieldType.pageRef ? "pageRef" : "ref",
            switches,
            location: "main",
          },
        ];
      });
    });
  }

  // ---- Reading ------------------------------------------------------------------------------

  /**
   * Every heading paragraph in story order (research R7): main text with table cells in place,
   * text boxes, footnotes, endnotes, headers, footers; tracked deletions left out (R9). Light:
   * styles for every paragraph and text for heading paragraphs only; `describe` adds numbers and
   * bookmarks for the headings that need them.
   */
  private async scanHeadings(context: Word.RequestContext): Promise<HeadingCandidate[]> {
    const body = context.document.body;
    const main = body.paragraphs;
    main.load(STYLE_FIELDS);
    const footnotes = body.footnotes;
    footnotes.load("items");
    const endnotes = body.endnotes;
    endnotes.load("items");
    const sections = context.document.sections;
    sections.load("items");
    const shapes = supports("WordApiDesktop", "1.2") ? body.shapes : null;
    shapes?.load("items/type");
    const tracked = supports("WordApi", "1.6") ? body.getTrackedChanges().load("items/type") : null;
    await context.sync();

    const textBoxes = (shapes?.items ?? []).filter((shape) => shape.type === "TextBox");
    const notes = [
      ...footnotes.items.map((n) => ({ location: "footnote" as const, paragraphs: n.body.paragraphs })),
      ...endnotes.items.map((n) => ({ location: "endnote" as const, paragraphs: n.body.paragraphs })),
    ];
    const headers: StoryParagraphs[] = [];
    const footers: StoryParagraphs[] = [];
    for (const section of sections.items) {
      for (const type of HEADER_TYPES) {
        headers.push({ location: "header", paragraphs: section.getHeader(type).paragraphs });
        footers.push({ location: "footer", paragraphs: section.getFooter(type).paragraphs });
      }
    }
    const others: StoryParagraphs[] = [
      ...textBoxes.map((shape) => ({ location: "textBox" as const, paragraphs: shape.body.paragraphs })),
      ...notes,
      ...headers,
      ...footers,
    ];
    // Header and footer text is needed to spot linked copies; they are short.
    others.forEach((story) =>
      story.paragraphs.load(story.location === "header" || story.location === "footer" ? PARAGRAPH_FIELDS : STYLE_FIELDS),
    );
    await context.sync();

    // A header or footer linked to the previous section reads the same as it: list it once.
    const seen = new Set<string>();
    const stories: StoryParagraphs[] = [{ location: "mainOrCell", paragraphs: main }];
    for (const story of others) {
      if (story.location === "header" || story.location === "footer") {
        const signature = `${story.location}:${bodySignature(story.paragraphs)}`;
        if (seen.has(signature)) continue;
        seen.add(signature);
      }
      stories.push(story);
    }

    const found = stories.flatMap((story) =>
      story.paragraphs.items
        .filter((p) => isHeadingParagraph(p.styleBuiltIn, p.outlineLevel))
        .map((paragraph) => {
          const inCell = story.location === "mainOrCell" && paragraph.tableNestingLevel > 0;
          const location: HeadingLocation = story.location === "mainOrCell" ? (inCell ? "tableCell" : "main") : story.location;
          return { paragraph, location };
        }),
    );
    found.forEach(({ paragraph }) => paragraph.load("text"));
    await context.sync();

    const candidates = found.map(({ paragraph, location }) => {
      const text = normaliseHeadingText(paragraph.text);
      const content = paragraph.getRange("Content");
      // In a note the first paragraph starts with the reference mark; the bookmark must not include it.
      const textRange =
        paragraph.text.trimStart().startsWith(NOTE_REFERENCE_MARK) && text !== ""
          ? content.search(text, { matchCase: true }).getFirst()
          : content;
      return { paragraph, location, level: headingLevel(paragraph), text, textRange };
    });

    const live = await this.withoutTrackedDeletions(context, candidates, tracked);
    return live.map((c, order) => ({ ...c, order }));
  }

  /**
   * Leave out headings whose text a tracked deletion covers. Only looked at when the main text
   * has a tracked deletion at all, so ordinary documents pay nothing. Position, not text, decides:
   * a deletion that also takes part of the next paragraph still removes the heading.
   */
  private async withoutTrackedDeletions<T extends { readonly textRange: Word.Range }>(
    context: Word.RequestContext,
    candidates: T[],
    tracked: Word.TrackedChangeCollection | null,
  ): Promise<T[]> {
    if (!tracked?.items.some((change) => change.type === "Deleted")) return candidates;
    const changes = candidates.map((c) => c.textRange.getTrackedChanges().load("items/type"));
    await context.sync();
    const relations = changes.map((list, i) =>
      list.items
        .filter((change) => change.type === "Deleted")
        .map((change) => change.getRange("Whole").compareLocationWith(candidates[i]!.textRange)),
    );
    await context.sync();
    return candidates.filter((_, i) => !relations[i]!.some((relation) => COVERS.has(relation.value)));
  }

  /** Numbers (optional) and bookmarks for the given candidates. */
  private async describe(
    context: Word.RequestContext,
    candidates: readonly HeadingCandidate[],
    options: { numbers: boolean },
  ): Promise<StoryHeading[]> {
    const extras = candidates.map((c) => ({
      list: options.numbers ? c.paragraph.listItemOrNullObject.load("listString") : null,
      bookmarks: c.paragraph.getRange("Whole").getBookmarks(true, false),
    }));
    await context.sync();
    const relations = candidates.map((c, i) =>
      extras[i]!.bookmarks.value.map((name) => ({
        name,
        relation: context.document.getBookmarkRangeOrNullObject(name).compareLocationWith(c.textRange),
      })),
    );
    await context.sync();

    return candidates.map((c, i) => {
      const { list, bookmarks } = extras[i]!;
      const bookmark = chooseUsableBookmark(
        relations[i]!.map(({ name, relation }) => ({ name, spansHeadingText: relation.value === "Equal" })),
      );
      const base = {
        level: c.level,
        text: c.text,
        number: !list || list.isNullObject || list.listString === "" ? null : list.listString,
        order: c.order,
        location: c.location,
        bookmark,
      };
      return {
        heading: { ...base, key: headingKeyFor(base) },
        paragraph: c.paragraph,
        textRange: c.textRange,
        bookmarkNames: bookmarks.value,
      };
    });
  }

  /**
   * Read Word's selection as raw facts and let the core decide (research R8). Reads the
   * selection's own paragraph only; with `positions`, it also counts the heading paragraphs
   * before the cursor in the main text for the preview and the heading filter (data-model.md:
   * approximate when tracked deletions precede the cursor).
   */
  private async readInsertionPoint(
    context: Word.RequestContext,
    policy: LocationPolicy,
    options: { positions: boolean },
  ): Promise<SelectionReading> {
    const selection = context.document.getSelection();
    selection.load("isEmpty");
    const body = selection.parentBody.load("type");
    const parentOfBody = body.parentBodyOrNullObject.load("type");
    const paragraphs = selection.paragraphs.load(STYLE_FIELDS);
    const tables = selection.tables.load("items");
    const pictures = selection.inlinePictures.load("items");
    const controls = selection.contentControls.load("items");
    const shapes = supports("WordApiDesktop", "1.2") ? selection.shapes.load("items") : null;
    await context.sync();

    const first = paragraphs.items[0] ?? null;
    const story = storyOf(body.type, parentOfBody.isNullObject ? null : parentOfBody.type);
    const fields = first && supports("WordApi", "1.4") ? first.fields.load("items") : null;
    const before =
      options.positions && first && story === "main"
        ? context.document.body.getRange("Start").expandTo(first.getRange("Whole")).paragraphs.load(STYLE_FIELDS)
        : null;
    await context.sync();

    const relations = (fields?.items ?? []).map((f) => f.result.compareLocationWith(selection));
    if (relations.length > 0) await context.sync();
    const inside = relations.findIndex((relation) => INSIDE_FIELD.has(relation.value));
    const field = inside >= 0 ? (fields?.items[inside] ?? null) : null;

    // The range ends with the selection's own paragraph, so a heading there is the last one counted.
    const own = first !== null && isHeadingParagraph(first.styleBuiltIn, first.outlineLevel);
    const count = before ? before.items.filter((p) => isHeadingParagraph(p.styleBuiltIn, p.outlineLevel)).length : 0;
    const preceding = count - (own ? 2 : 1);

    const facts: LocationFacts = {
      story,
      inTable: body.type === "TableCell" || (first?.tableNestingLevel ?? 0) > 0,
      styleBuiltIn: first?.styleBuiltIn ?? null,
      outlineLevel: first?.outlineLevel ?? null,
      // Protection is detected when a write is refused (AccessDenied → declined "protected").
      protected: false,
      headingOrder: before && own && count > 0 ? count - 1 : null,
      precedingHeadingOrder: before && preceding >= 0 ? preceding : null,
    };
    const extent = classifySelection({
      isEmpty: selection.isEmpty,
      paragraphCount: paragraphs.items.length,
      tableCount: tables.items.length,
      pictureCount: pictures.items.length,
      shapeCount: shapes?.items.length ?? 0,
      contentControlCount: controls.items.length,
      insideField: field !== null,
    });
    return { point: classifyLocation(facts, extent, policy), selection, paragraph: first, field };
  }

  /**
   * The listed heading, re-found in the live document: by order for a provisional key, by the
   * bookmark for a bookmark key; null if it has gone or no longer matches its fingerprint.
   * Bookmarks are read for the target only.
   */
  private async resolveTarget(context: Word.RequestContext, request: InsertReferenceRequest): Promise<StoryHeading | null> {
    const candidates = await this.scanHeadings(context);
    const matches = (c: HeadingCandidate) => headingFingerprint(c) === request.expectedFingerprint;
    const key = request.target;
    let found: HeadingCandidate | null;
    if (key.kind === "provisional") {
      const candidate = candidates[key.order];
      found = candidate && headingFingerprint(candidate) === key.fingerprint && matches(candidate) ? candidate : null;
    } else {
      // Only headings with the expected fingerprint can hold the bookmark; compare those few.
      const range = context.document.getBookmarkRangeOrNullObject(key.name);
      range.load("isNullObject");
      await context.sync();
      if (range.isNullObject) return null;
      const possible = candidates.filter(matches);
      const relations = possible.map((c) => c.paragraph.getRange("Whole").compareLocationWith(range));
      await context.sync();
      found = possible.find((_, i) => relations[i]!.value === "Contains" || relations[i]!.value === "Equal") ?? null;
    }
    if (!found) return null;
    const [target] = await this.describe(context, [found], { numbers: false });
    return target ?? null;
  }
}

/**
 * Word's body type for the selection mapped to the core's story (spike 1, research R8): a text
 * box reports "Shape", a comment "Unknown"; a table cell reports "TableCell" and its parent the story.
 */
function storyOf(type: string, parentType: string | null): SelectionStory {
  switch (type) {
    case "MainDoc":
      return "main";
    case "Footnote":
      return "footnote";
    case "Endnote":
      return "endnote";
    case "Header":
      return "header";
    case "Footer":
      return "footer";
    case "Shape":
      return "textBox";
    case "Unknown":
      return "comment";
    case "TableCell":
      return parentType === null ? "unknown" : storyOf(parentType, null);
    default:
      return "unknown";
  }
}
