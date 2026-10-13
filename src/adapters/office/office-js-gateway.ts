import { chooseUsableBookmark } from "../../core/bookmarks/selection";
import { fieldFor } from "../../core/formats/fields";
import type { FormatPart } from "../../core/formats/types";
import { atProvisionalKey, headingFingerprint, makeHeading } from "../../core/headings/key";
import { normaliseHeadingText, startsWithNoteMark } from "../../core/headings/normalise-text";
import { isRemovedByTrackedDeletions, withoutLinkedCopies } from "../../core/headings/scan";
import { headingPositions, type HeadingPositions } from "../../core/location/positions";
import { parseFieldCode } from "../../core/references/field-code";
import type { Heading, HeadingLevel, HeadingLocation, HeadingSnapshot } from "../../core/headings/types";
import { classifyLocation, confirmationFor, headingLevelOf, isHeadingParagraph } from "../../core/location/rules";
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
}

/** What the heading test needs; text is loaded afterwards for heading paragraphs only. */
const STYLE_FIELDS = "items/styleBuiltIn,items/outlineLevel,items/tableNestingLevel";
const PARAGRAPH_FIELDS = `${STYLE_FIELDS},items/text`;

/**
 * Relations of a field's result to the selection that put the selection inside the field. A
 * field wholly inside the selection ("Inside…") is simply replaced with it, so it does not count.
 */
const INSIDE_FIELD = new Set<string>(["Equal", "Contains", "ContainsStart", "ContainsEnd", "OverlapsBefore", "OverlapsAfter"]);

/**
 * Protection that stops a reference going in. "AllowOnlyRevisions" still allows edits (tracked),
 * so it is not here. Editable regions in a read-only document are not detected: there the palette
 * declines although Word would accept the edit (a known behaviour, to be listed in
 * docs/known-behaviours.md).
 */
const BLOCKING_PROTECTION = new Set<string>(["AllowOnlyComments", "AllowOnlyFormFields", "AllowOnlyReading"]);

/**
 * Relations of A to B where A covers all of B. Word reports "ContainsStart"/"ContainsEnd", not
 * "Contains", when the two share an edge, which a heading bookmark always does (it starts where
 * the paragraph starts), so all four must count.
 */
const COVERS = new Set<string>(["Equal", "Contains", "ContainsStart", "ContainsEnd"]);

/** Relations of A to B where the two share no character. */
const DISJOINT = new Set<string>(["Unrelated", "Before", "After", "AdjacentBefore", "AdjacentAfter"]);

function supports(set: string, version: string): boolean {
  return Office.context.requirements.isSetSupported(set, version);
}

function isAccessDenied(error: unknown): boolean {
  return error instanceof OfficeExtension.Error && error.code === "AccessDenied";
}

/**
 * Word's search takes at most 255 characters and treats `^` as its escape character, so only the
 * start of `text` is searched for. A null object if not found (the caller syncs once for all
 * searches). Searching for the end as well would not work: in a repetitive text ("xxx…") the
 * first match of the end lies too early.
 */
const SEARCH_PREFIX = 120;

function findStart(range: Word.Range, text: string): Word.Range {
  const prefix = text.slice(0, SEARCH_PREFIX).replace(/\^/g, "^^");
  return range.search(prefix, { matchCase: true }).getFirstOrNullObject().load("isNullObject");
}

function hasTrackedDeletion(tracked: Word.TrackedChangeCollection | null): boolean {
  return tracked?.items.some((change) => change.type === "Deleted") ?? false;
}

/** A heading paragraph to check against tracked deletions. */
interface DeletionCheck {
  readonly paragraph: Word.Paragraph;
  /** Exactly the heading text. */
  readonly textRange: Word.Range;
  /** As listed (`normaliseHeadingText`). */
  readonly text: string;
}

/** What a failed write batch is checked against: the paragraph the reference went into. */
interface WriteEvidence {
  /** Tracked, so a new Word.run can read it. */
  readonly host: Word.Paragraph;
  /** Its text before the batch. */
  readonly text: string;
  /** The bookmark the batch was to create, if any (creating one changes no text). */
  readonly createdBookmark: string | null;
}

/**
 * Whether a failed write batch left anything in the document (FR-014): the paragraph's text
 * changed or the new bookmark exists. If that cannot be read, assume it did: the message must
 * never claim the document is unchanged when it may not be.
 */
async function wroteAnything(evidence: WriteEvidence): Promise<boolean> {
  try {
    return await Word.run(evidence.host, async (context) => {
      evidence.host.load("text");
      const name = evidence.createdBookmark;
      const bookmark = name ? context.document.getBookmarkRangeOrNullObject(name).load("isNullObject") : null;
      await context.sync();
      const changed = evidence.host.text !== evidence.text || (bookmark !== null && !bookmark.isNullObject);
      evidence.host.untrack();
      await context.sync();
      return changed;
    });
  } catch {
    return true;
  }
}

/** Dev-pane hooks for the in-Word contract run (src/adapters/office/dev-registration.ts). */
export interface OfficeJsGatewayDebugHooks {
  /** Called after every check, just before the write batch; throw to simulate a host failure. */
  beforeWrite?(): void;
  /** Called with the writes queued, before their sync; queue a failing call to make the batch fail part-way. */
  duringWrite?(anchor: Word.Range): void;
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
  /** Inline pictures and shapes in the selection. */
  readonly objects: number;
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
      };
    });
  }

  async checkInsertionPoint(policy: LocationPolicy): Promise<InsertionPoint | Declined> {
    return Word.run(async (context) => (await this.readInsertionPoint(context, policy, { positions: true })).point);
  }

  async listBookmarkNames(): Promise<string[]> {
    return Word.run(async (context) => {
      // A range lists only its own story's bookmarks, but names are unique document-wide.
      const lists = (await storyBodies(context)).map(({ body }) => body.getRange("Whole").getBookmarks(true, true));
      await context.sync();
      const seen = new Map<string, string>();
      for (const name of lists.flatMap((list) => list.value)) seen.set(name.toLowerCase(), name);
      return [...seen.values()];
    });
  }

  async insertReference(request: InsertReferenceRequest): Promise<InsertReferenceResult> {
    /**
     * Set just before the write batch, which is not transactional (FR-014): what to look at
     * afterwards to tell whether any of it went in.
     */
    let written: WriteEvidence | null = null;
    try {
      return await Word.run(async (context) => {
        // Reads: as many syncs as needed. Nothing is written until every check has passed.
        const { point, selection, paragraph, field, objects } = await this.readInsertionPoint(context, request.policy, {
          positions: false,
        });
        if (point.kind === "declined") return { ok: false, reason: "declined", declined: point };

        const target = await this.resolveTarget(context, request);
        if (!target) return { ok: false, reason: "staleTarget" };
        // The cursor in the heading, or a selection that runs into it: replacing that selection
        // would delete the heading and the bookmark the reference points at.
        const own = paragraph ? target.paragraph.getRange("Whole").compareLocationWith(paragraph.getRange("Whole")) : null;
        const overlap = target.paragraph.getRange("Whole").compareLocationWith(selection);
        // Every write changes this paragraph's text (or creates the bookmark), so it is what a
        // failed write batch is checked against; tracked so a later Word.run can read it again.
        const host = selection.paragraphs.getFirst().load("text").track();
        await context.sync();
        const stop = (result: InsertReferenceResult) => {
          host.untrack();
          return result;
        };
        if (own?.value === "Equal" || (point.selection !== "none" && !DISJOINT.has(overlap.value))) {
          return stop({ ok: false, reason: "declined", declined: { kind: "declined", reason: "selfReference" } });
        }
        const confirm = confirmationFor(point.selection);
        if (confirm !== null && request.confirmed !== confirm) return stop({ ok: false, reason: "needsConfirmation", confirm });
        const replacing = point.selection === "field" ? field : null;

        let replacedText = "";
        if (this.debug.onInserted) {
          const replaced = replacing ? replacing.result.load("text") : selection.load("text");
          await context.sync();
          replacedText = replaced.text;
        }
        this.debug.beforeWrite?.();

        // Writes, all in ONE sync so the insertion is one Undo step (research R5, FR-013): a
        // selected picture or shape is cleared first (below), then the bookmark, then literals and
        // fields before the selection (or the whole field being replaced), then what they replace.
        let anchor = selection;
        if (replacing) {
          // Selecting a field selects all of it, so "Before" lands outside it.
          replacing.select();
          anchor = context.document.getSelection();
        }
        // Word refuses insertField next to a selected picture or shape (in-Word contract run), so such a
        // selection is cleared first and the reference goes where it was.
        const clearFirst = replacing === null && point.selection !== "none" && objects > 0;
        if (clearFirst) anchor.delete();
        const reused = target.heading.bookmark;
        const bookmark = reused ?? request.newBookmarkName;
        if (reused === null) target.textRange.insertBookmark(bookmark);
        const { fields, first } = queueParts(anchor, request.parts, bookmark);
        if (replacing) replacing.delete();
        else if (point.selection !== "none" && !clearFirst) anchor.insertText("", "Replace");
        fields.forEach((f) => f.updateResult());
        // A field's result is read only after updateResult is queued: a range taken before the
        // update comes back empty (in-Word contract run).
        const start = first instanceof Word.Field ? first.result : first;
        const span = this.debug.onInserted && start ? start.expandTo(anchor.getRange("Start")).track() : null;
        this.debug.duringWrite?.(anchor);
        // Queued last: a batch that fails part-way stops before it, so the check below can still
        // read the paragraph.
        host.untrack();
        written = { host, text: host.text, createdBookmark: reused === null ? bookmark : null };
        await context.sync();

        const id = `ins-${this.nextInsertion++}`;
        if (span) this.debug.onInserted?.(id, span, replacedText);
        return { ok: true, reference: { id }, bookmark, bookmarkCreated: reused === null };
      });
    } catch (error) {
      const partialWrite = written !== null && (await wroteAnything(written));
      if (isAccessDenied(error) && !partialWrite) {
        return { ok: false, reason: "declined", declined: { kind: "declined", reason: "protected" } };
      }
      // Not an error from Word: a bug in the add-in. Logged as such, with its stack, locally.
      if (!(error instanceof OfficeExtension.Error)) console.error("[radcut:insert-bug]", error);
      return { ok: false, reason: "hostError", partialWrite, detail: hostErrorDetail(error) };
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
      const stories = (await storyBodies(context)).map((story) => ({
        location: story.location,
        fields: story.body.fields.getByTypes([Word.FieldType.ref, Word.FieldType.pageRef]).load("items/code,items/type"),
        // Only header and footer text is needed, to spot linked copies.
        text: isHeaderOrFooter(story.location) ? story.body.load("text") : null,
      }));
      await context.sync();
      const distinct = withoutLinkedCopies(stories, (s) => linkedCopySignature(s.location, () => [s.text?.text ?? ""]));
      return distinct.flatMap(({ location, fields }) =>
        fields.items.flatMap((field): ReferenceRecord[] => {
          const { bookmark, switches } = parseFieldCode(field.code);
          if (!bookmark) return [];
          const fieldType = field.type === Word.FieldType.pageRef ? "pageRef" : "ref";
          const where = location === "main" || location === "footnote" || location === "endnote" ? location : "other";
          return [{ bookmark, fieldType, switches, location: where }];
        }),
      );
    });
  }

  // ---- Reading ------------------------------------------------------------------------------

  /**
   * Every heading paragraph in story order (research R7): main text with table cells in place,
   * text boxes, footnotes, endnotes, headers, footers; tracked deletions left out (R9) when the
   * main text has one. Light: styles for every paragraph and text for heading paragraphs only;
   * `describe` adds numbers and bookmarks for the headings that need them.
   */
  private async scanHeadings(context: Word.RequestContext): Promise<HeadingCandidate[]> {
    const tracked = supports("WordApi", "1.6") ? context.document.body.getTrackedChanges().load("items/type") : null;
    const all = (await storyBodies(context)).map(({ location, body }) => ({
      location,
      // Header and footer text is needed to spot linked copies; they are short.
      paragraphs: body.paragraphs.load(isHeaderOrFooter(location) ? PARAGRAPH_FIELDS : STYLE_FIELDS),
    }));
    await context.sync();
    const stories = withoutLinkedCopies(all, (story) =>
      linkedCopySignature(story.location, () => story.paragraphs.items.map((p) => p.text)),
    );

    const found = stories.flatMap(({ location, paragraphs }) =>
      paragraphs.items
        .filter((p) => isHeadingParagraph(p.styleBuiltIn, p.outlineLevel))
        .map((paragraph) => ({ paragraph, location: headingLocationIn(location, paragraph) })),
    );
    found.forEach(({ paragraph }) => paragraph.load("text"));
    await context.sync();

    const textRanges = await headingTextRanges(context, found.map(({ paragraph }) => paragraph));
    const candidates = found.map(({ paragraph, location }, i) => ({
      paragraph,
      location,
      // The scan kept heading paragraphs only, so the level is never null here.
      level: headingLevelOf(paragraph.styleBuiltIn, paragraph.outlineLevel)!,
      text: normaliseHeadingText(paragraph.text),
      textRange: textRanges[i]!,
    }));

    const removed = hasTrackedDeletion(tracked) ? await this.removedByDeletions(context, candidates) : [];
    return candidates.filter((_, i) => !removed[i]).map((c, order) => ({ ...c, order }));
  }

  /**
   * For each heading, whether tracked deletions remove it (FR-003, research R9); the rule is the
   * core's `isRemovedByTrackedDeletions`. Callers ask only when the main text has a tracked
   * deletion at all, so ordinary documents pay nothing; a deletion only in another story is not
   * looked for.
   */
  private async removedByDeletions(context: Word.RequestContext, headings: readonly DeletionCheck[]): Promise<boolean[]> {
    // The paragraph's changes, not the text range's: a deletion that also takes the paragraph
    // mark or the next paragraph may not be listed for the text range alone.
    const changes = headings.map((h) => h.paragraph.getTrackedChanges().load("items/type,items/text"));
    await context.sync();
    const deletions = changes.map((list) => list.items.filter((change) => change.type === "Deleted"));
    const relations = deletions.map((list, i) =>
      list.map((change) => change.getRange("Whole").compareLocationWith(headings[i]!.textRange)),
    );
    await context.sync();
    return headings.map((h, i) =>
      isRemovedByTrackedDeletions(
        h.text,
        deletions[i]!.map((d, j) => ({ covers: COVERS.has(relations[i]![j]!.value), text: d.text })),
      ),
    );
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
      const { list } = extras[i]!;
      const bookmark = chooseUsableBookmark(
        relations[i]!.map(({ name, relation }) => ({ name, spansHeadingText: relation.value === "Equal" })),
      );
      return {
        heading: makeHeading({
          level: c.level,
          text: c.text,
          number: !list || list.isNullObject || list.listString === "" ? null : list.listString,
          order: c.order,
          location: c.location,
          bookmark,
        }),
        paragraph: c.paragraph,
        textRange: c.textRange,
      };
    });
  }

  /**
   * Read Word's selection as raw facts and let the core decide (research R8). Style, fields and
   * text come from the selection's first paragraph; with `positions`, it also counts the heading paragraphs
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
    const doc = supports("WordApiDesktop", "1.4") ? context.document.load("protectionType") : null;
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
    first?.load("text");
    const fields = first ? first.fields.load("items") : null;
    // Heading orders are counted in the main text only (data-model.md): from its start through
    // the cursor's own paragraph.
    const before =
      options.positions && first && story === "main"
        ? context.document.body.getRange("Start").expandTo(first.getRange("Whole")).paragraphs.load(STYLE_FIELDS)
        : null;
    const tracked = before && supports("WordApi", "1.6") ? context.document.body.getTrackedChanges().load("items/type") : null;
    await context.sync();

    const relations = (fields?.items ?? []).map((f) => f.result.compareLocationWith(selection));
    if (relations.length > 0) await context.sync();
    const inside = relations.findIndex((relation) => INSIDE_FIELD.has(relation.value));
    const field = inside >= 0 ? (fields?.items[inside] ?? null) : null;

    const positions = before
      ? await this.positionsIn(context, before, hasTrackedDeletion(tracked))
      : { headingOrder: null, precedingHeadingOrder: null };
    const facts: LocationFacts = {
      story,
      inTable: body.type === "TableCell" || (first?.tableNestingLevel ?? 0) > 0,
      styleBuiltIn: first?.styleBuiltIn ?? null,
      outlineLevel: first?.outlineLevel ?? null,
      // Read up front where Word reports it; otherwise only a refused write (AccessDenied) shows it.
      protected: doc !== null && BLOCKING_PROTECTION.has(doc.protectionType),
      text: first ? normaliseHeadingText(first.text) : "",
      ...positions,
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
    const objects = pictures.items.length + (shapes?.items.length ?? 0);
    return { point: classifyLocation(facts, extent, policy), selection, paragraph: first, field, objects };
  }

  /**
   * Heading orders around the cursor from the main text's paragraphs up to and including the
   * cursor's (`headingPositions`). Tracked-deleted headings are looked for only when the main text
   * has a tracked deletion, as `scanHeadings` does, so the orders match the snapshot.
   */
  private async positionsIn(
    context: Word.RequestContext,
    paragraphs: Word.ParagraphCollection,
    trackedDeletions: boolean,
  ): Promise<HeadingPositions> {
    const isHeading = paragraphs.items.map((p) => isHeadingParagraph(p.styleBuiltIn, p.outlineLevel));
    const headings = paragraphs.items.filter((_, i) => isHeading[i]);
    let removed: boolean[] = [];
    if (trackedDeletions) {
      headings.forEach((p) => p.load("text"));
      await context.sync();
      removed = await this.removedByDeletions(
        context,
        headings.map((p) => ({ paragraph: p, textRange: p.getRange("Content"), text: normaliseHeadingText(p.text) })),
      );
    }
    let next = 0;
    return headingPositions(
      paragraphs.items.map((_, i) => ({ heading: isHeading[i]!, deleted: isHeading[i]! && (removed[next++] ?? false) })),
    );
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
      const candidate = atProvisionalKey(candidates, key);
      found = candidate && matches(candidate) ? candidate : null;
    } else {
      // Only headings with the expected fingerprint can hold the bookmark; compare those few.
      const range = context.document.getBookmarkRangeOrNullObject(key.name);
      range.load("isNullObject");
      await context.sync();
      if (range.isNullObject) return null;
      const possible = candidates.filter(matches);
      const relations = possible.map((c) => c.paragraph.getRange("Whole").compareLocationWith(range));
      await context.sync();
      found = possible.find((_, i) => COVERS.has(relations[i]!.value)) ?? null;
    }
    if (!found) return null;
    const [target] = await this.describe(context, [found], { numbers: false });
    return target ?? null;
  }
}

/** A story's body and where it is; the main text includes its table cells. */
export interface StoryBody {
  readonly location: "main" | Exclude<HeadingLocation, "main" | "tableCell">;
  readonly body: Word.Body;
}

/**
 * Every story's body in Word's story order (research R7): main text, text boxes, footnotes,
 * endnotes, headers, footers. A header or footer linked to the previous section is listed again
 * for each section. Office.js ranges see only their own story's bookmarks and fields, so
 * document-wide lists go through these.
 */
export async function storyBodies(context: Word.RequestContext): Promise<StoryBody[]> {
  const body = context.document.body;
  const footnotes = body.footnotes.load("items");
  const endnotes = body.endnotes.load("items");
  const sections = context.document.sections.load("items");
  const shapes = supports("WordApiDesktop", "1.2") ? body.shapes.load("items/type") : null;
  await context.sync();
  const each = (location: StoryBody["location"], bodies: Word.Body[]) => bodies.map((b) => ({ location, body: b }));
  return [
    { location: "main", body },
    ...each("textBox", (shapes?.items ?? []).filter((shape) => shape.type === "TextBox").map((shape) => shape.body)),
    ...each("footnote", footnotes.items.map((note) => note.body)),
    ...each("endnote", endnotes.items.map((note) => note.body)),
    ...each("header", sections.items.flatMap((section) => HEADER_TYPES.map((type) => section.getHeader(type)))),
    ...each("footer", sections.items.flatMap((section) => HEADER_TYPES.map((type) => section.getFooter(type)))),
  ];
}

/**
 * Queue the format's parts before `anchor`, in order: literals as text, the rest as hyperlinked
 * fields to `bookmark` with the R5 switches. Returns the fields (to update) and the first part's
 * range, for the dev pane's span: a literal, or the first field.
 */
function queueParts(
  anchor: Word.Range,
  parts: readonly FormatPart[],
  bookmark: string,
): { fields: Word.Field[]; first: Word.Range | Word.Field | null } {
  const fields: Word.Field[] = [];
  let first: Word.Range | Word.Field | null = null;
  for (const part of parts) {
    if (part.kind === "literal") {
      // Inserted unconditionally: `first ??= anchor.insertText(...)` would skip every later literal.
      const inserted = anchor.insertText(part.text, "Before");
      first ??= inserted;
      continue;
    }
    const spec = fieldFor(part.kind);
    const type = spec.type === "ref" ? Word.FieldType.ref : Word.FieldType.pageRef;
    const field = anchor.insertField("Before", type, `${bookmark} ${spec.switches.join(" ")}`, true);
    first ??= field;
    fields.push(field);
  }
  return { fields, first };
}

/** Word's bare "GeneralException" says nothing; its debug info names the failing call. */
function hostErrorDetail(error: unknown): string {
  const location = error instanceof OfficeExtension.Error ? error.debugInfo.errorLocation : undefined;
  const message = error instanceof Error ? error.message : String(error);
  return location ? `${message} at ${location}` : message;
}

/** A heading's location: its story, with the main text split into body and table cells. */
function headingLocationIn(story: StoryBody["location"], paragraph: Word.Paragraph): HeadingLocation {
  if (story !== "main") return story;
  return paragraph.tableNestingLevel > 0 ? "tableCell" : "main";
}

/**
 * Each heading's text, for its bookmark: the paragraph's content. In a note the first paragraph
 * starts with the reference mark, which the bookmark must not include, so there it runs from where
 * the text is found (few headings open a note) to the end of the content. Needs the paragraphs'
 * text loaded.
 */
async function headingTextRanges(context: Word.RequestContext, paragraphs: readonly Word.Paragraph[]): Promise<Word.Range[]> {
  const searched = paragraphs.map((p) => {
    const text = normaliseHeadingText(p.text);
    return startsWithNoteMark(p.text) && text !== "" ? findStart(p.getRange("Content"), text) : null;
  });
  if (searched.some((s) => s !== null)) await context.sync();
  return paragraphs.map((p, i) => {
    const start = searched[i];
    const content = p.getRange("Content");
    // Not found (should not happen): the whole content rather than fail the read.
    return start && !start.isNullObject ? start.getRange("Start").expandTo(content.getRange("End")) : content;
  });
}

function isHeaderOrFooter(location: StoryBody["location"]): boolean {
  return location === "header" || location === "footer";
}

/**
 * A header or footer linked to the previous section reads the same as it; other stories never
 * repeat. `texts` is called for headers and footers only: other stories' text is not loaded.
 */
function linkedCopySignature(location: StoryBody["location"], texts: () => readonly string[]): string | null {
  return isHeaderOrFooter(location) ? `${location}:${JSON.stringify(texts())}` : null;
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
