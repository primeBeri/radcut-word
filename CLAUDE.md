# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Pre-code. `RAD·CUT - PRD.md` is the source of truth for scope, requirements (FR-01…FR-14), risks and roadmap. It is deliberately gitignored (it contains internal plans) and must never be committed to the public repo; it exists only in the local working copy. There is no scaffold, build, lint or test setup yet. Once the project is scaffolded, replace this section with the real commands (including how to run a single Vitest test).

Phase 0 (three feasibility spikes on Windows desktop) comes before any MVP build: shortcut → task pane with focus in the search box; REF field to a hidden bookmark survives F9 and the hyperlink jumps; bookmark insertion under tracked changes and SharePoint co-authoring.

## Spec-driven workflow (spec-kit)

Features are built with GitHub spec-kit (Claude integration, PowerShell scripts). Core flow: `/speckit-constitution` → `/speckit-specify` → `/speckit-clarify` (optional) → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` (optional) → `/speckit-implement`. The constitution lives in `.specify/memory/constitution.md`; feature artefacts (spec, plan, tasks) go under `specs/<feature>/`. Specs must not copy internal content from the gitignored PRD or `planning/` beyond what is fit for the public repo.

Community extensions (each offers an optional hook after the matching core step):

- **agent-assign:** `/speckit-agent-assign-assign` maps tasks to Claude Code agents; `-validate` and `-execute` check and run them.
- **refine:** when requirements change, use `/speckit-refine-update` on the spec, then `/speckit-refine-propagate` to update plan and tasks, rather than regenerating. `/speckit-refine-status` shows stale artefacts.
- **review:** `/speckit-review-run` is a read-only post-implementation review (code, comments, tests, errors, types, simplify); toggles in `.specify/extensions/review/review-config.yml`.

`review` v1.0.1 is installed from a locally patched copy (its manifest's script names had file extensions, which the current CLI rejects) and its skill files were converted from symlinks to real files, because this repo uses `core.symlinks=false`. `specify extension update` will not upgrade it; reinstall from the catalogue once upstream fixes the manifest. Do not reinstall any extension with `--dev` without converting the resulting `.claude/skills` symlinks.

## What it is

RAD·CUT (RadBeri) is a Word add-in in TypeScript on Office.js. Shortcut (default Ctrl+Alt+K) → palette of the document's headings → fuzzy filter → Enter inserts a native Word cross-reference at the cursor. Windows desktop only for the MVP; Mac and web are phase 4 on the same codebase.

Planned stack: TypeScript, Office.js with the **shared runtime** (required for custom keyboard shortcuts in Word), React or plain TS for the palette, Vitest, scaffolded with the Yeoman Office generator or Microsoft 365 Agents Toolkit.

## Architecture (planned, ports and adapters)

- The core is pure TypeScript behind an `IDocumentGateway` interface. Only `OfficeJsGateway` touches Office.js; the palette and shortcut handler talk only to the core. Never call Office.js from core or UI code.
- Core units: `HeadingIndex`, `FuzzyMatcher`, bookmark naming, and the `InsertReference` use case. All are unit-tested against a `FakeGateway` without Word running.
- **Contract tests:** one shared suite runs against both `FakeGateway` and `OfficeJsGateway` so the fake cannot drift from real Word. The Office.js run happens inside Word (Script Lab or a dev task pane).
- **Backlinks-ready:** the gateway also exposes `readReferences()` (every REF field and its target bookmark), and the core keys headings by bookmark name, not position or text. Phase 2's backlinks pane is meant to be a new view over a `ReferenceIndex`, not a rework, so keep that keying intact.

## Output and document invariants

- Output only native Word constructs: bookmarks plus REF fields, hyperlinked (`\h`). Documents must work without the add-in installed.
- Reuse an existing bookmark on the target heading; never create duplicates. Generated bookmark names start with `_` (hidden), are unique, stay stable across edits, and fit Word's 40-character limit.
- A format is literal text plus REF fields to the same bookmark: `\w` = full-context number ("4.3"), plain REF = heading text, `\p` = "above"/"below". Default "§ number text" is `"§ "` + REF `\w \h` + `" "` + REF `\h`. Every part must update on F9.
- Headings are paragraphs with built-in Heading 1–9 styles or outline levels; manually formatted bold text is out of scope.
- No network calls beyond loading the add-in; document content never leaves the machine. Insertion should be a single undo step where the API allows.

## Known Office.js risks

- Focus handling is the main risk: the task pane may not take keyboard focus when opened by a shortcut. Fallback is a `displayDialogAsync` popup. Return focus with `range.select()` after insert.
- `insertField(..., "Ref", ...)` may be unavailable on some platforms; fallback is inserting a REF field via `insertOoxml`.
- Heading numbers come from `paragraph.listItemOrNullObject.listString` (unverified).
- Ctrl+Alt shortcuts can clash with AltGr on UK/European layouts, so the shortcut must stay configurable. Ctrl+@ is rejected (Word's accent key).
- Large documents (500+ headings): cache the heading index and refresh in the background. Target palette open under 500 ms at 300 headings.
