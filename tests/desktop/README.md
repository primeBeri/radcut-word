# Desktop test harness

Runs XRef's in-Word checks without a person: the in-Word contract suites, the hand checks they
used to leave, document verification through Word itself, the feature 001 quickstart scenarios
and palette timing. Development tooling only; never shipped. Design:
`specs/002-desktop-test-harness/` and `docs/proposals/0001-automated-testing.md`.

## Prerequisites

- Windows 11 with Word for Microsoft 365 desktop (current channel, signed in).
- Node.js 22 LTS or later, `npm install` and `npm run certs` done.
- .NET 10 SDK. `global.json` at the repository root opts `dotnet test` into
  Microsoft.Testing.Platform, which the .NET 10 SDK needs for xUnit v3.
- Once per machine, a trusted add-in catalogue (the harness loads XRef from it, see "Routes
  that worked"): in an elevated PowerShell, `New-Item -ItemType Directory -Force C:\radcut-catalog`
  and `New-SmbShare -Name radcut-catalog -Path C:\radcut-catalog -ReadAccess $env:USERNAME`; then
  in Word, File > Options > Trust Center > Trust Center Settings > Trusted Add-in Catalogs, add
  `\\localhost\radcut-catalog` with "Show in Menu" ticked. Without it every check refuses and says
  so. The harness copies `manifest.xml` there on each run.
- On a fresh Office, start Word once by hand and answer its first-run prompts (the "Default File
  Types" choice is modal and blocks every COM call).
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
| `npm run test:desktop -- --filter-trait "Category=Diagnose" --explicit only` | diagnostics (not checks): WebView2 processes, CDP targets, focus, the shortcut's registration, Esc, and the cursor when opening from a header; explicit, so never part of a normal run |

Exit code 0 means nothing failed; 8 means the filter matched no test. Each run clears the previous
run's evidence and reports first. Set `RADCUT_KEEP_SCRATCH=1` to keep every scratch document under
`%LOCALAPPDATA%\radcut-dev\scratch\` (by default only a failed test's copy is kept, in its evidence
folder). Reports (TRX, JUnit,
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

## The desktop bridge

Contract cases that need something Office.js cannot do ask the harness for it through
`__radcutDesktop`, a function Playwright exposes to the contract pane
(`Infrastructure/DesktopBridge.cs`, `src/dev/desktop-bridge.ts`): select a paragraph in any story
(comments and text boxes included), protect or unprotect, renew the plain-text control, press
Ctrl+Shift+Y, click the ribbon button, close the pane with its ×, Ctrl+Z, F9 on every story, move
paragraphs (cut and paste, so bookmarks move with them) and Ctrl+click a reference. Each run's
requests and replies are in `test-results/contract-run-<fixture>/desktop-bridge.log`, beside the
suite results (`*.json`), the pane console and a Playwright trace.

## Routes that worked

Settled by the M0 checks on 2026-10-15 (Word for Microsoft 365 16.0.20430, WebView2 155):
`npm run test:desktop -- --filter-trait "Category=M0"`, 5 of 5 in about 2 minutes. Each run
appends its attempts to `test-results/routes.md`.

| Question | Answer |
|---|---|
| Loading the add-in for the scratch copy | Register it (`office-addin-dev-settings register`, ASCII manifest copy) **and** add the sideload template's task pane parts to the scratch copy (`TaskpaneDocument`). Without the parts Word never shows the XRef ribbon group for the document. |
| Opening the pane without the keyboard | The parts load the add-in but do not open its pane. The harness invokes XRef's own "Cross-reference" ribbon button through UI Automation (Invoke needs no keyboard or foreground). Search from the "XRef" group: the References tab has its own "Cross-reference" button. |
| Reaching the pane over CDP: route A | Fails. Office's direct debugger setting (`UseDirectDebugger`) puts no `--remote-debugging-port` on WebView2 in this build; nothing listens on 9229. Kept behind `RADCUT_PANE_ROUTE=A`. |
| Reaching the pane over CDP: route B | Works. The harness starts `WINWORD.EXE` itself with `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<free port>` on that process only. All Office panes share one WebView2 browser (one data folder), so the endpoint also shows Word's preloaded Copilot pane; the harness picks the page from `https://localhost:3000/`. The pane's WebView2 starts about 30 s after Word, so the harness waits up to 90 s. |
| Attaching COM | Find the scratch document in the Running Object Table by its path and take `Document.Application`. This never starts Word and never matches another document. |
| Word's window | `Document.ActiveWindow.Hwnd`. The process's "main window" is a small helper window. |
| Keyboard focus | Windows reports focus inside a task pane on Office's `WebView2Holder` window, not on the element inside the WebView2. The harness checks that focus moved from the document (`_WwG`) to `WebView2Holder` and reads the active element from the page. Whether a screen reader can name it stays on the human Narrator check. |
| Dev-pane build and Ctrl+Shift+Y (research D6) | The dev-pane build does not answer the shortcut (its pane is the dev launcher), so keyboard checks run on the normal build and contract runs on the dev-pane build. |
| Dev server | `node node_modules/vite/bin/vite.js` directly. Through `cmd` and `npm`, stopping it left Vite orphaned, holding port 3000 and the test run's output pipe. With `RADCUT_LOG_REQUESTS=1` (the harness sets it) `vite.config.ts` logs every request to `dev-server-<mode>.log`, one log per run. |

### Added on the test VM, 2026-10-16 (Word 2609, 16.0.20430)

| Question | Answer |
|---|---|
| Developer registration (`office-addin-dev-settings register`) | Since Word 2609 an add-in registered this way loses its custom shortcuts on most starts: `Office.actions.getShortcuts()` returns `{}` and Ctrl+Shift+Y does nothing, although Office has fetched `shortcuts.json` (office-js#6973). Route B now loads the add-in from the trusted catalogue above; scratch documents refer to it with `store="\\localhost\radcut-catalog"`, `storeType="Filesystem"`, as Word writes it. Route A keeps the developer registration (Office's direct debugger needs it). |
| The ribbon click that starts the add-in | Often loads the add-in without running OpenPalette: the page is ready and has associated the action, but is never called, and the pane stays 120×11 (7 of 11 sessions; office-js#2744). The harness clicks again when no palette has appeared after 10 s; most sessions need two clicks. |
| Pane ready | The page appears over CDP before Office.js has initialised; the harness waits for `Office.onReady()` and, on the normal build, for the palette the ribbon opened, before a test touches the pane. |
| Hidden event | Office tells the page the pane is hidden 0.1–1.5 s after the hide. The add-in clears itself on that event, so a Ctrl+Shift+Y pressed before it is cancelled by it (pane back, empty). The harness subscribes to the event itself and waits for it before the next Ctrl+Shift+Y; `routes.md` notes each wait over 100 ms. |
| After an insertion or Esc | The add-in still hides the pane and then returns the cursor, which lands on whatever is selected by then (it collapsed a test's selection to its end). The harness counts the add-in's Office calls in the page (Word.run and show or hide, wrapped by the harness, not the add-in) and waits for 100 ms of quiet; `routes.md` notes waits over 400 ms (up to about 1.1 s). |
| Placing the cursor | After a comment is selected Word's active pane is the comments pane, with its own cursor: a selection made from there is dropped for the main pane's older one when focus comes back. `WordActions.SelectIn` (used by the tests and the desktop bridge) activates the main pane, leaves header view for body text and enters it for header or footer text. |
| Ctrl+click | The caret's place on screen is read once it has settled (150 ms unchanged); the first reading can be the old place. |
| A Word that will not quit | `Quit` is retried while Word answers "busy" (which dynamic COM can report as `MissingMemberException`); if Word still runs after 60 s its windows are recorded in `word-did-not-quit-<pid>/` and it is stopped, and the harness waits until it has gone, and then until Windows no longer lists it (a stopped Word stays listed while handles to it are open, and the next test refused). |
| Reopening a saved copy "without the add-in" (scenarios 6 and 14) | The copy is saved without the task pane parts. With them the add-in loaded from the catalogue in that Word, and quitting it 2–3 s after it started, while the add-in was still starting, crashed Word in `osf99.dll` (0xc0000005, 3 times in 8 full runs); the next Word then stopped on "Word couldn't start last time… safe mode?" and the run failed from there. |
| A text box after the contract restore | Word draws the re-created text box only once its anchor has been on screen; until then Office.js cannot select in it, and a selection Word COM makes there reads in Office.js as the start of the main text (contract 9c failed 9 runs in 10). The contract harness asks the desktop bridge to scroll each text box's anchor into view (`showTextBoxes`) and selects again through Office.js, which then reads the text box. |
| The debugging endpoint refusing | Once the endpoint answered and then refused the connection a moment later. The harness waits for it to answer again within the same 90 s and notes it in `routes.md`, with the WebView2 browser processes listening each time. |
| Asking UI Automation which element has focus | While focus moves into the WebView2 the query sometimes times out, which FlaUI throws as `TimeoutException: UIA Timeout` (2 of 10 full runs, in the palette-ready timing). It now counts as "not known yet", like the COM errors it already tolerated, and the timing loop asks the page first and UI Automation only once the list is there. |
| Word reinstalling the add-in mid-session (2026-10-17; again 2026-10-18) | In one run of the US2 scenarios, scenario 25's first ribbon click (Settings, after the palette had opened and closed by keyboard) made Word close the add-in's page and reinstall it from the catalogue; the dev server saw only two `shortcuts.json` requests and no task pane request, and Word showed "Error installing add-ins: Add-in RAD·CUT failed to download a required resource". The settings view never appeared and the test timed out. The same scenario then passed three times running, and scenarios 8 and 24, whose first ribbon click is also Settings, passed in that run. A Word fault close to office-js#2744 (the ribbon click that starts the add-in), not the add-in's: not retried by the harness, so a repeat shows up as a failure with this evidence. **Again 2026-10-18**, scenario 24, also on a session's first ribbon click being Settings: the page loaded, the dev server saw nothing more (the pane's only 404 is `/favicon.ico`, harmless), and about a minute later Word showed "Error installing add-ins", dropped the RAD·CUT ribbon group and closed the page. Saving evidence then failed on the closed page and left tracing on, so the pane's disposal threw and the harness never quit its Word, and every later test refused with "Word is running". Fixed in the harness: a pane that cannot be disposed no longer stops Word being quit (`PaneSession.CloseWordAsync`, `TaskPane.DisposeAsync`). |
| Changing the shortcut (2026-10-17) | `Office.actions.replaceShortcuts` is refused with `InvalidArgument` for every value, `{}` included, in the harness's Word (signed in, catalogue route), while `getShortcuts` and `areShortcutsInUse` work (research R4). Scenario 10b checks the add-in names the refused combination and keeps recording, and then skips with that reason; `Palette.RestoreDefaultShortcutAsync` puts the shortcut back through Office.js however a test ends, so a Word that accepts changes is not left with the test's shortcut. Office keeps the shortcut per account, so one changed in the owner's own Word (which accepts some changes) is the harness's too, and every test that presses Ctrl+Shift+Y then fails; the failure message names the assigned shortcut (2026-10-18). Reset it in XRef's settings in your own Word. **Cause (2026-10-18):** Word 2609 never registers the catalogue copy's shortcuts (`getShortcuts()` is `{}` without the cache), so `replaceShortcuts` has nothing to change; Ctrl+Shift+Y works only through Word's cached `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\AggregatedCache\1.1\<hash>\ShortcutsMapping.Word.en-US`, written on 2026-10-17 for the old developer registration. Keep that file: deleting it makes Ctrl+Shift+Y dead in harness Words (research R4). The harness refuses to run while `npm start`'s developer registration exists, since Word would then load the add-in twice (two RAD·CUT ribbon groups); run `npm stop` with Word closed. `Keys.Chord` sends scan codes, since FlaUI's virtual keys alone reach the page with an empty `KeyboardEvent.code`. |
| Keyboard layout for a test | `KeyboardLayout.ActivateInWord` makes a layout (UK, 00000809, for scenario 10) Word's input language with `WM_INPUTLANGCHANGEREQUEST`, waits until Word's thread reports it, and restores Word's previous layout afterwards; the user's language list is not changed, and a layout it had to load is unloaded. Characters such as @ are pressed through `VkKeyScanEx` on that layout (Shift+' on UK). |

### Added on the owner's desktop, 2026-10-21 (Word 2609, 16.0.20430)

| Question | Answer |
|---|---|
| Esc lost after typing (scenarios 23 and 27) | With Windows' "Show text suggestions when typing on the physical keyboard" on (`HKCU\Software\Microsoft\Input\Settings`, `EnableHwkbTextPrediction` = 1; on here, not on the VM), a text box in the pane shows Windows' suggestion pop-up a moment after a word is typed, and the pop-up takes the next Esc: the page never sees it, focus does not move, and a second Esc works. An Esc within about 100 ms of the last key arrived (the pop-up was not up yet), so only tests that waited before Esc failed: 23 and 27 read the document through COM with the warning on screen. Ruled out in turn by the explicit probe (`Feasibility/EscAfterTypingProbe.cs`): the COM reads, the background refresh, the warning and its live region, Enter, the Word selection, the pointer, Shift, and `writingsuggestions="false"` or `autocorrect="off"` on the box. A search box gets no pop-up, so the palette's box is now `type="search"`, which fixes it for people with the setting on too. The settings view's text fields (template label and text) are still text boxes and get the pop-up; no test failed on it there. |

## Safety checks (T045), 2026-10-15

| Check | Result |
|---|---|
| A Word of the owner's open (a blank document with text typed in) | Every check fails at once with "Word is running. Save your work and close Word, then run again."; that Word keeps running, its text untouched |
| A deliberate failure (an expected value changed in scenario 19) | Fails with the scratch document, the Word window, the Playwright trace, the pane console and the harness log kept |
| After every run | No WINWORD, dev server or test process left; `git status` shows no fixture changed |
| Outlook open with an add-in running | Works: the harness's Word has its own WebView2 data folder (research D15) |
| Another window brought to the front during a run | The keyboard step fails and names the window in the way; nothing is typed elsewhere |
| A locked screen (Win+L during the Scenario category, 2026-10-16, test VM) | Every test started after the lock reports `SKIPPED: no interactive desktop`, also in summary.md; no Word or dev server left, no fixture changed. The first attempt found that Windows 11 shows the lock screen on the normal desktop for a minute or two before it switches desktops, so three tests started behind it and failed; the check now also asks Windows whether the session is locked. A test caught mid-way skips when Word cannot be brought to the front with the screen locked (not yet seen in a run: the lock fell between tests) |

## A full run, 2026-10-15

`npm run test:desktop`: 112 passed, 3 failed, 4 skipped in 7 min 41 s. The failures are the add-in
findings recorded as feature 001 T143 (caret after the reference) and T144 (Esc with the warning
up, scenarios 23 and 27); the skips are the three explicit diagnostics and the deferred case 10f.

## Full runs on the test VM, 2026-10-16

Ten consecutive runs (T044) after the fixes in "Added on the test VM", all with the same outcome
for every test: 113 passed, 3 failed, 6 skipped, in 13 min 13 s to 14 min 42 s (under the
30-minute goal; the VM is about twice as slow as the first machine). No Word crashed, the debugging
endpoint never refused, and no Word was left. The skips are the five explicit diagnostics and 10f.
The failures:

- Scenario 01: the caret after the reference, feature 001 T143.
- Scenario 23: with a table selected the add-in declines when the palette opens (below). The owner
  has since decided that is right (2026-10-17); the test now expects it, and also that a table
  selected while the palette is open is declined at Enter with the palette kept and the document
  unchanged. It passed three runs in three.
- Palette ready on spec-300: median 606 to 996 ms against the 500 ms budget, the VM's speed. In 2 of
  the 10 runs it failed instead on the harness's own focus query ("UIA Timeout"), now fixed (table
  above).

Contract 9c passed in all ten.

After feature 001's T143 fix (caret after the reference) and the scenario 23 change, 2026-10-17:
117 passed, 1 failed, 6 skipped in 14 min 51 s; every scenario passes, and the one failure is the
palette-ready time on the VM (median 1009 ms).

With feature 001's US2 (format cycle, settings view, `ISettingsStore` contract), 2026-10-17: 17
scenarios, 71 contract cases (2 skipped: 10f deferred, S5 Node only), Document and M0 all pass in
21 min 52 s; the failures are the palette-ready time on the VM (median 1075 ms) and one harness
self-test still expecting the old scenario 25 note, since fixed. Every harness Word shares one
WebView2 data folder, so settings saved in one test would carry into the next: `ScenarioTest`
clears them as each scenario starts, unless the test keeps them across its own Word restart
(scenario 8).

The earlier runs, before those fixes:

Two consecutive runs, identical: 111 passed, 4 failed, 6 skipped, in 15 min 36 s and 14 min 20 s
(the VM is about twice as slow as the first machine). The skips are the five explicit diagnostics
and 10f. The failures:

- Scenario 01: the caret after the reference, feature 001 T143 (as before).
- Scenario 23: it now gets past the warning and Esc (T144 does not show here), then fails at its
  last step: with a table selected, the add-in declines when the palette opens ("References can't
  replace a table."), while the test expects the palette and the refusal on Enter. The spec says
  only "declined with a message" (FR-008a); the owner decides which is right.
- Contract 9c at "Text box body.": Office.js cannot select in the text box after the restore, the
  desktop bridge selects it (story 5), and the gateway then reports a location for which the
  preview does not warn "position unknown". It passed this morning, when Office.js could still
  select there. Fixed since: the text box was not yet laid out (`showTextBoxes`, table above).
- Palette ready on spec-300: median about 950 ms against the 500 ms budget, the VM's speed.

Scenario 27 passes here.
