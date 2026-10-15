# Contract: Automating the dev contract pane

The dev contract pane (`src/dev/contract-pane.html`, dev-pane build only) keeps its manual
behaviour and gains the following. The harness depends on exactly this; change both together.

## Starting a suite

- URL: `contract-pane.html?suite=<label>&autorun=1`. `<label>` is the registration label,
  URL-encoded, matched exactly (for example `IDocumentGateway: OfficeJsGateway`).
- With `autorun=1` and a known label, the pane selects that suite and runs it once, without a
  click, after the registry is ready.
- With an unknown label, the pane runs nothing, sets `data-status="error"` and publishes
  `{ "error": "Unknown suite: <label>", "suites": [<labels>] }`.
- Without `autorun`, `suite` only preselects the suite.

## Status

`document.body.dataset.status`: `idle` (loaded) → `running` → `done` | `error`.

## Results

When the run ends (`done`), the pane publishes the same JSON in two places:

- `<script type="application/json" id="contract-results">` (text content), and
- `window.__radcutContractResults`.

Shape: `ContractRunResults` from [../data-model.md](../data-model.md). Every registered case is
present, in run order, exactly once.

## Timings (also in the manual run)

- Each result line shows its duration ("PASS 412 ms 7. with no usable bookmark…").
- The summary shows the total and the five slowest cases.

## Release build

`__radcutContractResults` and `contract-results` never appear in `dist/` (checked with the
existing dev-page check in `scripts/check-bundle-size.mjs`).
