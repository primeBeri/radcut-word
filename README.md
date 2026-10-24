# XRef

Keyboard-driven cross-references for Microsoft Word.

XRef was called RAD·CUT until October 2026. The feature specs and run logs under `specs/` and `docs/` keep the old name, as written at the time.

Press a shortcut, fuzzy-search the document's headings in a palette, press Enter, and a live Word cross-reference is inserted at the cursor. XRef brings the two-keystroke linking habit of PKM tools such as Obsidian and Logseq to Word, without locking documents into an add-in.

> **Status:** the MVP for Word on Windows desktop is in its release checks. It is not yet published; to try it, sideload it as below.

## Why

Word's built-in Cross-reference dialog is modal, mouse-heavy and lists every heading in one unfiltered box. In long technical documents (specifications, design guides, BIM Execution Plans) authors end up typing "see section 4.3" as plain text, which breaks silently when the document is restructured.

## How it works

1. Place the cursor and press **Ctrl+Shift+Y** (configurable), or click **Cross-reference** in the XRef group on the Home tab.
2. Type to fuzzy-filter the document's headings: `fstrat` finds "4.3 Fire strategy", and `4.3` works too.
3. Use **↑ ↓** to choose, **Tab** to cycle the reference format, **Enter** to insert, **Esc** to cancel.

The output is standard Word: a hidden bookmark on the target heading and hyperlinked REF fields pointing at it. Anyone can update the references with F9, Ctrl+click follows them, and the add-in is not needed to read or edit the document. One Ctrl+Z removes an inserted reference.

With the search box empty, the palette lists the headings you referenced most recently in the document, up to five, under "Recent" above the full list. "Show recently used headings" in settings turns them off.

Headings are paragraphs in Word's built-in Heading 1–9 styles or with an outline level; bold text formatted by hand is not a heading. Headings in tables, text boxes, footnotes, endnotes, headers and footers are listed with a badge saying where they are.

## Keyboard

| Key | In the palette |
| --- | --- |
| Ctrl+Shift+Y | Open the palette (pressed again while it is open: back to its search box) |
| Type | Filter the headings |
| ↑ ↓, Page Up, Page Down | Choose a heading |
| Tab, Shift+Tab | Next or previous format; the selected row previews the result |
| Enter | Insert. Replacing a selection that spans paragraphs or holds a picture, shape or content control, or an existing field, asks first: Enter again to confirm |
| Esc | Close without changing anything (or dismiss a warning) |
| Ctrl+, | Settings |

The shortcut can be changed in settings (Office keeps it in your Microsoft 365 account, so changing it needs you to be signed in).

## Formats

The palette starts on the first format in your list, out of the box "§ Number & Text", for example "§ 4.3 Fire strategy". Tab cycles the list. In settings you can reorder it, remove formats, add the other built-in ones, add your own, and have the palette start on the format you used last.

| Built-in format | Example |
| --- | --- |
| § Number & Text | § 4.3 Fire strategy |
| Number Only | 4.3 |
| Text Only | Fire strategy |
| Number & Text | 4.3 Fire strategy |
| Page Number | 12 |
| Above/Below | above |
| Text + Above/Below | Fire strategy below |

A custom format is a template of text and placeholders, each of which becomes its own field: `{number}` (the heading number in full context, "4.3"), `{text}` (the heading text), `{page}` (its page number) and `{abovebelow}` ("above" or "below"). For example `see §{number} {text}, {abovebelow}` gives "see §4.3 Fire strategy, above". Write `{{` or `}}` for a literal brace. In footnotes, endnotes, headers, footers and text boxes, formats with `{abovebelow}` are skipped, because Word shows the heading text there instead.

For a heading without a number, the number is left out together with the text that follows it up to the next placeholder (and a bracket opened before it), so "§ Number & Text" gives "§ Heading text".

## Install (sideloading)

XRef runs from a local web server on your machine. You need Word for Windows (Microsoft 365), Node.js and npm.

```powershell
git clone <this repository> xref
cd xref
npm install
npm run certs   # once: a trusted HTTPS certificate for localhost:3000
npm start       # starts the server and sideloads XRef into Word
```

`npm stop` unloads it. Since Word 2609, an add-in sideloaded this way loses its keyboard shortcut on most starts (office-js#6973); the ribbon button still works. Loading the manifest from a shared-folder add-in catalogue does not help either: Word 2609 does not register that copy's shortcuts. See `tests/desktop/README.md`.

Known behaviours, such as what happens when a tracked reference is rejected, are listed in [docs/known-behaviours.md](docs/known-behaviours.md).

## Privacy

XRef makes no network requests after it has loaded, and no document content leaves your computer. Your settings and recently used headings are kept by Office on your computer, never in the document.

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

TypeScript, Svelte and the Office.js Word API. The core is plain TypeScript behind a document gateway interface, so it is tested with Vitest without Word running; a desktop harness checks the add-in in Word itself. Performance measurements are in [docs/performance.md](docs/performance.md).

## Licence

[Apache License 2.0](LICENSE). See [NOTICE](NOTICE).
