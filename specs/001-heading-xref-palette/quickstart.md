# Quickstart: validate the Heading Cross-Reference Palette

How to prove the feature works end to end. Commands become final once the project is
scaffolded; update this file and `CLAUDE.md` together if they change.

## Prerequisites

- Windows 11, Word for Microsoft 365 (current channel, build 2508 or later for WordApiDesktop
  1.4; 2408 or later at minimum for customisable shortcuts), signed in to Microsoft 365.
- Node.js LTS (22.x) and npm.
- A UK keyboard layout installed (for the shortcut check).
- Fixture documents in `tests/fixtures/`: `spec-300.docx` (300 numbered headings, existing
  bookmarks including `_Toc…` from a table of contents, bold and italic body text, a heading
  with direct formatting, captions, quotes, tables, footnotes), `guide-500.docx` (500+ headings, mixed
  numbered and unnumbered), `tracked.docx` (tracked changes on), `plain-headings.docx` (no
  numbering, outline-level headings, bold fake headings).

## Setup

```powershell
npm install
npx office-addin-dev-certs install     # trust the localhost HTTPS certificate once
```

## Automated checks

```powershell
npm test                               # unit + component + contract (FakeGateway), Vitest
npx vitest run tests/unit/fuzzy-matcher.test.ts      # a single test file
npx vitest run -t "reuses an existing usable bookmark"  # a single test by name
npm run lint                           # includes the Office-globals boundary rule
npm run build                          # release bundle; fails if palette bundle > 150 KB gzip
```

Expected: all green; the build prints the palette bundle size under budget.

## Run in Word

```powershell
npm start                              # dev server + sideload into Word desktop
```

Open a fixture document. The ribbon shows the RAD·CUT group with "Cross-reference" and
"Settings".

### Contract and performance run inside Word

```powershell
npm run start:dev-pane                 # dev build including the test pane (never shipped)
```

In Word, open the "RAD·CUT Dev" pane, choose a fixture, and run the contract suite. Expected:
every contract test in [contracts/document-gateway.md](contracts/document-gateway.md) passes. The
desktop harness runs the same suites unattended (`npm run test:desktop -- --filter-trait
"Category=Contract"`), and times the palette with the performance runner the dev server loads
(`--filter-trait "Category=Performance"`, docs/performance.md). Expected: palette ready < 500 ms
on `spec-300.docx`; filter < 50 ms per keystroke and no task over 100 ms on `guide-500.docx`.

## Manual acceptance scenarios

| # | Steps | Expected | Spec |
|---|---|---|---|
| 1 | In body text of `spec-300.docx`, press the shortcut, type `fstrat`, Enter | Palette opens with typing captured; "4.3 Fire strategy" ranked first with matched letters highlighted; "§ 4.3 Fire strategy" inserted; caret after it | US1 1–4 |
| 2 | Press the shortcut, Esc | No change; caret where it was | US1 5 |
| 3 | Ctrl+A, F9; move section 4.3 above 4.1; Ctrl+A, F9 | Reference shows the new number; Ctrl+click jumps to the heading | US1 6–7, SC-005 |
| 4 | With the cursor in body text, insert a reference to heading X; then insert a second reference to the same X; check Insert → Bookmark with "Hidden bookmarks" ticked | Only one bookmark on X; the second insertion reused it | US1 8, SC-006 |
| 5 | Insert with no selection, with a selected word, and with a confirmed two-paragraph selection; Ctrl+Z once after each; repeat with tracking on | Each time the document is exactly as before (reference, new bookmark and replaced text); more than one Undo step is a release blocker | US1 10, FR-013, SC-009 |
| 6 | Save, sideload removed (or another PC), open, Ctrl+A, F9 | All references correct | US1 9, SC-007 |
| 7 | Settings → Add Default Format: Page Number, Above/Below, Text + Above/Below; open palette, Tab through all formats, Shift+Tab back; insert each | Cycle follows the format list; preview matches inserted text; all update on F9 | US2 1–3, 7, SC-004 |
| 8 | Settings → move "Number Only" to the top; restart Word; open palette; insert with another format; reopen | Palette starts on "Number Only" each time | US2 4–5, 7 |
| 8b | Settings → "Remember last used format" on; insert with "Number & Text"; reopen; restart Word; reopen; remove "Number & Text" from the list; reopen | Starts on "Number & Text" until it is removed, then on the first format | US2 6, FR-017a |
| 9 | Add template `see §{number} {text}, {abovebelow}`; try `{num}` | First appears in the cycle; second rejected with message | US3 |
| 10 | Ribbon "Cross-reference"; change shortcut; try Ctrl+@; switch to UK layout | Same palette; new shortcut works, old one does not; Ctrl+@ refused; no stray character typed | US4 |
| 11 | Insert to two headings; reopen palette with empty query | Both listed first under "Recent", most recent at top | US5 |
| 11b | Settings → turn off "Show recently used headings"; reopen; insert to a third heading; turn it back on; reopen | No "Recent" group while off; once back on, the two earlier headings are recent and the third is not | US5 4, FR-022a |
| 12 | Cursor in a heading, Title, comment; protected document. Then cursor in a header, footer and text box (allowed from 2026-10-14) | Clear message (for heading and Title, it names the "Allow cross references in headings" setting); no change. In a header, footer or text box the reference is inserted, one Undo, caret returns | FR-001a, edge cases |
| 13 | Cursor in a caption, quote, table cell, footnote | Insert works | FR-001a |
| 14 | `tracked.docx`: insert; accept all; reject on a copy | Tracked insertion; reference valid after accept; nothing broken after reject | Edge cases |
| 15 | Windows dark mode + Office black theme; Windows "Animation effects" off | Palette dark; no motion | FR-025, FR-026 |
| 16 | Palette open, press Ctrl+, | Settings open with focus on first control; Esc returns to the palette | FR-021a/b |
| 17 | Co-authored SharePoint document (manual only) | Insert succeeds or fails cleanly; record the behaviour | Edge cases |
| 18 | Disconnect network after loading; use all features | Everything works; no network requests in dev tools | FR-023 |
| 19 | In a document with a table of contents, reference a heading; update the TOC; F9 | A new hidden `_RC…` bookmark was created (the `_Toc…` one was not reused); reference still resolves after the TOC update | FR-011 |
| 20 | Insert inside bold text and inside italic text; insert a reference to a heading that has direct bold on one word; F9 | Each reference matches the text around it, not the heading; unchanged after F9 | FR-012a |
| 21 | Open the palette, click into a different paragraph of the document, then into a heading; return to the palette each time and press Enter | First Enter inserts at the new paragraph; second shows the "cannot insert in headings" message, palette stays open, no change | FR-008 |
| 22 | `tracked.docx`: delete a heading with tracking on; open the palette. Insert a reference, then reject it | Deleted heading not listed; after reject the reference is gone and any leftover hidden bookmark is reused by the next insert | FR-003, edge cases |
| 23 | Select a few words and press the shortcut, Enter. Then select across two paragraphs and press Enter; Esc; Enter, Enter. Then select a whole table and press Enter | Words replaced without warning. Multi-paragraph: warning shown under the selected row, nothing changed; Esc keeps the selection; second Enter replaces it; one Ctrl+Z restores it. Table: message that references can't replace a table, nothing changed | FR-008a, FR-013 |
| 24 | Settings → turn on "Allow cross references in headings" (read the explanation); put the cursor in heading 4.3 and open the palette; insert a reference to 4.1. Turn the setting off again | 4.3 itself is not listed; the reference goes into the heading; with the setting off the heading message returns | FR-001b |
| 25 | In `spec-300.docx`, open the palette; reference the headings in the table cell, text box, footnote, endnote, header and footer; F9; Ctrl+click each. Settings → turn off "Show headings outside of the main text"; reopen | Each is listed with its badge; every reference resolves and jumps. With the setting off they are not listed | FR-003, FR-003a |
| 26 | With Word's Insert → Cross-reference insert a heading-number and a heading-text reference to heading A; with RAD·CUT insert the same to a heading B that Word has not bookmarked, then to A; Alt+F9 to compare field codes; check the bookmarks' extent | Same field types and bookmark extent; switches differ only by design (`\w` where Word uses `\r`, and `\* CHARFORMAT` added, research R5); B gets a new `_RC…` bookmark, A reuses Word's `_Ref…` one (FR-011); bookmarks and fields made by Word are untouched | FR-012, FR-011, FR-011a |
| 27 | Put the cursor inside an existing cross-reference field; press the shortcut, Enter; Esc; Enter, Enter; Ctrl+Z | First Enter: warning that the field will be replaced, nothing changed; Esc keeps it; second Enter replaces the whole field with the new reference; one Ctrl+Z restores the old field | FR-008b, FR-013 |
