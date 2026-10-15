---

description: "Task list for the desktop test harness"
---

# Tasks: Desktop Test Harness for the In-Word Checks

**Input**: Design documents from `/specs/002-desktop-test-harness/`; design source
`docs/proposals/0001-automated-testing.md`.

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Required (Constitution II). TypeScript changes: a Vitest test first, seen to fail.
Harness: each check is written first and seen to fail (or not compile) against the missing
infrastructure, then made to pass. Speed changes are guarded by an unchanged per-case outcome
in Word (research D2).

## Format: `[ID] [P?] [Story] [Layer] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US5 from spec.md
- **[Layer]**: the proposal's test layers: `[L1]` unit/component, `[L2]` contract vs fake,
  `[L3]` contract or pane state in Word, `[L4]` document via COM, `[L5]` keyboard and focus.
  Test at the lowest layer that can observe the behaviour.

## Ground rules for every task

- Never kill, reuse or attach to a Word the harness did not start; if `WINWORD.EXE` is running,
  stop and ask the owner to close it (FR-003).
- Never set a WebView2 or other environment variable machine-wide or user-wide (FR-008).
- No fixed sleeps; every wait is a condition with a time-out (FR-006).
- Find paragraphs by text from `tests/fixtures/README.md`, never by index.
- Reuse the contract runner (`src/dev/mini-test.ts`), registry, fixture script and
  `scripts/office-debug.mjs`; do not rebuild them.
- No contract case is weakened, removed or skipped to save time (FR-016).
- After each TypeScript task: `npm test`, `npm run lint` and `npm run typecheck` green. After each
  harness task: `dotnet build tests/desktop/RadCut.DesktopTests.slnx` green.
- Nothing from the gitignored PRD or `planning/` goes into committed files.

---

## Phase 1: Setup

- [X] T001 Add `tests/desktop/**/bin/`, `tests/desktop/**/obj/` and `tests/desktop/test-results/` to `.gitignore`
- [X] T002 Create the .NET 10 test project `tests/desktop/RadCut.DesktopTests/RadCut.DesktopTests.csproj` (`net10.0-windows`, nullable and warnings-as-errors on, xUnit v3, Microsoft.Playwright, FlaUI.UIA3; no Office interop assemblies, COM is late-bound) and a solution file `tests/desktop/RadCut.DesktopTests.slnx`; `dotnet build tests/desktop/RadCut.DesktopTests.slnx` succeeds with an empty test
- [X] T003 [P] Create `tests/desktop/README.md` with prerequisites (quickstart.md), the commands from contracts/harness-commands.md, the safety rules above, and an empty "Routes that worked" section for T030

---

## Phase 2: Contract-run speed (US2, part A; no harness needed)

**Goal**: the in-Word gateway contract suite runs in under 5 minutes with every case's outcome
unchanged, and shows where time goes. Benefits manual pane runs at once.

**Independent test**: run the gateway suite from the dev pane on a scratch copy of
`spec-contract.docx`: total under 5 minutes, per-case outcomes equal the baseline from T008.

- [X] T004 [P] [US2] [L1] Unit tests first for `MiniTest` in `tests/unit/mini-test.test.ts`: each `CaseResult` has `durationMs` ("wall time of the case body, ≥ 0; 0 for `skip`"), `error` "present only when `status` is `fail`", names are prefixes joined with " > "; a `timings` record set during a case through a new `mark(name, ms)` on the runner is attached to that case only; `run()` returns `ContractRunResults` (`suite`, `fixture`, `startedAt` ISO 8601, `totalMs`, `cases` in run order) per data-model.md; a pure `formatSummary(results)` gives the line text ("PASS 412 ms <name>") and the summary (counts, total, the five slowest cases), so T006's display is tested here
- [X] T005 [US2] [L1] Implement T004 in `src/dev/mini-test.ts` (`performance.now()` around each body; a `timing(name)` helper the harness can call); make the Vitest project include `src/dev/mini-test.ts` coverage if the config requires it
- [X] T006 [US2] [L1] Show per-case duration on each result line and the total plus the five slowest cases in the summary, using `formatSummary` from T004/T005, in `src/dev/contract-pane.ts`
- [X] T007 [US2] [L3] Instrument `wordHarness` in `src/adapters/office/dev-registration.ts`: time the restore, `select` (including `paragraphByText`) and `documentState`/`bookmarks`/`fields` reads through the runner's timing helper, so each case shows where its time went (depends on T005)
- [X] T008 [US2] [L3] Baseline run in Word: run "IDocumentGateway: OfficeJsGateway" from the dev pane on a scratch copy of `spec-300.docx` (accepted for spec-contract, as a superset; this run shows the effect of restoring only when dirty, against the 20–25 minutes before); record the total, the five slowest cases with their phase timings, and each case's outcome in `specs/002-desktop-test-harness/research.md` (new section "D2 measurements"); confirm or correct the D2 hypotheses before T009 (needs the owner or the harness to run Word; depends on T007) (2026-10-15: 17 min 16.6 s, outcomes unchanged; restores grow over the run, see research D2 measurements)
- [X] T009 [US2] [L2] Tests first: add `"spec-contract"` to `ContractFixture` in `tests/contract/document-gateway.contract.ts` and switch every `setup("spec-300")` to `setup("spec-contract")`; add `specContract` to `tests/fakes/fake-documents.ts` per contracts/spec-contract-fixture.md (the named paragraphs of `spec300`, filler only Chapters 5 and 6, footnote and endnote anchored as in `spec300`, marker paragraph "Contract fixture." as the last paragraph before "Title of the document", `documentId` `https://example.invalid/spec-contract.docx`); `npm test` green on the fake, and no case depends on a heading after Chapter 6
- [X] T010 [US2] Build `spec-contract.docx` and its manifest in `tests/fixtures/make-fixtures.ps1` (a function shared with `spec-300` that takes the filler chapter count, so the two stay identical up to Chapter 6; table of contents over the fixture's own headings); regenerate with Word closed; add a `spec-contract.docx` section to `tests/fixtures/README.md`; add the marker to `FIXTURE_MARKER` in `src/adapters/office/dev-registration.ts` and update its registration's `fixture` text to "a scratch copy of spec-contract.docx" (depends on T009) (2026-10-15: script, README and markers done; regenerated by the owner the same day)
- [X] T011 [US2] [L3] Restore only when dirty in `src/adapters/office/dev-registration.ts`, per data-model.md DirtyState: wrap the gateway so `insertReference` and any method not on the read-only list (`readHeadings`, `checkInsertionPoint`, `listBookmarkNames`, `readReferences`, `returnFocus`) marks the document dirty, as do `setParagraphText` and `failNextWrite`; the next `wordHarness()` restores only if dirty; when clean it still compares the main text's length and the bookmark count with the snapshot's and forces a restore with a `console.warn("[radcut:contract] …")` naming the previous case on a mismatch; the marker check reuses the restore's sync (depends on T010)
- [X] T012 [US2] [L3] Run the suite in Word on a scratch copy of `spec-contract.docx`: total under 5 minutes; every case's outcome equals T008's baseline (former hand checks still fail with their manual message). If not under 5 minutes, use T007's timings to cache story paragraph lists in `paragraphByText` until the next write, and rerun. Record before and after in `research.md` "D2 measurements" and in `docs/acceptance-checklist.md` (depends on T011) (2026-10-15: 1 min 3.5 s, outcomes unchanged; 5b's text box heading now passes too)

**Checkpoint**: manual contract runs are fast. Can be merged into `001` on its own if wanted.

---

## Phase 3: Foundational harness infrastructure

**Purpose**: what every harness story needs. No story work before this phase is done.

- [X] T013 [P] `Wait.Until(Func<bool> condition, TimeSpan timeout, string description)` and an async variant, with short back-off polling and a time-out exception naming the description; default time-outs from research D8 (60 s Word start and sideload, 10 s pane, 2 s focus), in `tests/desktop/RadCut.DesktopTests/Infrastructure/Wait.cs`
- [X] T014 [P] `Preflight`: fails every test with exactly "Word is running. Save your work and close Word, then run again." if any `WINWORD.EXE` exists; checks the localhost certificate is trusted ("The localhost certificate is not trusted. Run npm run certs."); reports whether an interactive desktop is available (research D12) for `[L5]` tests to skip with "SKIPPED: no interactive desktop", in `tests/desktop/RadCut.DesktopTests/Infrastructure/Preflight.cs`
- [X] T015 [P] `ScratchFixture.Create(fixture)` copies `tests/fixtures/<fixture>.docx` to `%LOCALAPPDATA%\radcut-dev\scratch\<run id>\<test id>\` (refuse a non-ASCII path), deletes it after a pass, hands it to `Evidence` after a fail; at start, deletes scratch folders of earlier runs, in `tests/desktop/RadCut.DesktopTests/Infrastructure/ScratchFixture.cs`
- [X] T016 [P] `DevServer.Start(mode)` (`normal` → `npm run dev-server`, `devpane` → `vite --mode devpane`) as a child process, waits for `https://localhost:3000` to answer, fails with "Port 3000 is in use. Stop the other server (npm stop) and run again." when another process holds the port, and stops only its own process tree, in `tests/desktop/RadCut.DesktopTests/Infrastructure/DevServer.cs`
- [X] T017 [P] `Evidence.Capture(testName)`: Word window PNG (capture by window handle), the scratch document saved under a new name, the pane console log and the Playwright trace if a pane session exists, `harness.log`, under `tests/desktop/test-results/<test name>/`; hooked into a base fixture so every failing test captures, in `tests/desktop/RadCut.DesktopTests/Infrastructure/Evidence.cs`
- [X] T018 [P] `Summary` writes `tests/desktop/test-results/summary.md` (counts per category, failures with message and evidence folder, skips with reason, contract timings) at the end of the run, in `tests/desktop/RadCut.DesktopTests/Infrastructure/Summary.cs`

---

## Phase 4: User Story 1 — Prove the harness can reach Word and the add-in (P1) 🎯 go/no-go

**Goal**: M0. **Independent test**: `npm run test:desktop -- --filter-trait "Category=M0"` passes with
Word closed, leaves no WINWORD process and no changed fixture, and the README names the routes.

### Checks first ⚠️

- [X] T019 [US1] Write the M0 checks, red, in `tests/desktop/RadCut.DesktopTests/Feasibility/M0Tests.cs` (`[Trait("Category","M0")]`): (a) dev server up and the add-in sideloaded, for the normal and the devpane build; (b) Word open on a scratch copy of `spec-contract.docx` with the add-in available; (c) COM reads "Fire strategy" from that document and its `FullName` is the scratch path; (d) Playwright reads the pane's `<title>` or a known element; (e) `[L5]` Ctrl+Shift+Y focuses the palette's search box (UIA focused element by accessible name, and `document.activeElement` agrees); (f) after teardown no WINWORD process the harness started remains and the fixture's hash is unchanged; plus a refusal check that, with a WINWORD process present, the harness starts nothing (simulated by a stub process name, never a real Word)

### Implementation

- [X] T020 [US1] `Sideload` registers and unregisters through `node scripts/office-debug.mjs start|stop` (ASCII manifest copy), with the D5 options to open the pane on a given document (`--document <scratch>`), in `tests/desktop/RadCut.DesktopTests/Infrastructure/Sideload.cs` (2026-10-15: the harness starts Word itself on a scratch copy carrying the sideload template's task pane parts, `TaskpaneDocument.cs`, so the pane opens with the document; `office-addin-dev-settings register` and `debugging` do the registration)
- [X] T021 [US1] `WordSession`: route A (Word started by `office-addin-debugging`, CDP on 127.0.0.1:9229) and route B (start `WINWORD.EXE <scratch>` as a child with `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<free port>` and a dedicated `WEBVIEW2_USER_DATA_FOLDER`, on that process only); record the process id; attach COM by `oleaut32!GetActiveObject` checked against the scratch document, falling back to the Running Object Table moniker of the scratch document (research D4); teardown closes the document without saving, quits, and waits for the process to exit, in `tests/desktop/RadCut.DesktopTests/Infrastructure/WordSession.cs`
- [X] T022 [US1] `TaskPane`: `ConnectOverCDPAsync` on the session's endpoint, pick the page whose URL starts with `https://localhost:3000/` and matches the pane path, start tracing, collect console messages; helpers `SearchBox`, `Rows`, `Message`, in `tests/desktop/RadCut.DesktopTests/Infrastructure/TaskPane.cs`
- [X] T023 [US1] `Keys`: find Word's document window for the session's process, `SetForegroundWindow` and verify before every chord (fail rather than type elsewhere), send chords with FlaUI, read the UIA focused element, in `tests/desktop/RadCut.DesktopTests/Infrastructure/Keys.cs`
- [X] T024 [US1] Make T019 pass by trying routes A then B (CDP) and the D5 options (pane open) in order; for D6, check whether the devpane build answers Ctrl+Shift+Y. Record every route tried, what worked and what did not with the error, in `tests/desktop/README.md` "Routes that worked". **If no route reaches the task pane, stop and report to the owner before any further phase** (FR-012) (2026-10-15: go. Route B, pane opened from the ribbon; M0 5 of 5 in about 2 minutes; see the README)

**Checkpoint**: go/no-go. Commit.

---

## Phase 5: User Story 2, part B — Run the contract suite unattended (P1)

**Goal**: M1. **Independent test**: `npm run test:desktop -- --filter-trait "Category=Contract"` gives
one result per case for every registered Office suite, none asking for a person.

**Design change (2026-10-15, M1):** instead of re-implementing the hand checks in C#
(`HandCheckTests`), the harness exposes a **desktop bridge** to the contract pane
(`src/dev/desktop-bridge.ts`, `tests/desktop/.../DesktopBridge.cs`). When a contract case needs a
state Office.js cannot create (a caret in a comment or the re-created text box, protection, a fresh
plain-text control, real Ctrl+Shift+Y, the ribbon button, the pane's ×, Ctrl+Z, F9, moving a
heading, a real Ctrl+click), the Word contract harness asks the desktop for it and the case runs as
written. Every check stays in the one shared contract suite; a run started by hand keeps the manual
instructions. Cases 7a (after update), 7c (jump) and 14 are now real cases (14 split into Undo and
update), driven through `GatewayContractHarness.word`.

### Tests first ⚠️

- [X] T025 [P] [US2] [L1] Unit tests first for the pane automation per contracts/contract-pane-automation.md, with the pane's logic extracted to a testable module `src/dev/contract-autorun.ts` (no Office globals): `?suite=<label>&autorun=1` picks the suite by exact label; unknown label → status `error` with `{ "error": "Unknown suite: <label>", "suites": [...] }`; without `autorun` the suite is only preselected; status goes `idle` → `running` → `done`; results published to `#contract-results` and `window.__radcutContractResults`, identical, every case once, in `tests/unit/contract-autorun.test.ts`
- [X] T026 [P] [US2] Extend `scripts/check-bundle-size.mjs` so the release build fails if any file in `dist/` contains `__radcutContractResults` or `contract-results`; check with a deliberately planted file, then remove it
- [X] T027 [US2] [L3] Write `ContractRunTests` red in `tests/desktop/RadCut.DesktopTests/Contract/ContractRunTests.cs` (`[Trait("Category","Contract")]`): for each registered Office suite (from the pane's suite list), a fresh scratch copy of its fixture, navigate the dev pane to `contract-pane.html?suite=…&autorun=1`, wait for `data-status` `done` (time-out from the suite's case count), parse the JSON, and report one xUnit theory row per case named `Contract.<suite>.<case name>` with its outcome, duration and message; contract timings go to the summary
- [X] T028 [US2] [L3][L4][L5] ~~Write `HandCheckTests` red~~ (2026-10-15: replaced by the desktop bridge, see the Phase 5 note) Write `HandCheckTests` red in `tests/desktop/RadCut.DesktopTests/Contract/HandCheckTests.cs`, one test per proposal §4.4 row: caret in a comment (COM `Comments(1).Range.Select()`, shortcut, pane message); protected document (COM `Protect(wdAllowOnlyReading)`, shortcut, protected message, document unchanged by snapshot); content control Enter, Enter, one Ctrl+Z restores the snapshot; picture, one Ctrl+Z restores; host shell (shortcut, ribbon "Cross-reference" by UIA name, pane × close: pane visibility and focus); plain-text content control parts of cases 5d and 10f (COM re-creates the control after the restore, or a fresh scratch copy); text box heading part of case 5b (COM `Shapes(1).TextFrame.TextRange.Paragraphs(1).Range.Select()`)

### Implementation

- [X] T029 [US2] Implement `src/dev/contract-autorun.ts` until T025 passes and use it from `src/dev/contract-pane.ts` (manual behaviour unchanged)
- [X] T030 [P] [US2] `DocumentState` (COM): caret or selection by paragraph text in any story (main, table cell, header, footer, text box, footnote, endnote, comment), selection of a content control, picture, table or field, `Protect`/`Unprotect`, tracking on/off, in `tests/desktop/RadCut.DesktopTests/Infrastructure/DocumentState.cs` (2026-10-15: done in `DesktopBridge.cs`, which finds a paragraph by its whole text in any story, comments included)
- [ ] T031 [P] [US3] `DocumentSnapshot` per data-model.md (text per story, fields code and result, bookmarks name/story/start/end, revisions), equality reporting the first differing item, in `tests/desktop/RadCut.DesktopTests/Infrastructure/DocumentSnapshot.cs` (2026-10-15: not needed for M1, whose cases compare the contract harness's `documentState()`; moved to US3 with `DocumentInspector`)
- [X] T032 [US2] Make T027 and T028 pass (2026-10-15: 65 of 66 cases pass; 10f deferred past V1, T047) (depends on T029–T031, T024); where a manual message remains in the Office registration (`setProtected`, `pressShortcut`, `clickCrossReferenceButton`, `closePaneByUser`, the text box and plain-text control fallbacks in `src/adapters/office/dev-registration.ts`), keep the manual message for pane runs and let the harness test cover the case; the pane suite's manual failures are reported by `ContractRunTests` as skipped with "covered by HandCheckTests.<name>", not as passes
- [X] T033 [US2] Run `npm run test:desktop -- --filter-trait "Category=Contract"` three times (2026-10-15: 65 passed, 1 failed (10f) on each of three runs; the gateway suite takes 1 min 17 s) on an unchanged build: same outcome every time; record the result, the run time, and that T051's, T138's and T142's hand-check lists are now covered in `docs/acceptance-checklist.md` (depends on T032)

- [X] T047 [US2] [L3] Case 10f in Word (plain-text control selected whole): deferred past V1 by the owner, 2026-10-15. Plain-text content controls are rare, and Office.js stops listing one after the harness's restore, so the case cannot be set up in Word. 10f stays in the contract suite against FakeGateway and is registered as skipped in the Word run; see `docs/backlog.md`

**Checkpoint**: M1 green. Commit; merge `002` into `001-heading-xref-palette` if feature 001 needs the faster run before Phase 6.

---

## Phase 6: User Story 3 — Verify what is in the saved document (P2)

**Goal**: M2. **Independent test**: `npm run test:desktop -- --filter-trait "Category=Document"` passes
on the current build; changing an expected switch makes the matching test fail.

### Checks first ⚠️

- [ ] T034 [US3] [L4] Write `DocumentVerificationTests` red in `tests/desktop/RadCut.DesktopTests/Documents/DocumentVerificationTests.cs` (`[Trait("Category","Document")]`), each inserting through the real palette (shortcut, query, Enter) on a scratch copy and then inspecting by COM: scenario 3 (F9, move section 4.3 above 4.1 by COM range move, F9: new number, field still targets the bookmark); 4 (second insert to the same heading adds no bookmark); 6 (save, close, reopen in a COM-only Word with the add-in unregistered, `Fields.Update()`: results correct); 14 (`tracked.docx`: insert, `Revisions.AcceptAll()` on one copy and `RejectAll()` on another: as feature 001 quickstart 14); 19 (new `_RC…` bookmark, `_Toc…` not reused; `TablesOfContents(1).Update()` then F9: still resolves); 20 (references inside bold and italic text match the surrounding text after F9, not the heading); 26 (`Selection.InsertCrossReference("Heading", wdNumberFullContext, n, true)` versus RAD·CUT: field types, switches and bookmark extents as feature 001 expects); plus the hyperlink jump: `Field.DoClick()` then `Selection` within the bookmark (research D11)

### Implementation

- [ ] T035 [US3] `DocumentInspector` per data-model.md ReferenceFieldInfo: every REF/PAGEREF field per story with bookmark and switches (parse the code), result before and after `Fields.Update()`, surrounding text formatting; bookmarks with extent relative to their paragraph (text, paragraph, partial); revisions, in `tests/desktop/RadCut.DesktopTests/Infrastructure/DocumentInspector.cs`
- [ ] T036 [US3] Make T034 pass (depends on T035); if `DoClick` does not move the selection, mark that test skipped with the reason, record it in `tests/desktop/README.md` and add the Ctrl+click jump to the human list in `docs/acceptance-checklist.md`
- [ ] T037 [US3] Run `--filter Category=Document` three times on an unchanged build, same outcome; then break one expectation on purpose (a missing `\h`) to see the right test fail with evidence, and revert

**Checkpoint**: M2 green. Commit. Merge `002` into `001-heading-xref-palette`; the constitution amendment and the `001` task rewording follow there (outside this task list).

---

## Phase 7: User Story 4 — Rerun the US1 acceptance scenarios (P2)

**Goal**: M3. **Independent test**: `npm run test:desktop -- --filter-trait "Category=Scenario"` passes
and writes `acceptance-summary.md`.

- [ ] T038 [US4] [L3][L4][L5] Write `Us1Scenarios` red in `tests/desktop/RadCut.DesktopTests/Scenarios/Us1Scenarios.cs` (`[Trait("Category","Scenario")]`, names `ScenarioNN_<title>`), from `specs/001-heading-xref-palette/quickstart.md`: 1 (`fstrat`: "4.3 Fire strategy" first with highlighted letters in the DOM, "§ 4.3 Fire strategy" inserted, caret after it); 2 (Esc: snapshot and `Selection.Start` unchanged); 5 (no selection, a word, a confirmed two-paragraph selection; one Ctrl+Z restores the snapshot each time; again with tracking on); 12 (heading, Title, comment, plain-text control declined with the expected message; header, footer, text box inserted, one Undo, caret returns; protected document); 13 (caption, quote, table cell, footnote insert); 21 (COM moves the selection while the palette is open, then Enter); 22 (tracked-deleted heading not listed; after reject, as expected); 23 (words, multi-paragraph and table selections); 25 (badges in the DOM, results by COM); 27 (caret inside an existing REF field)
- [ ] T039 [US4] `Summary` writes `tests/desktop/test-results/acceptance-summary.md` in the `docs/acceptance-checklist.md` table format (`| # | Result | Notes |`), with `Human` rows for the items that stay human, in `tests/desktop/RadCut.DesktopTests/Infrastructure/Summary.cs`
- [ ] T040 [US4] Make T038 pass, fixing harness helpers as needed; a scenario that fails because the add-in is wrong is reported to the owner with its evidence, not worked around in the harness
- [ ] T041 [US4] Run `--filter Category=Scenario` three times, same outcome; paste the summary into `docs/acceptance-checklist.md` as the automated US1 run

---

## Phase 8: User Story 5 — Time the palette from outside (P3)

- [ ] T042 [US5] [L3][L5] Write `BudgetTests` red in `tests/desktop/RadCut.DesktopTests/Performance/BudgetTests.cs` (`[Trait("Category","Performance")]`): on `spec-300.docx`, open the palette ten times (shortcut → search box focused and rows rendered), report median and worst, fail if the median exceeds 500 ms; on `guide-500.docx`, type a 10-character query, report per-keystroke time to list updated (DOM mutation observed through Playwright), fail if the median exceeds 50 ms; times written to the summary
- [ ] T043 [US5] Make T042 run reliably (warm-up open excluded, timestamps taken in the page with `performance.now()` where possible); when feature 001's T096 performance runner exists, also read and report its results

---

## Phase 9: Polish

- [ ] T044 [P] Ten consecutive full runs (`npm run test:desktop`) on an unchanged build: no test changes outcome (SC-006); fix any flaky test as a defect; record the full-run time against the plan's goal (under 30 minutes) in `tests/desktop/README.md`
- [ ] T045 [P] Do the safety checks of `quickstart.md` §5 (Word open → refusal and untouched; locked screen → skips; deliberate failure → evidence; no leftover WINWORD; no fixture changed) and record them in `tests/desktop/README.md`
- [ ] T046 Update `CLAUDE.md` "Project state and commands" with the harness commands and the `spec-contract` fixture; update `docs/proposals/0001-automated-testing.md` status to "Accepted, implemented in 002"

---

## Dependencies & Execution Order

- **Phase 1 Setup**: none.
- **Phase 2 Contract-run speed**: needs nothing from the harness; T008 and T012 need Word runs
  (owner, or the harness once Phase 4 is green). Can run alongside Phases 3–4.
- **Phase 3 Foundational**: needs Phase 1. Blocks Phases 4–8.
- **Phase 4 US1 (M0)**: needs Phase 3. **Go/no-go for Phases 5–8.**
- **Phase 5 US2 part B (M1)**: needs Phase 4 and T011 (dirty restore, so automated runs are fast).
- **Phase 6 US3 (M2)**: needs Phase 4 and T030–T031.
- **Phase 7 US4 (M3)** and **Phase 8 US5 (M4)**: need Phase 6; may run after `002` is merged into
  `001`, alongside feature 001's US2.
- **Phase 9 Polish**: after the stories delivered.

### Parallel opportunities

- T003 alongside T002.
- Phase 2's T004 and the whole of Phase 3 (T013–T018) in parallel; T013–T018 are separate files.
- T025 and T026 alongside T027–T028; T030 and T031 in parallel.

## Parallel Example: Phase 3

```text
T013 Wait.cs  |  T014 Preflight.cs  |  T015 ScratchFixture.cs
T016 DevServer.cs  |  T017 Evidence.cs  |  T018 Summary.cs
```

## Implementation Strategy

1. Phase 2 first: it pays off immediately in manual runs and needs only two Word runs from the
   owner (T008 baseline, T012 after).
2. Phases 1, 3, 4: M0 go/no-go. Stop and report if the pane is unreachable.
3. Phase 5 (M1), Phase 6 (M2), commit after each; merge into `001`, amend the constitution,
   reword `001`'s in-Word tasks.
4. Phases 7–8 alongside feature 001's US2; Phase 9 before the first release candidate.
