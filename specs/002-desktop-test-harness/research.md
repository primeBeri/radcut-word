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

- **Decision**: `dotnet test --logger trx --logger "console;verbosity=normal"`, plus a Markdown
  summary written by the harness (`test-results/summary.md`; the scenario run also writes
  `test-results/acceptance-summary.md` in the checklist's table format).

## D11. Hyperlink jump (M2 question)

- **Decision**: try `Field.DoClick()` on a REF `\h` field and check that `Selection` lies within
  the target bookmark. If it does not move the selection, record that in the harness README and
  keep the Ctrl+click jump on the human list.

## D12. Keyboard and the interactive desktop

- **Decision**: detect a locked or non-interactive desktop (input desktop not "Default", or
  `GetForegroundWindow` cannot be set) and skip layer 5 tests with "SKIPPED: no interactive
  desktop". Before every chord: `SetForegroundWindow` on Word's document window and verify it.
  The UK-layout check loads `00000809` with `LoadKeyboardLayout` for the run only.
