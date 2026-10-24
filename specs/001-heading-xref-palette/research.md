# Research: Heading Cross-Reference Palette (MVP)

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-10-10

Each entry records a decision, why it was made, and what else was considered. Items marked
**SPIKE** are proven (or overturned) by the Phase 0 spikes before feature work depends on them
(Constitution VI). Each spike-dependent decision names its fallback.

Requirement-set builds referenced below (Word on Windows, Microsoft 365): WordApi 1.3 = 1612,
1.4 = 2208, 1.5 = 2302; WordApiDesktop 1.4 = 2508; SharedRuntime 1.1 = 2205;
KeyboardShortcuts 1.1 = 2408.

---

## R1. Manifest type and runtime

- **Decision**: Add-in only XML manifest, shared runtime (`<Runtimes>` with `lifetime="long"`),
  keyboard shortcuts via `<ExtendedOverrides>` pointing at `shortcuts.json`.
- **Rationale**: Custom shortcuts in Word require the shared runtime. The XML manifest is the
  production-grade path for Word; the unified JSON manifest is still described as preview for
  Word in Microsoft's tooling docs, despite the overview listing support from build 2501.
- **Alternatives**: Unified JSON manifest (rejected for now: conflicting support statements;
  revisit in the web/Mac phase). Non-shared runtime (rejected: shortcuts would not work).
- **Sources**: learn.microsoft.com — design/keyboard-shortcuts; develop/configure-your-add-in-to-use-a-shared-runtime; develop/unified-manifest-overview.

## R2. Build tooling and scaffold

- **Decision**: Vite + Svelte + TypeScript project, with the XML manifest generated from
  `yo office` ("manifest only") and converted by hand to the shared runtime. Sideload and HTTPS
  via `office-addin-dev-certs` and `office-addin-debugging`. Vitest for tests.
- **Rationale**: Svelte and Vitest are native to Vite, giving one toolchain for build, dev server
  and tests. The Yeoman templates are webpack and React based; converting them costs more than
  starting from a manifest.
- **Risk**: Vite is not officially supported by Microsoft's Office tooling. Mitigation: spike 1
  is built on this toolchain, so any sideload or HTTPS problem shows up on day one; fallback is
  the Yeoman webpack template with `svelte-loader`.
- **Alternatives**: `yo office` TypeScript/webpack (fallback). Microsoft 365 Agents Toolkit
  (rejected: unified manifest only, Word in preview).

## R3. Palette surface and focus — SPIKE 1

- **Decision**: The palette lives in the task pane, shown with `Office.addin.showAsTaskpane()`
  from the shortcut's `Office.actions.associate` handler; on show, the search input is focused.
  After insert or Esc, `Office.addin.hide()` and `range.select()` return the caret to the
  document.
- **Rationale**: One runtime, one bundle, no cross-window messaging; settings live in the same
  pane (spec FR-021a).
- **Unverified**: whether the pane takes keyboard focus when opened by shortcut, and whether
  `range.select()` moves keyboard focus back to the document. No documentation either way.
- **Fallback**: `displayDialogAsync` popup for the palette only (separate runtime, talks to the
  shared runtime by `messageParent`/`messageChild`; DialogApi 1.2 checked at runtime). Settings
  stay in the task pane. Accept up to ~1 s open time in the fallback and record it.
- **Distribution note**: since 2026-02-23 `showAsTaskpane()` is ignored for Marketplace-published
  add-ins unless triggered by an explicit user action. This MVP is sideloaded, so it does not
  apply now; whether a keyboard shortcut counts as explicit user action must be re-checked before
  store publication.
- **Outcome (spike 1, 2026-10-11, Word 16.0.20430.20092)**: the task pane takes keyboard focus
  when opened by the shortcut. `showAsTaskpane()` + `focus()` gives `activeElementIsProbe: true`
  in 5–21 ms, typed keys reach the input with `clickedSinceShow: false`, and showing the pane does
  not move Word's selection. Esc → `hide()` + `range.select()` returns the caret: typing lands at
  the original position. **Decision: task pane; the dialog fallback is not needed** (1.10 not
  run). Ribbon: the first click opened the pane, later clicks did nothing while the shortcut
  kept working, because the handler never called `event.completed()` and Word treated the first
  command as still running. **Decision: every `Office.actions.associate` handler calls
  `event?.completed()` when done** (shortcuts pass no event); fixed in the spike pane, required
  in `OfficeHostShell` (T050).
  Sideloading note: Word ignores a registry-sideloaded manifest whose path has non-ASCII
  characters, so the start/stop scripts sideload a copy (see CLAUDE.md).

## R4. Default shortcut and customisation — SPIKE 1

- **Decision**: Keep **Ctrl+Alt+K** as the default (spec FR-001) provisionally. Spike 1 runs
  `Office.actions.areShortcutsInUse(["Ctrl+Alt+K"])` and a UK-layout test. If Ctrl+Alt+K is taken
  by Word or produces a character, switch the default to **Ctrl+Shift+Alt+K** (Microsoft's
  recommended pattern) and update the spec via `/speckit-refine-update`.
- **Customisation**: `Office.actions.replaceShortcuts({ OpenPalette: "<combo>" })`; read back
  with `getShortcuts()`; check with `areShortcutsInUse()` before saving and refuse combinations
  in use (FR-020). Validation of the combination rules (at least one modifier, Shift not the only
  modifier, one key from A–Z/0–9/`-`/`_`/`+`, never Ctrl+@) is a pure core function.
- **Constraints found**:
  - Custom shortcuts are stored by Office in the user's roaming settings and only work when the
    user is signed in to Microsoft 365. When signed out, the settings view shows the shortcut as
    read-only with that explanation.
  - When a shortcut conflicts, Office itself asks the user once which action wins; if the user
    picks Word's, `getShortcuts()` returns `null` for our action. The settings view MUST show
    "no shortcut assigned" in that case.
  - AltGr is sent as Ctrl+Alt on Windows, so Ctrl+Alt+letter can collide on European layouts.
    UK AltGr only affects vowels and 4; K is believed safe but is tested in the spike.
- **Outcome (spike 1, 2026-10-11, Word 16.0.20430.20092)**: `areShortcutsInUse` reports
  Ctrl+Alt+K **in use** and Ctrl+Shift+Alt+K free; on first press Word showed its conflict
  prompt and, once our action was chosen, Ctrl+Alt+K opened the pane reliably. On the UK layout
  Ctrl+Alt+K types no character and AltGr+K also opened the pane. Ctrl+, reaches the pane and
  Word does nothing with it, so it stays the settings shortcut. A second run checked every
  two-modifier + letter/digit combination with `areShortcutsInUse`: free were Ctrl+Alt + A B E J Q
  R T W X 0 4 6 7 8 9, Ctrl+Shift + C Y 0–7 9, Alt+Shift + B G H J Q S V W Y Z 0. The list is not
  complete: Ctrl+Shift+C (copy formatting) and Ctrl+Alt+R/T (® and ™) are Word shortcuts
  reported as free. **Decision (product owner, 2026-10-11): default `Ctrl+Shift+Y`.** Three keys
  rather than four (Ctrl+Shift+Alt+K was rejected as too long), free in Word, and with no Alt
  there is no AltGr clash on any layout. Confirmed in Word the same day: Ctrl+Shift+Y opens the
  pane with no conflict prompt. If a later build claims it, the next choice is Ctrl+Alt+J.
- **Customising, found in US4 (2026-10-17, Word 2609, signed in, add-in sideloaded by the
  harness)**: `getShortcuts()` gives `{ OpenPalette: "Ctrl+Shift+Y" }` and `areShortcutsInUse`
  works (Ctrl+Alt+K and our own Ctrl+Shift+Y in use, Ctrl+Alt+J free), but **every
  `replaceShortcuts` call is refused with `InvalidArgument`** (`ActionService.replaceShortcuts`):
  Ctrl+Alt+J, the default itself, `null` (the documented reset), `""` and even `{}`. No office-js
  issue or documentation explains it; the documented causes (unknown action id, invalid
  combination, signed out) do not fit. Whether a store or centrally deployed install is allowed
  could not be checked on this VM (catalogue sideloading is broken on 2609). **Decision**: the
  host port's `replace` returns `"refused"` for `InvalidArgument`; the settings view then says
  "Word didn't allow the shortcut to be changed, so it stays as it is." and turns read-only.
  Ctrl+@ and the other rules are checked by the core first, so they are refused the same way
  whatever Word does. Recheck on each new Word build (harness scenario 10b skips with this reason
  while Word refuses).
- **Customising in the owner's Word (2026-10-18, same VM and build, Word started normally)**:
  changes work there for some combinations (Ctrl+Shift+1 to 4, Ctrl+Alt+B) and not others, so
  the refusal is per combination outside the harness. Two causes, found with a harness probe:
  (1) **Word runs its own shortcuts before the pane sees the key**: while the pane has focus,
  Ctrl+B, Ctrl+J, Ctrl+Q, Ctrl+1, Ctrl+Alt+1, Ctrl+Alt+K and Ctrl+Shift+A, J, M and Q never
  reach the page; it gets only the modifiers' keydown and keyup. Ctrl+A, Ctrl+Shift+ a digit,
  Ctrl+Alt+J or Q, Alt+Shift+J and Ctrl+Shift+Alt+K do reach it. (2) **`replaceShortcuts`
  refuses some combinations that `areShortcutsInUse` calls free**, with the same bare
  `InvalidArgument` and no reason (`debugInfo` has only the statement). **Decision** (replaces
  the read-only one above): a refusal is about that combination only. The view says "Word
  wouldn't accept <combination> and gave no reason. Try another." and keeps recording; Ctrl or
  Alt pressed and released with no other key reaching the pane is reported as "Word kept that
  combination for one of its own commands. Try another."; the recording hint says Ctrl+Shift
  with a digit is usually free. Word still runs its command on the document (Ctrl+B toggles
  bold), which the add-in cannot prevent. Why the harness's Word refuses every change while
  the owner's accepts some is not known; Office keeps the shortcut per account, so a change
  made in the owner's Word is the harness's too, and the harness cannot reset it.
  Later the same morning the owner's Word refused every change too (Ctrl+Shift+4, which had
  worked, and the reset, `null`), with the shortcut left at Ctrl+Alt+B; the manifest default
  Ctrl+Shift+Y is reported in use (by the add-in itself), so choosing it is now treated as the
  reset. The customisation is not in any local file or registry key (it roams with the account,
  as the guide says); why Word stops accepting changes is not known.
- **Cause found (2026-10-18)**: since 2026-10-15 every Word on the VM had loaded the add-in
  **twice**, the `npm start` developer registration (never unregistered) and the harness's
  catalogue copy, same id, two RAD·CUT ribbon groups. Word's cached shortcut table
  (`%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\AggregatedCache\1.1\<hash>\ShortcutsMapping.Word.en-US`, last written 2026-10-17) maps Ctrl+Shift+Y to the **developer** copy only. With
  the developer registration removed (`npm stop`) the catalogue copy is still refused; with the
  cache moved aside too, `getShortcuts()` returns `{}`: **Word 2609 never registered the
  catalogue copy's shortcuts at all** (the same regression as office-js#6973, which also drops
  them for developer registrations on most starts). `InvalidArgument` is then accurate
  ("ActionId doesn't exist"): there is nothing of this add-in's to replace. Ctrl+Shift+Y had
  worked in the harness only through the stale cache entry, which the shared runtime honours
  because the id is the same. The owner's changes that did work were presumably made on a start
  where Word had registered the shortcuts. **Consequences**: (1) the add-in's handling stands: a
  refusal is reported with the combination and recording goes on, since on a start where the
  shortcuts are registered changes do work; (2) the harness keeps relying on the cached entry
  (restored after the experiment) and now refuses to run while a developer registration exists,
  so Word cannot load two copies; (3) do not use `npm start` and the catalogue route at the
  same time, and `npm stop` after `npm start`. Recheck customising when Microsoft fixes
  office-js#6973.

## R5. Inserting cross-references — SPIKE 2

- **Decision**: In one `Word.run` and one `sync`: ensure the target bookmark, then insert literal
  text and fields at the captured range with `Range.insertField(location, Word.FieldType.ref |
  pageRef, "<bookmark> <switches>")` (WordApi 1.5), then `updateResult()` on each new field.
- **Format → field mapping** (all with `\h`, and `\* CHARFORMAT` appended to every field per
  the spike 2 outcome below):

  | Format | Composition |
  |---|---|
  | text | REF `bm \h` |
  | number | REF `bm \w \h` |
  | number + text | REF `bm \w \h` + " " + REF `bm \h` |
  | § number text (default) | "§ " + REF `bm \w \h` + " " + REF `bm \h` |
  | page | PAGEREF `bm \h` |
  | above/below | REF `bm \p \h` |
  | text + above/below | REF `bm \h` + " " + REF `bm \p \h` |

- **Formatting (FR-012a)**: the reference must look like the surrounding text and stay that way
  after F9. Fields are inserted with `removeFormatting = true` so no heading formatting is
  copied, and the add-in sets no character formatting. Heading paragraph styles do not travel
  with a REF result, but direct character formatting inside a heading may. If spike 2 shows the
  result picking up heading formatting or losing the surrounding formatting on F9, add
  `\* CHARFORMAT` to every field (result takes the formatting of the field code's first
  character, which is inserted in the surrounding formatting). The switch is then part of the
  R5 mapping for all formats.
- **Unverified**: the exact `text` argument shape for Ref/PageRef (no Microsoft example), the
  formatting behaviour above, and whether `updateResult()` is needed for a correct initial
  display.
- **Fallback**: `insertOoxml` with complex fields (`w:fldChar` begin/separate/end, `w:instrText`,
  cached result run), followed by `updateResult()`. Watch for extra paragraphs and imported
  styles.
- **Undo (FR-013, mandatory)**: there is no undo-grouping API for Word. All writes (selection
  replacement, bookmark, literals, fields, `updateResult()`) go in one `Word.run` and one `sync`.
  Spike 2 counts the Undo presses that restore the document for: no selection, an inline
  selection, a confirmed extended selection, a reused bookmark and a new bookmark; spike 3
  repeats them with tracking on. If the primary path needs more than one, try the OOXML path and
  write-order variations (bookmark first or last). If no path gives one step, stop: it is a
  release blocker raised with the product owner (plan "Delivery sequence"), not a documented
  exception.
- **Match Word's own dialog** (spec Assumptions): spike 2 also inserts a heading-text and a
  heading-number reference with Insert → Cross-reference and compares field codes, switches,
  bookmark extent and resulting formatting with ours. Differences other than the bookmark name
  are fixed in the mapping above or recorded here with a reason.
- **Outcome (spike 2, 2026-10-11, Word 16.0.20430.20092)**: `insertField` works for every format
  (codes as in the mapping, e.g. ` REF _RC… \w \h `) and gives the right result without further
  action. **One Undo step** in every case: no selection, inline selection, two-paragraph
  selection, new bookmark (written first or last), reused `_Ref` bookmark, the six-story run
  (2.11), and with tracking on (3.2). F9 and Ctrl+click work. **Decision: `insertField` path;
  bookmark first; the OOXML fallback (T049) is not needed.**
  - Formatting: literals and the number, page and above/below fields take the surrounding bold
    or italic; the **heading-text REF does not**: it shows the heading's own character
    formatting, including direct bold inside the heading (2.9). That breaks FR-012a, so per the
    rule above **`\* CHARFORMAT` is added to every field**. Verified in Word: with it, all seven
    formats inserted into bold and into italic text match the surrounding formatting in every
    part, including the heading text with direct bold, before and after F9.
  - Word's dialog: heading number = ` REF _Ref… \r \h `, heading text = ` REF _Ref… \h `, no
    `\* MERGEFORMAT`, same font as ours. The only difference is `\r` (relative number) where we
    use `\w` (full number); `\w` is kept on purpose, because the format is defined as the full
    number (FR-012) and `\r` drops levels shared with the reference's position.
  - Moving a heading (2.7): the reference to the moved heading followed it. A reference to
    "Means of escape" then showed "Fire strategy" in heading style: the pasted heading landed at
    the start of the bookmarked text and Word extended the bookmark over it. This is Word's
    behaviour for any bookmark that starts a paragraph (its own `_Ref` bookmarks have the same
    extent), so it is documented in `docs/known-behaviours.md` (T100), not worked around.

## R6. Bookmarks

- **Decision**:
  - Read: `paragraphRange.getBookmarks(includeHidden = true, includeAdjacent = false)` and
    `document.getBookmarkRangeOrNullObject(name)` (WordApi 1.4).
  - Reuse rule (spec FR-011): a bookmark is **usable** only if
    1. its range spans exactly the heading's text, not the paragraph mark (otherwise a text REF
       would pull in a paragraph break and heading style), and
    2. it is not Word-managed. Word-managed names are matched case-insensitively against a
       core exclusion list: `_Toc` prefix (table-of-contents entries, deleted and recreated
       when the TOC updates), `_GoBack` (last edit position), `_Hlk` prefix (hyperlink targets
       Word may tidy away). The list lives in one core constant with unit tests so additions
       are cheap.

    Among usable bookmarks, pick the first in case-insensitive name order, so the choice is the
    same every time. Word's own cross-reference bookmarks (`_Ref` prefix) are usable. If none is
    usable, create one. Unusable bookmarks are left untouched, so no duplicate of a usable
    bookmark is ever made.
  - Reading extents: compare each bookmark's range with the heading text range
    (`getBookmarkRangeOrNullObject(name)` then `compareLocationWith`, WordApi 1.4/1.3). Spike 2
    confirms this works for hidden bookmarks and `_Toc…` bookmarks.
  - Create: `range.insertBookmark(name)` over the heading text (paragraph range minus the
    paragraph mark), the same extent Word's cross-reference dialog gives its `_Ref…` bookmarks.
  - Hands off (FR-011a): bookmarks and fields the add-in did not create are never renamed,
    moved, removed or flagged, whatever their state. Advice on bad practice is for the backlinks
    phase.
  - Naming: `_RC` + 10 characters from `[a-z0-9]` (random), checked against all existing names
    (case-insensitive) and regenerated on collision. 13 characters, inside the 40 limit; only
    letters, digits and underscore; the leading `_` hides it. The name never derives from heading
    text or position, so it is stable under edits (FR-012). Word's own `_Ref` + digits style was
    considered and declined (2026-10-10) so the add-in's bookmarks stay identifiable.
- **Rationale**: Word's naming rules (alphanumeric and underscore, start with a letter or `_` for
  hidden, max 40, case-insensitive; inserting an existing name moves it) are documented on
  `Word.Range.insertBookmark`.
- **Alternatives**: deriving names from heading text like Word's `_Ref` + number (rejected:
  leaks content shape, no benefit); always creating a new bookmark (violates FR-011).
- **Outcome (spike 2, 2026-10-11, Word 16.0.20430.20092)**: `getRange("Content")` excludes the
  paragraph mark. `compareLocationWith` works on hidden bookmarks: `_Toc…`, `_Ref…`, `_Hlk…`,
  `zeta` and `Alpha` report `Equal`; `WholeParagraph` reports `ContainsStart` and `PartOfText`
  `Inside`, so the usability rule can be decided from the relation alone. Reusing `_Ref242545576`
  for "Scope" created no bookmark; "Means of escape" (only `_Hlk`/`_Toc`) got a new `_RC…`
  bookmark, which later inserts reused. **Decision: as planned.**

## R7. Reading headings and numbers — SPIKE 2

- **Decision**: One batched load of `body.paragraphs` selecting `text, styleBuiltIn,
  outlineLevel, isListItem`; a second batch loads `listItemOrNullObject.listString` for heading
  paragraphs only. A paragraph is a heading if `styleBuiltIn` is Heading1–Heading9 or
  `outlineLevel` is 1–9 (values unverified; body text believed to be 10).
- **Numbers**: `listString` is used as the displayed number if the spike shows it returns the
  full-context number ("4.3"). If it returns only the level's own part ("3"), the core composes
  the full number from ancestor headings in `HeadingIndex`. The number is only for display and
  matching; the inserted field (`\w`) always gets Word's real number.
- **Other stories** (FR-003, FR-003a): table-cell headings are body paragraphs with
  `tableNestingLevel > 0` (`location: "tableCell"`). Footnotes and endnotes: `body.footnotes` and
  `body.endnotes` (WordApi 1.5), then each item's `body.paragraphs`. Headers and footers:
  `sections`, then `getHeader`/`getFooter` for primary, first-page and even-pages (WordApi 1.1);
  a story linked to the previous section is read once. Text boxes: `body.shapes` filtered to text
  boxes, then `shape.body.paragraphs` (WordApiDesktop 1.2, checked at runtime). Everything loads
  in the same batched syncs as the body. Order: main text (table cells in place), text boxes,
  footnotes, endnotes, headers, footers.
  **Unverified**: bookmark creation and REF/PAGEREF resolution in each story, the Ctrl+click
  jump, de-duplicating linked headers, and the extra read time at 300 headings. Spike 2 checks
  all of them. **Fallback** per story: if bookmarks cannot be created or referenced there, that
  story's headings are not listed and the spec is amended through `/speckit-refine-update`
  (FR-003); if WordApiDesktop 1.2 is missing, text-box headings are not listed and this is
  documented.
- **Performance**: target palette ready < 500 ms at 300 headings. The index is cached in memory
  per document and refreshed in the background when the palette opens; the palette shows the
  cached list immediately and swaps in the fresh one without moving the selection.
- **Outcome (spike 2, 2026-10-11, Word 16.0.20430.20092)**: `listString` returns the
  **full-context number** ("1.1", "4.3"), so no composition is needed. Body text has outline
  level 10. Reading all stories took **456 ms** for 301 main headings plus the other stories:
  under the 500 ms target with no margin, so the cache-first design above is required, not
  optional. Every story worked (2.11): bookmark creation, REF result, F9 and Ctrl+click in a
  table cell, footnote, endnote, header, footer and text box (`textBoxSupport: true`). **Decision:
  all stories listed; no FR-003 fallback.** New finding: a heading that is the first paragraph
  of a footnote or endnote reads as `"\u0002 Heading in a footnote"`, with the note's reference
  mark and a space at the start, and a REF to its content range repeats that mark. The core
  strips a leading `\u0002` and whitespace from heading text, and the adapter starts the
  bookmark after them.

## R8. Where the cursor is

- **Decision**: In the shortcut handler, load `getSelection()` with `parentBody.type` and the
  first paragraph's `styleBuiltIn` and `outlineLevel`.
  - Allowed: `MainDoc`, `Footnote`, `Endnote`, `NoteItem`, and `TableCell` whose chain leads
    to the main document.
  - Declined with a message: `Header`, `Footer`, `Unknown` (comments) and `Shape` (text
    boxes; spike 1 outcome below), and any heading, Title or Subtitle paragraph.
  - Read-only: check `document.protectionType` when WordApiDesktop 1.4 is available; otherwise
    catch the access-denied error on write and show the same message.
- **Policy** (FR-001b): `checkInsertionPoint` and `insertReference` receive
  `{ allowInHeadings }`. Gateways load raw facts and call the core's `classifyLocation`, so the
  rules live once. With the setting on, heading, Title and Subtitle paragraphs are allowed; the
  heading containing the cursor is reported as `inHeadingOrder` and left out of the list, and a
  target equal to it is declined `selfReference` at Enter.
- **Selection extent** (FR-008a): `extended` when the selection range has more than one
  paragraph (`range.paragraphs`), or contains a table (`range.tables`, WordApi 1.3), an inline
  picture (`range.inlinePictures`), a content control (`range.contentControls`) or a shape
  (`range.shapes`, WordApiDesktop 1.2 when supported); otherwise `inline`. The core's
  `classifySelection` decides from those counts. Equations and embedded objects are not
  detected; this is documented. **Unverified**: whether a whole-paragraph selection that
  includes its paragraph mark counts as one paragraph; spike 1 logs the counts.
- **When the check runs** (spec FR-008): twice. When the palette opens, so a disallowed place is
  reported straight away and the above/below preview has a position. Then again inside the
  insertion transaction at Enter, reading Word's selection afresh: the reference goes wherever
  the cursor is at that moment, and if the place is now disallowed or protected the
  transaction writes nothing and returns a decline reason. No range is tracked between open and
  Enter, which also avoids leaking tracked objects. Spike 1 checks that showing the pane does
  not move Word's selection and that it can be read from the pane.
- **Outcome (spike 1, 2026-10-11, Word 16.0.20430.20092)**: `parentBody.type` reports `MainDoc`,
  `Endnote`, `Header`, `Footer`, `TableCell` (with `parentOfBodyType: "MainDoc"`), and **`Shape`
  for a text box**, not `Unknown`; a comment reports `Unknown` (style `Other`) and a footnote
  `Footnote`.
  **Hand checks (2026-10-13)**: with a plain-text content control selected by its title tab,
  the selection was replaced without the warning, so the control was not counted; with the
  cursor inside one, Word wrote the literal text and then refused `insertField` (fields are not
  allowed in plain-text controls). Reading `range.parentContentControlOrNullObject` (`type`,
  and `compareLocationWith` its whole range) covers both: inside a plain-text control is
  declined `plainTextControl`, the whole control is `extended`. Rich-text controls take fields.
  A triple-clicked paragraph including its mark counts as **1** paragraph (inline); heading plus
  body counts as 2; a whole table gives `tableCount: 1`; an inline picture counts as both
  `pictureCount: 1` and `shapeCount: 1`. Showing the pane leaves Word's selection unchanged.
  **Decision: as planned, with `Shape` added to the declined body types.**
- **Refinement (2026-10-14)**: `Header`, `Footer` and `Shape` (text box) move to the allowed
  body types, with the same paragraph exclusions as the main text (FR-001a); a table cell is
  allowed when its chain leads to any allowed story. Only `Unknown` (comments) stays declined
  by body type. `precedingHeadingOrder` and `inHeadingOrder` are `null` there, as in notes.
  **Unverified, spike 4**: one Undo step for the R5 write in each; F9 and Ctrl+click from the
  reference; `range.select()` returning the caret into a header or footer after the pane hides
  (Word may need header view); a header linked to the previous section receiving the write in
  the shared story; and what a `\p` field shows there (if the heading text, as in notes,
  FR-016a's exclusion applies).
- **Outcome (spike 4, 2026-10-14)**: with the cursor in a header (`Header`), a footer (`Footer`)
  and a text box (`Shape`), the production path wrote `§ 4.3 Fire strategy` at the cursor (REF
  `\w \h \* CHARFORMAT` and REF `\h \* CHARFORMAT`), reusing the bookmark from the first
  insert; one Ctrl+Z removed each, F9 kept the results and Ctrl+click jumped. Hiding the pane and
  `returnFocus` (`range.select()`) put the caret back in the header, footer or text box. In
  section 2's header linked to section 1 the reference appeared in both. A `\p` field shows the
  heading text, not "above"/"below", in all three, as in notes; Word's own cross-reference
  dialog does the same (a header or footer spans pages; a text box floats outside the paragraph
  flow). **Decision: allowed, as refined; FR-016a's exclusion covers headers, footers and text
  boxes.**

## R9. Tracked changes and co-authoring — SPIKE 3

- **Decision**: No special handling for insertion. Insert as normal with tracking on; the spike
  verifies the inserted text and fields appear as one tracked insertion and the reference still
  updates, and that one Undo still restores the document (FR-013; more than one is a blocker).
  Co-authoring is a manual checklist item; results are recorded in user documentation.
- **Rejected references** (spec edge case): rejecting removes the text and fields; a bookmark
  created for the reference may remain on the heading. That is accepted: it is hidden, usable
  and reused by the next reference. The spike records what actually happens, and the user
  documentation states it.
- **Headings that are tracked changes** (spec FR-003): headings shown as tracked deletions are
  not listed; tracked insertions are. Detection: `paragraph.getTrackedChanges()` /
  `Range.getTrackedChanges()` (WordApi 1.6) filtered for type `deleted` covering the whole
  heading text. **Unverified** — spike 3 confirms the API on build 2408+; fallback is to list
  such headings with a "(deleted)" suffix rather than hide them, and note it.
- **Outcome (spike 3, 2026-10-11, Word 16.0.20430.20092)**: WordApi 1.6 is supported;
  `getTrackedChanges()` reports "Deleted heading" as `Deleted` and "Inserted heading" as `Added`,
  so **deleted headings are hidden as planned; no fallback**. With tracking on, an insertion is
  one tracked insertion and one Undo step. After Accept all, F9 and Ctrl+click work. Moving a
  heading while tracking is on breaks REF updates (heading text shown as deleted, "unknown field
  change", the number pointing at the wrong heading). The same happens to Word's own
  cross-references and is a known Word issue, so it goes in `docs/known-behaviours.md` (T100).
  Reject all (rerun on a spec-300 copy) removes the reference and **leaves the `_RC…` bookmark on
  the heading** with the exact heading extent (`Equal`), as the rejected-references rule above
  expects: it is reused by the next reference and documented (T100). Co-authoring (3.5) is
  deferred until a second user is available; it stays on `docs/acceptance-checklist.md`.

## R10. UI layer

- **Decision**: **Svelte 5** (runes) compiled by Vite, styled with **Fluent 2 design tokens**
  (`@fluentui/tokens`, `webLightTheme`/`webDarkTheme` emitted as CSS custom properties at build
  time), and a hand-built WAI-ARIA combobox/listbox for the palette. No component library in the
  palette.
- **Rationale**: the palette and settings view hold state that changes on every keystroke (query,
  ranked results with highlight ranges, selection, format, preview, recents, messages, form
  fields). Svelte compiles that to direct DOM updates with a runtime of roughly 10 KB, which fits
  the constitution's 150 KB budget with a wide margin. Tokens give the Office Fluent look
  (FR-025) without a component framework.
- **Alternatives**:
  - Plain TypeScript + tokens: smallest, but the settings forms and template editor need
    hand-written binding. Kept as the fallback if Svelte causes trouble in the add-in WebView.
  - Fluent UI Web Components v3: good settings controls (~35–50 KB for a realistic set), but
    the dropdown is a form control, not a command palette, and shadow DOM complicates
    `aria-activedescendant`. May be lazy-loaded later for settings only if hand-built controls
    fall short.
  - Fluent UI React v9: best fidelity, but React plus Griffel is likely 100–150 KB gzip before
    our code. Rejected on budget.
  - Preact + signals, Solid, Lit: viable, but no advantage over Svelte here.
- **No maintained Fluent-styled Svelte library exists** (fluent-svelte and svelte-fui are
  inactive or pre-release), so tokens it is.

## R11. Theme and motion

- **Decision**:
  - Theme: on every palette or settings show, read `Office.context.officeTheme`
    (`isDarkTheme`, colours; `fluentThemeData` on Windows) and apply the light or dark token
    set. There is no `OfficeThemeChanged` event in Word (Outlook only), but reading on each show
    is enough because the views are shown fresh each time.
  - Motion: CSS transitions only (≤150 ms, opacity and transform), disabled by a
    `@media (prefers-reduced-motion: reduce)` rule. Svelte `transition:` directives are not used,
    because they ignore that media query.
- **Unverified**: whether the WebView2 inside Word reflects Windows "reduce animation" in
  `prefers-reduced-motion`. Spike 1 logs `matchMedia` results. Fallback: an "Animations" on/off
  toggle in settings, off by default if the media query cannot be trusted.
- **Outcome (spike 1, 2026-10-11, Word 16.0.20430.20092)**: `prefers-reduced-motion` follows the
  Windows setting (false → true), so **no Animations setting; T099 is dropped**.
  `prefers-color-scheme: dark` stays false even with Office's Black theme, while `officeTheme`
  reports it correctly (Colorful: `themeId 0`, `isDarkTheme false`; Black: `themeId 2`,
  `isDarkTheme true`; White: `themeId 3`). **Decision: theme comes only from
  `Office.context.officeTheme.isDarkTheme`, applied as `data-theme` on the root. The
  `prefers-color-scheme` media query is never relied on in the add-in.**

## R12. Fuzzy matching

- **Decision**: In-house fzy-style scorer in the core (`FuzzyMatcher`): dynamic programming over
  query × candidate, with bonuses for word starts, after separators (space, `.`, `-`) and
  consecutive runs, a gap penalty, and backtracking to return matched character positions for
  highlighting (FR-005a). It matches against the number and text together ("4.3 Fire strategy").
- **Rationale**: zero dependencies, under 1 KB, trivially fast at 500 items, tunable for heading
  numbers, and fully testable with a table of real abbreviations ("fstrat" → "Fire strategy",
  "4.3", "mos").
- **Alternatives**: fuzzysort 4 (8 KB, good results; used as a dev-only benchmark in tests to
  check ranking quality); uFuzzy (does not match "fstrat" across a space by default); fzf-for-js
  (fine, but larger than needed); fuse.js (poor for abbreviations).

## R13. Persistence

- **Decision**:
  - User settings (default format, templates, allow references in headings, show headings
    outside the main text) are stored in `OfficeRuntime.storage` under one
    versioned JSON key. The shortcut itself is stored by Office (R4).
  - Recents are stored in `OfficeRuntime.storage` keyed by `Office.context.document.url`, as
    bookmark names, at most 5 per document, and at most 50 documents (oldest dropped).
  - Unsaved documents (`url` empty or null) keep recents in memory for the session only.
- **Rationale**: per-user and outside the document (FR-021); 10 MB per-domain limit is far beyond
  need; no network (FR-023). `localStorage` also works in Word on Windows but
  `OfficeRuntime.storage` is the documented shared-runtime store.
- **Alternatives**: document settings or custom XML parts (rejected: stored in the document);
  `roamingSettings` (Outlook only).

## R14. Testing strategy

- **Decision**:
  - **Unit (Vitest, node)**: all core units against `FakeGateway`, `FakeSettingsStore`,
    `FakeHostShell`.
  - **Component (Vitest + @testing-library/svelte, jsdom)**: palette and settings behaviour —
    keyboard, ARIA roles and states, highlighting, preview, focus.
  - **Contract**: shared suites for every port — `tests/contract/document-gateway.contract.ts`
    and `tests/contract/host-ports.contract.ts` — run in Node against the fakes and inside Word
    against the Office adapters from a dev-only test pane that prints results in the pane.
    Fixture documents live in `tests/fixtures/`.
  - **App flow**: one integration test mounts the app from `createApp(ports)` with fakes.
  - **Performance**: the dev test pane times palette-ready and filter latency on the 300- and
    500-heading fixtures and reports against the budgets. Matcher speed is a Vitest benchmark
    (`npm run bench`). Unit tests never assert on timing (Constitution II).
  - **Manual acceptance**: checklist per release (focus, undo, tracked changes, co-authoring, UK
    layout, opening references without the add-in).
- **Boundary enforcement**: ESLint `no-restricted-globals` bans `Office`, `Word` and
  `OfficeRuntime` outside `src/adapters/`, with no exemptions (the composition root in
  `src/app/` and the dev panes in `src/dev/` reach Office only through adapter functions; the
  dev-only spike scripts live in `src/adapters/office/spikes/` and are excluded from release
  builds), and `no-restricted-imports` stops `src/core/` importing from
  `ui`, `adapters` or `app`, and `src/ui/` importing from `adapters`.
- **Deferred**: the earlier idea of a fully automated Word-driving harness (UI Automation, COM,
  OOXML checks) is not needed for this MVP. Reconsider if manual acceptance becomes the
  bottleneck.
