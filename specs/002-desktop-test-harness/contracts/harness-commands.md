# Contract: Harness commands and outputs

Run from the repository root with Word closed. Keyboard and mouse must not be used during a run.

`npm run test:desktop` wraps `dotnet test --solution tests/desktop/RadCut.DesktopTests.slnx` with the
report options below. The .NET 10 SDK runs it on Microsoft.Testing.Platform (opted in by `global.json`),
so filters are xUnit's `--filter-trait`, `--filter-class`, `--filter-method` or `--filter-query`, not
VSTest's `--filter`.

| Command | Runs |
|---|---|
| `npm run test:desktop` | everything |
| `npm run test:desktop -- --filter-trait "Category=Harness"` | the harness's own helper checks (no Word) |
| `npm run test:desktop -- --filter-trait "Category=M0"` | feasibility (US1) |
| `npm run test:desktop -- --filter-trait "Category=Contract"` | contract suites and former hand checks (US2) |
| `npm run test:desktop -- --filter-trait "Category=Document"` | document verification (US3) |
| `npm run test:desktop -- --filter-trait "Category=Scenario"` | US1 quickstart scenarios (US4) |
| `npm run test:desktop -- --filter-trait "Category=Performance"` | timing (US5) |
| `npm run test:desktop -- --filter-method "*Scenario01*"` | one scenario |

Test names: contract cases as `Contract.<suite>.<case name>`; scenarios as `ScenarioNN_<title>`.

## Outputs

- Exit code 0 only if no test failed (skips do not fail). Exit code 8 means the filter matched no test.
- `tests/desktop/test-results/*.trx` and a JUnit XML report (`--report-xunit-trx --report-xunit-junit`).
- `tests/desktop/test-results/summary.md`: counts per category, failures with their message and
  evidence folder, skipped tests with their reason, contract timings (total and five slowest).
- `tests/desktop/test-results/acceptance-summary.md` after a scenario run: the
  `docs/acceptance-checklist.md` table (`| # | Result | Notes |`).
- `tests/desktop/test-results/<test>/`: evidence for each failed test (data-model EvidenceBundle).

## Refusals and skips (exact messages)

- Word running: `Word is running. Save your work and close Word, then run again.` Every test
  fails fast; nothing is started.
- No interactive desktop: `SKIPPED: no interactive desktop` (keyboard and focus tests only).
- Port 3000 in use by something other than this repository's dev server:
  `Port 3000 is in use. Stop the other server (npm stop) and run again.`
- Certificate missing or untrusted: `The localhost certificate is not trusted. Run npm run certs.`

## Environment

No machine-wide or user-wide environment variable is set. WebView2 variables are set on the
WINWORD child process only. The CDP endpoint listens on 127.0.0.1.
