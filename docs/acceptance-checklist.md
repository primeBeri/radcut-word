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
