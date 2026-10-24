# Known behaviours

How XRef behaves in situations that may surprise you. Everything it inserts is ordinary
Word: a hidden bookmark on the heading and REF fields pointing at it.

## Undo

**One Ctrl+Z removes one inserted reference, completely.** That holds with or without Track
Changes, wherever the cursor is (main text, table cell, footnote, endnote, header, footer, text
box), and when the reference replaces a selection or an existing field. If an insertion fails
part-way, XRef checks the document afterwards and tells you whether anything was written.

## Selections

Before replacing a selection that spans more than one paragraph, or holds a picture, a shape or
a content control, or an existing field, XRef asks you to confirm. **Equations and embedded objects
(for example an embedded spreadsheet) are not detected**: a selection containing only those and
text is replaced without the warning. Undo restores it.

A selection that includes a table, or part of one, is refused rather than replaced.

## Where references can go

Main text, table cells, footnotes, endnotes, headers, footers and text boxes, and rich-text
content controls. Not in a comment, a plain-text content control or a protected document, nor in
a heading, Title or Subtitle paragraph unless "Allow cross references in headings" is on;
XRef says why and changes nothing.

In a header, footer, text box, footnote or endnote, the "above"/"below" formats are not offered:
Word's `\p` switch shows the heading text there instead of "above" or "below", as Word's own
Cross-reference dialog does. A header linked to the previous section is shared, so a reference
inserted there appears in every linked section.

## Track Changes

- An insertion with Track Changes on is one tracked insertion. After Accept All, the reference
  updates (F9) and Ctrl+click jumps to the heading as normal.
- **Rejecting the insertion removes the reference text and fields, but leaves the hidden
  bookmark (`_XR…`) on the heading.** It is harmless and invisible, and the next reference to
  that heading reuses it.
- A heading shown as a tracked deletion is not listed; a tracked inserted heading is.
- **Moving a heading while Track Changes is on can break references to it** (Word shows the
  heading text as deleted and the number points at the wrong heading after F9). Word's own
  cross-references do the same; accept the move before updating fields.

## Bookmarks

XRef reuses a bookmark already on the heading when it covers exactly the heading text, and
otherwise adds one hidden bookmark named `_XR…`. It never uses the bookmarks Word manages itself
(`_Toc…` for a table of contents, which Word replaces when the table is updated, `_Hlk…` and
`_GoBack`). It never renames, moves or deletes a bookmark or field it did not create.

## Keyboard shortcut

- The default is **Ctrl+Shift+Y**. Changing it needs you to be **signed in to Microsoft 365**,
  because Office keeps custom shortcuts in your account; signed out, the settings show the
  shortcut but cannot change it.
- Word keeps some combinations for its own commands, and refuses others without giving a
  reason; the settings say so and let you try another. Ctrl+Shift with a digit is usually free.
- If another add-in or Word claims the same shortcut, Office asks you once which one wins.
- Ctrl+Alt combinations can clash with AltGr on UK and European layouts, which is why the
  default uses Ctrl+Shift. Ctrl+@ is refused (Word's accent key).

## Co-authoring

Not yet checked with two people editing the same document at once. Until then, treat it as
untested: insert, then check the reference updates with F9.

## Speed

The palette shows the heading list from the last read at once and, if it is still open a second
later, refreshes it. **A heading added since that read is listed only once a palette has stayed
open for a second**, so if you open, type and insert quickly every time, keep the palette open a
moment when you look for a new heading. Enter always checks the live document, so a heading
renamed or removed in the meantime is caught: the palette refreshes its list and says so instead
of inserting.

## Privacy

XRef makes no network requests after it has loaded, and no document content leaves your
computer. Settings and recently used headings are kept by Office on your computer, never in the
document.
