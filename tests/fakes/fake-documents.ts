/**
 * In-memory Word documents for FakeGateway, and builders for the fixture documents the contract
 * suite names (tests/fixtures/README.md describes the real .docx equivalents).
 */

export type FakeStory = "main" | "textBox" | "footnote" | "endnote" | "header" | "footer" | "comment";

export interface FakeParagraph {
  readonly id: number;
  story: FakeStory;
  /** In a table cell of its story. */
  inTable: boolean;
  /** Built-in style name: "Normal", "Heading1".."Heading9", "Title", "Subtitle", "Quote", "Caption", "ListParagraph". */
  style: string;
  /** Outline level 1–9 set directly on a paragraph without a heading style; null otherwise. */
  outlineLevel: number | null;
  text: string;
  /** Full-context list number as Word displays it, or null. */
  number: string | null;
  /** Shown as a tracked deletion. */
  trackedDeletion: boolean;
  /** Character formatting of the paragraph's text, e.g. "regular", "bold", "italic". */
  charFormat: string;
}

/** Extent of a bookmark relative to its paragraph's text. */
export type FakeBookmarkExtent = "text" | "paragraph" | "partial";

export interface FakeBookmark {
  name: string;
  paragraphId: number;
  extent: FakeBookmarkExtent;
  createdByAddin: boolean;
}

export interface FakeField {
  readonly id: number;
  paragraphId: number;
  type: "ref" | "pageRef" | "other";
  bookmark: string | null;
  switches: string[];
  result: string;
  charFormat: string;
  insertedByAddin: boolean;
}

export type FakeInlineContent = { kind: "literal"; text: string } | { kind: "field"; fieldId: number };

export interface FakeInsertion {
  readonly id: string;
  paragraphId: number;
  content: FakeInlineContent[];
  /** Text of the selection the insertion replaced ("" for a caret). */
  replacedText: string;
  charFormat: string;
}

export interface FakeSelection {
  paragraphId: number;
  /** Selected characters in the first paragraph; 0 = caret. */
  length: number;
  /** Paragraphs the selection touches (1 = within one paragraph). */
  paragraphs: number;
  tables: number;
  pictures: number;
  shapes: number;
  contentControls: number;
}

export interface FakeDocumentState {
  documentId: string | null;
  paragraphs: FakeParagraph[];
  bookmarks: FakeBookmark[];
  fields: FakeField[];
  insertions: FakeInsertion[];
  selection: FakeSelection;
  protected: boolean;
}

export interface HeadingOptions {
  number?: string | null;
  story?: FakeStory;
  inTable?: boolean;
  /** Use an outline level instead of a Heading N style. */
  outlineOnly?: boolean;
  trackedDeletion?: boolean;
  charFormat?: string;
}

export interface ParagraphOptions {
  style?: string;
  story?: FakeStory;
  inTable?: boolean;
  charFormat?: string;
}

export interface SelectOptions {
  length?: number;
  paragraphs?: number;
  tables?: number;
  pictures?: number;
  shapes?: number;
  contentControls?: number;
}

export class FakeDocumentBuilder {
  private readonly state: FakeDocumentState = {
    documentId: null,
    paragraphs: [],
    bookmarks: [],
    fields: [],
    insertions: [],
    selection: emptySelection(-1),
    protected: false,
  };
  private nextFieldId = 1;

  documentId(id: string | null): this {
    this.state.documentId = id;
    return this;
  }

  heading(level: number, text: string, options: HeadingOptions = {}): this {
    this.state.paragraphs.push({
      id: this.state.paragraphs.length,
      story: options.story ?? "main",
      inTable: options.inTable ?? false,
      style: options.outlineOnly ? "Normal" : `Heading${level}`,
      outlineLevel: options.outlineOnly ? level : null,
      text,
      number: options.number ?? null,
      trackedDeletion: options.trackedDeletion ?? false,
      charFormat: options.charFormat ?? "regular",
    });
    return this;
  }

  para(text: string, options: ParagraphOptions = {}): this {
    this.state.paragraphs.push({
      id: this.state.paragraphs.length,
      story: options.story ?? "main",
      inTable: options.inTable ?? false,
      style: options.style ?? "Normal",
      outlineLevel: null,
      text,
      number: null,
      trackedDeletion: false,
      charFormat: options.charFormat ?? "regular",
    });
    return this;
  }

  /** Bookmark on the paragraph whose text is `paragraphText`. */
  bookmark(name: string, paragraphText: string, extent: FakeBookmarkExtent = "text"): this {
    this.state.bookmarks.push({
      name,
      paragraphId: this.paragraphId(paragraphText),
      extent,
      createdByAddin: false,
    });
    return this;
  }

  /** A field the add-in did not make, placed in the paragraph whose text is `paragraphText`. */
  foreignField(
    paragraphText: string,
    field: Pick<FakeField, "type" | "bookmark" | "switches" | "result">,
  ): this {
    this.state.fields.push({
      ...field,
      id: this.nextFieldId++,
      paragraphId: this.paragraphId(paragraphText),
      charFormat: "regular",
      insertedByAddin: false,
    });
    return this;
  }

  select(paragraphText: string, options: SelectOptions = {}): this {
    this.state.selection = { ...emptySelection(this.paragraphId(paragraphText)), ...options };
    return this;
  }

  protect(): this {
    this.state.protected = true;
    return this;
  }

  build(): FakeDocumentState {
    if (this.state.selection.paragraphId < 0) {
      const firstBody = this.state.paragraphs.find((p) => p.story === "main" && p.style === "Normal");
      if (firstBody) this.state.selection = emptySelection(firstBody.id);
    }
    return structuredClone(this.state);
  }

  private paragraphId(text: string): number {
    const found = this.state.paragraphs.find((p) => p.text === text);
    if (!found) throw new Error(`Fixture has no paragraph with text "${text}".`);
    return found.id;
  }
}

export function emptySelection(paragraphId: number): FakeSelection {
  return { paragraphId, length: 0, paragraphs: 1, tables: 0, pictures: 0, shapes: 0, contentControls: 0 };
}

export function fakeDocument(): FakeDocumentBuilder {
  return new FakeDocumentBuilder();
}

/** Fixture names shared with the Word contract run (tests/fixtures/*.docx). */
export type FixtureName = "spec-300" | "guide-500" | "tracked" | "plain-headings";

/** Filler headings so the fake fixture has the same scale as the .docx. */
function addNumberedFiller(builder: FakeDocumentBuilder, chapters: number, sections: number, from: number): void {
  for (let c = from; c < from + chapters; c++) {
    builder.heading(1, `Chapter ${c}`, { number: `${c}` }).para(`Introduction to chapter ${c}.`);
    for (let s = 1; s <= sections; s++) {
      builder.heading(2, `Topic ${c}.${s}`, { number: `${c}.${s}` }).para(`Body of topic ${c}.${s}.`);
    }
  }
}

function spec300(): FakeDocumentState {
  const b = fakeDocument()
    .documentId("https://example.invalid/spec-300.docx")
    .heading(1, "Introduction", { number: "1" })
    .para("This specification sets out the requirements.")
    .para("Bold body text.", { charFormat: "bold" })
    .para("Italic body text.", { charFormat: "italic" })
    .para("A quotation.", { style: "Quote" })
    .para("Figure 1 Site plan", { style: "Caption" })
    .heading(2, "Scope", { number: "1.1" })
    .para("Scope body.")
    .heading(2, "Definitions", { number: "1.2" })
    .para("Definitions body.")
    .heading(1, "General", { number: "2" })
    .heading(2, "Standards", { number: "2.1" })
    .heading(1, "Materials", { number: "3" })
    .heading(2, "Concrete", { number: "3.1" })
    .heading(1, "Safety", { number: "4" })
    .heading(2, "Means of escape", { number: "4.1" })
    .heading(2, "Structural fire resistance", { number: "4.2" })
    .heading(2, "Fire strategy", { number: "4.3" })
    .para("The fire strategy is described here.")
    .heading(2, "Heading with bold word", { number: "4.4", charFormat: "partBold" })
    .para("First of two paragraphs.")
    .para("Second of two paragraphs.")
    .para("Cell text in the main table.", { inTable: true })
    .heading(3, "Heading in a table cell", { number: "4.4.1", inTable: true })
    .para("Paragraph with an inline picture.")
    .para("References made by Word: see section and heading.");
  addNumberedFiller(b, 72, 3, 5);
  b.para("Title of the document", { style: "Title" })
    .para("Subtitle of the document", { style: "Subtitle" })
    .heading(1, "Heading in a text box", { story: "textBox" })
    .para("Text box body.", { story: "textBox" })
    .heading(1, "Heading in a footnote", { story: "footnote" })
    .para("Footnote text.", { story: "footnote" })
    .heading(1, "Heading in an endnote", { story: "endnote" })
    .para("Endnote text.", { story: "endnote" })
    .heading(1, "Heading in the header", { story: "header" })
    .para("Header text.", { story: "header" })
    .heading(1, "Heading in the footer", { story: "footer" })
    .para("Footer text.", { story: "footer" })
    .para("A comment.", { story: "comment" })
    // A table of contents gives Word-managed _Toc bookmarks over heading text.
    .bookmark("_Toc100000001", "Introduction")
    .bookmark("_Toc100000002", "Fire strategy")
    // A usable bookmark made by Word's own cross-reference dialog.
    .bookmark("_Ref200000001", "Scope")
    // A user bookmark over the whole paragraph including its mark: not usable.
    .bookmark("WholeParagraph", "Definitions", "paragraph")
    // Two usable bookmarks: the first by case-insensitive name order wins.
    .bookmark("zeta", "Standards")
    .bookmark("Alpha", "Standards")
    .bookmark("_GoBack", "Concrete")
    .bookmark("_Hlk300000001", "Means of escape")
    .bookmark("PartOfText", "Structural fire resistance", "partial")
    // References made with Word's own Insert → Cross-reference dialog.
    .foreignField("References made by Word: see section and heading.", {
      type: "ref",
      bookmark: "_Ref200000001",
      switches: ["\\w", "\\h"],
      result: "1.1",
    })
    .foreignField("References made by Word: see section and heading.", {
      type: "ref",
      bookmark: "_Ref200000001",
      switches: ["\\h"],
      result: "Scope",
    })
    .select("The fire strategy is described here.");
  return b.build();
}

function guide500(): FakeDocumentState {
  const b = fakeDocument().documentId("https://example.invalid/guide-500.docx");
  for (let c = 1; c <= 100; c++) {
    b.heading(1, `Part ${c}`, { number: `${c}` });
    for (let s = 1; s <= 2; s++) b.heading(2, `Numbered section ${c}.${s}`, { number: `${c}.${s}` });
    for (let s = 1; s <= 2; s++) b.heading(2, `Unnumbered note ${c}-${s}`).para(`Note body ${c}-${s}.`);
  }
  return b.build();
}

function tracked(): FakeDocumentState {
  return fakeDocument()
    .documentId("https://example.invalid/tracked.docx")
    .heading(1, "Kept heading", { number: "1" })
    .para("Body under the kept heading.")
    .heading(1, "Deleted heading", { number: "2", trackedDeletion: true })
    .heading(1, "Inserted heading", { number: "2" })
    .para("Body under the inserted heading.")
    .build();
}

function plainHeadings(): FakeDocumentState {
  return fakeDocument()
    .documentId(null)
    .heading(1, "Overview")
    .para("Overview body.")
    .heading(2, "Outline-level heading", { outlineOnly: true })
    .para("Bold fake heading", { charFormat: "bold" })
    .heading(2, "")
    .para("Closing body.")
    .build();
}

export const fakeFixtures: Record<FixtureName, () => FakeDocumentState> = {
  "spec-300": spec300,
  "guide-500": guide500,
  tracked,
  "plain-headings": plainHeadings,
};
