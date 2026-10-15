# Research: Desktop Test Harness

Decisions taken from `docs/proposals/0001-automated-testing.md` (the proposal) and from reading
the current code, plus the questions only the M0 spike can settle. Each M0 question has a
fallback, so no question blocks planning.

## D1. Harness technology

- **Decision**: one .NET test project, `tests/desktop/RadCut.DesktopTests`, targeting
  `net10.0-windows` with xUnit v3, Microsoft.Playwright (CDP connection only), FlaUI.UIA3 and
  late-bound Word COM interop.
- **Rationale**: COM, real OS input and CDP all have mature .NET libraries; one runner gives one
  report (TRX) and one place to own Word's lifecycle (proposal §4.1). The machine has the .NET 10
  SDK (LTS) installed, so `net10.0` replaces the proposal's `net8.0`. Late binding (`dynamic`)
  avoids a dependency on the Office primary interop assemblies, which need an Office install to
  build against.
- **Alternatives considered**: Pester/PowerShell (good COM, awkward FlaUI and Playwright);
  Node only (`winax` COM is fragile, native input libraries poorly maintained); Word PIAs (tie
  the build to the installed Office version).

## D2. Contract-run slowness (20–25 minutes, about 90 cases)

- **Finding** (from `src/adapters/office/dev-registration.ts` and `tests/fixtures/README.md`):
  1. `wordHarness()` restores the whole main text with `body.insertOoxml(snapshot, "Replace")`,
     plus every header and footer, before **every** case, including the read-only ones. The
     document is `spec-300.docx`: about 600 paragraphs, a table of contents with about 300
     entries and `_Toc` bookmarks, one multilevel list. Word then renumbers and repaginates.
  2. The contract fixture is the performance fixture. Chapters 5–76 exist only for the
     300-heading budget; contract cases name only the paragraphs listed in the fixture README
     (Chapter 5 and 6 bodies carry the footnote and endnote). `readHeadings` (about 450 ms at 300
     headings, research R12 of feature 001), `paragraphByText` (every paragraph of every story,
     two syncs, per `select`), `documentState` (every bookmark with two range comparisons, every
     field's result including the table of contents' entries; twice per mutating case) all scale
     with document size.
  3. The fixture-marker check after the restore loads every body paragraph again.
- **Decision**, in this order, each step measured before the next:
  1. **Measure**: `MiniTest` records per-case duration; the harness records restore, select and
     state-read time per case (`performance.now()`), shown in the pane and in the results JSON.
  2. **Small contract fixture** `spec-contract.docx`: the named paragraphs of `spec-300` in the
     same order and with the same other stories and bookmarks, with filler reduced to Chapters 5
     and 6 (which carry the notes), and a table of contents over those headings only. Built by
     `make-fixtures.ps1`; the fake gets `specContract` with the same texts. `ContractFixture`
     gains `"spec-contract"` and the gateway contract uses it wherever it uses `spec-300` today.
     `spec-300` stays for performance and the US1 scenarios that need size.
  3. **Restore only when dirty**: the Word harness wraps the gateway so any call other than
     the read-only list in data-model.md (DirtyState) marks the document dirty, as do
     `setParagraphText` and `failNextWrite`; selecting never does. The next `wordHarness()`
     restores only if dirty, and a cheap guard catches a missed write. The marker check reuses the
     restore's sync.
  4. **Cheaper lookups** only if the measurement still shows `paragraphByText` high: cache story
     paragraph lists until the next write.
- **Rationale**: steps 2 and 3 remove the dominant per-case cost without touching any case.
  Target under 5 minutes (FR-017); expectation is well under that.
- **Alternatives considered**: reopening a fresh scratch copy per case (slower without the
  harness, and impossible from the pane alone); undoing instead of restoring (Office.js has no
  Undo API); running cases in parallel (one document, one selection: not possible).
- **Guard**: the run on the new fixture must give the same outcome per case as the last recorded
  run on `spec-300` (46 passed in T142's run, the rest manual by design); any difference is a
  defect in the change, not in the case (FR-016).

### D2 measurements

| Run | Fixture | Change | Total | Outcomes |
|---|---|---|---|---|
| Before (T051/T142 runs) | `spec-300` | none | 20–25 min (owner's estimate) | 46 passed, the rest manual or other fixtures |
| T008, 2026-10-15 | `spec-300` | restore only when dirty | 17 min 16.6 s | 46 passed, 13 failed: the same cases (manual checks, other fixtures); 0 skipped |
| T012, 2026-10-15 | `spec-contract` | and the small fixture | 1 min 3.5 s | 47 passed, 12 failed: the same, except 5b's text box heading now passes (no restore precedes it) |

Findings from T008's per-case timings:

- Read-only cases now cost about 0.33 s for the guard instead of a full restore (about 30
  cases), which accounts for the saving.
- **A full restore gets slower over the run** on the same snapshot: about 5 s for cases 6–7,
  10–18 s by cases 7a–10b, 20–23 s by cases 11–13 (one restore each). Something accumulates in
  the document with each `insertOoxml` restore. Hypotheses, to test if the growth survives the
  small fixture: list numbering definitions or styles duplicated by each `insertOoxml`; inline
  picture parts duplicated; Word's Undo history growing.
- Writing with the cursor in a header or footer is slow in the gateway itself (case 9c: about
  51 s of gateway time for the seven formats in the header and in the footer, against 28 s in
  the text box and 5–8 s in notes and table cells). Worth a look in feature 001 (product
  latency, not only the harness).
- T012 on `spec-contract`: a full restore takes 0.5–0.9 s, a guard check 3–6 ms; the slowest
  case (9) takes 7.1 s. The counts noted after each restore stayed at 70 paragraphs, 1 list,
  373 styles and 1 picture through the run, so lists, styles and pictures do not accumulate.
  Restores still grow a little (0.53 s at case 1b to 0.90 s at case 13), which fits Word's
  Undo history growing; at one minute a run, not worth chasing. The diagnostic note is removed.
- The header and footer write cost on `spec-300` (51 s of gateway time in case 9c) falls to
  0.6–0.7 s on `spec-contract`, so it scales with document size: feature 001 should time an
  insertion from a header in a large document (its T096/T098 performance work).
- 5b's text box heading passes when no restore precedes it, confirming that Word refuses the
  selection only in a text box re-created by `insertOoxml`.
- The multi-restore cases dominate: case 9 (1 min 9.6 s of restores), 10a (47 s), 13a (45 s),
  7c and 7d (40 s each).

## D3. Reaching the task pane (M0 question, proposal §8.1)

- **Route A (try first)**: `office-addin-debugging start` (via `scripts/office-debug.mjs`) is
  documented to enable WebView2 debugging for VS Code on port 9229; try
  `ConnectOverCDPAsync("http://127.0.0.1:9229")`.
- **Route B**: start `WINWORD.EXE` as a child process with
  `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<free port>` and a dedicated
  `WEBVIEW2_USER_DATA_FOLDER`, on that process only. COM activation (`new Word.Application`) is
  launched by DCOM and does not inherit the environment, so the harness starts the process and
  then attaches COM to it (D4).
- **Selecting the page**: among the CDP targets, the page whose URL starts with
  `https://localhost:3000/` and whose path is the pane (`taskpane.html` or
  `src/dev/contract-pane.html`).
- **Fallback if neither works**: layers 4–5 still run; palette state is read through UI
  Automation; the contract run stays manual but faster (D2). Stop and report (FR-012).

### D3–D6 outcome (M0, 2026-10-15)

Route B works and is the default; route A fails (no debugging port in this Office build). The
injected task pane parts are needed to load the development add-in for the scratch copy but do
not open the pane, which the harness opens from RAD·CUT's ribbon button through UI Automation.
COM attaches through the Running Object Table (D4). The dev-pane build does not answer
Ctrl+Shift+Y (D6), so layer 5 runs on the normal build. Details in `tests/desktop/README.md`,
"Routes that worked".

## D4. Attaching COM to the Word the harness started (M0 question, §8.2)

- **Decision**: P/Invoke `oleaut32!GetActiveObject("Word.Application")` after the started
  process's main window exists, verified by comparing the COM `Application`'s window handle (or
  its `Documents` containing the scratch path) with the process the harness started. If that
  fails, walk the Running Object Table for the scratch document's moniker and use
  `Document.Application`.
- **Rationale**: `Marshal.GetActiveObject` does not exist in .NET 5+. Binding through the
  document's moniker guarantees the instance is ours.

## D5. Opening the pane on the scratch copy without a click (M0 question, §8.3)

- **Candidates**: `office-addin-debugging start … desktop --app word --document <scratch>` (its
  sideload opens the pane); the shortcut through FlaUI (normal build); the ribbon button through
  FlaUI (dev-pane launcher).
- **Decision**: try them in that order; record which works. Registration (sideload) itself always
  goes through `scripts/office-debug.mjs` or the same ASCII-path rule.

## D6. Dev-pane build and the shortcut (M0 question, §8.4)

- **Question**: does the dev-pane build still answer Ctrl+Shift+Y?
- **Fallback**: run layer 3 on the dev-pane build and layers 4–5 on the normal build, restarting
  the dev server and Word between them.

## D7. Never touching the owner's Word

- **Decision**: before anything else, if any `WINWORD.EXE` exists, fail with "Word is running;
  save your work and close Word, then run again." The harness records the process ids it starts
  and only ever stops those. Leftover scratch folders older than the current run are deleted at
  start; a leftover Word is never assumed to be ours.

## D8. Waiting without sleeps

- **Decision**: one `Wait.Until(condition, timeout, description)` helper polling with a short
  back-off; Playwright's own auto-waiting for DOM conditions. Default time-outs: 60 s for Word
  start and sideload, 10 s for pane conditions, 2 s for focus. A time-out fails with the
  description and triggers evidence capture.

## D9. Evidence on failure

- **Decision**: per failed test, under `tests/desktop/test-results/<test>/`: Playwright trace
  (`tracing` started on connect), a PNG of the Word window (window capture by handle, not the
  whole screen), the scratch `.docx` saved under a new name, and the pane's console log. The
  folder is gitignored.

## D10. Report format

- **Decision**: `npm run test:desktop` (Microsoft.Testing.Platform, opted in by `global.json`, since the
  .NET 10 SDK no longer runs xUnit v3 through VSTest) with `--report-xunit-trx --report-xunit-junit`, plus a Markdown
  summary written by the harness (`test-results/summary.md`; the scenario run also writes
  `test-results/acceptance-summary.md` in the checklist's table format).

## D11. Hyperlink jump (M2 question)

- **Decision**: try `Field.DoClick()` on a REF `\h` field and check that `Selection` lies within
  the target bookmark. If it does not move the selection, record that in the harness README and
  keep the Ctrl+click jump on the human list.
- **Outcome (M1, 2026-10-15)**: `Field.DoClick()` leaves the cursor where it is, a REF `\h`
  result has no `Hyperlinks`, and `Window.GetPoint` fails ("Command failed"). What works is a real
  Ctrl+click: put the cursor one character into the reference through COM, read where Windows
  draws Word's caret (`GetGUIThreadInfo`), and Ctrl+click there with FlaUI. Case 7c (jump) passes
  for headings in the main text, a table cell, a text box, a footnote, an endnote and the header,
  so the jump leaves the human list.

## D13. Hand checks: a desktop bridge instead of C# copies (M1, 2026-10-15)

- **Decision**: the contract pane's Word harness asks the desktop harness, through a function
  Playwright exposes to the page (`__radcutDesktop`), for the states Office.js cannot create. Each
  former hand check then runs as the contract case already written.
- **Rationale**: one suite stays the single statement of the gateway contract (Constitution II);
  C# copies of seven cases would drift from it. The bridge is dev-only and refused in `dist/`.
- **Findings on the way**: a paragraph must be found by its whole text (a `Find` for "Fire
  strategy" first hits its table of contents line); the pane's × is a "Close pane" button under
  the pane titled "RAD·CUT" (the Navigation pane has one too); Word's shortcut and ribbon handlers
  run after the keystroke or click returns, so the host-shell case waits for them as its other
  cases already do; after an `insertOoxml` restore Office.js stops listing a plain-text control in
  `contentControls` though Word COM still sees it, so case 10f (a plain-text control selected
  whole) is not run in Word: deferred past V1 by the owner (T047).

## D12. Keyboard and the interactive desktop

- **Decision**: detect a locked or non-interactive desktop (input desktop not "Default", or
  `GetForegroundWindow` cannot be set) and skip layer 5 tests with "SKIPPED: no interactive
  desktop". Before every chord: `SetForegroundWindow` on Word's document window and verify it.
  The UK-layout check loads `00000809` with `LoadKeyboardLayout` for the run only.
