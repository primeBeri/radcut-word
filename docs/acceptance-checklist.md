# Manual acceptance checklist

Per-release checks on Word for Windows desktop. The full list from quickstart scenarios 1–27 is
added by T101; items below were added by earlier tasks.

## Co-authoring (spike 3, research R9)

- [ ] With the document open by two users on SharePoint or OneDrive, user A inserts a reference
      while user B edits elsewhere. After both save and sync: the reference shows the right
      number and text, F9 updates it, Ctrl+click jumps, and user B sees the same. Record the
      outcome in `docs/known-behaviours.md`.

## US1 run (T055), 2026-10-11

Word for Windows desktop 16.0.20430.20092, `spec-300.docx` (scratch copy), `tracked.docx`.
Numbers are the quickstart scenario numbers.

| # | Result | Notes |
|---|---|---|
| 1 | Pass | |
| 2 | Pass | |
| 3 | Pass | |
| 4 | Not run | The scenario wording was unclear; to be rerun (insert twice to one heading, then check Insert → Bookmark with hidden bookmarks shown). |
| 5 | Pass | One Undo step each time; warning shown for a multi-paragraph selection. |
| 6 | Not run | |
| 12 | Pass | Message shown; the setting it names arrives with US2. Protected document declines only at Enter (known gap). |
| 13 | Pass | |
| 19 | Pass | |
| 20 | Pass | |
| 21 | Pass | |
| 23 | Fail (table) | Words and multi-paragraph selections pass. A whole-table selection, confirmed, put the fields in the first cell and then showed "The reference couldn't be inserted. The document hasn't been changed", which is untrue. |
| 25 | Pass | Default settings part only. Badges could use more colour within Fluent. |
| 26 | Pass on substance | Field types and switches as designed (`\w` for Word's `\r`; `\* CHARFORMAT` added). RAD·CUT reused the `_Ref…` bookmark Word's dialog had already put on the heading, which is the FR-011 reuse rule; the scenario's "`_RC…`" expectation only holds when RAD·CUT inserts first or targets a heading Word has not bookmarked. Bookmark extent not recorded. |

Observations from the same run:

- Large document: the pane is blank for about 2 s after the shortcut, and Enter takes 2–3 s.
- Pressing the shortcut again with the palette already open: typing filters at once, then the
  palette resets about 2 s later.
- `tracked.docx`: occasionally a tracked-deleted heading is listed and can be referenced; not yet
  reproducible on demand.
- Hiding and showing the pane on every use reflows the document in multi-page view.
- The extended-selection warning sits at the foot of the pane, far from the selected row on large
  monitors.
- With the caret inside an existing REF field, an insertion appears to succeed, shows briefly
  inside the field result, then disappears when the field updates; the original field is intact.
- Search on joined fragments and the dark theme were both well received.

Rerun after T107–T112, 2026-10-11:

- Opening the palette and inserting are both much faster on `spec-300.docx` (T110).
- Scenario 27: the field under the caret is replaced. Only that field is replaced, so with the
  caret in the text part of "§ 4.3 Fire strategy" the "§ 4.3 " part stays (backlog item).
- Closing the pane with × and pressing the shortcut again gives an empty search box.

## In-Word contract run (T051), 2026-10-12

`IDocumentGateway: OfficeJsGateway` on scratch copies of `spec-300.docx`, four runs. Run 4:
32 passed, 6 failed, every failure a case the script cannot drive.

Fixed along the way: field codes carry control characters (`parseFieldCode`); a heading bookmark
shares its start with the paragraph, so Word reports "ContainsStart" rather than "Contains";
bookmark lists are per story, so document-wide lists cover every story (`storyBodies`); Word
refuses `insertField` next to a selected picture, so such a selection is cleared first; several
harness and test assumptions that only held for the fake (field order, paragraph text with field
results, the debug span read before the field update).

Still to check by hand:

- [x] Case 2 on `plain-headings.docx` and case 2a on `tracked.docx` (after the harness switched change tracking off while restoring).
- [x] Cases 5 and 5b, comment: cursor in a comment, open the palette, expect the comment message.
- [x] Cases 5 and 5a, protected: Review → Restrict Editing, open the palette and press Enter;
      the protected message now appears as the palette opens.
- [x] Case 10a, content control: select a content control, Enter (warning), Enter (replaced),
      then one Ctrl+Z restores it.
- [x] Case 10a, picture: after the replacement, one Ctrl+Z restores the picture (FR-013).
- [x] `IHostShell: OfficeHostShell` suite (shortcut, ribbon and × cases by hand).

Hand checks, 2026-10-12: comment message, content control (warning, replace, one Undo), picture
(one Undo restores it) and the host-shell suite all pass. Case 2 needed two fixtures in one case,
so it could pass in neither document; it is now 2 (`plain-headings`) and 2a (`tracked`). A
protected document gave the part-way write message instead of the protected one, because Word
did not refuse with AccessDenied; protection is now read up front (`protectionType`, WordApiDesktop
1.4), so the palette declines as it opens.

## US1 rerun (T055), 2026-10-12

After T107–T112 and the in-Word contract fixes: scenarios 4, 6, 23, 26 and 27 pass. With the
first run (1–3, 5, 12, 13, 19–21, 25 default settings part), every T055 scenario passes. US1 is
complete.

## In-Word contract run after the convergence (Phase 9), 2026-10-12 to 2026-10-13

`IDocumentGateway: OfficeJsGateway`, five runs on scratch copies of `spec-300.docx`. Last run:
40 passed, 12 failed, every failure a case that needs another fixture or a hand check. Cases 2
(`plain-headings.docx`), 2a and the tracked-deletion part of 9a (`tracked.docx`) pass. Every new
case (1b, 7d, 9a, 9b, 10d, 10e, 12a, 13a) passes.

Fixed along the way: the heading scan read paragraph text that only headers and footers load; a
format's literals after the first were not inserted (`??=` skipped the insert); a long heading
opening a note got a bookmark over its first 120 characters only; the harness listed fields in
the main text only, and assumed the fake's name for Word's own `_Ref` bookmark.

Found in Word: in a footnote or endnote, a `\p` (above/below) field shows the heading text, not
"above" or "below". Decided 2026-10-13: above/below formats are not offered there (FR-016a).

Still to check by hand. Use the add-in as shipped (`npm start`, not the dev pane) on a fresh
scratch copy of `spec-300.docx`; Ctrl+Shift+Y opens the palette.

- [x] **Case 5, text box.** Click inside the text box ("Text box body."), press Ctrl+Shift+Y.
      Expect "References can't go in text boxes." and no heading list.
- [x] **Cases 5 and 5b, comment.** Click inside the comment ("A comment."), press Ctrl+Shift+Y.
      Expect "References can't go in comments.", also with "Allow references in headings" on.
- [x] **Cases 5 and 5a, protected.** Review → Restrict Editing → "Allow only this type of
      editing: No changes (Read only)" → Yes, Start Enforcing Protection (no password). Click in
      "The fire strategy is described here.", press Ctrl+Shift+Y. Expect "This document is
      protected, so references can't be inserted." as the palette opens; the document is unchanged.
      Stop Protection afterwards.
- [x] **Case 10a, content control.** Developer → Controls → Plain Text Content Control into a body
      paragraph, type a word in it, select the control (click its title tab). Press Ctrl+Shift+Y,
      choose "Fire strategy", Enter: expect the warning that the selection will be replaced, and
      nothing written. Enter again: the control is replaced by "§ 4.3 Fire strategy". One Ctrl+Z
      brings the control back and removes the reference.
- [x] **Case 7a (after F9), formatting.** Put the cursor mid-word in "Bold body text.", insert a
      reference to "Fire strategy"; repeat in "Italic body text.". Ctrl+A, F9. Expect both
      references to keep the bold and the italic of the text around them (not the heading's style).
- [x] **Case 7c (jump), other stories.** The references go in the main text and point at
      headings in the other stories; keep the cursor in the main text for this case. For each target in turn: click in "The fire
      strategy is described here.", press Ctrl+Shift+Y, type part of the heading's name, pick it
      (its badge names the story) and press Enter. Targets: "Heading in a table cell", "Heading in
      a text box", "Heading in a footnote", "Heading in an endnote", "Heading in the header",
      "Heading in the footer". Then Ctrl+click each of the six references: expect Word to jump to
      that heading.

Hand checks, 2026-10-13: text box, comment, protected, 7a and 14 pass. 7c passed for the table
cell, footnote and endnote; the cursor had been put in the text box, header and footer, which
are declined as expected, so those three targets are to be rechecked with the steps above. 10a
failed: a selected plain-text content control was replaced without the warning, and with the
cursor inside one only "§ " was written before Word refused the field ("part-way" message).
Word allows no fields in a plain-text content control; FR-001a and FR-008a were refined
2026-10-13 (decline inside; warn, then replace, for the whole control). Recheck, 2026-10-15:
7c passes for the text box, header and footer targets too.
- [x] **Case 14, update and Undo.** Insert "§ 4.3 Fire strategy" in "The fire strategy is
      described here.". Expect one entry in the Undo list (arrow beside Undo); Ctrl+Z removes the
      whole reference in one step, Ctrl+Y puts it back. Cut the "Fire strategy" heading paragraph
      and paste it above "Means of escape", then Ctrl+A, F9: the reference shows the new number
      and still reads "Fire strategy".

Content control hand checks after T137, 2026-10-13 (plain-text control): caret inside, and some
text selected inside, are declined with the plain-text control message (pass). All of its text
selected gave the warning, but the write put "§ " before the control and then failed, because
Word refused the field before the control's own range; the write now selects the whole control
first and replaces that selection. The control selected with its handle was replaced without
the warning, because Word reports it neither among the selection's controls nor as its
container; the controls in the selection's paragraph are now checked as well. Both pass on recheck: warning, then replaced, one Undo.

## In-Word contract run after Phase 10 (T138), 2026-10-14

`IDocumentGateway: OfficeJsGateway` on a scratch copy of the regenerated `spec-300.docx`: 42
passed, 12 failed, every failure a case that needs another fixture or a hand check. Case 5d's
rich-text part passes; its plain-text part and case 10f are hand checks (the 10a content-control
checks above), because the harness's restore before each case (`insertOoxml` over the body)
keeps a rich-text content control but drops a plain-text one, and Word refuses to put one back
from script (`insertContentControl("PlainText")` throws). The fixture's controls are now inline,
as a user would insert them in running text; Word makes a block-level control of one that covers
the paragraph's whole text. Case 5 (text box) passed from script in the last four runs. One run
had 7d fail with `hostError` and did not repeat; cases 8 and 9 now place the cursor themselves,
and a failed insert reports the heading and Word's detail.

## Headers, footers and text boxes (Phase 11, T139 and T142)

Allowed from 2026-10-14 (FR-001a). Spike 4 runs from the dev pane (`npm run start:dev-pane`,
Spikes, "Spike 4") on a scratch copy of `spec-300.docx`; it uses the production write path.

- [x] **Spike 4, per place.** For each of "Header text.", "Footer text." and "Text box body."
      (double-click a header or footer to edit it): click in it, run "Insert § number text".
      Expect "§ 4.3 Fire strategy" there; one Ctrl+Z removes all of it; Ctrl+Y, then F9 keeps
      it; Ctrl+click jumps to "Fire strategy".
- [x] **Spike 4, above/below.** In each place run "Insert text + above/below"; note what the
      `\p` field shows before and after F9 ("above"/"below", or the heading text as in notes).
- [x] **Spike 4, caret.** In each place run "Hide the pane and return the caret", then type a
      character: it lands where the cursor was.
- [x] **Spike 4, linked header.** On a copy, add a Next Page section break at the end of the
      main text; in section 2's header ("Same as Previous") run the linked-header insert: the
      reference shows in both sections' headers, one Undo.
- [x] **T142, as shipped.** With `npm start`, in each place press Ctrl+Shift+Y, pick "Fire
      strategy", Enter: inserted, one Undo, the caret returns, Ctrl+click jumps.

Results, 2026-10-14 to 2026-10-15: every place passes (one Undo, F9, Ctrl+click, caret return),
and the linked header shows the reference in both sections. Above/below: in a header, footer or
text box the `\p` field shows the heading text, not "above"/"below", exactly as Word's own
cross-reference dialog does there (a header or footer spans pages; a text box floats outside the
paragraph flow); so FR-016a leaves those formats out there too (US2, T057/T060/T064). As shipped,
Ctrl+Shift+Y in each place inserts the reference (T142 hand check, pass).

Contract run in Word, 2026-10-15 (fresh copy of `spec-300.docx`): 46 passed, 13 failed, all by
design (other fixtures, protection, comments, the plain-text control the restore drops, and the
F9/Ctrl+click/Undo manual checks). Cases 5 (header, footer, text box allowed) and 9c (writes in
all three, resolving, no heading orders) pass. In 5b the header and footer headings pass; Word
will not place the cursor in "Heading in a text box" (the text box's first paragraph) from
script after the restore, so that part is a hand check:

- [ ] **5b, text box heading.** Once the settings view exists (T069), turn on "allow references
      in headings", click in "Heading in a text box", press Ctrl+Shift+Y: the palette opens and
      inserts. With the setting off (as shipped) it declines as a heading.

## Contract-run speed (feature 002, T008 and T012), 2026-10-15

`IDocumentGateway: OfficeJsGateway` from the dev pane, on fresh scratch copies:

| Fixture | Change | Total | Outcome |
|---|---|---|---|
| `spec-300.docx` | before 002 | 20–25 min | 46 passed, 13 by design |
| `spec-300.docx` | restore only after a case that wrote | 17 min 16.6 s | 46 passed, the same 13 |
| `spec-contract.docx` | and the small contract fixture | 1 min 3.5 s | 47 passed, 12 by design |

The extra pass is case 5b's text box heading: no write precedes it, so no restore runs before it
and Word accepts the selection. It still depends on that order (after a restore Word refuses),
so the item above stays open until the desktop harness covers it (002 T028). Details: 
`specs/002-desktop-test-harness/research.md`, "D2 measurements".

## Automated contract run (feature 002, M1), 2026-10-15

`npm run test:desktop -- --filter-trait "Category=Contract"`, three runs, no person involved: 65
passed, 1 failed, the same each time. The desktop harness opens scratch copies of `spec-contract`,
`tracked` and `plain-headings`, runs the gateway and host-shell suites from the dev contract pane,
and sets up through Word COM and UI Automation what Office.js cannot. Now automated, so off the
hand-check lists of T051, T138 and T142: the caret in a comment; a protected document; the text box
heading (5b); the plain-text control inside (5d); formatting after F9 (7a); Ctrl+click on each
reference (7c, in every story); one Undo after a caret, a word, a picture and a content control
(14); the number after moving a heading and F9 (14); the shortcut, the ribbon button and the
pane's × (host shell).

Deferred past V1 (002 T047, owner's decision 2026-10-15): case 10f, the plain-text control
selected whole, and the plain-text part of the 10a hand check. Office.js stops listing the control
after the harness's restore, so the case cannot be set up in Word; it still runs against the fake.
See `docs/backlog.md`.

## Automated document checks (feature 002, M2), 2026-10-15

`npm run test:desktop -- --filter-trait "Category=Document"`, three runs, 7 of 7 each time, about
1.5 minutes. Each scenario inserts through the real palette (Ctrl+Shift+Y, typing, Enter) and
reads the result through Word itself:

| # | Result | Notes |
|---|---|---|
| 3 | Pass | "4.3" becomes "4.1" after moving the section and F9; Ctrl+click lands on the heading |
| 4 | Pass | The second reference reuses the first one's `_RC…` bookmark; one bookmark added in all |
| 6 | Pass | Saved, reopened with the add-in unregistered, F9: same results, no errors |
| 14 | Pass | `tracked.docx`: the insertion is tracked; correct after Accept All; Reject All removes it with no errors. With Track Changes on, F9 itself is tracked (Word), so the check after accepting runs with tracking off |
| 19 | Pass | A new `_RC…` bookmark (the `_Toc…` one not reused); still correct after the TOC update and F9 |
| 20 | Pass | Bold and italic follow the surrounding text, not the heading, before and after F9 |
| 26 | Pass | Against Word's own dialog: same field types and bookmark extent, switches differ only by design (`\w`, `\* CHARFORMAT`); B gets `_RC…`, A reuses Word's `_Ref…`; Word's bookmark and fields untouched |

## Automated US1 run (feature 002, T041), 2026-10-16

`npm run test:desktop`, ten consecutive full runs on the test VM (Word 2609, 16.0.20430), no
person involved; every scenario had the same result in all ten (the Scenario category alone was
run twice more for the locked-screen check). Rows marked Human stay on this checklist; "Not run"
rows have no harness test in US1 (later stories).

| # | Result | Notes |
|---|---|---|
| 1 | Fail | Feature 001 T143: after Enter the caret stays before the inserted reference, not after it |
| 2 | Pass | Automated |
| 3 | Pass | Automated |
| 4 | Pass | Automated |
| 5 | Pass | Automated |
| 6 | Pass | Automated |
| 7 | Not run | No harness test yet |
| 8 | Not run | No harness test yet |
| 9 | Not run | No harness test yet |
| 10 | Human | A physical UK keyboard: the shortcut works and no stray character is typed |
| 11 | Not run | No harness test yet |
| 12 | Pass | Automated |
| 13 | Pass | Automated |
| 14 | Pass | Automated |
| 15 | Human | A visual pass over the light, dark and black themes |
| 16 | Not run | No harness test yet |
| 17 | Human | Co-authoring on SharePoint or OneDrive with two users |
| 18 | Pass | Automated |
| 19 | Pass | Automated |
| 20 | Pass | Automated |
| 21 | Pass | Automated |
| 22 | Pass | Automated |
| 23 | Fail | Words and multi-paragraph selections pass; with a table selected the add-in declines as the palette opens ("References can't replace a table."), while the test expected the palette and the refusal on Enter. Owner's decision, 2026-10-17: declining at open is right; a table selected after the palette opened must be declined at Enter. The test now checks both and passes (three runs) |
| 24 | Not run | No harness test yet |
| 25 | Pass | Automated. By hand: the badges' colours, by eye; the settings part waits for the settings view (US2) |
| 26 | Pass | Automated |
| 27 | Pass | Automated |

## Automated US1 and US2 run (feature 001, T071), 2026-10-17

`npm run test:desktop` on the test VM (Word 2609), no person involved: every scenario with a
harness test passes, US1 after the T143, T144 and T145 changes and US2 for the first time. Rows
9 and 11 have no harness test yet (later stories); rows marked Human stay on this checklist.

| # | Result | Notes |
|---|---|---|
| 1 | Pass | Automated |
| 2 | Pass | Automated |
| 3 | Pass | Automated |
| 4 | Pass | Automated |
| 5 | Pass | Automated |
| 6 | Pass | Automated |
| 7 | Pass | Automated |
| 8 | Pass | Automated |
| 9 | Not run | No harness test in this run |
| 10 | Human | A physical UK keyboard: the shortcut works and no stray character is typed |
| 11 | Not run | No harness test in this run |
| 12 | Pass | Automated |
| 13 | Pass | Automated |
| 14 | Pass | Automated |
| 15 | Human | A visual pass over the light, dark and black themes |
| 16 | Pass | Automated |
| 17 | Human | Co-authoring on SharePoint or OneDrive with two users |
| 18 | Pass | Automated |
| 19 | Pass | Automated |
| 20 | Pass | Automated |
| 21 | Pass | Automated |
| 22 | Pass | Automated |
| 23 | Pass | Automated |
| 24 | Pass | Automated |
| 25 | Pass | Automated. By hand: The badges' colours, by eye |
| 26 | Pass | Automated |
| 27 | Pass | Automated |

## Automated US3 run (feature 001, T078), 2026-10-17

`npm run test:desktop -- --filter-class "*Us3Scenarios"` and the Contract category on the test
VM (Word 2609), no person involved. Scenario 9 makes the template in the settings view, sees
`{num}` refused with its message next to the field and focus on it, cycles to the template
after the built-ins, inserts it as previewed, updates fields, then edits and deletes the
template and checks the inserted reference is unchanged. Contract case 9e inserts a template
with every placeholder kind, a repeat and literal braces: 72 passed, 2 skipped (10f deferred,
S5 Node only).

| # | Result | Notes |
|---|---|---|
| 9 | Pass | Automated (`Scenario09`) |

## Automated US4 run (feature 001, T088), 2026-10-17

`npm run test:desktop -- --filter-class "*Us4Scenarios"` and the Contract category on the test
VM (Word 2609, signed in), no person involved, with the UK layout made Word's input language
for the test. Scenario 10 (first test) opens the palette from the ribbon's Cross-reference
button with keyboard focus in the search box and inserts as after the shortcut; presses
Ctrl+Shift+Y and checks no character is typed; records Ctrl+@ (Shift+' on UK) and sees it
refused with its reason, then Ctrl+B and sees it reported as kept by Word (updated
2026-10-18). Scenario 10b records Ctrl+Alt+J: Word refuses every
`Office.actions.replaceShortcuts` call (`InvalidArgument`, research R4), so the test checks the
settings view names the refused combination and keeps recording, that Ctrl+Shift+Y still opens
the palette, and skips the rest with that reason. Rerun 2026-10-18 after the owner reset the
account's shortcut and removed `npm start`'s leftover developer registration: scenario 10
passes, 10b skips as above. The refusal's cause is Word 2609 never registering the catalogue
copy's shortcuts (office-js#6973, research R4). Contract and Scenario categories: 95 passed,
5 skipped, 0 failed.

| # | Result | Notes |
|---|---|---|
| 10 | Partial | Ribbon, Ctrl+@ and UK layout pass (`Scenario10_the_ribbon_…`); a new shortcut cannot be set on this Word (`Scenario10_a_recorded_shortcut_…` skipped: replaceShortcuts refused). Recheck on a later Word build or a store install |
| 10 | Human | A physical UK keyboard: the shortcut works and no stray character is typed |

## Automated run after the settings refinement (feature 001, Phase 13, T156), 2026-10-18

`npm run test:desktop -- --filter-trait "Category=Scenario"`, then `"Category=Contract"` (two
`--filter-trait` options do not combine), on the test VM (Word 2609), no person involved. The format
list replaces the default format: scenario 7 adds page, above/below and text + above/below in
settings and cycles all seven in list order; scenario 8 moves Number to the top; new scenario 8b
remembers the last used format across a restart until it is removed from the list. Contract: 76
passed, 4 skipped (10f deferred; K3, K6 and S5 Node only). Scenario: 19 passed, 1 skipped (10b,
replaceShortcuts refused, research R4), 1 failed: US1 scenario 25 timed out waiting for the RAD·CUT
ribbon group and then passed 3 of 3 on its own; its evidence was cleared by the Contract run, so the
cause is not confirmed (Word's mid-session add-in reinstall, seen twice before, drops that group).

| # | Result | Notes |
|---|---|---|
| 7 | Pass | Automated (`Scenario07`), all seven built-ins once added |
| 8 | Pass | Automated (`Scenario08`), format moved to the top of the list |
| 8b | Pass | Automated (`Scenario08b`) |
| 9 | Pass | Automated (`Scenario09`), template at the end of the list |
| — | Human | Visual check of the settings view in Word: sections, info tooltips, previews lined up in their column, dragging a row |

## Automated run after the owner's wording (feature 001, T158), 2026-10-18

`npm run test:desktop -- --filter-trait "Category=Scenario"`, then `"Category=Contract"`, on the test VM (Word 2609), no person involved, after the settings texts and built-in format names were renamed (T157). Scenario: 20 passed, 1 skipped (10b, replaceShortcuts refused, research R4), including US1 scenario 25, which failed once in the T156 run. Contract: 76 passed, 4 skipped (10f deferred; K3, K6 and S5 Node only). The visual check of the settings view (badge, tooltips with line breaks, narrow-pane rows) was done by the owner in Word.

## Automated run for US5, recently used headings (feature 001, T095), 2026-10-19

`npm run test:desktop -- --filter-trait "Category=Contract"`, then `"Category=Scenario"`, on the test VM (Word 2609), no person involved. Contract: 80 passed, 4 skipped (10f deferred; K3, K6 and S5 Node only), including the new recents cases R1–R4 on `OfficeRuntime.storage`. Scenario: 20 passed, 1 skipped (10b, replaceShortcuts refused, research R4), 2 failed: both new US5 scenarios, on a harness mistake (each looked up a paragraph by its whole text after an insertion had changed it). With each insertion in a paragraph of its own, `--filter-class "*Us5Scenarios"` passed 2 of 2. The scenarios were written after the implementation, so they were not seen red against the code before it.

| # | Result | Notes |
|---|---|---|
| 11 | Pass | Automated (`Scenario11`): both under Recent, most recent first; ↓ crosses into All headings; typing removes the groups |
| 11b | Pass | Automated (`Scenario11b`): no groups while "Show recently used headings" is off and nothing recorded; back on, the earlier recent returns |
| — | Human | Visual check in Word of the Recent and All headings labels and the new Headings checkbox with its tooltip |

## Automated rerun after the US5 review fixes (feature 001), 2026-10-19

`npm run test:desktop -- --filter-trait "Category=Scenario"` on the test VM (Word 2609), no person involved, after commit 7970600 (prune race, stored recents held to the limits, recents writes one at a time). Scenario: 21 passed, 2 failed, including both US5 scenarios 11 and 11b. The two failures, US1 scenario 2 and US4 scenario 10b, each timed out after 60 s waiting for the RAD·CUT ribbon group, before the palette was reached (the add-in not loading on this Word, as in the T156 run). Run on their own, `--filter-method "*Scenario02_*"` passed 1 of 1 and `"*Scenario10_*"` gave 1 passed, 1 skipped (10b, replaceShortcuts refused, research R4).
