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
import { normaliseHeadingText } from "../../core/headings/normalise-text";
import { registerContract } from "../../dev/contract-registry";
import { OfficeHostShell } from "./office-host-shell";
import { OfficeJsGateway } from "./office-js-gateway";

/** A heading each fixture has and the others do not, to tell which document is open. */
const FIXTURE_MARKER: Record<ContractFixture, string> = {
  "spec-300": "Fire strategy",
  "guide-500": "Part 100",
  tracked: "Kept heading",
  "plain-headings": "Outline-level heading",
};

let snapshot: string | null = null;

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

async function paragraphByText(context: Word.RequestContext, text: string): Promise<Word.Paragraph> {
  const found = (await storyParagraphs(context)).find((p) => normaliseHeadingText(p.text) === text);
  if (!found) throw new Error(`No paragraph "${text}" reachable from script (comments: put the cursor there by hand).`);
  return found;
}

function parseCode(code: string): { bookmark: string | null; switches: string[] } {
  const tokens = code.trim().split(/\s+/);
  const switches: string[] = [];
  for (let i = 2; i < tokens.length; i++) {
    const token = tokens[i]!;
    switches.push(token === "\\*" && tokens[i + 1] ? `${token} ${tokens[++i]}` : token);
  }
  return { bookmark: tokens[1] ?? null, switches };
}

async function wordHarness(fixture: ContractFixture): Promise<GatewayContractHarness> {
  await Word.run(async (context) => {
    const body = context.document.body;
    if (snapshot === null) {
      const ooxml = body.getOoxml();
      await context.sync();
      snapshot = ooxml.value;
    } else {
      body.insertOoxml(snapshot, "Replace");
      await context.sync();
    }
    const paragraphs = body.paragraphs.load("items/text");
    await context.sync();
    if (!paragraphs.items.some((p) => p.text.trim() === FIXTURE_MARKER[fixture])) {
      throw new Error(`This case needs ${fixture}.docx open in Word.`);
    }
  });

  let failNext = false;
  const spans = new Map<string, { span: Word.Range; replaced: string }>();
  const gateway = new OfficeJsGateway({
    beforeWrite: () => {
      if (failNext) {
        failNext = false;
        throw new Error("Simulated host failure.");
      }
    },
    onInserted: (id, span, replaced) => spans.set(id, { span, replaced }),
  });
  const spanOf = (reference: InsertedReference) => {
    const found = spans.get(reference.id);
    if (!found) throw new Error(`No insertion ${reference.id}.`);
    return found;
  };

  const fields = async (): Promise<FieldInfo[]> =>
    Word.run(async (context) => {
      const all = context.document.body.fields.load("items/code,items/type");
      await context.sync();
      const results = all.items.map((f) => f.result.load("text,font/bold,font/italic"));
      await context.sync();
      return all.items.map((field, i) => {
        const type = field.type === Word.FieldType.ref ? "ref" : field.type === Word.FieldType.pageRef ? "pageRef" : "other";
        const parsed = type === "other" ? { bookmark: null, switches: [] } : parseCode(field.code);
        return {
          type,
          ...parsed,
          result: results[i]!.text,
          format: { bold: results[i]!.font.bold === true, italic: results[i]!.font.italic === true },
        };
      });
    });

  const bookmarks = async (): Promise<BookmarkInfo[]> =>
    Word.run(async (context) => {
      const names = context.document.body.getRange("Whole").getBookmarks(true, true);
      await context.sync();
      const entries = names.value.map((name) => {
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

  return {
    gateway,
    async select(text: string, selection: SelectionRequest = {}) {
      await Word.run(async (context) => {
        const paragraph = await paragraphByText(context, text);
        let range: Word.Range = paragraph.getRange("Start");
        if (selection.tables) {
          range = context.document.body.tables.getFirst().getRange("Whole");
        } else if (selection.pictures || selection.shapes) {
          range = (await paragraphByText(context, "Paragraph with an inline picture.")).inlinePictures.getFirst().getRange("Whole");
        } else if (selection.inField) {
          // Two characters into the first field's result: clearly inside it, not at an edge.
          const result = paragraph.fields.getFirst().result.load("text");
          await context.sync();
          range = result.search(result.text.slice(0, 2), { matchCase: true }).getFirst().getRange("End");
        } else if (selection.contentControls) {
          throw new Error("The fixture has no content control; check this case by hand.");
        } else if ((selection.paragraphs ?? 1) > 1) {
          range = paragraph.getRange("Whole").expandTo(paragraph.getNext().getRange("Whole"));
        } else if (selection.length) {
          range = paragraph.search(paragraph.text.slice(0, selection.length), { matchCase: true }).getFirst();
        }
        range.select();
        await context.sync();
      });
    },
    async setProtected(on: boolean) {
      if (on) throw new Error("Protect the document by hand (Review → Restrict Editing); not scriptable.");
    },
    async failNextWrite() {
      failNext = true;
    },
    async setParagraphText(current: string, next: string) {
      await Word.run(async (context) => {
        (await paragraphByText(context, current)).getRange("Content").insertText(next, "Replace");
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
