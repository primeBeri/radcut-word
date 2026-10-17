/**
 * Dev-only: registers the Office adapters with the contract pane so the shared suites run inside
 * Word (Constitution II, tasks T051). Never part of the release build.
 *
 * Run on a scratch copy of the named fixture. The first case snapshots the main text and the
 * primary headers and footers; a case after one that wrote restores them (notes are not
 * restored, so reopen the copy between runs). States Office.js cannot create (protection, a caret
 * in a comment or the re-created text box, a selection in the plain-text control, keystrokes,
 * Undo, F9, following a hyperlink) come from the desktop harness through its bridge
 * (src/dev/desktop-bridge.ts); in a run started by hand those cases fail with the manual steps.
 */
import type {
  BookmarkInfo,
  ContractFixture,
  FieldInfo,
  GatewayContractHarness,
  SelectionRequest,
  WordDesktopOps,
} from "../../../tests/contract/document-gateway.contract";
import { defineDocumentGatewayContract } from "../../../tests/contract/document-gateway.contract";
import { defineHostShellContract } from "../../../tests/contract/host-ports.contract";
import type { IDocumentGateway, InsertedReference } from "../../core/ports/document-gateway";
import { normaliseHeadingText, startsWithNoteMark } from "../../core/headings/normalise-text";
import { withoutLinkedCopies } from "../../core/headings/scan";
import { parseFieldCode } from "../../core/references/field-code";
import { registerContract } from "../../dev/contract-registry";
import { desktopBridge, type DesktopBridge } from "../../dev/desktop-bridge";
import { runningCase, timed } from "../../dev/mini-test";
import { OfficeHostShell } from "./office-host-shell";
import { OfficeJsGateway, storyBodies } from "./office-js-gateway";

/**
 * Paragraphs that tell which document is open: a case runs if any of its fixture's markers is
 * there. spec-300 holds every paragraph of spec-contract, so it is accepted for spec-contract
 * too; that lets the speed work be measured on both (research D2).
 */
const FIXTURE_MARKER: Record<ContractFixture, readonly string[]> = {
  "spec-contract": ["Contract fixture.", "Chapter 76"],
  "spec-300": ["Chapter 76"],
  "guide-500": ["Part 100"],
  tracked: ["Kept heading"],
  "plain-headings": ["Outline-level heading"],
};

/**
 * The main text, and each section's primary header and footer, as the first case found them, per
 * document (the pane may outlive a document). Headers and footers are restored too since
 * references may be written there (case 9c). `textLength` and `bookmarkCount` are the cheap
 * guard used when no restore seems needed; `fixtures` caches which fixture markers the document
 * has.
 */
let snapshot: {
  url: string;
  ooxml: string;
  headersAndFooters: string[];
  textLength: number;
  bookmarkCount: number;
  fixtures: Map<ContractFixture, boolean>;
} | null = null;

/**
 * Whether a case may have changed the document since the last restore. Restoring the whole
 * document took most of a case's time on spec-300 (research D2), so it is done only after a case
 * that wrote; a case that only read leaves the document as it found it.
 */
let dirty = false;

/** Whether a case protected the document through the desktop bridge; undone before the next case. */
let protectedByBridge = false;

/** The case that last prepared the document: the one to blame if the guard finds a change. */
let previousCase: string | null = null;

/** Gateway methods that never change the document; any other call marks it dirty. */
const READ_ONLY: ReadonlySet<PropertyKey> = new Set([
  "readHeadings",
  "checkInsertionPoint",
  "listBookmarkNames",
  "readReferences",
  "returnFocus",
]);

function markDirty(): void {
  dirty = true;
}

async function mainTextFacts(context: Word.RequestContext): Promise<{ textLength: number; bookmarkCount: number }> {
  const body = context.document.body.load("text");
  const names = body.getRange("Whole").getBookmarks(true, true);
  await context.sync();
  return { textLength: body.text.length, bookmarkCount: names.value.length };
}

/**
 * Bring the open document back to the snapshot before a case, taking the snapshot on the first
 * case of a document, and check it is the fixture the case needs.
 */
async function prepareDocument(fixture: ContractFixture): Promise<void> {
  if (protectedByBridge) {
    await desktopBridge()?.({ action: "unprotect" });
    protectedByBridge = false;
  }
  await Word.run(async (context) => {
    const body = context.document.body;
    const url = Office.context.document.url;
    if (snapshot === null || snapshot.url !== url) {
      const ooxml = body.getOoxml();
      const others = (await headersAndFooters(context)).map((story) => story.getOoxml());
      const facts = await mainTextFacts(context);
      snapshot = {
        url,
        ooxml: ooxml.value,
        headersAndFooters: others.map((o) => o.value),
        ...facts,
        fixtures: new Map(),
      };
      dirty = false;
    } else if (!dirty) {
      // Guard: a write the dirty tracking missed shows up here, is logged and still restored.
      const facts = await mainTextFacts(context);
      if (facts.textLength !== snapshot.textLength || facts.bookmarkCount !== snapshot.bookmarkCount) {
        console.warn(`[radcut:contract] "${previousCase ?? "?"}" changed the document without marking it dirty; restoring`, {
          expected: { textLength: snapshot.textLength, bookmarkCount: snapshot.bookmarkCount },
          found: facts,
        });
        dirty = true;
      }
    }
    if (dirty) {
      // With change tracking on, the restore itself would be tracked and leave a deleted copy of
      // every paragraph (contract run on tracked.docx), so switch tracking off around it.
      const document = context.document.load("changeTrackingMode");
      await context.sync();
      const mode = document.changeTrackingMode;
      document.changeTrackingMode = Word.ChangeTrackingMode.off;
      body.insertOoxml(snapshot.ooxml, "Replace");
      const saved = snapshot.headersAndFooters;
      (await headersAndFooters(context)).forEach((story, i) => {
        const ooxml = saved[i];
        if (ooxml !== undefined) story.insertOoxml(ooxml, "Replace");
      });
      document.changeTrackingMode = mode;
      await context.sync();
      dirty = false;
    }
    previousCase = runningCase();
    let hasMarker = snapshot.fixtures.get(fixture);
    if (hasMarker === undefined) {
      const paragraphs = body.paragraphs.load("items/text");
      await context.sync();
      const markers = FIXTURE_MARKER[fixture];
      hasMarker = paragraphs.items.some((p) => markers.includes(p.text.trim()));
      snapshot.fixtures.set(fixture, hasMarker);
    }
    if (!hasMarker) throw new Error(`This case needs ${fixture}.docx open in Word.`);
  });
}

/** Each section's primary header and footer, in section order: header, footer, header, … */
async function headersAndFooters(context: Word.RequestContext): Promise<Word.Body[]> {
  const sections = context.document.sections.load("items");
  await context.sync();
  return sections.items.flatMap((section) => [section.getHeader("Primary"), section.getFooter("Primary")]);
}

async function storyParagraphs(context: Word.RequestContext): Promise<Word.Paragraph[]> {
  const body = context.document.body;
  const sections = context.document.sections.load("items");
  const notes = [body.footnotes.load("items"), body.endnotes.load("items")];
  const shapes = body.shapes.load("items/type");
  await context.sync();
  const collections: Word.ParagraphCollection[] = [body.paragraphs];
  for (const shape of shapes.items.filter((s) => s.type === "TextBox")) collections.push(shape.body.paragraphs);
  for (const list of notes) for (const note of list.items) collections.push(note.body.paragraphs);
  for (const section of sections.items) {
    collections.push(section.getHeader("Primary").paragraphs, section.getFooter("Primary").paragraphs);
  }
  // Comment text cannot hold the selection from script; the comment case is checked by hand.
  collections.forEach((c) => c.load("items/text"));
  await context.sync();
  return collections.flatMap((c) => c.items);
}

/**
 * Paragraph texts as Word reports them where they differ from the shared fixture text: Word
 * includes field results in paragraph text, the fake does not (the in-Word contract run, docs/acceptance-checklist.md).
 */
const WORD_TEXT: Record<string, string> = {
  "References made by Word: see section and heading.": "References made by Word: see section 1.1 and heading Scope.",
};

async function paragraphByText(context: Word.RequestContext, fixtureText: string): Promise<Word.Paragraph> {
  const text = WORD_TEXT[fixtureText] ?? fixtureText;
  const found = (await storyParagraphs(context)).find((p) => normaliseHeadingText(p.text) === text);
  if (!found) throw new Error(`No paragraph "${text}" reachable from script (comments: put the cursor there by hand).`);
  return found;
}

/**
 * The content control holding `text`. After the restore before each case (`insertOoxml` over the
 * body) a plain-text control is left half there: no longer listed in `body.contentControls`, still
 * the parent of its text, and not taken as selected whole when its whole range is selected (contract
 * runs, 2026-10-15). Office.js cannot rebuild it (GeneralException at
 * `Range.insertContentControl("PlainText")`), so the desktop harness replaces it with a fresh one
 * through Word COM before the selection (see `select`), and it is reached here from its paragraph;
 * a run started by hand checks those cases by hand.
 */
async function controlByText(context: Word.RequestContext, text: string): Promise<Word.ContentControl> {
  const controls = context.document.body.contentControls.load("items/text");
  await context.sync();
  const found = controls.items.find((c) => c.text.trim() === text);
  if (found) return found;
  // Not listed after a restore, but reachable from its paragraph (contract runs, 2026-10-15).
  const paragraph = await paragraphByText(context, text);
  const inside = paragraph.search(text.slice(0, 2), { matchCase: true }).getFirst().parentContentControlOrNullObject;
  inside.load("isNullObject");
  await context.sync();
  if (!inside.isNullObject) return inside;
  if (snapshot?.ooxml.includes("<w:text/>")) {
    throw new Error(
      "Manual check: the restore before each case drops the plain-text content control; " +
        "check the plain-text content-control cases by hand (docs/acceptance-checklist.md, case 10a).",
    );
  }
  throw new Error(`No content control holding "${text}" (${controls.items.length} in the body).`);
}

/**
 * The gateway with each call timed as `phase` of the running contract case, and any call not on
 * the read-only list marking the document dirty before it runs.
 */
function trackCalls(gateway: IDocumentGateway, phase: string): IDocumentGateway {
  return new Proxy(gateway, {
    get(target, property, receiver) {
      const value: unknown = Reflect.get(target, property, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        if (!READ_ONLY.has(property)) markDirty();
        return timed(phase, async () => value.apply(target, args));
      };
    },
  });
}

/** Word-only steps done through Word COM by the desktop harness; each may change the document. */
function wordOps(desktop: DesktopBridge): WordDesktopOps {
  return {
    async updateFields() {
      markDirty();
      await desktop({ action: "updateFields" });
    },
    async undo() {
      markDirty();
      await desktop({ action: "undo" });
    },
    async moveParagraphs(text, before, paragraphs) {
      markDirty();
      await desktop({ action: "moveParagraphBefore", text, before, paragraphs });
    },
    async followReference(bookmark) {
      return String(await desktop({ action: "followReference", bookmark }));
    },
  };
}

async function wordHarness(fixture: ContractFixture): Promise<GatewayContractHarness> {
  await timed("restore", () => prepareDocument(fixture));

  let failNext: "beforeWrite" | "duringWrite" | null = null;
  const spans = new Map<string, { span: Word.Range; replaced: string }>();
  const gateway = new OfficeJsGateway({
    beforeWrite: () => {
      if (failNext === "beforeWrite") {
        failNext = null;
        throw new Error("Simulated host failure.");
      }
    },
    duringWrite: (anchor) => {
      if (failNext === "duringWrite") {
        failNext = null;
        // An invalid bookmark name fails at the sync, after the reference's own writes.
        anchor.insertBookmark("1 not a valid name");
      }
    },
    onInserted: (id, span, replaced) => spans.set(id, { span, replaced }),
  });
  const trackedGateway = trackCalls(gateway, "gateway");
  const spanOf = (reference: InsertedReference) => {
    const found = spans.get(reference.id);
    if (!found) throw new Error(`No insertion ${reference.id}.`);
    return found;
  };

  /** Every story's fields, as the fake lists them; a linked header or footer is listed once. */
  const fields = async (): Promise<FieldInfo[]> =>
    timed("state", () => Word.run(async (context) => {
      const stories = (await storyBodies(context)).map(({ location, body }) => ({
        location,
        fields: body.fields.load("items/code,items/type"),
        text: location === "header" || location === "footer" ? body.load("text") : null,
      }));
      await context.sync();
      const all = withoutLinkedCopies(stories, (s) => (s.text ? `${s.location}:${s.text.text}` : null)).flatMap(
        (s) => s.fields.items,
      );
      const results = all.map((f) => f.result.load("text,font/bold,font/italic"));
      await context.sync();
      return all.map((field, i) => {
        const type = field.type === Word.FieldType.ref ? "ref" : field.type === Word.FieldType.pageRef ? "pageRef" : "other";
        const parsed = type === "other" ? { bookmark: null, switches: [] } : parseFieldCode(field.code);
        return {
          type,
          bookmark: parsed.bookmark,
          switches: [...parsed.switches],
          result: results[i]!.text,
          format: { bold: results[i]!.font.bold === true, italic: results[i]!.font.italic === true },
        };
      });
    }));

  const bookmarks = async (): Promise<BookmarkInfo[]> =>
    timed("state", () => Word.run(async (context) => {
      const lists = (await storyBodies(context)).map(({ body }) => body.getRange("Whole").getBookmarks(true, true));
      await context.sync();
      // Linked headers and footers repeat their bookmarks; list each name once.
      const names = [...new Set(lists.flatMap((list) => list.value))];
      const entries = names.map((name) => {
        const range = context.document.getBookmarkRangeOrNullObject(name);
        const paragraph = range.paragraphs.getFirst().load("text");
        return {
          name,
          paragraph,
          text: range.compareLocationWith(paragraph.getRange("Content")),
          whole: range.compareLocationWith(paragraph.getRange("Whole")),
        };
      });
      await context.sync();
      return entries.map((e) => ({
        name: e.name,
        paragraphText: normaliseHeadingText(e.paragraph.text),
        extent: e.text.value === "Equal" ? "text" : e.whole.value === "Equal" ? "paragraph" : "partial",
      }));
    }));

  const selectOnce = (text: string, selection: SelectionRequest) =>
    Word.run(async (context) => {
      const paragraph = await paragraphByText(context, text);
      let range: Word.Range = paragraph.getRange("Start");
      if (selection.tables) {
        range = context.document.body.tables.getFirst().getRange("Whole");
      } else if (selection.pictures || selection.shapes) {
        range = (await paragraphByText(context, "Paragraph with an inline picture.")).inlinePictures.getFirst().getRange("Whole");
      } else if (selection.inField) {
        // Two characters into the field's result: clearly inside it, not at an edge.
        const fields = paragraph.fields.load("items");
        await context.sync();
        const field = fields.items[selection.fieldIndex ?? 0];
        if (!field) throw new Error(`The paragraph has no field ${selection.fieldIndex ?? 0}.`);
        const result = field.result.load("text");
        await context.sync();
        range = result.search(result.text.slice(0, 2), { matchCase: true }).getFirst().getRange("End");
      } else if (selection.contentControls) {
        range = (await controlByText(context, text)).getRange("Whole");
      } else if (selection.inContentControl) {
        const content = (await controlByText(context, text)).getRange("Content").load("text");
        await context.sync();
        // Two characters in, or the first `length` characters: inside the control, not at its edge.
        const found = content.search(content.text.slice(0, selection.length ?? 2), { matchCase: true }).getFirst();
        range = selection.length ? found : found.getRange("End");
      } else if ((selection.paragraphs ?? 1) > 1) {
        range = paragraph.getRange("Whole").expandTo(paragraph.getNext().getRange("Whole"));
      } else if (selection.caretOffset) {
        const before = paragraph.search(paragraph.text.slice(0, selection.caretOffset), { matchCase: true }).getFirst();
        range = before.getRange("End");
      } else if (selection.length) {
        range = paragraph.search(paragraph.text.slice(0, selection.length), { matchCase: true }).getFirst();
      }
      range.select();
      await context.sync();
    });

  const select = async (text: string, selection: SelectionRequest) => {
    const desktop = desktopBridge();
    if (desktop && (selection.contentControls || selection.inContentControl)) {
      // Before the Word.run that selects: a control replaced from outside is not seen by a
      // context opened before the change (contract run, 2026-10-15). A rich-text control is left as is.
      markDirty();
      await desktop({ action: "renewPlainTextControl", text });
    }
    try {
      await selectOnce(text, selection);
    } catch (error) {
      // After the restore Word draws a text box only once its anchor has been on screen, and
      // refuses a selection in it until then (contract 9c on the VM, 2026-10-16): scroll there, as
      // a person would, and try again.
      if (desktop && (await desktop({ action: "showTextBoxes" })) !== 0) {
        try {
          await selectOnce(text, selection);
          return;
        } catch {
          // Fall through to the fallbacks below, with the first error.
        }
      }
      // Word refuses a caret in the text box's first paragraph after the restore, at its start
      // and two characters in (in-Word contract runs, 2026-10-15). A plain caret request falls
      // back to those, then to selecting the first two characters: still inside the paragraph.
      if (Object.keys(selection).length === 0) {
        for (const fallback of [{ caretOffset: 2 }, { length: 2 }]) {
          try {
            await selectOnce(text, fallback);
            return;
          } catch {
            // Try the next, or fall through to the original error.
          }
        }
      }
      // Office.js cannot put the cursor in a comment, and after the restore (insertOoxml over the
      // body) Word refuses a caret in the re-created text box (in-Word contract runs, 2026-10-12
      // and 2026-10-15); Word COM can, through the desktop bridge, for a caret or a selection from
      // the paragraph's start.
      const plain = Object.keys(selection).every((key) => key === "caretOffset" || key === "length");
      if (desktop && plain) {
        await desktop({ action: "select", text, caretOffset: selection.caretOffset, length: selection.length });
        return;
      }

      if (text === "Text box body." || text === "Heading in a text box") {
        throw new Error(
          `Manual check: Word will not select "${text}" in the text box from script after the document is restored; ` +
            "put the cursor there by hand, press the shortcut, and check the palette behaves as this case expects.",
          { cause: error },
        );
      }
      throw error;
    }
  };

  const desktop = desktopBridge();
  return {
    gateway: trackedGateway,
    ...(desktop ? { word: wordOps(desktop) } : {}),
    select: (text: string, selection: SelectionRequest = {}) => timed("select", () => select(text, selection)),
    async setProtected(on: boolean) {
      const desktop = desktopBridge();
      if (!desktop) {
        if (on) throw new Error("Protect the document by hand (Review → Restrict Editing); not scriptable.");
        return;
      }
      await desktop({ action: on ? "protect" : "unprotect" });
      protectedByBridge = on;
    },
    async failNextWrite(options = {}) {
      markDirty();
      failNext = options.duringWrite ? "duringWrite" : "beforeWrite";
    },
    async setParagraphText(current: string, next: string) {
      markDirty();
      await Word.run(async (context) => {
        const paragraph = await paragraphByText(context, current);
        // A note's first paragraph starts with its reference mark, which must stay.
        const inNote = startsWithNoteMark(paragraph.text);
        const range = inNote ? paragraph.search(current, { matchCase: true }).getFirst() : paragraph.getRange("Content");
        range.insertText(next, "Replace");
        await context.sync();
      });
    },
    bookmarks,
    fields,
    async insertionText(reference) {
      const { span } = spanOf(reference);
      return Word.run(span, async (context) => {
        span.load("text");
        await context.sync();
        return span.text;
      });
    },
    async insertionParagraph(reference) {
      const { span } = spanOf(reference);
      return Word.run(span, async (context) => {
        span.load("text");
        const paragraph = span.paragraphs.getFirst().load("text");
        await context.sync();
        return paragraph.text.replace(span.text, "");
      });
    },
    async replacedText(reference) {
      return spanOf(reference).replaced;
    },
    async caretIsAfter(reference) {
      const { span } = spanOf(reference);
      return Word.run(span, async (context) => {
        const selection = context.document.getSelection().load("isEmpty");
        const where = span.getRange("End").compareLocationWith(selection);
        await context.sync();
        return selection.isEmpty && where.value === "Equal";
      });
    },
    async documentState() {
      const text = await timed("state", () =>
        Word.run(async (context) => {
          const body = context.document.body.load("text");
          await context.sync();
          return body.text;
        }),
      );
      return { text, bookmarks: await bookmarks(), fields: await fields() };
    },
  };
}

export async function registerOfficeContracts(): Promise<void> {
  await Office.onReady();
  registerContract({
    label: "IDocumentGateway: OfficeJsGateway",
    fixture: "a scratch copy of spec-contract.docx",
    define: (api) => defineDocumentGatewayContract("OfficeJsGateway", wordHarness, api),
  });

  // Each case gets its own shell; the shared runtime has one handler per action, so the last
  // registration wins, which is what a fresh shell expects.
  registerContract({
    label: "IHostShell: OfficeHostShell",
    define: (api) =>
      defineHostShellContract(
        "OfficeHostShell",
        async () => {
          const shell = new OfficeHostShell();
          let visible = true;
          Office.addin.onVisibilityModeChanged((args) => {
            visible = args.visibilityMode === Office.VisibilityMode.taskpane;
          });
          return {
            shell,
            pressShortcut: async () => {
              const desktop = desktopBridge();
              if (!desktop) throw new Error("Press Ctrl+Shift+Y in the document; the shortcut cannot be fired from script.");
              await desktop({ action: "pressShortcut" });
            },
            clickCrossReferenceButton: async () => {
              const desktop = desktopBridge();
              if (!desktop) throw new Error("Click Cross-reference on the ribbon; ribbon buttons cannot be fired from script.");
              await desktop({ action: "clickCrossReference" });
            },
            paneVisible: async () => visible,
            closePaneByUser: async () => {
              const desktop = desktopBridge();
              if (!desktop) {
                throw new Error("Close the pane with its × button; closing it as the user does cannot be done from script.");
              }
              await desktop({ action: "closePane" });
            },
          };
        },
        api,
      ),
  });
}
