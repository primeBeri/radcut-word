# Spike runbook (tasks T014–T016)

How to run the three Phase 0 feasibility spikes in Word for Windows and where to record what
you find. Allow about half a day per spike. Run them in order: spike 1 decides whether the
palette can work at all.

## 0. One-time setup

1. Close Word completely (check Task Manager for `WINWORD.EXE`).
2. In the repository root:

   ```powershell
   npm install
   npm run certs        # trusts a localhost HTTPS certificate; accept the Windows prompt
   ```

3. Spikes change documents, so work on copies of the fixtures:

   ```powershell
   $spikes = "$env:TEMP\radcut-spikes"
   New-Item -ItemType Directory -Force $spikes | Out-Null
   Copy-Item tests\fixtures\*.docx $spikes
   ```

   Make extra copies of `tracked.docx` for spike 3 (`tracked-accept.docx`,
   `tracked-reject.docx`).

## 1. Start Word with the dev panes

```powershell
npm run start:dev-pane -- --document "$env:TEMP\radcut-spikes\spec-300.docx"
```

This starts the dev server on `https://localhost:3000`, sideloads the add-in and opens the
document in Word. Then:

1. On the **Home** tab, at the right-hand end, find the **XRef** group and click
   **Cross-reference**. The task pane opens on the **dev launcher**.
2. Click **Spike pane**. The log at the bottom starts with **Requirement sets**: copy that line,
   because every spike outcome depends on it.
3. Use **Copy log** to put the log on the clipboard at any point. Paste it into a scratch file
   as you go, because the log is lost when the pane reloads.

To switch documents, run `npm stop`, then start again with a different `--document`. You can
also open another fixture from Word's File menu, then reopen the pane from the ribbon and click
Spike pane again.

If the XRef group is missing, open it from **Home → Add-ins → Advanced → Developer
Add-ins → XRef**. If it isn't listed there either: close Word, clear
`%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\`, and start again. The start/stop scripts sideload
a copy of the manifest from `%LOCALAPPDATA%\radcut-dev\`, because Word ignores a sideloaded
manifest whose path contains the `·` of the repository folder. Record anything else here
under R2.

## 2. Spike 1: shortcut and focus (R3, R4, R8, R11)

Document: `spec-300.docx`.

| Step | What to do | What to note |
|---|---|---|
| 1.1 | Click **Shortcut state**. | `getShortcuts` and whether Ctrl+Alt+K and Ctrl+Shift+Alt+K are in use. If Word showed a "which action should this shortcut run?" prompt at any point, note what it said and what you chose. |
| 1.2 | Press **Esc** in the probe box to hide the pane. Click in the body text. Press **Ctrl+Alt+K**. | Does the pane appear? Without clicking, type `abc`: do three `probe keydown` lines appear with `clickedSinceShow: false`? Also note the `activeElementIsProbe` and `msToShow` values, and whether "Word selection unchanged" is `true`. |
| 1.3 | Press **Esc** in the probe, then type `xyz` straight away without clicking. | Does `xyz` land in the document at the original caret position? |
| 1.4 | Repeat 1.2 and 1.3 using the ribbon **Cross-reference** button instead of the shortcut. | Same questions. |
| 1.5 | With the pane open and the probe focused, press **Ctrl+,**. | Does the log show "Ctrl+, reached the page"? Did Word do anything (for example change the font size)? If the keystroke doesn't arrive, choose another combination and note it. |
| 1.6 | Switch Windows to a **UK keyboard layout** (Win+Space), then repeat 1.2 in body text. | Does Ctrl+Alt+K open the pane without typing a character? Also try AltGr+K. |
| 1.7 | Click **Read selection facts** with the cursor in each place: body text, the comment, the text box, the header, the footnote, the endnote, a table cell. | `parentBodyType` and `parentOfBodyType` for each place. Plan R8 expects comments and text boxes to report `Unknown`. |
| 1.8 | Same button, with these selected: a few words; a whole paragraph including its mark (triple-click); "First of two paragraphs." plus the next paragraph; the whole table; the inline picture. | `paragraphCount`, `tableCount`, `pictureCount`, `shapeCount`, `contentControlCount` for each. The key question: does a triple-clicked paragraph count as 1 paragraph or 2? |
| 1.9 | Click **Theme and reduced motion**: once with Windows animation effects on and once off (Settings > Accessibility > Visual effects), then with the Office theme set to Dark (File > Account). | Does `prefers-reduced-motion` follow the Windows setting? What does `officeTheme` contain? |
| 1.10 | **Only if 1.2 failed:** click **Toggle palette surface** (it switches to the dialog), then repeat 1.2 and 1.3. | Messages from the dialog: is `focusedOnOpen` true, do keystrokes arrive without a click, how long did it take to open, and does Esc return the caret? |

**Decides**: task pane or dialog (R3), the default shortcut (R4), and whether an Animations
setting is needed (R11, task T099). If neither the pane nor the dialog takes keyboard focus,
stop: per plan.md the spec has to change first.

## 3. Spike 2: REF survives F9 (R5, R6, R7)

Document: a fresh copy of `spec-300.docx`.

**Counting Undo steps:** after each insert, click the small arrow beside **Undo** in the Quick
Access Toolbar. The list shows each undo step; count how many entries the insert added. Then
press Ctrl+Z that many times and check the document is back exactly as before: no reference,
no new bookmark (use Insert > Bookmark with "Hidden bookmarks" ticked), and any replaced
selection restored.

| Step | What to do | What to note |
|---|---|---|
| 2.1 | **Read headings in every story**. | `totalMs`, `mainHeadings`; whether `listString` gives "4.3" (full) or "3" (level only); which other stories reported headings; whether `textBoxSupport` is true. |
| 2.2 | **Compare bookmark ranges**. | The relation for each bookmark. Expected: the `_Toc…` and `_Ref…` bookmarks and `zeta`/`Alpha` report `Equal`; `WholeParagraph` and `PartOfText` don't. Also check the "content range excludes the paragraph mark" sample. |
| 2.3 | Put the caret in "The fire strategy is described here." and click **Insert § number text → "Fire strategy"**. | Does it read "§ 4.3 Fire strategy"? Number of Undo steps. Then Ctrl+A, F9: still correct? Ctrl+click: does it jump to the heading? |
| 2.4 | Repeat 2.3 with a few words selected, then with two paragraphs selected. | Was the selection replaced? Number of Undo steps for each. |
| 2.5 | **Same, bookmark written last** ("Means of escape" has only a `_Hlk` bookmark, so a new one is created). | Number of Undo steps, compared with 2.3. |
| 2.6 | **Insert … → "Scope"**. | `bookmarkCreated: false` (reuses `_Ref…`). Number of Undo steps. |
| 2.7 | Move the "Fire strategy" heading above "Means of escape" (cut and paste), then Ctrl+A, F9. | Do the references now show the new number? |
| 2.8 | Caret in "Bold body text.", then click **Insert all seven formats**; repeat in "Italic body text.". | Each format's result. Is the formatting the surrounding bold/italic, or the heading's? Then F9: is the formatting kept? If it changes, the plan adds `\* CHARFORMAT` (FR-012a). |
| 2.9 | Caret in plain body text, then click **Insert § number text → "Heading with bold word"**. | Does the heading's direct bold on "bold" carry into the reference, before or after F9? |
| 2.10 | **Read REF/PAGEREF fields**. | Compare our field codes and fonts with the two references made by Word's dialog in "References made by Word…". Any difference other than the bookmark name needs a decision (R5). |
| 2.11 | **Bookmark + REF for a heading in each other story**. | The result per story; then F9 and Ctrl+click each one. Note any story where creating the bookmark, the field result or the jump fails. That decides which stories are listed (R7). |
| 2.12 | Only if any `insertField` call threw an error, or more than one Undo step appeared in 2.3–2.6: **OOXML complex-field path** (run 2.3 first so a bookmark exists). | Number of Undo steps, any extra paragraph, any imported style. |

**Decides**: insertField or OOXML; whether the full number comes from `listString` or has to be
composed; whether `\* CHARFORMAT` is needed; which stories are listed; the write path for one
Undo step. **If no path gives one Undo step, stop and raise it with the product owner (FR-013):
it blocks release.**

## 4. Spike 3: tracked changes (R9)

Documents: copies of `tracked.docx`. Steps 3.2 onwards need a heading called "Fire strategy",
so run them on a copy of `spec-300.docx` with tracking turned on, as described.

| Step | What to do | What to note |
|---|---|---|
| 3.1 | Open `tracked.docx` and click **Detect headings that are tracked deletions**. | Does "Deleted heading" report a `Deleted` change and "Inserted heading" an `Added` change? Or does it say WordApi 1.6 is unsupported, in which case the fallback applies? |
| 3.2 | Open a spec-300 copy, click **Turn change tracking on**, then **Insert with tracking on** with the caret in body text. | Is the reference shown as one tracked insertion? Number of Undo steps with tracking on. |
| 3.3 | On copy A: **Accept all**, then Ctrl+A, F9. | Does the reference still update and jump? |
| 3.4 | On copy B (repeat 3.2 first): **Reject all**, then spike 2's **Compare bookmark ranges**. | Is the reference gone? Is the created `_RC…` bookmark still on the heading? |
| 3.5 | Co-authoring, by hand, with two accounts or devices, per `docs/acceptance-checklist.md`. | The outcome. It's fine to defer this until a second user is available, as long as you note that. |

## 5. Recording the outcomes

Under each research entry in `specs/001-heading-xref-palette/research.md`, add a line:

```markdown
- **Outcome (spike N, 2026-10-DD, Word build XXXX)**: what happened; decision; fallback used or not.
```

| Entry | Comes from |
|---|---|
| R3 surface and focus | 1.2–1.4, 1.10 |
| R4 default shortcut | 1.1, 1.6 |
| R5 field insertion, formatting, Undo | 2.3–2.10, 2.12, 3.2 |
| R6 bookmarks | 2.2, 2.6 |
| R7 heading read, numbers, stories | 2.1, 2.11 |
| R8 cursor location and selection extent | 1.2 (selection unchanged), 1.7, 1.8 |
| R9 tracked changes | 3.1–3.5 |
| R11 theme and motion | 1.9 |

The Word build number is under File > Account > About Word.

If you prefer, paste the saved logs and your notes into the chat. I'll write the outcome
lines, then do T017: apply the decisions to plan.md, research.md, `shortcuts.json`, and the
spec if needed.
