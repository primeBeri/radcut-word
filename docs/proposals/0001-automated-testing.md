# Proposal 0001: Automate the in-Word checks to remove the human bottleneck

| | |
| --- | --- |
| **Status** | Accepted; M0–M2 implemented in feature `002-desktop-test-harness`, merged into `001-heading-xref-palette` on 2026-10-15 (Constitution 1.2.0) |
| **Date** | 2026-10-13 (revised the same day against branch `001-heading-xref-palette`; revised 2026-10-15 for Phases 10–11, contract-run speed and milestone order) |
| **Baseline** | Branch `001-heading-xref-palette` at `78f1aab` (merged into `main`): US1 and Phases 9–11 complete, US2–US5 and Polish open |
| **Affects** | The in-Word contract run (T051, T138, T142) and its speed, every "Run quickstart scenarios in Word" task (T071, T078, T088, T095, T103), the performance runner (T096), Constitution 1.1.0 → 1.2.0 |
| **Runs on** | Windows 11 with Word for Microsoft 365 desktop. Everything that does not need Word already runs under `npm test` |

## TL;DR

The code side is already in good shape. Vitest covers the core, components and the `FakeGateway` contract. The shared contract suite also runs inside Word through the dev pane, using `MiniTest`. What still needs a person is the following:

1. **Driving the in-Word contract run.** Someone has to open the right fixture copy, open the dev pane, pick a suite and press Run, then read the results back. Six cases are also checked by hand, because Office.js cannot set them up: the caret in a comment, a protected document, Undo after replacing a content control or picture, and the shortcut, ribbon and × close.
2. **The 27 quickstart scenarios.** These are run by hand at the end of each user story and again before release.

This proposal adds a **C# desktop harness** (xUnit, Playwright for .NET, FlaUI, Word COM) that does all of this from one command, `dotnet test tests/desktop`:

- It opens a scratch copy of a fixture with the add-in loaded.
- It attaches Playwright to the task pane's WebView2 to run the contract suite and read the palette.
- It uses **Word COM** to set up awkward states (comment caret, protection, selections, tracked changes, a table of contents) and to verify the saved document.
- It uses **FlaUI** to press the real shortcut, Enter, Esc and Ctrl+Z.

On that basis, **24 of the 27 quickstart scenarios can be automated fully or almost fully.** Human testing shrinks to a short per-release list: co-authoring, a physical UK keyboard, a visual check of the themes, and a screen-reader pass.

The first milestone (M0) is a go/no-go spike that proves the harness can reach Word's task pane. Nothing else starts until it passes.

---

## 1. Where the project is (branch `001-heading-xref-palette`)

What already exists and **must be reused, not rebuilt**:

| Piece | Where | Relevance |
| --- | --- | --- |
| Runner-agnostic contract API | `tests/contract/test-api.ts` (`ContractTestApi`, `environment: "node" \| "word"`) | The same suites run in Vitest and in Word. No new runner is needed |
| In-Word runner | `src/dev/mini-test.ts`, `src/dev/contract-pane.ts`, `src/dev/contract-registry.ts` | Layer 3 only needs a way to trigger it and read the results by script (§4.3) |
| Office contract registration | `src/adapters/office/dev-registration.ts` (fixture markers, snapshot restore) | Tells the harness which fixture each suite needs |
| Fixtures built by Word COM | `tests/fixtures/make-fixtures.ps1`, `*.docx`, `*.manifest.txt`, `tests/fixtures/README.md` | Proves COM automation works on this machine. The fixtures and their paragraph texts are the shared vocabulary for harness scenarios |
| Sideload with an ASCII path | `scripts/office-debug.mjs` (Word ignores a manifest path containing `·`) | The harness must sideload through this script or the same rule |
| Dev and release builds | `npm run start:dev-pane`, `npm start`; the release build fails if `dist/` holds a dev page | Constitution V is already enforced for dev tooling |
| Acceptance log | `docs/acceptance-checklist.md`, `specs/001-heading-xref-palette/quickstart.md` (scenarios 1–27) | This is the manual work to automate |

Facts the spikes have already settled (research R3, R5, R7; Constitution 1.1.0), which the harness takes as given:

- The default shortcut is **Ctrl+Shift+Y**.
- The task pane takes focus when the shortcut opens it, so no dialog fallback is needed.
- `insertField(Ref)` works, with one Undo step per insertion.
- `listString` gives the full-context number.

The Phase 0 spikes are therefore **regression** checks now, not feasibility checks.

## 2. Goals and non-goals

**Goals**

- G1. Claude Code on the Windows desktop runs every automatable in-Word check with one command. It gets back an exit code, a TRX/JUnit report and a Markdown summary that can be pasted into `docs/acceptance-checklist.md`.
- G2. The in-Word contract run (T051) has **no hand-checked cases** left.
- G3. Each future "Run quickstart scenarios in Word" task becomes "write the harness scenario test first (red), implement, then run `dotnet test` (green)". This is the same red-green discipline as Principle II, applied in Word.
- G4. The human part is a written list of about 10 minutes per release candidate.
- G5. Everything stays within the constitution: deterministic tests, no network beyond localhost, dev tooling out of release builds.

**Non-goals**

- Running Word in GitHub-hosted CI, which has no licensed Office. A self-hosted runner is a later option (§10).
- Mac and web (Phase 4).
- Screenshots or computer vision as a pass/fail gate.

## 3. Test layers

| # | Layer | Status | Tooling |
| --- | --- | --- | --- |
| 1 | Core unit and component | **Exists** (`npm test`) | Vitest, jsdom, Testing Library |
| 2 | Contract vs `FakeGateway` | **Exists** (`npm test`) | Vitest via `tests/contract/vitest-api.ts` |
| 3 | Contract vs `OfficeJsGateway` in Word | Exists, **started and read by hand** → automate | `MiniTest` in the dev pane, triggered and read by Playwright over CDP |
| 4 | Document verification | **New** | Word COM from C#: set up the state, then inspect fields, bookmarks, revisions, formatting and Undo |
| 5 | Keyboard and focus | **New** | FlaUI (real OS keystrokes, UI Automation focus), plus Playwright for palette state |
| 6 | Exploratory | Optional | Claude computer use with written charters. Never a gate |
| 7 | Human | Shrinks | `docs/acceptance-checklist.md`, reduced to §6 |

Rule for `tasks.md`: tag each test task with its layer (`[L1]`…`[L7]`), and test at the lowest layer that can observe the behaviour.

## 4. The desktop harness

### 4.1 Why C#

The harness needs COM, real OS input and CDP. .NET has mature libraries for all three ([Playwright for .NET](https://playwright.dev/dotnet/docs/webview2), [FlaUI](https://github.com/FlaUI/FlaUI) and COM interop), so one xUnit project gives one runner, one report and one place to manage Word's lifecycle. The project owner reads C#. The add-in stays TypeScript, and `make-fixtures.ps1` stays PowerShell.

*Rejected alternatives:*
- **Pester and PowerShell:** good for COM, but awkward for FlaUI and Playwright.
- **Node only:** COM from Node (`winax`) is fragile, and native input libraries are poorly maintained.

### 4.2 Layout and responsibilities

```
tests/desktop/RadCut.DesktopTests/          (net8.0-windows, xUnit)
  Infrastructure/
    WordSession.cs        // IDisposable. Launches WINWORD, attaches COM, tears down without saving
    DevServer.cs          // starts and stops Vite (normal or devpane mode), waits for https://localhost:3000
    Sideload.cs           // registers the manifest via the ASCII-path rule of scripts/office-debug.mjs
    ScratchFixture.cs     // copies tests/fixtures/<name>.docx to an ASCII scratch dir per test
    TaskPane.cs           // Playwright: ConnectOverCDPAsync, finds the RAD·CUT pane page, palette helpers
    Keys.cs               // FlaUI: brings Word to the front, sends chords, reads the focused element
    DocumentState.cs      // COM: puts the caret or selection in a named paragraph or story, protects, tracks
    DocumentInspector.cs  // COM: fields and codes, results after Fields.Update(), bookmarks, revisions, fonts
    DocumentSnapshot.cs   // a comparable snapshot (text, fields, bookmarks, revisions) for "unchanged" and Undo checks
  Contract/ContractRunTests.cs       // M1: one xUnit case per MiniTest case, per registered suite
  Contract/HandCheckTests.cs         // M1: the six cases T051 left to a person
  Scenarios/Us1Scenarios.cs          // M2–M3: quickstart 1–6, 12–14, 19–23, 25–27
  Scenarios/Us2Scenarios.cs …        // added test-first as each story is built
  Performance/BudgetTests.cs         // M4
tests/desktop/README.md              // routes that worked, prerequisites, how to run one test
```

Rules:

- **Find paragraphs by text** from `tests/fixtures/README.md` and the `.manifest.txt` files, never by index. This matches how the contract suites find them.
- **One fresh scratch copy per test.** Scratch copies live under `%LOCALAPPDATA%\radcut-dev\scratch\` (ASCII path). Word closes without saving unless a test saves its own copy for inspection.
- **Never kill or reuse a running Word.** `WordSession` refuses to start if `WINWORD.EXE` is running and says so. The owner may have unsaved work open.
- **No sleeps.** Every wait is a condition with a timeout.
- **On failure, keep the evidence:** a Playwright trace, a screenshot of the Word window, the scratch `.docx` and the pane console log, all under `test-results/` (gitignored). Claude Code can then diagnose without asking.
- The harness's `bin/`, `obj/` and `test-results/` folders are added to `.gitignore`. ESLint and `tsconfig` already ignore `.cs` files.

### 4.3 Layer 3: starting and reading the existing contract pane

Make two small dev-only changes in `src/dev/contract-pane.ts`, and nothing else:

1. Accept `?suite=<label>&autorun=1` in the URL, so a suite can start without a click.
2. When the run finishes, set `data-status="done"` on `<body>` and write the full `CaseResult[]` as JSON into `<script type="application/json" id="contract-results">`. Also expose it as `window.__radcutContractResults`.

`ContractRunTests` then does the following for each registered suite:

1. Open a scratch copy of the suite's fixture.
2. Open the dev pane.
3. Navigate it to `contract-pane.html?suite=…&autorun=1`.
4. Wait for `data-status="done"`.
5. Report each `MiniTest` case as its own xUnit result, through a theory over the parsed JSON.

The existing release-build check already keeps `src/dev/**` out of `dist/`. Add a Vitest case asserting that the release bundle does not contain `__radcutContractResults`.

### 4.4 Layer 3 + 4 + 5: the hand-checked contract cases

| Hand check today (T051) | Harness replacement |
| --- | --- |
| Caret in a comment → comment message | COM: `Document.Comments(1).Range.Select()`. FlaUI: Ctrl+Shift+Y. Playwright: the message text |
| Protected document → protected message on open | COM: `Document.Protect(wdAllowOnlyReading)`. FlaUI: shortcut. Playwright: the message text. COM: the document is unchanged |
| Content control: Enter (warning), Enter (replaced), one Ctrl+Z restores | COM: select the content control and take a snapshot. FlaUI: shortcut, Enter, Enter, Ctrl+Z. COM: the snapshot is equal again |
| Picture: one Ctrl+Z restores | The same pattern with the inline picture paragraph |
| Host shell: shortcut, ribbon and × | FlaUI: shortcut, ribbon "Cross-reference" button (by automation ID or name), and the pane's close button. Playwright or UIA: pane visible or hidden, focus where expected |
| Cases 2 and 2a (two fixtures) | Already split. The harness simply runs each on its own fixture |
| Plain-text content control parts of cases 5d and 10f (T138): the snapshot restore drops the control and Office.js cannot put it back | COM: restore the control (`ContentControls.Add(wdContentControlText, range)`) after the restore, or open a fresh scratch copy for these cases. Then the scripted cases run as written |
| Text box heading part of case 5b (T142): Word refuses `Range.select()` in the re-created text box after the restore | COM: `Shapes(1).TextFrame.TextRange.Paragraphs(1).Range.Select()`, or a fresh scratch copy for this case |

### 4.5 Layer 4: document verification

`DocumentInspector` reads the saved scratch copy in Word through COM. It needs no add-in code to do this, which proves scenario 6 directly. It checks:

- Every RAD·CUT field is `REF <bookmark> …\h` with the switches each format expects (`\w`, plain, `\p`, `\* CHARFORMAT`).
- The bookmark exists and its range starts in the target heading paragraph.
- Names are `_`-prefixed, 40 characters or fewer and unique. A second insertion to the same heading adds no bookmark (FR-011), and Word's own `_Ref…` bookmarks are reused while `_Toc…` ones are not.
- After `Fields.Update()`, results match the expected number and text. They still match after the heading moves (scenario 3), and after `TablesOfContents(1).Update()` (scenario 19).
- The field result's formatting matches the surrounding text, not the heading (scenario 20).
- `Revisions.AcceptAll()` and `RejectAll()` on copies behave as in scenarios 14 and 22.
- **Comparison with Word's own dialog (scenario 26):** `Selection.InsertCrossReference("Heading", wdNumberFullContext, n, InsertAsHyperlink: true)` produces Word's reference, and the inspector compares the field codes and bookmark extents.
- **Hyperlink jump:** first try `Field.DoClick()`, then check that `Selection` lies within the bookmark's range. If that does not work for REF `\h` fields, record that in `tests/desktop/README.md` and leave the jump to the human list (§6).

### 4.6 Layer 5: keyboard and focus

- `Keys` brings the Word document window to the foreground and verifies it before every chord, because the test console otherwise keeps focus. It sends real input through FlaUI.
- Focus is checked through UI Automation (the focused element is the palette's search box, by its accessible name). Playwright's `document.hasFocus()` and `document.activeElement` must agree. This also enforces the labelling that Principle IV requires.
- Layer 5 needs an **unlocked, interactive desktop**. Without one, these tests skip with "SKIPPED: no interactive desktop" rather than fail.
- **The harness takes over the keyboard and screen while it runs.** Start it and leave the machine alone. A later option is running it in a separate Windows user session.

### 4.7 Quickstart scenario coverage

| Scenario | Automated by | Left to a person |
| --- | --- | --- |
| 1 shortcut, `fstrat`, Enter | L5 keys, L3 ranking and highlight in the DOM, L4 result and caret | – |
| 2 Esc | L5, L4 snapshot unchanged, `Selection.Start` unchanged | – |
| 3 F9 after moving 4.3 | L4 (COM moves the section range, then `Fields.Update`) | The Ctrl+click jump, only if `DoClick` fails |
| 4 bookmark reuse | L4 | – |
| 5 Undo with and without tracking | L5 Ctrl+Z, L4 snapshot | – |
| 6 without the add-in | L4 (COM-only Word instance) | – |
| 7 every format, preview = result | L3 preview text, L4 result | – |
| 8 default format persists after restart | L5 plus a Word restart in the harness | – |
| 9 templates | L1 already. L5 smoke for one template | – |
| 10 ribbon, change shortcut, Ctrl+@ | L5 (ribbon by UIA, recorder UI, refusal message). UK layout loaded with `LoadKeyboardLayout("00000809")` for "no stray character" | One physical UK-keyboard check |
| 11 recents | L5 + L3 | – |
| 12 caret in heading, Title, comment, plain-text content control (declined); header, footer, text box (allowed since Phase 11); protected | L4 caret placement in each story, L5 shortcut, L3 message or L4 inserted field | – |
| 13 caption, quote, table cell, footnote | The same | – |
| 14 tracked accept and reject | L4 | – |
| 15 dark theme, reduced motion | L3 (`emulateMedia`, Office theme set in the registry before launch), with a screenshot kept | A visual look (or L6) |
| 16 Ctrl+, opens settings | L5 | – |
| 17 SharePoint co-authoring | – | **Yes** |
| 18 no network after load | L3: Playwright records every request from the pane page after load and asserts none leave `localhost` | – |
| 19 TOC bookmarks | L4 | – |
| 20 formatting matches the surrounding text | L4 | – |
| 21 click elsewhere, then Enter | L4 moves the selection (instead of a click), L5 Enter | – |
| 22 tracked-deleted heading | L4 setup, L3 list contents, L4 after reject | – |
| 23 words, multi-paragraph and table selections | L4 selections, L5 keys, L4 snapshot | – |
| 24 allow references in headings | L5 | – |
| 25 headings in other stories, badges | L3 badges in the DOM, L4 results | Badge colour by eye (§6) |
| 26 vs Word's own dialog | L4 (`InsertCrossReference`) | – |
| 27 caret inside an existing field | L4, L5 | – |
| SC-001 median under 3 s, by a practised human | Harness times machine latency only | The human timing, if still wanted |

### 4.8 Contract-run speed

One run of the `OfficeJsGateway` suite on `spec-300.docx` takes 20–25 minutes for about 90 cases, roughly 15 s per case, although most cases do one read and at most one insertion. The harness would make every run pay that, so the run is made fast before it is automated. Likely causes, from the code (`src/adapters/office/dev-registration.ts`), to be confirmed by measurement first:

1. **Every case restores the whole document**, whether or not the previous case changed it: `body.insertOoxml(snapshot, "Replace")` over about 600 paragraphs, a table of contents with about 300 entries and their `_Toc` bookmarks, multilevel list numbering, and every header and footer. Word then renumbers and repaginates.
2. **The contract fixture is the performance fixture.** Chapters 5–76 of `spec-300` exist for the 300-heading budget; no contract case needs them (two of them carry the footnote and endnote). Every `readHeadings` (about 450 ms at 300 headings), every `paragraphByText` (all paragraphs of every story, per `select`), and every `documentState` (all bookmarks with two range comparisons each, every field's result, including the table of contents' `PAGEREF`s, twice per mutating case) scales with it.
3. **Repeated whole-document reads in the harness**: the fixture-marker check reads every body paragraph per case, and `paragraphByText` reloads every story per call.

Plan:

- **Measure first** (Constitution VI). `MiniTest` records each case's duration; the harness records time spent restoring, selecting and reading state. The pane shows the slowest cases and the total.
- **A small contract fixture.** `make-fixtures.ps1` builds `spec-contract.docx` (the named paragraphs of `spec-300`, two filler chapters for the notes, a table of contents over those only), and the fake gets the same document. `spec-300` and `guide-500` stay for performance (T096, M4).
- **Restore only when needed.** The harness marks the document dirty when a case writes (insert, `setParagraphText`, a simulated failure) and skips the restore otherwise; the marker check reuses what the restore already read.
- **Cheaper lookups.** Find a paragraph with `body.search` in the story that holds it, and cache story paragraph lists until the next write.

Target: the full gateway suite on its fixture in under 5 minutes, and recorded in `tests/desktop/README.md` with the before and after timings. No case is weakened or skipped to get there; a change that alters a result is a defect.

## 5. Claude computer use (layer 6)

Use it for exploration only, from the Claude desktop app on the same machine, after layers 1–5 are green. Charters live in `tests/exploratory/*.md`, each with a goal, a time box, a fixture and what to report. For example: "On `spec-300.docx`, insert ten references in mixed formats, restructure two chapters, press F9 and report anything that looks wrong, slow or jarring (for example the reflow when the pane hides)." Every real finding becomes a layer 1–5 test before it is fixed.

## 6. What stays human (layer 7)

Per release candidate, about 10 minutes, recorded in `docs/acceptance-checklist.md`:

1. Scenario 17: SharePoint or OneDrive co-authoring with two users.
2. Scenario 10 on a **physical** UK keyboard: the shortcut works and no stray character is typed.
3. A visual pass over the light, dark and black Office themes and the story badges (scenarios 15 and 25), using the screenshots the harness saved.
4. A Narrator pass over the palette and settings.
5. Ctrl+click jumps, only if `Field.DoClick` proves unusable in M2.

## 7. Milestones

Work test-first throughout. Build the harness as spec-kit feature **`002-desktop-test-harness`**, branched from `001-heading-xref-palette`, and merge it back into `001` once M1 is green, so the rest of US2–US5 benefits.

| ID | Milestone | Done when |
| --- | --- | --- |
| **M0** | **Feasibility (go/no-go)** | From `dotnet test --filter Category=M0`, the harness: (a) starts the dev server and sideloads (normal and devpane builds); (b) launches Word on a scratch copy of `spec-300.docx` with the add-in available; (c) attaches **COM** to that same Word instance; (d) attaches **Playwright** to the pane over CDP and reads one known element; (e) presses **Ctrl+Shift+Y** through FlaUI and sees the search box focused; (f) shuts everything down cleanly. Record the routes that worked in `tests/desktop/README.md` (see §8). **If (d) cannot be made to work by any route in §8, stop and report.** Layers 4 and 5 still work without it, but the plan changes. |
| M1 | Contract run fast and automated | §4.8 first: timings recorded, the small contract fixture, restore only when dirty; the gateway suite under 5 minutes. Then the §4.3 pane changes. Every registered Office suite runs on a fresh fixture copy, one xUnit result per case. The §4.4 hand checks are automated. T051's "Still to check by hand" list, and the hand-check parts of T138 and T142, are empty. |
| M2 | Document verification | `DocumentInspector` and `DocumentSnapshot` exist. Scenarios 3, 4, 6, 14, 19, 20 and 26 pass. The `DoClick` question is answered. US2's scenario 7 (preview = result) depends on this. |
| M3 | US1 regression complete | Scenarios 1, 2, 5, 12, 13, 21, 22, 23, 25 and 27 pass, which together with M2 covers everything T055 checked by hand. The harness writes `test-results/acceptance-summary.md` in the checklist's table format. |
| M4 | Performance | When T096's perf runner exists, the harness reads it. Until then, it times shortcut → search box focused and keystroke → list updated from outside. Budgets: ready < 500 ms on `spec-300`, filter < 50 ms, no long task > 100 ms on `guide-500`. |
| M5 | Workflow and governance | `/speckit-constitution` amendment 1.1.0 → **1.2.0** (§9). `CLAUDE.md` commands updated. The open "Run quickstart scenarios in Word" tasks (T071, T078, T088, T095, T103) are reworded with `/speckit-refine-update` and `/speckit-refine-propagate` so each becomes "write the harness scenario first, then run it", with only §6 items left manual. `docs/acceptance-checklist.md` reorganised into "automated (paste the summary)" and "human (§6)". |
| M6 | Exploratory charters (optional) | Two charters in `tests/exploratory/`. |

Order (revised 2026-10-15): M0 → M1 → M2 → merge `002` into `001-heading-xref-palette`, with M5's constitution amendment and task rewording → US2 using the harness → M3 (US1 regression, needed before a release, T103) → M4 with T096. The amendment moves forward from "after M3" because US2's tasks rely on the harness as soon as they are reworded, and `/speckit-analyze` checks tasks against the constitution. M5's task rewording is a direct edit of `001`'s `plan.md` and `tasks.md` with a dated note, not `/speckit-refine-update`: `001`'s spec does not change. US2's Vitest-only tasks (T056–T065, T068–T070) need no harness and may go ahead if M0 stalls.

## 8. Routes to verify in M0

1. **Reaching the task pane over CDP**, two candidate routes. Try them in this order:
   - **A. The debugger port Office already opens under `office-addin-debugging`** (the [VS Code debug configuration](https://learn.microsoft.com/office/dev/add-ins/testing/debug-desktop-using-edge-chromium) attaches on **9229**). If Playwright's `ConnectOverCDPAsync("http://127.0.0.1:9229")` works when Word is started through `scripts/office-debug.mjs`, use it: it is already part of `npm start`.
   - **B. `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<free port>`**, set on the WINWORD process only and **never machine-wide**, because it would affect Teams and Outlook. Use a dedicated `WEBVIEW2_USER_DATA_FOLDER`. See the [Playwright WebView2 guide](https://playwright.dev/dotnet/docs/webview2). **Caveat:** Word started through COM activation (`new Word.Application`) is launched by DCOM and does *not* inherit the harness's environment. For route B, start `WINWORD.EXE` as a child process with the variable set, then attach COM to it.
2. **Attaching COM to a running Word in .NET 8.** `Marshal.GetActiveObject` no longer exists. P/Invoke `oleaut32!GetActiveObject` instead, or walk the Running Object Table.
3. **Getting the pane open on the scratch copy without a click.** Options: `office-addin-debugging start … --document <scratch copy>` (its desktop sideload normally opens the pane with the document), the shortcut through FlaUI (normal build), or the ribbon button through FlaUI (devpane launcher). Record which one works.
4. **Whether the devpane build still answers Ctrl+Shift+Y.** If it does not, layer 3 runs on the devpane build and layer 5 on the normal build, and the harness restarts between the two.

## 9. Constitution impact (1.1.0 → 1.2.0, MINOR)

Make the amendment when `002` merges into `001` after M2, with `/speckit-constitution`:

- **Technology constraints, Testing:** "the Office.js contract run happens inside Word (Script Lab or a dev task pane)" becomes "…inside Word, from the dev pane, started and read by the desktop harness (`tests/desktop`)". Add the harness (C#, xUnit, Playwright for .NET, FlaUI, Word COM) as development-only tooling.
- **Principle II:** name the test layers. A quickstart scenario that can be automated is written as a harness test before the implementation that satisfies it.
- **Quality gate 5:** the manual checklist is the layer 7 list only. Layers 3–5 must pass on the Windows machine before a release.

## 10. Commands (target state)

```powershell
npm test                                            # layers 1–2 (exists)
dotnet test tests/desktop                           # layers 3–5; Word must be closed; hands off the keyboard
dotnet test tests/desktop --filter Category=Contract
dotnet test tests/desktop --filter "FullyQualifiedName~Scenario01"   # one scenario
```

Later, not part of this proposal: register this PC as a **self-hosted GitHub Actions runner** labelled `word`, running interactively rather than as a service, so that layers 3–5 run on pull requests.

## 11. Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Neither CDP route reaches the add-in's WebView2 | Medium | M0 tests it first. Without it: layers 4–5 still run, palette state is read through UIA instead of the DOM, and the contract run stays manual |
| Word is already running, so the launch joins it and the environment is ignored | High | Refuse and ask the owner to close Word. Never kill it |
| The test console steals focus | High | Foreground Word and verify it before every chord |
| Locked screen or screensaver | Medium | Layer 5 skips with a clear message |
| Flaky UI tests | Medium | Condition waits only, traces on failure, at most one retry while diagnosing. A flaky test is a bug, never skipped or quarantined |
| The `·` in the repository path breaks sideload or scratch paths | Known | ASCII paths under `%LOCALAPPDATA%\radcut-dev\`, as `scripts/office-debug.mjs` does |
| Fixture texts drift between `.docx`, the fake and the harness | Low | All three read the same paragraph texts. `tests/fixtures/README.md` is the single list |
| An open CDP port is an attack surface | Low | `127.0.0.1` only, dev runs only, the variable set on the child process only |

## 12. Expected effect on human time

| | Today | After M3 (and M5 for later stories) |
| --- | --- | --- |
| In-Word contract run | Several runs by hand plus six hand checks | `dotnet test --filter Category=Contract` |
| End of each user story | Quickstart scenarios by hand (T055 took two evenings) | Harness scenarios written test-first. Nothing manual unless the story touches §6 |
| Release candidate | Full quickstart, 27 scenarios | §6 list, about 10 minutes |

## 13. Handover: prompt for Claude Code on the Windows desktop

**Prerequisites:** Windows 11; Word for Microsoft 365 desktop, current channel, signed in; Node.js 22 LTS; .NET 8 SDK or later; Git; PowerShell 7; the dev certificate installed (`npm run certs`). **Save and close Word before starting.** While the harness runs, leave the keyboard and mouse alone.

Paste this into Claude Code from the repository root:

> Read `docs/proposals/0001-automated-testing.md` from `origin/main` (`git fetch origin main` then `git show origin/main:docs/proposals/0001-automated-testing.md`). Then read `CLAUDE.md`, `.specify/memory/constitution.md`, `specs/001-heading-xref-palette/quickstart.md`, `docs/acceptance-checklist.md` and `tests/fixtures/README.md` on branch `001-heading-xref-palette`.
>
> Create feature `002-desktop-test-harness` from `001-heading-xref-palette` with `/speckit-specify`, then `/speckit-plan` and `/speckit-tasks`. Copy the proposal into the new branch with `git checkout origin/main -- docs/proposals/0001-automated-testing.md`. Tag every test task with its layer `[L1]`–`[L7]`. Reuse what §1 lists. Do not rebuild the contract runner or the fixtures.
>
> Implement **M0 first**, test-first. Never kill or reuse a running Word: if `WINWORD.EXE` is running, stop and ask me to close it. Never set a WebView2 environment variable machine-wide. Report which routes in §8 worked, with test output as evidence. If no route reaches the task pane over CDP, stop and report before going further.
>
> If M0 passes, continue with M1, then M2 and M3, committing after each green milestone. Merge `002` back into `001-heading-xref-palette` once M1 is green. Leave M5's constitution amendment until M3 is green. Do not copy anything from the gitignored PRD or `planning/` into committed files.

## 14. References

- Playwright: [WebView2 (.NET)](https://playwright.dev/dotnet/docs/webview2) and [WebView2 (Node)](https://playwright.dev/docs/webview2)
- Meziantou: [Debugging a WebView2 component using Playwright in .NET](https://meziantou.net/debugging-a-webview2-using-playwright-in-dotnet.htm)
- Microsoft: [Debug add-ins on Windows using VS Code and WebView2](https://learn.microsoft.com/office/dev/add-ins/testing/debug-desktop-using-edge-chromium) and [Debug add-ins using Edge DevTools](https://learn.microsoft.com/office/dev/add-ins/testing/debug-add-ins-using-devtools-edge-chromium)
- Microsoft: [`office-addin-debugging`](https://www.npmjs.com/package/office-addin-debugging) and [`office-addin-dev-settings`](https://www.npmjs.com/package/office-addin-dev-settings)
- FlaUI: [github.com/FlaUI/FlaUI](https://github.com/FlaUI/FlaUI) and the [FlaUInspect](https://github.com/FlaUI/FlaUInspect) tree viewer
- Word object model: [`Fields.Update`](https://learn.microsoft.com/office/vba/api/word.fields.update), [`Field.DoClick`](https://learn.microsoft.com/office/vba/api/word.field.doclick), [`Selection.InsertCrossReference`](https://learn.microsoft.com/office/vba/api/word.selection.insertcrossreference), [`Document.Protect`](https://learn.microsoft.com/office/vba/api/word.document.protect), [`Revisions`](https://learn.microsoft.com/office/vba/api/word.revisions)
- Anthropic: [Computer use](https://docs.claude.com/en/docs/agents-and-tools/tool-use/computer-use-tool)
