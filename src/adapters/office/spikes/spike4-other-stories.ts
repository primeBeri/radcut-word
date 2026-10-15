/**
 * Spike 4 — references written with the cursor in a header, a footer or a text box (research
 * R8, FR-001a as refined 2026-10-14), on a scratch copy of tests/fixtures/spec-300.docx. Uses the
 * production path (`OfficeJsGateway`), so what it shows is what the palette will do. Undo counts,
 * F9, Ctrl+click and the caret's return are checked by hand; the log records what was written.
 */
import { generateBookmarkName } from "../../../core/bookmarks/naming";
import { formatById } from "../../../core/formats/built-ins";
import { headingFingerprint } from "../../../core/headings/key";
import { OfficeJsGateway } from "../office-js-gateway";
import type { Log, Spike } from "./spike-kit";

const gateway = new OfficeJsGateway();
const OFF = { allowInHeadings: false };
const TARGET = "Fire strategy";

/** Where Word says the cursor is, and what the core decides there. */
async function whereIsTheCursor(log: Log): Promise<void> {
  const facts = await Word.run(async (context) => {
    const selection = context.document.getSelection();
    const body = selection.parentBody.load("type");
    const parent = body.parentBodyOrNullObject.load("type");
    selection.load("text");
    await context.sync();
    return { bodyType: body.type, parentBodyType: parent.isNullObject ? null : parent.type, selected: selection.text };
  });
  log("cursor", { ...facts, insertionPoint: await gateway.checkInsertionPoint(OFF) });
}

/** The REF and PAGEREF fields in the cursor's paragraph, as Word shows them now. */
async function fieldsAtCursor(log: Log, label: string): Promise<void> {
  await Word.run(async (context) => {
    const paragraph = context.document.getSelection().paragraphs.getFirst().load("text");
    const fields = paragraph.fields.load("items/code");
    await context.sync();
    const results = fields.items.map((field) => field.result.load("text"));
    await context.sync();
    log(label, {
      paragraph: paragraph.text,
      fields: fields.items.map((field, i) => ({ code: field.code.trim(), result: results[i]?.text })),
    });
  });
}

async function insertAtCursor(log: Log, formatId: string): Promise<void> {
  const format = formatById(formatId);
  if (!format) throw new Error(`No format ${formatId}.`);
  const { headings } = await gateway.readHeadings();
  const target = headings.find((h) => h.text === TARGET);
  if (!target) throw new Error(`No heading "${TARGET}": open a copy of spec-300.docx.`);
  await whereIsTheCursor(log);
  const result = await gateway.insertReference({
    target: target.key,
    expectedFingerprint: headingFingerprint(target),
    parts: format.parts,
    newBookmarkName: generateBookmarkName(await gateway.listBookmarkNames()),
    policy: OFF,
    confirmed: null,
  });
  log("insertReference", result);
  if (result.ok) await fieldsAtCursor(log, "written");
  log("Now: count Ctrl+Z presses (expect 1); F9 and check the result; Ctrl+click the reference");
}

export const spike4: readonly Spike[] = [
  {
    id: "spike4-where",
    label: "Where is the cursor?",
    instructions: "Click in \"Header text.\", \"Footer text.\" or \"Text box body.\" first (double-click the header or footer to edit it).",
    run: whereIsTheCursor,
  },
  {
    id: "spike4-insert-section",
    label: "Insert § number text to \"Fire strategy\" at the cursor",
    instructions: "Expect \"§ 4.3 Fire strategy\" at the cursor, one Undo step, resolving on F9 and jumping on Ctrl+click.",
    run: (log) => insertAtCursor(log, "sectionNumberText"),
  },
  {
    id: "spike4-insert-above-below",
    label: "Insert text + above/below to \"Fire strategy\" at the cursor",
    instructions:
      "Record what the \\p field shows, before and after F9: \"above\"/\"below\", or the heading text as in notes (decides FR-016a there).",
    run: (log) => insertAtCursor(log, "textAboveBelow"),
  },
  {
    id: "spike4-fields",
    label: "Show the fields in the cursor's paragraph",
    instructions: "After F9, to read the \\p result again.",
    run: (log) => fieldsAtCursor(log, "fields"),
  },
  {
    id: "spike4-return-caret",
    label: "Hide the pane and return the caret (as after an insert)",
    instructions:
      "With the cursor in the header, footer or text box: the pane hides and the caret should be back where it was. Type a character to see where it lands, then reopen the pane and read the log.",
    async run(log) {
      await whereIsTheCursor(log);
      // The palette's order (research R3): hide the pane first, then select, which gives Word focus.
      await Office.addin.hide();
      await gateway.returnFocus();
      log("caret returned (check where typing lands)");
    },
  },
  {
    id: "spike4-linked",
    label: "Linked header: insert in section 2's header",
    instructions:
      "On a copy: put the cursor at the end of the main text, Layout → Breaks → Next Page; section 2's header shows \"Same as Previous\". Click in its \"Header text.\" and run this. Expect the reference in both sections' header, one Undo step.",
    run: (log) => insertAtCursor(log, "sectionNumberText"),
  },
];
