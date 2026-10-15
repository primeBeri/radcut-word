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

Filled in by the feasibility checks (task T024): how the harness reaches the task pane over CDP
(route A: the `office-addin-debugging` port; route B: a debugging port on the WINWORD process it
starts), how it attaches COM to that Word, how the pane opens on the scratch document, and
whether the dev-pane build answers Ctrl+Shift+Y.

_Not yet run._
