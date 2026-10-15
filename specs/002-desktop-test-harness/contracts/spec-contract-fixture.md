# Contract: the `spec-contract` fixture

A small copy of `spec-300.docx` for the contract suite. Built by `tests/fixtures/make-fixtures.ps1`
beside the others, with a `.manifest.txt`; the fake document `specContract` in
`tests/fakes/fake-documents.ts` has the same paragraph texts in the same order.

## Content

- Every named paragraph of `spec-300` listed in `tests/fixtures/README.md`, with the same style,
  numbering, direct formatting, table, inline picture, content controls, Word-made references,
  Title and Subtitle.
- Filler reduced to Chapters 5 and 6 (each a Heading 1, a body paragraph and three Heading 2
  topics with bodies), keeping the footnote and endnote anchored where `spec-300` anchors them.
- The same other stories (text box, footnote, endnote, primary header and footer, comment) and
  the same bookmarks (`_Toc…` from a table of contents over these headings, `_Ref…` on "Scope",
  `WholeParagraph`, `zeta` and `Alpha`, `_Hlk…`, `PartOfText`).
- Fixture marker for the Word harness: a body paragraph "Contract fixture." as the last paragraph
  before "Title of the document", so the harness can tell it from `spec-300` (which shares
  "Fire strategy").

## Use

- `ContractFixture` gains `"spec-contract"`; every gateway contract case that uses `spec-300`
  today uses `spec-contract`, in the fake and in Word.
- `spec-300` stays as it is for performance (feature 001 T096/T098, harness US5) and for
  scenarios that need size.
- Numbering matches `spec-300` up to Chapter 6; no contract case may depend on a heading after it.
