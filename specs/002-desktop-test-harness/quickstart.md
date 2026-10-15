# Quickstart: validate the desktop test harness

## Prerequisites

Windows 11; Word for Microsoft 365 desktop (current channel, signed in); Node.js 22 LTS or later;
.NET 10 SDK; PowerShell 7; `npm install` and `npm run certs` done. **Save and close Word.**
During a run, leave the keyboard and mouse alone.

## 1. Contract-run speed (no harness needed)

```powershell
npx vitest run tests/unit/mini-test.test.ts   # timings and results shape
npm test                                       # FakeGateway contract on spec-contract passes
pwsh tests/fixtures/make-fixtures.ps1          # builds spec-contract.docx (Word closed first)
npm run start:dev-pane                         # then open a scratch copy of spec-contract.docx
```

In the pane, run "IDocumentGateway: OfficeJsGateway". Expected: every case shows its duration;
the summary shows a total under 5 minutes and the five slowest cases; per-case outcomes equal the
last recorded run (only the former hand checks fail, with their manual message).

## 2. Feasibility (M0)

```powershell
npm run test:desktop -- --filter-trait "Category=M0"
```

Expected: all pass; Word starts and closes; `tests/desktop/README.md` names the routes that
worked. If the pane test fails on every route, the run says so; stop there (spec FR-012).

## 3. Contract run

```powershell
npm run test:desktop -- --filter-trait "Category=Contract"
```

Expected: one result per contract case across all suites, no manual messages; the total time is
in `tests/desktop/test-results/summary.md`.

## 4. Document verification and scenarios

```powershell
npm run test:desktop -- --filter-trait "Category=Document"
npm run test:desktop -- --filter-trait "Category=Scenario"
```

Expected: quickstart scenarios 3, 4, 6, 14, 19, 20, 26 and 1, 2, 5, 12, 13, 21, 22, 23, 25, 27 of
feature 001 pass; `tests/desktop/test-results/acceptance-summary.md` exists.

## 5. Safety checks (once)

- With Word open on any document, run `npm run test:desktop -- --filter-trait "Category=M0"`: it refuses
  with the Word-running message and Word is untouched.
- Lock the screen during a scenario run: keyboard tests report `SKIPPED: no interactive desktop`.
- Make a check fail on purpose (edit an expected value): its evidence folder holds a trace, a
  window picture, the scratch document and the pane log.
- After any run: no WINWORD process remains and `git status` shows no fixture changed.

See [contracts/harness-commands.md](contracts/harness-commands.md) for every command and output.
