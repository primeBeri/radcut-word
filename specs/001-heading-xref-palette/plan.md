# Implementation Plan: Heading Cross-Reference Palette (MVP)

**Branch**: `001-heading-xref-palette` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)

**Propagated**: 2026-10-10 — Updated from spec.md refinement (usable-bookmark rule excluding Word-managed bookmarks; bookmark extent; surrounding-text formatting, FR-012a; insertion point taken at Enter and re-checked; tracked-change headings). Research R5, R6, R8, R9, data model, gateway contract and quickstart updated to match.

**Input**: Feature specification from `/specs/001-heading-xref-palette/spec.md`

## Summary

A Word for Windows add-in: a shortcut (or ribbon button) opens a keyboard-driven palette of the
document's headings in the task pane; fuzzy search with highlighted matches, Tab to cycle the
reference format with a live preview, Enter to insert at the cursor as it is at that moment
(location re-checked). Insertion reuses a usable bookmark on the heading, or creates a hidden one
over the heading text, and writes literal text plus hyperlinked REF/PAGEREF fields in the
surrounding text's formatting, in one document transaction, so the output is native Word and
works without the add-in.

Technical approach (see [research.md](research.md)): XML manifest with the shared runtime and
keyboard-shortcut overrides; a pure TypeScript core behind ports (`IDocumentGateway`,
`IHostShell`, `ISettingsStore`); Office.js only in adapters; Svelte 5 views styled with Fluent 2
design tokens; an in-house fuzzy matcher; Vite and Vitest. Three feasibility spikes come first
and decide the fallbacks (dialog palette, OOXML field insertion, alternative default shortcut).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), ES2022 target (Edge WebView2)

**Primary Dependencies**: Office.js (WordApi 1.5 required; WordApiDesktop 1.4 used when present;
SharedRuntime 1.1; KeyboardShortcuts 1.1), Svelte 5, `@fluentui/tokens` (build-time only)

**Dev Dependencies**: Vite, Vitest, @testing-library/svelte, jsdom, ESLint, office-addin-dev-certs,
office-addin-debugging, fuzzysort (test benchmark only)

**Storage**: `OfficeRuntime.storage` for user settings and per-document recents; Office's own
roaming store for the custom shortcut; nothing in documents

**Testing**: Vitest unit (core vs fakes), Vitest component (Svelte views, jsdom), shared contract
suite (FakeGateway in Node; OfficeJsGateway inside Word via a dev-only pane), manual acceptance
checklist ([quickstart.md](quickstart.md))

**Target Platform**: Word for Microsoft 365 on Windows desktop, build 2408+ (2508+ for the full
API surface); sideloaded

**Project Type**: Office add-in (single front-end project: shared-runtime task pane plus manifest)

**Performance Goals**: palette ready < 500 ms at 300 headings; filter results < 50 ms per keystroke
at 300 headings; no main-thread task > 100 ms at 500 headings; shortcut to inserted reference
< 3 s for a practised user

**Constraints**: palette bundle < 150 KB min+gzip; no network beyond loading the add-in; one
`sync` per insertion; keyboard-only flows; Fluent look with light/dark; motion ≤ 150 ms and off
under reduced motion

**Scale/Scope**: documents up to ~500+ headings among thousands of paragraphs; 2 views (palette,
settings); ~10 core units; 1 manifest

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-research | Post-design |
|---|---|---|---|
| I. Clean Architecture | Core is pure TS; only adapters touch Office.js; headings keyed by bookmark | ✅ planned | ✅ ports in [contracts/](contracts/); `HeadingKey` in [data-model.md](data-model.md); ESLint boundary rule (research R14) |
| II. Test-First | Red-green-refactor; unit vs fakes; shared contract suite; test tasks precede implementation | ✅ planned | ✅ contract suite defined line by line; component tests for UI contract |
| III. Native, Portable Output | Bookmarks + REF `\h` only; reuse; `_` names ≤ 40; every part updates; single undo | ✅ | ✅ format→field map (R5); usable-bookmark reuse excluding Word-managed bookmarks, extent and naming rules (R6); surrounding formatting kept after F9 (R5, spike 2); undo measured in spike 2 and documented if not single |
| IV. Lightweight, Responsive, Keyboard-First UI | Keyboard flows, focus in/out, budgets, background refresh, small UI layer, theme, a11y | ✅ | ✅ keyboard and ARIA contract (palette-ui.md); cached index with background refresh (R7); Svelte justified below |
| V. Local-Only and Private | No network/telemetry; dev tooling excluded from release, localhost only | ✅ | ✅ storage local (R13); dev pane excluded by build flag; quickstart scenario 18 |
| VI. Simplicity, Verified Assumptions | YAGNI; unverified host behaviour proven by spike or contract test with named fallback | ✅ | ✅ three spikes gate dependent work; each unverified item in research names its fallback; automated Word-driving harness deferred |

Platform constraints: shared runtime ✅; Windows desktop only ✅; configurable shortcut, never
Ctrl+@ ✅; fallbacks live in adapters behind the same ports ✅; internal planning material not
copied ✅.

**Result**: PASS. One justified item in Complexity Tracking (new runtime UI dependency).

## Delivery sequence

Each step is test-first. Spikes are timeboxed (about half a day each) and their outcomes are
written back into [research.md](research.md) before dependent work starts.

0. **Scaffold**: Vite + Svelte + TS, XML manifest with shared runtime and shortcuts JSON,
   ESLint boundary rule, Vitest, dev-certs sideload. `CLAUDE.md` updated with real commands.
1. **Spike 1 — shortcut and focus** (R3, R4, R8, R11): shortcut and ribbon open the task pane
   with focus in an input; Esc returns the caret; `areShortcutsInUse("Ctrl+Alt+K")` and UK
   layout; Word's selection readable from the pane at Enter time (and unchanged by showing the
   pane); `parentBody.type` in comment and text box;
   `prefers-reduced-motion` and theme readout. **Decides**: task pane vs dialog; default
   shortcut.
2. **Spike 2 — REF survives F9** (R5, R6, R7): bookmark over heading text, `insertField` Ref and
   PageRef with switches, `updateResult`, Ctrl+click jump, reorder + F9, undo depth, `listString`
   shape; reference formatting: inserted into bold/italic/styled surrounding text, from a heading
   with direct formatting, before and after F9; reading bookmark ranges to tell usable from
   unusable (`_Toc…` from a table of contents). **Decides**: insertField vs OOXML; number
   composition; whether a formatting switch is needed (FR-012a).
3. **Spike 3 — tracked changes** (R9): spike 2 path with tracking on; accept and reject
   (including whether the created bookmark survives a reject); detecting headings that are
   tracked deletions; co-authoring checked by hand.
4. **Core** (US1): `HeadingIndex`, `FuzzyMatcher`, bookmark naming and usable-bookmark selection
   (Word-managed exclusion list), location check (used at open and again at Enter),
   format catalogue and preview, `InsertReference` and `OpenPalette` use cases; `FakeGateway`;
   contract suite.
5. **OfficeJsGateway** passing the contract suite in Word; dev test pane.
6. **Palette view** (US1): combobox/listbox, highlighting, messages, theme, motion.
7. **Formats** (US2): Tab cycling, preview strip, default format, settings view shell.
8. **Templates** (US3): grammar, editor with live preview.
9. **Access** (US4): ribbon buttons, shortcut capture and validation, signed-out read-only.
10. **Recents** (US5).
11. **Performance and acceptance**: dev-pane timings on fixtures, full quickstart checklist,
    documentation of undo/co-authoring findings.

If spike 1 fails both the task pane and the dialog fallback, stop and amend the spec before
step 4: the keyboard-only promise cannot be kept as written.

## Project Structure

### Documentation (this feature)

```text
specs/001-heading-xref-palette/
├── plan.md              # This file
├── research.md          # Phase 0: decisions, spikes, fallbacks
├── data-model.md        # Phase 1: core types and state transitions
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   ├── document-gateway.md   # IDocumentGateway port + contract-suite cases
│   ├── host-ports.md         # IHostShell, ISettingsStore
│   ├── format-templates.md   # template grammar and errors
│   └── palette-ui.md         # keyboard, ARIA, look and motion contract
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks; not created here)
```

### Source Code (repository root)

```text
manifest.xml                     # XML add-in manifest, shared runtime, ribbon, ExtendedOverrides
src/
├── core/                        # pure TypeScript — no Office, DOM or Svelte imports
│   ├── ports/                   # IDocumentGateway, IHostShell, ISettingsStore
│   ├── headings/                # Heading, HeadingKey, HeadingIndex, number composition
│   ├── matching/                # FuzzyMatcher (scores + highlight ranges)
│   ├── bookmarks/               # naming, reuse selection
│   ├── formats/                 # built-in catalogue, template parser, preview, cycle
│   ├── location/                # insertion-point rules (allowed / declined reasons)
│   ├── settings/                # UserSettings validation, migration, defaults; shortcut rules
│   ├── recents/                 # RecentHeadings
│   └── use-cases/               # OpenPalette, InsertReference, SaveSettings, ChangeShortcut
├── adapters/
│   └── office/                  # OfficeJsGateway, OOXML fallback, OfficeHostShell,
│       │                        # OfficeSettingsStore, theme readout, bootstrap (Office.onReady),
│       │                        # dev-registration (registers adapters with the dev contract pane)
│       └── spikes/              # dev-only spike scripts and pane; excluded from release builds
├── ui/
│   ├── palette/                 # Palette.svelte, ResultRow, FormatStrip, MessageRegion
│   ├── settings/                # Settings.svelte, FormatPicker, TemplateEditor, ShortcutCapture
│   └── theme/                   # Fluent token CSS (generated), motion.css
├── app/                         # composition root: wires ports to adapters and views
│   ├── taskpane.html
│   ├── main.ts
│   ├── create-app.ts            # createApp(ports), used by main.ts and the app-flow test
│   └── shortcuts.json
└── dev/                         # dev-only test pane (contract + performance runner); no Office
                                 # globals; excluded from release builds
tests/
├── unit/                        # core units against fakes
├── component/                   # Svelte views and app flow (jsdom, Testing Library)
├── contract/                    # document-gateway and host-ports contract suites + fake runners
├── bench/                       # Vitest benchmarks (npm run bench, not npm test)
├── fakes/                       # FakeGateway, FakeHostShell, FakeSettingsStore
└── fixtures/                    # .docx fixture documents for the Word contract run
docs/
└── acceptance-checklist.md      # manual per-release checklist (from quickstart)
```

**Structure Decision**: single front-end project. Dependency direction is
`app → ui, adapters → core`; `ui` depends on `core` only; `core` depends on nothing. The
contract suite lives in `tests/contract/` and is imported by both the Node test run and the
dev-only Word pane, so the fake and the real gateway are checked by the same code.

## Complexity Tracking

| Item | Why needed | Simpler alternative rejected because |
|---|---|---|
| Svelte 5 as a runtime UI dependency (Constitution IV requires justification) | Palette and settings hold per-keystroke state (ranked results with highlight ranges, selection, format, preview, recents, messages) plus form state (template editor with live preview, shortcut capture, validation). A compiled reactive layer keeps it in sync with ~10 KB runtime. | Plain TypeScript works for the palette but makes the settings forms and editor hand-written binding code that is harder to test and keep correct; kept as the fallback. Fluent UI React v9 breaks the 150 KB budget. |
| Vite instead of Microsoft's webpack templates | One toolchain for Svelte, dev server and Vitest | Webpack template plus svelte-loader and a separate test setup is more configuration; kept as the fallback if sideload tooling misbehaves (spike 1). |
