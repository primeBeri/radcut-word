# Fixture documents

Word documents for the spikes (T014–T016) and the in-Word contract run. Make them by hand in
Word for Windows and save them here. `tests/fakes/fake-documents.ts` builds the in-memory
equivalent of each one for FakeGateway, using the **same paragraph texts**, because contract
cases find paragraphs by their text. Keep the two in step: if you change a text here, change it
in the fake, and the other way round.

No content in these documents may be confidential; they are committed to the public repository.

## `spec-300.docx`

About 300 multilevel-numbered headings (Heading 1–3 linked to one multilevel list, so numbers
read "4.3", "4.4.1"). Main text, in this order:

| Paragraph text | Style / notes |
|---|---|
| Introduction | Heading 1, number 1 |
| This specification sets out the requirements. | Normal |
| Bold body text. | Normal, all bold |
| Italic body text. | Normal, all italic |
| A quotation. | Quote |
| Figure 1 Site plan | Caption |
| Scope | Heading 2, 1.1 |
| Scope body. | Normal |
| Definitions | Heading 2, 1.2 |
| Definitions body. | Normal |
| General | Heading 1, 2 |
| Standards | Heading 2, 2.1 |
| Materials | Heading 1, 3 |
| Concrete | Heading 2, 3.1 |
| Safety | Heading 1, 4 |
| Means of escape | Heading 2, 4.1 |
| Structural fire resistance | Heading 2, 4.2 |
| Fire strategy | Heading 2, 4.3 |
| The fire strategy is described here. | Normal (the default caret position) |
| Heading with bold word | Heading 2, 4.4; the word "bold" has direct bold formatting |
| First of two paragraphs. | Normal |
| Second of two paragraphs. | Normal |
| Cell text in the main table. | Normal, in a table cell |
| Heading in a table cell | Heading 3, 4.4.1, in a cell of the same table |
| Paragraph with an inline picture. | Normal, with a small inline picture |
| References made by Word: see section and heading. | Normal, containing two references made with Insert → Cross-reference to "Scope": one "Heading number", one "Heading text" |
| Chapter 5 … Chapter 76 | Filler: each a Heading 1 ("Chapter N") with a body paragraph, then three Heading 2 ("Topic N.1"–"Topic N.3") each with a body paragraph |
| Title of the document | Title |
| Subtitle of the document | Subtitle |

Other stories:

- A text box containing "Heading in a text box" (Heading 1) and "Text box body.".
- A footnote containing "Heading in a footnote" (Heading 1) and "Footnote text.".
- An endnote containing "Heading in an endnote" (Heading 1) and "Endnote text.".
- The primary header containing "Heading in the header" (Heading 1) and "Header text.".
- The primary footer containing "Heading in the footer" (Heading 1) and "Footer text.".
- A comment containing "A comment.".

Bookmarks:

- A table of contents near the start, so `_Toc…` bookmarks exist (at least on "Introduction"
  and "Fire strategy").
- The cross-reference dialog references above give "Scope" a usable `_Ref…` bookmark.
- "Definitions": a user bookmark named `WholeParagraph` over the whole paragraph including its
  paragraph mark (not usable).
- "Standards": two user bookmarks over exactly the heading text, `zeta` and `Alpha` (the
  first by case-insensitive name order, `Alpha`, is the one to reuse).
- "Means of escape": a `_Hlk…` bookmark (e.g. made by inserting a hyperlink to it).
- "Structural fire resistance": a bookmark `PartOfText` over part of the heading text only.
- `_GoBack` is maintained by Word itself; it may sit anywhere.

## `guide-500.docx`

500 headings for performance: 100 × (Heading 1 "Part N" numbered; two Heading 2 "Numbered
section N.1/N.2" numbered; two Heading 2 "Unnumbered note N-1/N-2" without numbering, each with a
body paragraph "Note body N-1."/"Note body N-2.").

## `tracked.docx`

Change tracking on. "Kept heading" (Heading 1, 1) with "Body under the kept heading."; "Deleted
heading" (Heading 1) as a tracked deletion; "Inserted heading" (Heading 1) as a tracked
insertion with "Body under the inserted heading.".

## `plain-headings.docx`

Never saved under a URL during tests (unsaved-document behaviour) — keep a copy here but open it
as a new document when a case needs `documentId` null. "Overview" (Heading 1, unnumbered) with
"Overview body."; "Outline-level heading" (Normal style with outline level 2 set in the
paragraph dialog); "Bold fake heading" (Normal, bold, larger font: must not be listed); an empty
Heading 2; "Closing body.".
