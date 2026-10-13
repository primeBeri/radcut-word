/**
 * Dev-only: registers the Office adapters with the contract pane so the shared suites run inside
 * Word (Constitution II, tasks T051). Never part of the release build.
 *
 * Run on a scratch copy of the named fixture. Each case restores the main text from a snapshot
 * taken by the first case; headers, footers and notes are not restored, so reopen the copy
 * between runs. Protecting the document cannot be scripted: cases that need it fail with an
 * instruction and are checked by hand (Review → Restrict Editing).
 */
import type {
  BookmarkInfo,
  ContractFixture,
  FieldInfo,
  GatewayContractHarness,
  SelectionRequest,
} from "../../../tests/contract/document-gateway.contract";
import { defineDocumentGatewayContract } from "../../../tests/contract/document-gateway.contract";
import { defineHostShellContract } from "../../../tests/contract/host-ports.contract";
import type { InsertedReference } from "../../core/ports/document-gateway";
import { normaliseHeadingText, startsWithNoteMark } from "../../core/headings/normalise-text";
import { withoutLinkedCopies } from "../../core/headings/scan";
import { parseFieldCode } from "../../core/references/field-code";
import { registerContract } from "../../dev/contract-registry";
import { OfficeHostShell } from "./office-host-shell";
import { OfficeJsGateway, storyBodies } from "./office-js-gateway";

/** A heading each fixture has and the others do not, to tell which document is open. */
const FIXTURE_MARKER: Record<ContractFixture, string> = {
  "spec-300": "Fire strategy",
  "guide-500": "Part 100",
  tracked: "Kept heading",
  "plain-headings": "Outline-level heading",
};

/** The main text as the first case found it, per document (the pane may outlive a document). */
let snapshot: { url: string; ooxml: string } | null = null;

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

async function wordHarness(fixture: ContractFixture): Promise<GatewayContractHarness> {
  await Word.run(async (context) => {
    const body = context.document.body;
    const url = Office.context.document.url;
    if (snapshot === null || snapshot.url !== url) {
      const ooxml = body.getOoxml();
      await context.sync();
      snapshot = { url, ooxml: ooxml.value };
    } else {
      // With change tracking on, the restore itself would be tracked and leave a deleted copy of
      // every paragraph (contract run on tracked.docx), so switch tracking off around it.
      const document = context.document.load("changeTrackingMode");
      await context.sync();
      const mode = document.changeTrackingMode;
      document.changeTrackingMode = Word.ChangeTrackingMode.off;
      body.insertOoxml(snapshot.ooxml, "Replace");
      document.changeTrackingMode = mode;
      await context.sync();
    }
    const paragraphs = body.paragraphs.load("items/text");
    await context.sync();
    if (!paragraphs.items.some((p) => p.text.trim() === FIXTURE_MARKER[fixture])) {
      throw new Error(`This case needs ${fixture}.docx open in Word.`);
    }
  });

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
  const spanOf = (reference: InsertedReference) => {
    const found = spans.get(reference.id);
    if (!found) throw new Error(`No insertion ${reference.id}.`);
    return found;
  };

  /** Every story's fields, as the fake lists them; a linked header or footer is listed once. */
  const fields = async (): Promise<FieldInfo[]> =>
    Word.run(async (context) => {
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
    });

  const bookmarks = async (): Promise<BookmarkInfo[]> =>
    Word.run(async (context) => {
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
    });

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
        throw new Error("The fixture has no content control; check this case by hand.");
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

  return {
    gateway,
    async select(text: string, selection: SelectionRequest = {}) {
      // Selecting inside a text box sometimes fails with GeneralException at Range.select and
      // works when tried again (in-Word contract runs, 2026-10-12); this is the harness, not the add-in.
      try {
        await selectOnce(text, selection);
      } catch {
        await selectOnce(text, selection);
      }
    },
    async setProtected(on: boolean) {
      if (on) throw new Error("Protect the document by hand (Review → Restrict Editing); not scriptable.");
    },
    async failNextWrite(options = {}) {
      failNext = options.duringWrite ? "duringWrite" : "beforeWrite";
    },
    async setParagraphText(current: string, next: string) {
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
    async documentState() {
      const text = await Word.run(async (context) => {
        const body = context.document.body.load("text");
        await context.sync();
        return body.text;
      });
      return { text, bookmarks: await bookmarks(), fields: await fields() };
    },
  };
}

export async function registerOfficeContracts(): Promise<void> {
  await Office.onReady();
  registerContract({
    label: "IDocumentGateway: OfficeJsGateway",
    fixture: "a scratch copy of spec-300.docx",
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
              throw new Error("Press Ctrl+Shift+Y in the document; the shortcut cannot be fired from script.");
            },
            clickCrossReferenceButton: async () => {
              throw new Error("Click Cross-reference on the ribbon; ribbon buttons cannot be fired from script.");
            },
            paneVisible: async () => visible,
            closePaneByUser: async () => {
              throw new Error("Close the pane with its × button; closing it as the user does cannot be done from script.");
            },
          };
        },
        api,
      ),
  });
}
