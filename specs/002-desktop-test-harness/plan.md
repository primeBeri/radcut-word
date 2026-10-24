# Implementation Plan: Desktop Test Harness for the In-Word Checks

**Branch**: `002-desktop-test-harness` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-desktop-test-harness/spec.md`; design source
`docs/proposals/0001-automated-testing.md`.

## Summary

Make the in-Word checks of feature 001 run unattended from one command on the owner's Windows
machine. Two parts:

1. **Contract-run speed (TypeScript, no harness needed)**: per-case timings in the in-Word
   runner, a small `spec-contract` fixture for the contract suite, and restoring the document
   only after a case changed it. Target: the gateway suite under 5 minutes, from 20–25 (research
   D2). This lands first, because it also speeds up today's manual runs.
2. **Desktop harness (C#)**: a .NET test project that starts the dev server, sideloads, launches
   Word on scratch fixture copies, attaches Word COM (document set-up and inspection),
   Playwright over CDP (task pane DOM) and FlaUI (real keystrokes, focus). It runs the contract
   suites case by case, the document-verification checks, the US1 quickstart scenarios and the
   timing checks. M0 proves the routes before anything else is built on them.

## Technical Context

**Language/Version**: C# 13 on .NET 10 (`net10.0-windows`) for the harness; TypeScript (strict)
for the dev-pane and contract-harness changes; PowerShell 7 for the fixture script.

**Primary Dependencies**: xUnit v3, Microsoft.Playwright (CDP connection only, no bundled
browsers), FlaUI.UIA3, Word COM late-bound; existing Vitest, `office-addin-debugging`.

**Storage**: files only: fixtures in `tests/fixtures/`, scratch copies in
`%LOCALAPPDATA%\radcut-dev\scratch\`, evidence in `tests/desktop/test-results/` (gitignored).

**Testing**: the harness is itself the test suite (`npm run test:desktop`). Its
infrastructure is proved by the M0 checks; TypeScript changes are unit-tested with Vitest
(`tests/unit/mini-test.test.ts`) and proved in Word by an unchanged contract outcome.

**Target Platform**: Windows 11, Word for Microsoft 365 desktop (current channel, signed in),
interactive desktop for keyboard checks.

**Project Type**: developer test tooling inside the existing single project.

**Performance Goals**: gateway contract suite under 5 minutes (FR-017); harness overhead per
check under 30 s including Word start; full harness run under 30 minutes.

**Constraints**: never touch a Word the harness did not start (FR-003); CDP on 127.0.0.1 and the
started process only (FR-008); no fixed sleeps (FR-006); nothing in the release build (FR-009);
the `·` in the repository path never reaches Word (ASCII scratch and manifest paths).

**Scale/Scope**: about 90 contract cases across 4 fixtures, 6 former hand checks, 17 quickstart
scenarios (US3 + US4), 2 timing checks.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre | Post |
|---|---|---|---|
| I. Ports and adapters | No Office.js outside `src/adapters/`; harness is outside `src/` | ✅ | ✅ dev-registration (adapter) owns the dirty tracking; `src/dev/` changes use no Office globals; the harness talks to Word through COM, never through the core |
| II. Test-first | Tests before the code they drive | ✅ | ✅ MiniTest timing and autorun/results have Vitest tests first; each harness check is written red against the current build before the infrastructure that makes it pass; the speed work is guarded by an unchanged per-case outcome (D2) |
| III. Native Word output | Product output unchanged | ✅ | ✅ no product code changes; the harness *verifies* native output independently of the add-in (US3) |
| IV. Responsive UI | Budgets measured | ✅ | ✅ US5 measures them from outside |
| V. Local-only, dev tooling out of release | No network beyond localhost; dev code excluded | ✅ | ✅ CDP on 127.0.0.1; `src/dev/**` already excluded and checked by `check-bundle-size.mjs`; the release-build check also refuses the results global in `dist/`; `tests/desktop` is outside the bundle. NuGet restore is a dev-time download like `npm install` |
| VI. Simplicity, verified assumptions | Spike risky assumptions first | ✅ | ✅ M0 go/no-go before any harness feature; speed work measured before and after each step |
| Tech constraint: TypeScript | The add-in is TypeScript | ⚠️ | ⚠️ the harness is C#; justified in Complexity Tracking; it is development-only tooling, never shipped |
| Testing constraint | Office.js contract run inside Word | ✅ | ✅ still inside Word, from the dev pane; the harness starts and reads it |

## Project Structure

### Documentation (this feature)

```text
specs/002-desktop-test-harness/
├── plan.md              # This file
├── research.md          # Phase 0: decisions D1–D12
├── data-model.md        # Phase 1: harness entities
├── quickstart.md        # Phase 1: how to run and validate
├── contracts/
│   ├── contract-pane-automation.md   # URL parameters, results JSON, timings
│   ├── harness-commands.md           # categories, filters, outputs, exit codes
│   └── spec-contract-fixture.md      # the small contract fixture
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/dev/
├── mini-test.ts              # + per-case duration, timing marks
└── contract-pane.ts          # + ?suite=&autorun=1, results JSON, data-status, slowest cases

src/adapters/office/
└── dev-registration.ts       # + dirty tracking, restore only when dirty, timing marks,
                              #   spec-contract fixture marker

tests/contract/
└── document-gateway.contract.ts  # ContractFixture + "spec-contract"; spec-300 → spec-contract

tests/fakes/
└── fake-documents.ts         # + specContract (same texts as the new fixture)

tests/fixtures/
├── make-fixtures.ps1         # + spec-contract.docx
├── spec-contract.docx        # new, generated
├── spec-contract.manifest.txt
└── README.md                 # + spec-contract section

tests/unit/
└── mini-test.test.ts         # new: durations, results shape, autorun parsing

tests/desktop/
├── RadCut.DesktopTests.slnx (or .sln)
├── README.md                 # prerequisites, routes that worked, how to run one test
└── RadCut.DesktopTests/
    ├── RadCut.DesktopTests.csproj
    ├── Infrastructure/
    │   ├── Preflight.cs          # Word-running refusal, interactive desktop, cert, port
    │   ├── Wait.cs               # condition waits with time-outs (D8)
    │   ├── DevServer.cs          # Vite normal / devpane, ready on https://localhost:3000
    │   ├── Sideload.cs           # via scripts/office-debug.mjs (ASCII path)
    │   ├── ScratchFixture.cs     # per-test copy under %LOCALAPPDATA%\radcut-dev\scratch
    │   ├── WordSession.cs        # starts WINWORD (route B env on child only), COM attach (D4), teardown
    │   ├── TaskPane.cs           # Playwright CDP connect, page pick, palette helpers, trace
    │   ├── Keys.cs               # FlaUI: foreground Word, chords, focused element
    │   ├── DocumentState.cs      # COM: caret/selection by paragraph text and story, protect, track
    │   ├── DocumentInspector.cs  # COM: fields, bookmarks, revisions, formatting
    │   ├── DocumentSnapshot.cs   # comparable snapshot for unchanged/Undo checks
    │   ├── Evidence.cs           # trace, window PNG, scratch copy, console log (D9)
    │   └── Summary.cs            # summary.md, acceptance-summary.md
    ├── Feasibility/M0Tests.cs
    ├── Contract/ContractRunTests.cs
    ├── Contract/HandCheckTests.cs
    ├── Documents/DocumentVerificationTests.cs   # quickstart 3, 4, 6, 14, 19, 20, 26
    ├── Scenarios/Us1Scenarios.cs                # quickstart 1, 2, 5, 12, 13, 21, 22, 23, 25, 27
    └── Performance/BudgetTests.cs
```

**Structure Decision**: one .NET project under `tests/desktop/`, outside `src/` and the Vite
build, so it can never reach the release bundle; the TypeScript changes stay in the files that
already own the in-Word runner and the Office contract registration. `.gitignore` gains
`tests/desktop/**/bin/`, `obj/` and `test-results/`.

## Order of work

1. **Contract-run speed** (US2 part A, TypeScript only): measure → `spec-contract` fixture →
   restore only when dirty → measure again. Needs Word only for the before and after runs. Can
   start at once and runs alongside M0.
2. **M0 feasibility** (US1): go/no-go. If the task pane cannot be reached, stop and report.
3. **Contract run automated** (US2 part B): pane autorun and results, `ContractRunTests`,
   `HandCheckTests`.
4. **Document verification** (US3). Then merge `002` into `001-heading-xref-palette` with the
   constitution amendment and the `001` task rewording (outside this feature's tasks).
5. **US1 scenarios** (US4) and **timing** (US5): after the merge, alongside feature 001's US2.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| A C# project in a TypeScript repository | Word COM, real OS input and CDP in one runner with one report and one owner of Word's lifecycle | PowerShell/Pester is awkward for FlaUI and Playwright; Node COM (`winax`) is fragile and native input libraries are poorly maintained (proposal §4.1). It is development-only and never shipped |
| A second contract fixture (`spec-contract`) beside `spec-300` | The contract suite's cost scales with the document; the filler exists only for the 300-heading budget | Trimming `spec-300` itself would lose the performance fixture; keeping one fixture keeps the 20–25-minute run |
