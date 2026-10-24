# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state and commands

Scaffolded (Vite + Svelte 5 + TypeScript strict + Vitest), feature `001-heading-xref-palette` in progress; see `specs/001-heading-xref-palette/tasks.md`. `RAD·CUT - PRD.md` is the source of truth for scope, requirements, risks and roadmap. It is deliberately gitignored (it contains internal plans) and must never be committed to the public repo; it exists only in the local working copy.

- Install: `npm install`, then `npm run certs` once (trusted HTTPS certificate for `localhost:3000`).
- Run in Word: `npm start` (dev server + sideload into Word desktop); `npm stop` to unload. Both go through `scripts/office-debug.mjs`, which sideloads a copy of `manifest.xml` from `%LOCALAPPDATA%\xref-dev\`: Word silently ignores a manifest whose path has non-ASCII characters (found when the repository folder was `RAD·CUT`).
- Dev panes in Word (spikes, contract suite): `npm run start:dev-pane`; the task pane opens a launcher. The performance runner (`src/dev/perf-recorder.ts`, `perf-pane.ts`) is loaded by `main.ts` in the Vite dev server only; the harness's Performance category reads it as `window.__xrefPerf` (see `docs/performance.md`). Never part of the release build: `npm run build:dev-pane` writes to `dist-dev/`, and the release build fails if `dist/` holds a dev page.
- Tests: `npm test` (unit + component), `npm run test:unit`, `npm run test:component`.
- Single test file: `npx vitest run tests/unit/fuzzy-matcher.test.ts`; single test by name: `npx vitest run -t "<name>"`.
- Lint (includes the Office.js boundary rules): `npm run lint`. Types (TS + Svelte): `npm run typecheck`.
- Release build (tokens, Vite, dev-page and 150 KB gzip budget checks): `npm run build`.
- Icons: SVG masters in `design/icons` (a 16 px and a 32 px master per ribbon button, Office Monoline style); `npm run icons` renders the committed PNGs in `src/app/public/assets`, and `tests/unit/manifest-assets.test.ts` checks every size the manifest declares exists.
- Matcher benchmark (not part of `npm test`; asserts 5 ms per query over 500 headings): `npm run bench`. Vitest 5 benchmarks use the `bench` test-context fixture and run only in the projects it derives from `benchmark.include` (here `unit (bench)`).
- In-Word checks (desktop harness, `tests/desktop`, C# on .NET 10): `npm run test:desktop`, or one category with `npm run test:desktop -- --filter-trait "Category=Contract"` (also `Harness`, `M0`, `Document`, `Scenario`, `Performance`; `Diagnose` holds explicit probes, run with `--explicit only`) or one test with `--filter-method "*Scenario03*"`. Save and close Word first and leave the keyboard and mouse alone: the harness refuses to run while Word is open, starts its own Word on scratch copies, and sends real keystrokes. Evidence of failures and `summary.md` go to `tests/desktop/test-results/`; `XREF_KEEP_SCRATCH=1` keeps the scratch documents. `global.json` opts `dotnet test` into Microsoft.Testing.Platform, so filters are xUnit's `--filter-trait`/`--filter-method`, not VSTest's `--filter`. Details and the routes that work: `tests/desktop/README.md`.

Office types exist only in `tsconfig.adapters.json` (all of `src/`); `tsconfig.json` type-checks everything except adapters and the entry points that start them, so Office use elsewhere fails to compile as well as to lint.

Testing strategy (Constitution 1.2.0, Principle II): tests are layered, L1 unit/component, L2 contract vs `FakeGateway`, L3 contract or pane state in Word, L4 the document through Word COM, L5 keyboard and focus, L7 human; test at the lowest layer that can observe the behaviour and tag test tasks with their layer. Layers 3–5 run unattended through the desktop harness (feature `002-desktop-test-harness`, design in `docs/proposals/0001-automated-testing.md`); an automatable quickstart scenario is written as a harness test before the code that satisfies it. Only co-authoring, a physical UK keyboard, a visual theme pass and a screen-reader pass are left to a person.

## Spec-driven workflow (spec-kit)

Features are built with GitHub spec-kit (Claude integration, PowerShell scripts). Core flow: `/speckit-constitution` → `/speckit-specify` → `/speckit-clarify` (optional) → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` (optional) → `/speckit-implement`. The constitution lives in `.specify/memory/constitution.md`; feature artefacts (spec, plan, tasks) go under `specs/<feature>/`. Specs must not copy internal content from the gitignored PRD or `planning/` beyond what is fit for the public repo.

Community extensions (each offers an optional hook after the matching core step):

- **agent-assign:** `/speckit-agent-assign-assign` maps tasks to Claude Code agents; `-validate` and `-execute` check and run them.
- **refine:** when requirements change, use `/speckit-refine-update` on the spec, then `/speckit-refine-propagate` to update plan and tasks, rather than regenerating. `/speckit-refine-status` shows stale artefacts.
- **review:** `/speckit-review-run` is a read-only post-implementation review (code, comments, tests, errors, types, simplify); toggles in `.specify/extensions/review/review-config.yml`.

`review` v1.0.1 is installed from a locally patched copy (its manifest's script names had file extensions, which the current CLI rejects) and its skill files were converted from symlinks to real files, because this repo uses `core.symlinks=false`. `specify extension update` will not upgrade it; reinstall from the catalogue once upstream fixes the manifest. Do not reinstall any extension with `--dev` without converting the resulting `.claude/skills` symlinks.

## What it is

XRef (by RadBeri; formerly RAD·CUT) is a Word add-in in TypeScript on Office.js. Shortcut (default Ctrl+Shift+Y) → palette of the document's headings → fuzzy filter → Enter inserts a native Word cross-reference at the cursor. Windows desktop only for the MVP; Mac and web are phase 4 on the same codebase.

Stack: TypeScript (strict), Office.js with the **shared runtime** (required for custom keyboard shortcuts in Word), an add-in only XML manifest (`manifest.xml`, shortcuts in `src/app/shortcuts.json`), Svelte 5 views styled with Fluent 2 tokens (`src/ui/theme/tokens.css`, generated), Vite and Vitest. Phase 0 spikes (shortcut → focus; REF survives F9; tracked changes and co-authoring) run from the dev pane before any adapter work.

## Architecture (ports and adapters)

- The core is pure TypeScript behind an `IDocumentGateway` interface. Only `OfficeJsGateway` touches Office.js; the palette and shortcut handler talk only to the core. Never call Office.js from core or UI code.
- Core units: `HeadingIndex`, `FuzzyMatcher`, bookmark naming, and the `InsertReference` use case. All are unit-tested against a `FakeGateway` without Word running.
- **Contract tests:** one shared suite runs against both `FakeGateway` and `OfficeJsGateway` so the fake cannot drift from real Word. The Office.js run happens inside Word from the dev pane's contract suite, on a scratch copy of `spec-contract.docx` (the small contract fixture; `spec-300` is for performance), started and read by the desktop harness. States Office.js cannot create (a caret in a comment, protection, keystrokes, Undo, F9, Ctrl+click) come from the harness through the dev-only desktop bridge (`src/dev/desktop-bridge.ts`); in a run started by hand those cases fail with manual steps. The Word harness restores the document only after a case that wrote to it.
- Decision logic belongs in the core, not the adapters: both gateways read raw facts and call core rules (`classifyLocation`, `classifySelection`, `confirmationFor`, `headingLevelOf`, `headingPositions`, `isRemovedByTrackedDeletions`, `chooseUsableBookmark`), so they cannot disagree on the rules.
- **Backlinks-ready:** the gateway also exposes `readReferences()` (every REF field and its target bookmark), and the core keys headings by bookmark name, not position or text. Phase 2's backlinks pane is meant to be a new view over a `ReferenceIndex`, not a rework, so keep that keying intact.

## Output and document invariants

- Output only native Word constructs: bookmarks plus REF fields, hyperlinked (`\h`). Documents must work without the add-in installed.
- Reuse an existing bookmark on the target heading; never create duplicates. Generated bookmark names start with `_` (hidden), are unique, stay stable across edits, and fit Word's 40-character limit.
- A format is literal text plus REF fields to the same bookmark: `\w` = full-context number ("4.3"), plain REF = heading text, `\p` = "above"/"below". Default "§ number text" is `"§ "` + REF `\w \h` + `" "` + REF `\h`, each field also with `\* CHARFORMAT` so it keeps the surrounding text's formatting after F9. Every part must update on F9.
- Headings are paragraphs with built-in Heading 1–9 styles or outline levels; manually formatted bold text is out of scope.
- No network calls beyond loading the add-in; document content never leaves the machine. Insertion should be a single undo step where the API allows.

## Office.js behaviour (settled by the phase 0 spikes, `specs/001-heading-xref-palette/research.md`)

- Focus: the task pane takes keyboard focus when opened by the shortcut, so no dialog fallback is needed (R3). Hide the pane first, then return the caret with `range.select()`; that order gives Word focus.
- `insertField(..., Word.FieldType.ref, ...)` works for every format, one Undo step per insertion, bookmark written first; the OOXML fallback is not needed (R5). Office.js batches are not transactional, so a failed write is checked afterwards before saying the document is unchanged (FR-014).
- `paragraph.listItemOrNullObject.listString` already gives the full-context number ("4.3") (R7).
- Ctrl+Alt shortcuts can clash with AltGr on UK/European layouts, so the shortcut must stay configurable. Ctrl+@ is rejected (Word's accent key).
- Large documents: reading every story takes about 450 ms at 300 headings, so the heading index is cached and refreshed in the background (target: palette open under 500 ms at 300 headings).
