# Contract: `IDocumentGateway` port

The core's only view of a Word document. Implemented by `FakeGateway` (tests) and
`OfficeJsGateway` (adapter). Both MUST pass the shared contract suite
`tests/contract/document-gateway.contract.ts` (Constitution II).

```ts
interface IDocumentGateway {
  /** Every heading paragraph in document order, with usable bookmark if present. */
  readHeadings(): Promise<HeadingSnapshot>;

  /** Read Word's current selection as an insertion point, or say why it is not allowed. Read-only. */
  checkInsertionPoint(policy: LocationPolicy): Promise<InsertionPoint | Declined>;

  /** All bookmark names in the document, including hidden ones. */
  listBookmarkNames(): Promise<string[]>;

  /**
   * Insert a reference in ONE document transaction:
   * re-read the current selection and re-check location and protection (decline if now invalid,
   * or `selfReference` if the target is the heading containing the cursor),
   * decline `tableSelected` if the selection contains a table (FR-008a),
   * stop with `needsConfirmation` if the selection is extended, or inside a field, and not
   * confirmed (FR-008a, FR-008b); a confirmed field is replaced whole,
   * ensure a bookmark on the target (reuse usable one, else create `newBookmarkName`),
   * then write the format's parts at the selection and update the new fields.
   * On any decline or `needsConfirmation` the document is left unchanged. Every check runs
   * before the first write; if Word fails during the write itself, `hostError` carries
   * `partialWrite: true`, because Office.js batches are not transactional (FR-014).
   * All writes go in one `sync` so the insertion is one Undo step (FR-013).
   */
  insertReference(request: InsertReferenceRequest): Promise<InsertReferenceResult>;

  /** Put the caret back in the document: after the reference if given, else where it is now. */
  returnFocus(after?: InsertedReference): Promise<void>;

  /** Every REF/PAGEREF field and its target bookmark (backlinks-ready; not used by the MVP UI). */
  readReferences(): Promise<ReferenceRecord[]>;
}

interface InsertReferenceRequest {
  target: HeadingKey;             // provisional keys are re-validated against the live document
  expectedFingerprint: string;    // level + text when the palette listed the heading
  parts: FormatPart[];            // already validated by the core
  newBookmarkName: string;        // used only if no usable bookmark exists
  policy: LocationPolicy;         // { allowInHeadings } from user settings
  confirmExtendedSelection: boolean; // true only after the user confirmed the warning (FR-008a)
}

type InsertReferenceResult =
  | { ok: true; reference: InsertedReference; bookmark: string; bookmarkCreated: boolean }
  | { ok: false; reason: "staleTarget" }
  | { ok: false; reason: "needsConfirmation"; confirm: "selection" | "field" }
  | { ok: false; reason: "hostError"; partialWrite: boolean; detail?: string }
  | { ok: false; reason: "declined"; declined: Declined };  // cursor now disallowed or document protected

interface ReferenceRecord {
  bookmark: string;
  fieldType: "ref" | "pageRef";
  switches: string[];             // e.g. ["\\w", "\\h"]
  location: "main" | "footnote" | "endnote" | "other";
}
```

Both gateways read raw facts (story type, paragraph style and outline level, protection,
paragraph/table/picture/shape/content-control counts in the selection) and decide with the
core's `classifyLocation` and `classifySelection` (data-model.md), so the rules exist once.

## Behavioural contract (each line is at least one contract test)

1. `readHeadings` returns only paragraphs with Heading 1–9 style or outline level 1–9, in
   document order, with `level`, `text`, `number` (or `null`), `location` and `order` 0..n-1.
1a. Headings in table cells, text boxes, footnotes, endnotes, headers and footers are returned
   with the matching `location`, in story order (main text with table cells in place, text
   boxes, footnotes, endnotes, headers, footers); a header or footer shared by several sections
   is returned once.
2. Bold or large-font paragraphs without a heading style or outline level are not returned;
   headings shown as tracked deletions are not returned; tracked-insertion headings are.
3. A heading with a usable bookmark reports it in `bookmark`; a heading whose only bookmarks
   include the paragraph mark, cover only part of the text, or are Word-managed (`_Toc…`,
   `_Hlk…`, `_GoBack`) reports `null`.
4. When several usable bookmarks exist, `bookmark` is the first by case-insensitive name order,
   every time.
5. With `allowInHeadings: false`, `checkInsertionPoint` returns `Declined` for header, footer,
   comment, text box, heading, Title and Subtitle paragraphs, and protected documents; it
   returns an `InsertionPoint` for main text, footnotes, endnotes and table cells in the main
   text. It never changes the document.
5b. With `allowInHeadings: true`, heading, Title and Subtitle paragraphs return an
   `InsertionPoint` (`inHeadingOrder` set for a heading, `null` for Title and Subtitle); header,
   footer, comment, text box and protected cases are still declined.
5c. `insertReference` whose target is the heading containing the cursor returns `declined` with
   `selfReference`, and the document is unchanged.
5a. If the selection moves between `checkInsertionPoint` and `insertReference`, the reference
   goes to the new selection; if the new selection is disallowed or the document is now
   protected, the result is `declined` and the document is unchanged.
6. `insertReference` with a target that has a usable bookmark creates no bookmark
   (`bookmarkCreated = false`) and the bookmark count is unchanged.
7. `insertReference` with no usable bookmark creates exactly one bookmark named
   `newBookmarkName`, covering the heading text without the paragraph mark; existing unusable
   bookmarks (including `_Toc…`) keep their names and ranges.
7a. The inserted reference has the character formatting of the text at the insertion point (for
   example bold inside bold text), not the heading's, before and after a field update (Word run
   only for the after-update part).
7b. No insertion renames, moves or removes a bookmark it did not create, or changes the code or
   result of a field it did not insert (FR-011a).
7c. A heading in a table cell, text box, footnote, endnote, header or footer gets its bookmark
   like any other, and a reference to it resolves (the Ctrl+click jump is checked in the Word
   run only).
8. The inserted content, read back, consists of the literal parts and one field per non-literal
   part, each with `\h`, pointing at the returned bookmark, with the switches in research R5.
9. After insertion, each field's displayed result equals the core's preview for that format
   (page excepted, where the result is a positive integer).
10. With a selection inside one paragraph (`selection: "inline"`), the reference replaces the
    selected text without confirmation.
10a. With a selection spanning two paragraphs, or containing a picture, shape or content
    control (`selection: "extended"`), `insertReference` with `confirmExtendedSelection: false`
    returns `needsConfirmation` with `confirm: "selection"` and the document is unchanged; with
    `true`, the reference replaces the selection.
10b. With a selection containing a table, `checkInsertionPoint` and `insertReference` decline
    with `tableSelected`, confirmed or not, and the document is unchanged.
10c. With the cursor inside an existing REF field (`selection: "field"`), `insertReference`
    returns `needsConfirmation` with `confirm: "field"` and the document is unchanged; with
    `confirmExtendedSelection: true`, the field is removed and the reference takes its place in
    the same paragraph.
11. If `expectedFingerprint` no longer matches the live heading, the result is
    `staleTarget` and the document is unchanged.
12. A failure before the write leaves no new bookmark and no partial reference, and reports
    `hostError` with `partialWrite: false`.
13. `readReferences` returns one record per REF/PAGEREF field with its bookmark and switches.
14. In the Word run only (not checked against the fake): after a field update (F9), every
    inserted reference still shows the correct value; after moving the target heading and
    updating, it shows the new number; one Undo restores the document exactly (reference, any
    new bookmark, any replaced selection), with no selection, an inline selection and a
    confirmed extended selection, and with tracking on. More than one Undo step is a release
    blocker (FR-013), never a recorded exception.
