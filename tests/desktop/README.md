# Desktop test harness

Runs RAD·CUT's in-Word checks without a person: the in-Word contract suites, the hand checks they
used to leave, document verification through Word itself, the feature 001 quickstart scenarios
and palette timing. Development tooling only; never shipped. Design:
`specs/002-desktop-test-harness/` and `docs/proposals/0001-automated-testing.md`.

## Prerequisites

- Windows 11 with Word for Microsoft 365 desktop (current channel, signed in).
- Node.js 22 LTS or later, `npm install` and `npm run certs` done.
- .NET 10 SDK. `global.json` at the repository root opts `dotnet test` into
  Microsoft.Testing.Platform, which the .NET 10 SDK needs for xUnit v3.
- **Save your work and close Word before a run.** The harness refuses to start while Word is
  running, and never closes or reuses a Word it did not start.
- **Leave the keyboard and mouse alone during a run.** Keyboard checks send real keystrokes to
  Word. On a locked screen they are skipped, not failed.

## Commands

| Command | Runs |
|---|---|
| `npm run test:desktop` | everything |
| `npm run test:desktop -- --filter-trait "Category=Harness"` | the harness's own helper checks (no Word) |
| `npm run test:desktop -- --filter-trait "Category=M0"` | feasibility: can the harness reach Word and the pane |
| `npm run test:desktop -- --filter-trait "Category=Contract"` | in-Word contract suites and former hand checks |
| `npm run test:desktop -- --filter-trait "Category=Document"` | document verification |
| `npm run test:desktop -- --filter-trait "Category=Scenario"` | feature 001 quickstart scenarios |
| `npm run test:desktop -- --filter-trait "Category=Performance"` | palette timing |
| `npm run test:desktop -- --filter-method "*Scenario01*"` | one test |

Exit code 0 means nothing failed; 8 means the filter matched no test. Reports (TRX, JUnit,
`summary.md`) and the evidence of failed tests go to `tests/desktop/test-results/` (gitignored).
Full contract: `specs/002-desktop-test-harness/contracts/harness-commands.md`.

## Safety rules

- Never kill, reuse or attach to a Word the harness did not start.
- WebView2 debugging variables are set on the WINWORD process the harness starts, never
  machine-wide or user-wide; the debugging port listens on 127.0.0.1 only.
- Scratch copies of fixtures live under `%LOCALAPPDATA%\radcut-dev\scratch\` (ASCII path: Word
  mishandles the `·` in the repository folder name); fixtures themselves are never saved.
- No fixed sleeps: every wait is a condition with a time-out.
- A flaky test is a defect: fix it, never skip or quarantine it.

## Routes that worked

Settled by the M0 checks on 2026-10-15 (Word for Microsoft 365 16.0.20430, WebView2 155):
`npm run test:desktop -- --filter-trait "Category=M0"`, 5 of 5 in about 2 minutes. Each run
appends its attempts to `test-results/routes.md`.

| Question | Answer |
|---|---|
| Loading the add-in for the scratch copy | Register it (`office-addin-dev-settings register`, ASCII manifest copy) **and** add the sideload template's task pane parts to the scratch copy (`TaskpaneDocument`). Without the parts Word never shows the RAD·CUT ribbon group for the document. |
| Opening the pane without the keyboard | The parts load the add-in but do not open its pane. The harness invokes RAD·CUT's own "Cross-reference" ribbon button through UI Automation (Invoke needs no keyboard or foreground). Search from the "RAD·CUT" group: the References tab has its own "Cross-reference" button. |
| Reaching the pane over CDP: route A | Fails. Office's direct debugger setting (`UseDirectDebugger`) puts no `--remote-debugging-port` on WebView2 in this build; nothing listens on 9229. Kept behind `RADCUT_PANE_ROUTE=A`. |
| Reaching the pane over CDP: route B | Works. The harness starts `WINWORD.EXE` itself with `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<free port>` on that process only. All Office panes share one WebView2 browser (one data folder), so the endpoint also shows Word's preloaded Copilot pane; the harness picks the page from `https://localhost:3000/`. The pane's WebView2 starts about 30 s after Word, so the harness waits up to 90 s. |
| Attaching COM | Find the scratch document in the Running Object Table by its path and take `Document.Application`. This never starts Word and never matches another document. |
| Word's window | `Document.ActiveWindow.Hwnd`. The process's "main window" is a small helper window. |
| Keyboard focus | Windows reports focus inside a task pane on Office's `WebView2Holder` window, not on the element inside the WebView2. The harness checks that focus moved from the document (`_WwG`) to `WebView2Holder` and reads the active element from the page. Whether a screen reader can name it stays on the human Narrator check. |
| Dev-pane build and Ctrl+Shift+Y (research D6) | The dev-pane build does not answer the shortcut (its pane is the dev launcher), so keyboard checks run on the normal build and contract runs on the dev-pane build. |
| Dev server | `node node_modules/vite/bin/vite.js` directly. Through `cmd` and `npm`, stopping it left Vite orphaned, holding port 3000 and the test run's output pipe. |
