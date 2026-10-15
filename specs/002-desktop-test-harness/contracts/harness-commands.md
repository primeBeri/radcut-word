# Contract: Harness commands and outputs

Run from the repository root with Word closed. Keyboard and mouse must not be used during a run.

| Command | Runs |
|---|---|
| `dotnet test tests/desktop` | everything |
| `dotnet test tests/desktop --filter Category=M0` | feasibility (US1) |
| `dotnet test tests/desktop --filter Category=Contract` | contract suites and former hand checks (US2) |
| `dotnet test tests/desktop --filter Category=Document` | document verification (US3) |
| `dotnet test tests/desktop --filter Category=Scenario` | US1 quickstart scenarios (US4) |
| `dotnet test tests/desktop --filter Category=Performance` | timing (US5) |
| `dotnet test tests/desktop --filter "FullyQualifiedName~Scenario01"` | one scenario |

Test names: contract cases as `Contract.<suite>.<case name>`; scenarios as `ScenarioNN_<title>`.

## Outputs

- Exit code 0 only if no test failed (skips do not fail).
- `tests/desktop/test-results/*.trx` (`--logger trx`).
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
