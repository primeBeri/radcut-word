# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state and commands

Scaffolded (Vite + Svelte 5 + TypeScript strict + Vitest), feature `001-heading-xref-palette` in progress; see `specs/001-heading-xref-palette/tasks.md`. `RAD·CUT - PRD.md` is the source of truth for scope, requirements, risks and roadmap. It is deliberately gitignored (it contains internal plans) and must never be committed to the public repo; it exists only in the local working copy.

- Install: `npm install`, then `npm run certs` once (trusted HTTPS certificate for `localhost:3000`).
- Run in Word: `npm start` (dev server + sideload into Word desktop); `npm stop` to unload. Both go through `scripts/office-debug.mjs`, which sideloads a copy of `manifest.xml` from `%LOCALAPPDATA%\radcut-dev\`: Word silently ignores a manifest whose path contains the `·` in the repository folder name.
- Dev panes in Word (spikes, contract suite; a performance pane is planned in T096): `npm run start:dev-pane`; the task pane opens a launcher. Never part of the release build: `npm run build:dev-pane` writes to `dist-dev/`, and the release build fails if `dist/` holds a dev page.
- Tests: `npm test` (unit + component), `npm run test:unit`, `npm run test:component`.
- Single test file: `npx vitest run tests/unit/fuzzy-matcher.test.ts`; single test by name: `npx vitest run -t "<name>"`.
- Lint (includes the Office.js boundary rules): `npm run lint`. Types (TS + Svelte): `npm run typecheck`.
- Release build (tokens, Vite, dev-page and 150 KB gzip budget checks): `npm run build`.
- Matcher benchmark (not part of `npm test`): `npm run bench` (the benchmark itself is planned in T097; `tests/bench/` is empty until then).

Office types exist only in `tsconfig.adapters.json` (all of `src/`); `tsconfig.json` type-checks everything except adapters and the entry points that start them, so Office use elsewhere fails to compile as well as to lint.

Testing strategy: `docs/proposals/0001-automated-testing.md` (proposed) adds a Windows desktop harness (`tests/desktop`, C#) that runs the in-Word contract suite and the quickstart scenarios without a human, leaving a short manual list per release.

## Spec-driven workflow (spec-kit)

Features are built with GitHub spec-kit (Claude integration, PowerShell scripts). Core flow: `/speckit-constitution` → `/speckit-specify` → `/speckit-clarify` (optional) → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` (optional) → `/speckit-implement`. The constitution lives in `.specify/memory/constitution.md`; feature artefacts (spec, plan, tasks) go under `specs/<feature>/`. Specs must not copy internal content from the gitignored PRD or `planning/` beyond what is fit for the public repo.

Community extensions (each offers an optional hook after the matching core step):

- **agent-assign:** `/speckit-agent-assign-assign` maps tasks to Claude Code agents; `-validate` and `-execute` check and run them.
- **refine:** when requirements change, use `/speckit-refine-update` on the spec, then `/speckit-refine-propagate` to update plan and tasks, rather than regenerating. `/speckit-refine-status` shows stale artefacts.
- **review:** `/speckit-review-run` is a read-only post-implementation review (code, comments, tests, errors, types, simplify); toggles in `.specify/extensions/review/review-config.yml`.

`review` v1.0.1 is installed from a locally patched copy (its manifest's script names had file extensions, which the current CLI rejects) and its skill files were converted from symlinks to real files, because this repo uses `core.symlinks=false`. `specify extension update` will not upgrade it; reinstall from the catalogue once upstream fixes the manifest. Do not reinstall any extension with `--dev` without converting the resulting `.claude/skills` symlinks.

## What it is

RAD·CUT (RadBeri) is a Word add-in in TypeScript on Office.js. Shortcut (default Ctrl+Shift+Y) → palette of the document's headings → fuzzy filter → Enter inserts a native Word cross-reference at the cursor. Windows desktop only for the MVP; Mac and web are phase 4 on the same codebase.

Stack: TypeScript (strict), Office.js with the **shared runtime** (required for custom keyboard shortcuts in Word), an add-in only XML manifest (`manifest.xml`, shortcuts in `src/app/shortcuts.json`), Svelte 5 views styled with Fluent 2 tokens (`src/ui/theme/tokens.css`, generated), Vite and Vitest. Phase 0 spikes (shortcut → focus; REF survives F9; tracked changes and co-authoring) run from the dev pane before any adapter work.

## Architecture (ports and adapters)

- The core is pure TypeScript behind an `IDocumentGateway` interface. Only `OfficeJsGateway` touches Office.js; the palette and shortcut handler talk only to the core. Never call Office.js from core or UI code.
- Core units: `HeadingIndex`, `FuzzyMatcher`, bookmark naming, and the `InsertReference` use case. All are unit-tested against a `FakeGateway` without Word running.
- **Contract tests:** one shared suite runs against both `FakeGateway` and `OfficeJsGateway` so the fake cannot drift from real Word. The Office.js run happens inside Word from the dev pane's contract suite, on a scratch copy of the fixture.
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
