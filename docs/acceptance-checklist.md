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
