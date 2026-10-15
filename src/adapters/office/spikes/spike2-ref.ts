/**
 * Spike 2 — REF survives F9 (research R5, R6, R7) on tests/fixtures/spec-300.docx. Decides:
 * insertField vs OOXML; number composition; formatting switch; which stories are listed; the
 * write path that gives one Undo step. Undo counts, F9, Ctrl+click and formatting are checked by
 * hand after each insert; the log records what was written.
 */
import {
  findHeading,
  isHeadingParagraph,
  spikeBookmarkName,
  timed,
  type Log,
  type Spike,
} from "./spike-kit";

type WriteOrder = "bookmarkFirst" | "bookmarkLast";
type PartKind = "literal" | "number" | "text" | "page" | "aboveBelow";
interface Part {
  kind: PartKind;
  text?: string;
}

const FIELD: Record<Exclude<PartKind, "literal">, { type: Word.FieldType; switches: string }> = {
  number: { type: Word.FieldType.ref, switches: "\\w \\h" },
  text: { type: Word.FieldType.ref, switches: "\\h" },
  page: { type: Word.FieldType.pageRef, switches: "\\h" },
  aboveBelow: { type: Word.FieldType.ref, switches: "\\p \\h" },
};

const SECTION_NUMBER_TEXT: Part[] = [
  { kind: "literal", text: "§ " },
  { kind: "number" },
  { kind: "literal", text: " " },
  { kind: "text" },
];

/** The seven built-in formats of FR-016 / research R5. */
const ALL_FORMATS: [string, Part[]][] = [
  ["text", [{ kind: "text" }]],
  ["number", [{ kind: "number" }]],
  ["numberText", [{ kind: "number" }, { kind: "literal", text: " " }, { kind: "text" }]],
  ["sectionNumberText", SECTION_NUMBER_TEXT],
  ["page", [{ kind: "page" }]],
  ["aboveBelow", [{ kind: "aboveBelow" }]],
  ["textAboveBelow", [{ kind: "text" }, { kind: "literal", text: " " }, { kind: "aboveBelow" }]],
];

let lastBookmark: string | null = null;

/**
 * Write `parts` before the selection anchor, in order. Clearing any selected content is the caller's job.
 * Everything is queued; the caller syncs once.
 */
function queueParts(anchor: Word.Range, bookmark: string, parts: Part[], extraSwitch: string): Word.Field[] {
  const fields: Word.Field[] = [];
  for (const part of parts) {
    if (part.kind === "literal") anchor.insertText(part.text ?? "", "Before");
    else {
      const { type, switches } = FIELD[part.kind];
      fields.push(anchor.insertField("Before", type, `${bookmark} ${switches}${extraSwitch}`, true));
    }
  }
  return fields;
}

async function insertAtSelection(
  log: Log,
  headingText: string,
  parts: Part[],
  order: WriteOrder,
  extraSwitch = "",
): Promise<void> {
  await Word.run(async (context) => {
    const heading = await findHeading(context, headingText);
    const headingText_ = heading.getRange("Content");
    const existing = heading.getRange("Whole").getBookmarks(true, false);
    const selection = context.document.getSelection();
    selection.load("isEmpty,text");
    await context.sync(); // reads only; all writes below go in ONE sync

    const usable = existing.value.find((name) => !/^(_toc|_hlk)|^_goback$/i.test(name)) ?? null;
    const bookmark = usable ?? spikeBookmarkName();
    const createBookmark = () => {
      if (!usable) headingText_.insertBookmark(bookmark);
    };

    if (order === "bookmarkFirst") createBookmark();
    const fields = queueParts(selection, bookmark, parts, extraSwitch);
    if (!selection.isEmpty) selection.insertText("", "Replace");
    if (order === "bookmarkLast") createBookmark();
    fields.forEach((field) => field.updateResult());
    const { ms } = await timed(() => context.sync());

    fields.forEach((field) => field.load("code"));
    const results = fields.map((field) => field.result);
    results.forEach((range) => range.load("text"));
    await context.sync();
    lastBookmark = bookmark;
    log("inserted", {
      heading: headingText,
      order,
      bookmark,
      bookmarkCreated: usable === null,
      existingBookmarks: existing.value,
      replacedSelection: selection.isEmpty ? null : selection.text,
      writeSyncMs: ms,
      fields: fields.map((field, i) => ({ code: field.code, result: results[i]?.text })),
    });
    log("Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting");
  });
}

async function readHeadingsAllStories(log: Log): Promise<void> {
  await Word.run(async (context) => {
    const { ms, value } = await timed(async () => {
      const body = context.document.body;
      const paragraphs = body.paragraphs;
      paragraphs.load("items/text,items/styleBuiltIn,items/outlineLevel,items/isListItem,items/tableNestingLevel");
      const footnotes = body.footnotes;
      footnotes.load("items/body/paragraphs/items/text,items/body/paragraphs/items/styleBuiltIn,items/body/paragraphs/items/outlineLevel");
      const endnotes = body.endnotes;
      endnotes.load("items/body/paragraphs/items/text,items/body/paragraphs/items/styleBuiltIn,items/body/paragraphs/items/outlineLevel");
      const sections = context.document.sections;
      sections.load("items");
      const shapes = Office.context.requirements.isSetSupported("WordApiDesktop", "1.2") ? body.shapes : null;
      shapes?.load("items/type");
      await context.sync();

      const headerBodies: { kind: string; body: Word.Body }[] = [];
      for (const section of sections.items) {
        for (const type of ["Primary", "FirstPage", "EvenPages"] as const) {
          headerBodies.push({ kind: `header ${type}`, body: section.getHeader(type) });
          headerBodies.push({ kind: `footer ${type}`, body: section.getFooter(type) });
        }
      }
      const textBoxes = (shapes?.items ?? []).filter((shape) => shape.type === "TextBox");
      const storyBodies = [
        ...headerBodies,
        ...textBoxes.map((shape) => ({ kind: "textBox", body: shape.body })),
      ];
      storyBodies.forEach(({ body: b }) => b.paragraphs.load("items/text,items/styleBuiltIn,items/outlineLevel"));
      const headings = paragraphs.items.filter(isHeadingParagraph);
      const lists = headings.map((p) => p.listItemOrNullObject);
      lists.forEach((item) => item.load("listString,level"));
      await context.sync();

      const otherStories = [
        ...footnotes.items.map((n) => ({ kind: "footnote", paragraphs: n.body.paragraphs.items })),
        ...endnotes.items.map((n) => ({ kind: "endnote", paragraphs: n.body.paragraphs.items })),
        ...storyBodies.map(({ kind, body: b }) => ({ kind, paragraphs: b.paragraphs.items })),
      ].map(({ kind, paragraphs: ps }) => ({
        kind,
        headings: ps.filter(isHeadingParagraph).map((p) => p.text),
      }));

      return {
        mainHeadings: headings.length,
        tableCellHeadings: headings.filter((p) => p.tableNestingLevel > 0).map((p) => p.text),
        outlineLevelsSeen: [...new Set(paragraphs.items.map((p) => p.outlineLevel))],
        listStringSamples: headings.slice(0, 12).map((p, i) => ({
          text: p.text,
          style: p.styleBuiltIn,
          listString: lists[i]?.isNullObject ? null : lists[i]?.listString,
          listLevel: lists[i]?.isNullObject ? null : lists[i]?.level,
        })),
        otherStories: otherStories.filter((s) => s.headings.length > 0),
        textBoxSupport: shapes !== null,
      };
    });
    log("headings read", { ...value, totalMs: ms });
  });
}

async function compareBookmarkRanges(log: Log): Promise<void> {
  await Word.run(async (context) => {
    const paragraphs = context.document.body.paragraphs;
    paragraphs.load("items/text,items/styleBuiltIn,items/outlineLevel");
    await context.sync();
    const headings = paragraphs.items.filter(isHeadingParagraph);
    const perHeading = headings.map((p) => ({
      paragraph: p,
      content: p.getRange("Content"),
      names: p.getRange("Whole").getBookmarks(true, false),
    }));
    perHeading.forEach(({ content }) => content.load("text"));
    await context.sync();

    const comparisons: { heading: string; name: string; relation: OfficeExtension.ClientResult<Word.LocationRelation> }[] = [];
    for (const { paragraph, content, names } of perHeading) {
      for (const name of names.value) {
        const range = context.document.getBookmarkRangeOrNullObject(name);
        comparisons.push({ heading: paragraph.text, name, relation: range.compareLocationWith(content) });
      }
    }
    await context.sync();
    log(
      "content range excludes the paragraph mark",
      perHeading.slice(0, 5).map(({ paragraph, content }) => ({ paragraph: paragraph.text, content: content.text })),
    );
    log(
      "bookmark range vs heading content range",
      comparisons.map((c) => ({ heading: c.heading, bookmark: c.name, relation: c.relation.value })),
    );
  });
}

async function readReferences(log: Log): Promise<void> {
  await Word.run(async (context) => {
    const fields = context.document.body.fields.getByTypes([Word.FieldType.ref, Word.FieldType.pageRef]);
    fields.load("items/code,items/type");
    await context.sync();
    const results = fields.items.map((field) => field.result);
    results.forEach((range) => range.load("text,font/bold,font/italic,font/name,font/size"));
    await context.sync();
    log(
      "REF/PAGEREF fields",
      fields.items.map((field, i) => ({
        type: field.type,
        code: field.code,
        result: results[i]?.text,
        font: results[i]
          ? { bold: results[i].font.bold, italic: results[i].font.italic, name: results[i].font.name, size: results[i].font.size }
          : null,
      })),
    );
  });
}

async function insertOoxmlField(log: Log): Promise<void> {
  if (!lastBookmark) throw new Error("Run an insertField variant first, so a bookmark exists.");
  const bookmark = lastBookmark;
  const run = (inner: string) => `<w:r>${inner}</w:r>`;
  const field = (code: string, cached: string) =>
    run('<w:fldChar w:fldCharType="begin"/>') +
    run(`<w:instrText xml:space="preserve"> ${code} </w:instrText>`) +
    run('<w:fldChar w:fldCharType="separate"/>') +
    run(`<w:t xml:space="preserve">${cached}</w:t>`) +
    run('<w:fldChar w:fldCharType="end"/>');
  const paragraph =
    `<w:p>${run('<w:t xml:space="preserve">§ </w:t>')}${field(`REF ${bookmark} \\w \\h`, "?")}` +
    `${run('<w:t xml:space="preserve"> </w:t>')}${field(`REF ${bookmark} \\h`, "?")}</w:p>`;
  const ooxml =
    '<pkg:package xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage">' +
    '<pkg:part pkg:name="/_rels/.rels" pkg:contentType="application/vnd.openxmlformats-package.relationships+xml"><pkg:xmlData>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    "</Relationships></pkg:xmlData></pkg:part>" +
    '<pkg:part pkg:name="/word/document.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"><pkg:xmlData>' +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph}</w:body></w:document>` +
    "</pkg:xmlData></pkg:part></pkg:package>";

  await Word.run(async (context) => {
    const inserted = context.document.getSelection().insertOoxml(ooxml, "Replace");
    const fields = inserted.fields;
    fields.load("items");
    await context.sync();
    fields.items.forEach((f) => f.updateResult());
    inserted.load("text");
    const paragraphsAfter = inserted.paragraphs;
    paragraphsAfter.load("items");
    await context.sync();
    log("OOXML insert", {
      bookmark,
      text: inserted.text,
      fieldCount: fields.items.length,
      paragraphsTouched: paragraphsAfter.items.length,
    });
    log("Check for an extra paragraph or imported style; count Ctrl+Z presses (this path used 2 syncs)");
  });
}

async function otherStoriesBookmarkAndRef(log: Log): Promise<void> {
  await Word.run(async (context) => {
    const body = context.document.body;
    const candidates: { kind: string; paragraphs: Word.ParagraphCollection }[] = [];
    const main = body.paragraphs;
    main.load("items/text,items/styleBuiltIn,items/outlineLevel,items/tableNestingLevel");
    const footnotes = body.footnotes;
    footnotes.load("items");
    const endnotes = body.endnotes;
    endnotes.load("items");
    const sections = context.document.sections;
    sections.load("items");
    const shapes = Office.context.requirements.isSetSupported("WordApiDesktop", "1.2") ? body.shapes : null;
    shapes?.load("items/type");
    await context.sync();

    footnotes.items.forEach((n) => candidates.push({ kind: "footnote", paragraphs: n.body.paragraphs }));
    endnotes.items.forEach((n) => candidates.push({ kind: "endnote", paragraphs: n.body.paragraphs }));
    const first = sections.items[0];
    if (first) {
      candidates.push({ kind: "header", paragraphs: first.getHeader("Primary").paragraphs });
      candidates.push({ kind: "footer", paragraphs: first.getFooter("Primary").paragraphs });
    }
    (shapes?.items ?? [])
      .filter((shape) => shape.type === "TextBox")
      .forEach((shape) => candidates.push({ kind: "textBox", paragraphs: shape.body.paragraphs }));
    candidates.forEach((c) => c.paragraphs.load("items/text,items/styleBuiltIn,items/outlineLevel"));
    await context.sync();

    const targets: { kind: string; paragraph: Word.Paragraph }[] = [];
    const tableHeading = main.items.find((p) => p.tableNestingLevel > 0 && isHeadingParagraph(p));
    if (tableHeading) targets.push({ kind: "tableCell", paragraph: tableHeading });
    for (const c of candidates) {
      const heading = c.paragraphs.items.find(isHeadingParagraph);
      if (heading && !targets.some((t) => t.kind === c.kind)) targets.push({ kind: c.kind, paragraph: heading });
    }

    const anchor = context.document.getSelection();
    const made = targets.map((t) => {
      const name = spikeBookmarkName();
      t.paragraph.getRange("Content").insertBookmark(name);
      anchor.insertText(`${t.kind}: `, "Before");
      const field = anchor.insertField("Before", Word.FieldType.ref, `${name} \\h`, true);
      anchor.insertText(" ; ", "Before");
      field.updateResult();
      return { kind: t.kind, heading: t.paragraph.text, bookmark: name, field };
    });
    await context.sync();
    made.forEach((m) => m.field.result.load("text"));
    await context.sync();
    log(
      "story bookmarks and REFs",
      made.map((m) => ({ kind: m.kind, heading: m.heading, bookmark: m.bookmark, result: m.field.result.text })),
    );
    log("Now F9 and Ctrl+click each reference; note any story where either fails");
  });
}

export const spike2: readonly Spike[] = [
  {
    id: "spike2-read",
    label: "Read headings in every story (timed)",
    instructions: "Open spec-300.docx. Records listString shape (full \"4.3\" or level part \"3\") and read time at 300 headings.",
    run: readHeadingsAllStories,
  },
  {
    id: "spike2-bookmark-ranges",
    label: "Compare bookmark ranges with heading text",
    instructions: "Expect _Toc and _Ref bookmarks Equal to the content range; the whole-paragraph bookmark not Equal.",
    run: compareBookmarkRanges,
  },
  {
    id: "spike2-insert-new",
    label: "Insert § number text → \"Fire strategy\" (new bookmark, bookmark first)",
    instructions: "Try with no selection, an inline selection and a two-paragraph selection. Count Ctrl+Z presses.",
    run: (log) => insertAtSelection(log, "Fire strategy", SECTION_NUMBER_TEXT, "bookmarkFirst"),
  },
  {
    id: "spike2-insert-new-last",
    label: "Same, bookmark written last",
    run: (log) => insertAtSelection(log, "Means of escape", SECTION_NUMBER_TEXT, "bookmarkLast"),
  },
  {
    id: "spike2-insert-reuse",
    label: "Insert § number text → \"Scope\" (reuses _Ref bookmark)",
    run: (log) => insertAtSelection(log, "Scope", SECTION_NUMBER_TEXT, "bookmarkFirst"),
  },
  {
    id: "spike2-insert-direct-bold",
    label: "Insert § number text → \"Heading with bold word\" (direct bold in heading)",
    instructions: "Caret in plain body text. Does the heading's bold word carry into the reference, before or after F9?",
    run: (log) => insertAtSelection(log, "Heading with bold word", SECTION_NUMBER_TEXT, "bookmarkFirst"),
  },
  {
    id: "spike2-all-formats",
    label: "Insert all seven formats → \"Fire strategy\"",
    instructions: "Place the caret in bold text, then in italic text, then repeat; check formatting before and after F9 (\\* CHARFORMAT decision).",
    async run(log) {
      for (const [id, parts] of ALL_FORMATS) {
        log(`format ${id}`);
        await insertAtSelection(log, "Fire strategy", [...parts, { kind: "literal", text: " | " }], "bookmarkFirst");
      }
    },
  },
  {
    id: "spike2-charformat",
    label: "Insert all seven formats → \"Heading with bold word\" with \\* CHARFORMAT",
    instructions: "Caret in bold text, then italic text: every part, the heading text included, should match the surrounding formatting, before and after F9.",
    async run(log) {
      for (const [id, parts] of ALL_FORMATS) {
        log(`format ${id}`);
        await insertAtSelection(log, "Heading with bold word", [...parts, { kind: "literal", text: " | " }], "bookmarkFirst", " \\* CHARFORMAT");
      }
    },
  },
  {
    id: "spike2-ooxml",
    label: "OOXML complex-field path (fallback)",
    run: insertOoxmlField,
  },
  {
    id: "spike2-stories",
    label: "Bookmark + REF for a heading in each other story",
    run: otherStoriesBookmarkAndRef,
  },
  {
    id: "spike2-references",
    label: "Read REF/PAGEREF fields (ours and Word's own)",
    instructions: "Compare codes, switches and font with the references made by Insert → Cross-reference.",
    run: readReferences,
  },
];
