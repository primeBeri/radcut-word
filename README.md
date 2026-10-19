# RAD·CUT

Keyboard-driven cross-references for Microsoft Word.

Press a shortcut, fuzzy-search the document's headings in a palette, press Enter, and a live Word cross-reference is inserted at the cursor. RAD·CUT brings the two-keystroke linking habit of PKM tools such as Obsidian and Logseq to Word, without locking documents into an add-in.

> **Status:** early planning. Nothing is installable yet.

## Why

Word's built-in Cross-reference dialog is modal, mouse-heavy and lists every heading in one unfiltered box. In long technical documents (specifications, design guides, BIM Execution Plans) authors end up typing "see section 4.3" as plain text, which breaks silently when the document is restructured.

## How it works

1. Place the cursor and press **Ctrl+Shift+Y** (configurable).
2. Type to fuzzy-filter the document's headings.
3. Use **↑ ↓** to choose, **Tab** to cycle the reference format, **Enter** to insert, **Esc** to cancel.

The output is standard Word: a hidden bookmark on the target heading and hyperlinked REF fields pointing at it. Anyone can update the references with F9, and the add-in is not needed to read or edit the document. The palette starts on the first format in your list of cross reference formats, out of the box "§ Number & Text", for example "§ 4.3 Fire strategy". In settings you can reorder the list, which is the Tab order, add other built-in formats or your own custom formats, and have the palette start on the format you used last.

With the search box empty, the palette lists the headings you referenced most recently in the document, up to five, under "Recent" above the full list. They are kept on your computer, never in the document, and "Show recently used headings" in settings turns them off.

Requires headings that use Word's built-in Heading 1–9 styles or outline levels.

## Roadmap

| Phase | Adds |
| --- | --- |
| 0 | Feasibility spikes on Word for Windows |
| 1 | MVP: shortcut → palette → cross-reference, Windows desktop |
| 2 | Backlinks pane ("referenced by") |
| 3 | Broken-reference and orphan-heading reports |
| 4 | Word on the web and Mac |
| 5 | Figures, tables, captions and named bookmarks |
| 6 | Links to headings in other documents |
| 7 | Onboarding, docs site and AppSource release |

## Tech

TypeScript and the Office.js Word API. The core is plain TypeScript behind a document gateway interface, so it is tested with Vitest without Word running. No document content leaves your machine.

## Licence

[Apache License 2.0](LICENSE). See [NOTICE](NOTICE).
