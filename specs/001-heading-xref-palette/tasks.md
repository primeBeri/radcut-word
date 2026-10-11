---

description: "Task list for the Heading Cross-Reference Palette (MVP)"
---

# Tasks: Heading Cross-Reference Palette (MVP)

**Input**: Design documents from `/specs/001-heading-xref-palette/`

**Propagated**: 2026-10-11 — Updated from spec.md refinement (default shortcut Ctrl+Shift+Y, FR-001) and T017 spike decisions: T006 shortcut updated; T049 (OOXML fallback) and T099 (Animations setting) dropped; T028, T040, T048 and T050 carry the R3/R5/R7/R8/R11 outcomes.

**Propagated**: 2026-10-10 — Updated from spec.md refinement (CHK001/003/005/013/014/025): "Allow references in headings" setting with self-reference guard (FR-001b); headings outside the main text listed with a location badge and a hide setting (FR-003, FR-003a); extended-selection confirmation (FR-008a); hands off foreign bookmarks and fields (FR-011a); output mimics Word's own cross-reference dialog (FR-012); one atomic Undo step as a release gate (FR-013, SC-009). Research R5–R9 and R13, data model, gateway and palette contracts and quickstart (scenarios 5, 12, 23–26) updated to match. Tasks modified: T012, T014–T020, T022, T031, T033–T036, T038, T048, T051, T053–T055, T058, T060, T062, T065, T069, T070, T100, T101, T103; added: T105–T106.

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Required. Constitution II (test-first, non-negotiable): every test task is written and seen to FAIL for the expected reason before the implementation task that follows it. Run a single file with `npx vitest run <path>`.

**Organization**: Tasks are grouped by user story so each story can be built, tested and demonstrated on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: The user story the task belongs to (US1–US5)
- Paths are relative to the repository root (single project, see plan.md "Project Structure")

## Ground rules for every task

- Only files under `src/adapters/` may use the `Office`, `Word` or `OfficeRuntime` globals; dev-only spikes live in `src/adapters/office/spikes/` for that reason (Constitution I), and `src/dev/` reaches Word only through adapters. `src/core/` imports nothing from `src/ui/`, `src/adapters/`, `src/app/`, the DOM or Svelte (enforced by T004).
- Headings are identified by bookmark name, never by position or text (Constitution I).
- Use the exact names, constraints and messages from data-model.md and contracts/ when a task quotes them.
- After each task: `npm test` and `npm run lint` are green except for tests deliberately left red for the next task.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: A buildable, sideloadable, testable empty add-in.

- [X] T001 Initialise the project: `package.json` (name `radcut-word`, private, `"type": "module"`), Vite + `@sveltejs/vite-plugin-svelte` + Svelte 5 + TypeScript 5; create the folder skeleton from plan.md (`src/core/{ports,headings,matching,bookmarks,formats,location,settings,recents,use-cases}`, `src/adapters/office`, `src/adapters/office/spikes`, `src/ui/{palette,settings,theme}`, `src/app`, `src/dev`, `tests/{unit,component,contract,fakes,fixtures,bench}`, `scripts`, `docs`) with a `.gitkeep` in each empty folder, in `package.json` and `vite.config.ts`
- [X] T002 [P] Configure TypeScript strict mode (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, target ES2022, `@types/office-js` and `@types/office-runtime` included only for `src/adapters/**` via a separate `tsconfig.adapters.json` referenced from `tsconfig.json`) in `tsconfig.json` and `tsconfig.adapters.json`
- [X] T003 [P] Configure Vitest with two projects: `unit` (environment `node`, `tests/unit/**`, `tests/contract/**/*.test.ts`) and `component` (environment `jsdom`, `tests/component/**`, Svelte plugin, `@testing-library/svelte`, `@testing-library/jest-dom`); scripts `test`, `test:unit`, `test:component` in `vitest.config.ts` and `package.json`
- [X] T004 [P] Configure ESLint (flat config, `typescript-eslint`, `eslint-plugin-svelte`) with boundary rules: `no-restricted-globals` for `Office`, `Word`, `OfficeRuntime` everywhere except `src/adapters/**` (no other exemptions, not even `src/dev/**`); `no-restricted-imports` so `src/core/**` cannot import `src/ui`, `src/adapters`, `src/app`, `svelte` or DOM helpers, and `src/ui/**` cannot import `src/adapters`; script `lint` in `eslint.config.js` and `package.json`
- [X] T005 Write the add-in only XML manifest: shared runtime (`<Runtimes><Runtime resid="Taskpane.Url" lifetime="long"/></Runtimes>`), host Document, `<Requirements>` declaring WordApi 1.5 and SharedRuntime 1.1 (KeyboardShortcuts 1.1, WordApi 1.6 and WordApiDesktop 1.4 are checked at runtime with `isSetSupported`, not declared), ribbon group "RAD·CUT" with buttons "Cross-reference" (action `OpenPalette`) and "Settings" (action `OpenSettings`), `<ExtendedOverrides Url="https://localhost:3000/shortcuts.json"/>` directly after `</VersionOverrides>`, in `manifest.xml`
- [X] T006 [P] Write the shortcuts file with actions `OpenPalette` and `OpenSettings` (type `ExecuteFunction`) and shortcut `OpenPalette` default `Ctrl+Shift+Y` (research R4 outcome; was `Ctrl+Alt+K`, taken in Word) in `src/app/shortcuts.json`, copied to the build output by `vite.config.ts`
- [X] T007 [P] Create the task pane entry: `src/app/taskpane.html` loading Office.js from the Microsoft CDN and `src/app/main.ts`; `main.ts` only calls an adapter `startOfficeHost()` (stub in `src/adapters/office/bootstrap.ts` that awaits `Office.onReady`) and mounts an empty Svelte root
- [X] T008 Add scripts and dev tooling: `office-addin-dev-certs` for HTTPS on `localhost:3000`; `start` (Vite dev server + `office-addin-debugging start manifest.xml desktop --app word`), `stop`, `build`, `start:dev-pane` (Vite mode `devpane` that includes `src/dev/**` and `src/adapters/office/spikes/**`; release `build` must exclude both), `bench` (`vitest bench`, not part of `npm test`) in `package.json` and `vite.config.ts`
- [X] T009 [P] Add a bundle-budget check script that gzips the built task pane JS and fails if it exceeds 150 KB (153,600 bytes), run at the end of `npm run build`, in `scripts/check-bundle-size.mjs`
- [X] T010 [P] Generate Fluent 2 design tokens at build time from `@fluentui/tokens` (`webLightTheme`, `webDarkTheme`) into CSS custom properties under `:root[data-theme="light"]` and `:root[data-theme="dark"]` in `scripts/build-tokens.mjs` writing `src/ui/theme/tokens.css` (generated file committed)
- [X] T011 Replace the "Project state" section of `CLAUDE.md` with the real commands: install, dev certs, `npm start`, `npm test`, single test (`npx vitest run <file>`, `-t "<name>"`), `npm run lint`, `npm run build`, `npm run start:dev-pane`, `npm run bench`

**Checkpoint**: `npm test` (no tests yet) and `npm run lint` pass; `npm start` sideloads an empty pane into Word with both ribbon buttons visible.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Spikes that settle unverified host behaviour (Constitution VI), the core vocabulary, ports, fakes and the contract-suite harness.

**⚠️ CRITICAL**: No user story work begins until this phase is complete. If T014 shows that neither the task pane nor the dialog fallback can take keyboard focus, STOP and amend the spec (plan.md "Delivery sequence"). If T015/T016 find no write path that makes an insertion one Undo step, STOP and raise it with the product owner (FR-013).

### Fixtures and spikes

- [X] T012 Create fixture documents by hand in Word and save them: `tests/fixtures/spec-300.docx` (300 multilevel-numbered headings; a table of contents so `_Toc…` bookmarks exist; one heading with an existing usable `_Ref…` bookmark and one with a user bookmark over the whole paragraph incl. mark; bold and italic body text; a heading with direct bold on one word; captions, quotes, a table, footnotes, endnotes, a header, a comment, a text box; one heading each inside a table cell, a text box, a footnote, an endnote, a header and a footer; a two-paragraph region and an inline picture for selection tests; one heading-number and one heading-text reference made with Word's own Insert → Cross-reference dialog); `tests/fixtures/guide-500.docx` (500+ headings, mixed numbered and unnumbered); `tests/fixtures/tracked.docx` (tracking on, one heading as a tracked deletion, one as a tracked insertion); `tests/fixtures/plain-headings.docx` (unnumbered headings, outline-level headings, bold fake headings, an empty heading); describe each in `tests/fixtures/README.md`
- [X] T013 Build the spike harness pane (dev-only, adapter layer because spikes call Office.js directly): a page in the `devpane` build with buttons that run named spike scripts and print results, in `src/adapters/office/spikes/spike-pane.html` and `src/adapters/office/spikes/spike-pane.ts`
- [X] T014 Spike 1 — shortcut and focus (research R3, R4, R8, R11): in `src/adapters/office/spikes/spike1-focus.ts` associate `OpenPalette` with a handler that calls `Office.addin.showAsTaskpane()` and focuses an `<input>`; verify typing goes to the input without a click; Esc → `Office.addin.hide()` + `range.select()` returns the caret; log `Office.actions.areShortcutsInUse(["Ctrl+Alt+K"])`; test with a UK keyboard layout; read Word's selection from the pane after the user clicks elsewhere in the document; log `getSelection().parentBody.type` inside a comment, text box, header, footnote, endnote and table cell; log the selection's paragraph, table, inline-picture, content-control and shape counts for a few words, a whole paragraph incl. its mark, two paragraphs, a table and a picture (research R8 selection extent); log `matchMedia("(prefers-reduced-motion: reduce)")` with Windows animation effects on and off; log `Office.context.officeTheme`; check that Ctrl+, pressed in the pane reaches the page (keydown seen, Word does not act on it) and, if not, choose and record a fallback combination for opening settings and update `specs/001-heading-xref-palette/contracts/palette-ui.md`. If focus fails, repeat with `displayDialogAsync`. Record outcomes and the chosen palette surface and default shortcut in `specs/001-heading-xref-palette/research.md` (R3, R4, R8, R11 "Outcome" lines)
- [X] T015 Spike 2 — REF survives F9 (research R5, R6, R7): in `src/adapters/office/spikes/spike2-ref.ts`, on `spec-300.docx`: insert a hidden bookmark over a heading's text without the paragraph mark; insert `insertField("Before", Word.FieldType.ref, "<bm> \\w \\h", true)` and the other R5 field shapes incl. PAGEREF; `updateResult()`; Ctrl+click jumps; reorder headings + F9 shows new numbers; count Undo presses needed to restore the document after one insertion done in one `sync`, for no selection, an inline selection, a confirmed extended selection, a reused and a new bookmark (if over one, try the OOXML path and bookmark-first/last write orders); compare our field codes, switches, bookmark extent and formatting with the references made by Word's own dialog in the fixture; read headings from table cells, text boxes, footnotes, endnotes, headers and footers (research R7 "Other stories"), create a bookmark on each, insert a REF to it, F9 and Ctrl+click, and time the full heading read at 300 headings; log `listItemOrNullObject.listString` for level-2 and level-3 headings; insert into bold and italic text and from a heading with direct bold, check formatting before and after F9 (decide whether `\* CHARFORMAT` is needed); read ranges of `_Toc…`, `_Ref…` and whole-paragraph bookmarks and compare with the heading text range. If `insertField` fails, try the OOXML complex-field path. Record outcomes in `research.md` (R5, R6, R7, R8 "Outcome" lines)
- [X] T016 Spike 3 — tracked changes (research R9): in `src/adapters/office/spikes/spike3-tracked.ts`, on `tracked.docx`, run the T015 insert path with tracking on; accept all on one copy and reject all on another; record whether the created bookmark survives a reject and whether the reference updates after accept; count Undo presses for one insertion with tracking on; detect the tracked-deletion heading via `getTrackedChanges()` (or record the fallback); record the outcome in `research.md` (R9 "Outcome" line) and add a manual co-authoring item to `docs/acceptance-checklist.md`
- [X] T017 Apply spike decisions: if no write path gives one Undo step per insertion (T015, T016), STOP and raise it with the product owner (FR-013 release blocker; plan.md "Delivery sequence"); if bookmarks or REF fields fail in a story, apply the research R7 per-story fallback and run `/speckit-refine-update` on FR-003; if the default shortcut, palette surface, field path or formatting switch differ from the plan, update `plan.md` and `research.md`; if the default shortcut changes, run `/speckit-refine-update` on `spec.md` (FR-001) and `/speckit-refine-propagate`; update `src/app/shortcuts.json` to match

### Core vocabulary and ports

- [X] T018 [P] Define core heading types exactly as data-model.md: `Heading` (`level: 1..9`, `text`, `number: string | null`, `order`, `location: "main" | "tableCell" | "textBox" | "footnote" | "endnote" | "header" | "footer"`, `bookmark: string | null`), `HeadingKey` (`{ kind: "bookmark", name }` | `{ kind: "provisional", order, fingerprint }` with fingerprint = level + location + text), `HeadingSnapshot` (`documentId: string | null`, `headings`, `takenAt`) in `src/core/headings/types.ts`
- [X] T019 [P] Define insertion and format types: `InsertionPoint` (`location: "main" | "footnote" | "endnote" | "tableCellInMain"`, `selection: "none" | "inline" | "extended"`, `inHeadingOrder: number | null`, `precedingHeadingOrder: number | null`), `Declined` reasons `"header" | "footer" | "comment" | "textBox" | "headingParagraph" | "titleParagraph" | "selfReference" | "protected" | "unknown"`, `LocationPolicy` (`allowInHeadings: boolean`), `LocationFacts` and `SelectionFacts` (raw facts the gateways read for `classifyLocation`/`classifySelection`), `FormatPart` (`literal{text}` | `number` | `text` | `page` | `aboveBelow`), `ReferenceFormat` (`id`, `label`, `parts`, `builtIn`), `ReferencePreview` (`text`, `warnings: ("noNumber" | "pageUnknown" | "positionUnknown")[]`), `MatchResult` (`key`, `score`, `numberRanges`, `textRanges` as `[start, end][]`) in `src/core/location/types.ts`, `src/core/formats/types.ts`, `src/core/matching/types.ts`
- [X] T020 [P] Define `IDocumentGateway`, `InsertReferenceRequest`, `InsertReferenceRequest` incl. `policy` and `confirmExtendedSelection`, `InsertReferenceResult` (`ok` | `staleTarget` | `hostError` | `needsConfirmation` | `declined` with a `Declined`), `checkInsertionPoint(policy)`, `InsertedReference`, `ReferenceRecord` exactly as contracts/document-gateway.md in `src/core/ports/document-gateway.ts`
- [X] T021 [P] Define `IHostShell`, `HostTheme`, `ISettingsStore` exactly as contracts/host-ports.md in `src/core/ports/host-shell.ts` and `src/core/ports/settings-store.ts`

### Fakes and contract harness

- [X] T022 Implement `FakeGateway`: an in-memory document of paragraphs (style, outline level, text, number, story: main/footnote/endnote/header/footer/comment/textBox/tableCellInMain, tracked deletion flag; headings in every story carry their `location`), bookmarks (name, paragraph index, `spansHeadingText`), fields not made by the add-in, inserted references, a movable selection that can span paragraphs or contain a table, picture, shape or content control, protection flag and a fail-next-write switch; writes are all-or-nothing; location and selection decisions go through the core's `classifyLocation`/`classifySelection` (stubbed until T043); implements every `IDocumentGateway` method, in `tests/fakes/fake-gateway.ts` with fixture builders in `tests/fakes/fake-documents.ts`
- [X] T023 [P] Implement `FakeHostShell` (records show/hide, settable theme, reduced motion, shortcut state incl. `null`, `canCustomise`, in-use set) and `FakeSettingsStore` (in-memory, can return corrupt raw data) in `tests/fakes/fake-host-shell.ts` and `tests/fakes/fake-settings-store.ts`
- [X] T024 Create the shared contract harness: `defineDocumentGatewayContract(name, setup)` where `setup(fixtureName)` returns a gateway plus helpers to move the selection and inspect bookmarks/fields, exported from `tests/contract/document-gateway.contract.ts` (no cases yet), and a Node runner `tests/contract/fake-gateway.contract.test.ts` that runs it against `FakeGateway`
- [X] T025 Create the shared host-ports contract harness: `defineSettingsStoreContract(name, makeStore)` and `defineHostShellContract(name, makeShell)` exported from `tests/contract/host-ports.contract.ts` (no cases yet), with a Node runner against `FakeSettingsStore` and `FakeHostShell` in `tests/contract/fake-host-ports.contract.test.ts`
- [X] T026 Create the dev contract pane shell: in the `devpane` build, a page that runs a chosen contract suite (`defineDocumentGatewayContract`, `defineSettingsStoreContract`, `defineHostShellContract`) against implementations passed in by a small registry, with a minimal in-browser `describe/it/expect` shim, and prints pass/fail per case; the user opens the fixture document in Word first. Office adapters are registered later (T051, T066 onwards); `src/dev/` never uses Office globals itself. In `src/dev/contract-pane.html`, `src/dev/contract-pane.ts`, `src/dev/contract-registry.ts`, `src/dev/mini-test.ts`

**Checkpoint**: spikes recorded, decisions applied; core types compile; fakes and harness run (zero cases).

---

## Phase 3: User Story 1 — Insert a cross-reference to a heading without the mouse (Priority: P1) 🎯 MVP

**Goal**: Shortcut → palette with focus → fuzzy filter with highlighted matches → Enter inserts "§ number text" as native hyperlinked fields at the cursor, reusing or creating a usable hidden bookmark; Esc cancels.

**Independent Test**: In `spec-300.docx`, using only the keyboard, insert a reference to "4.3 Fire strategy" by typing `fstrat`; Ctrl+A, F9; move the heading; F9 → new number shown; Ctrl+click jumps (quickstart scenarios 1–6, 12–13, 19–21, 23, 25, 26).

### Tests for User Story 1 (write first, see them fail) ⚠️

- [ ] T027 [P] [US1] Unit tests for `FuzzyMatcher`: "fstrat" ranks "Fire strategy" first among the `spec-300` heading texts; query matches across number and text ("4.3 fire"); matched ranges returned separately for number and text; word-start and consecutive bonuses beat scattered matches; ties broken by document order; empty query returns all headings in order with no ranges; case-insensitive (no timing assertions here — Constitution II; speed is measured by the benchmark task in Phase 8); a dev-only comparison with `fuzzysort` asserts our top-1 equals fuzzysort's top-1 on a table of 20 abbreviations, in `tests/unit/fuzzy-matcher.test.ts`
- [ ] T028 [P] [US1] Unit tests for `HeadingIndex`: builds from a snapshot; `byKey` for bookmark and provisional keys; provisional key is invalid against a newer snapshot when the fingerprint (level + text) differs; the host's `listString` used as the number as is (spike 2: it is already the full "4.3"; no composition); heading text from a note has a leading reference mark `\u0002` and whitespace stripped (research R7); unnumbered → `null`; cached snapshot returned immediately and replaced by `refresh()` without changing keys of bookmarked headings, in `tests/unit/heading-index.test.ts`
- [ ] T029 [P] [US1] Unit tests for bookmark naming: generated names match `^_RC[a-z0-9]{10}$` (13 characters, ≤ 40); "unique case-insensitively against every bookmark in the document including hidden ones"; regenerates on collision (inject a deterministic random source); never derived from heading text or position, in `tests/unit/bookmark-naming.test.ts`
- [ ] T030 [P] [US1] Unit tests for usable-bookmark selection: `wordManaged` when name matches "prefix `_Toc`, prefix `_Hlk`, exactly `_GoBack`" case-insensitively; `usable = spansHeadingText && !wordManaged`; `_Ref…` is usable; among usable picks "the first by case-insensitive name order"; returns `null` when none usable (caller creates one; unusable ones untouched), in `tests/unit/bookmark-selection.test.ts`
- [ ] T031 [P] [US1] Unit tests for location and selection rules: with `allowInHeadings: false`, allowed for main, footnote, endnote, tableCellInMain non-heading paragraphs of any style (quote, caption, list item); declined `headingParagraph` for Heading 1–9 or outline level 1–9, `titleParagraph` for Title/Subtitle, `header`, `footer`, `comment`, `textBox`, `protected`, `unknown`; with `allowInHeadings: true`, heading/Title/Subtitle allowed with `inHeadingOrder` set for headings only, the others still declined; `classifySelection`: no selection → `none`, one paragraph → `inline`, more than one paragraph or any table, picture, shape or content control → `extended`, in `tests/unit/location-rules.test.ts`
- [ ] T032 [P] [US1] Unit tests for the default format and preview: `sectionNumberText` parts = literal "§ ", number, literal " ", text; preview for "4.3"/"Fire strategy" is "§ 4.3 Fire strategy"; unnumbered heading gives warning `noNumber`; adjacent literals merged and empty literals dropped, in `tests/unit/format-preview.test.ts`
- [ ] T033 [P] [US1] Unit tests for the `OpenPalette` use case: declined location returns a message state (no headings loaded); no headings returns the "no headings" message; otherwise returns headings in order, default format, first row selected, `precedingHeadingOrder` set; passes the `LocationPolicy` from settings (defaults until US2 wires them); applies the heading list filter (T105); uses the cached index then refreshes, in `tests/unit/open-palette.test.ts`
- [ ] T034 [P] [US1] Unit tests for the `InsertReference` use case against `FakeGateway`: reuses a usable bookmark (bookmark count unchanged); creates exactly one when none usable and leaves `_Toc…` untouched; passes the format parts and a fresh unique name; maps `staleTarget` to a refresh + message; maps `declined` (selection moved into a heading, or protection turned on, after opening) to a message with the palette kept open and no change; maps `hostError` to a message with the document unchanged (FR-014); maps `needsConfirmation` to the selection-warning state, and a second call sends `confirmExtendedSelection: true`; maps `selfReference` to its message; never asks the gateway to touch a bookmark it did not choose or create (FR-011a); on success returns focus after the reference, in `tests/unit/insert-reference.test.ts`
- [ ] T035 [US1] Contract cases 1–14 from contracts/document-gateway.md (incl. 1a, 5a, 5b, 5c, 7a, 7b, 7c and 10a; mark 7a's after-update part, 7c's jump and case 14 as Word-only), each as an `it` in `tests/contract/document-gateway.contract.ts`
- [ ] T105 [P] [US1] Unit tests for the heading list filter: with `showHeadingsOutsideMainText: false` every heading whose `location` is not `main` is left out (table cells included); with `true` all are kept in story order; the heading at `inHeadingOrder` is always left out; recents and ranking apply only to the kept headings, in `tests/unit/heading-filter.test.ts`
- [ ] T036 [P] [US1] Component tests for the palette per contracts/palette-ui.md: search input focused on mount; `role="combobox"` with `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-autocomplete="list"`; `role="listbox"` and `role="option"` with `aria-selected`; accessible name "4.3 Fire strategy, level 2" and "Summary, level 1, in text box"; location badge text for each non-main location; the heading containing the cursor is not listed; extended selection: first Enter shows the selection-warning text verbatim and does not insert, second Enter inserts with confirmation, Esc dismisses only the warning, typing dismisses it and applies the key; typing re-ranks and selects first row; ↑/↓ move without wrapping and keep the row in view; Page Up/Down; Enter calls insert with the selected key; Esc calls cancel; matches wrapped in `<mark>`; empty-state and message texts in one polite live region; Enter is a no-op with no rows; indent one step per level capped at 6; long text truncated with full text in `title`; keystrokes typed while a transition is running are applied immediately and no input handler waits on a transition (FR-026), in `tests/component/palette.test.ts`
- [ ] T037 [P] [US1] Host-shell contract cases for US1: one `OpenPalette` handler is invoked for both the shortcut action and the ribbon action; `showPane` then `hidePane` leave the shell hidden; `theme()` returns `isDark`, `background`, `foreground`; `prefersReducedMotion()` returns a boolean; add to `tests/contract/host-ports.contract.ts`
- [ ] T038 [P] [US1] App-flow integration test: mount the app from a `createApp(ports)` factory with `FakeGateway`, `FakeHostShell` and `FakeSettingsStore`; open → type "fstrat" → Enter inserts the selected heading and returns focus; Esc hides the pane and changes nothing; a declined location shows the message (in a heading it names the setting); a two-paragraph selection needs a second Enter; with default settings, headings in a text box and a footnote are listed with badges, in `tests/component/app-flow.test.ts`

### Implementation for User Story 1

- [ ] T039 [P] [US1] Implement `FuzzyMatcher` (fzy-style DP with word-start, separator and consecutive bonuses, gap penalty, backtracking for ranges; matches "number text" as one string and splits ranges back) until T027 passes, in `src/core/matching/fuzzy-matcher.ts`
- [ ] T040 [P] [US1] Implement `HeadingIndex` and heading-text normalisation until T028 passes, in `src/core/headings/heading-index.ts` and `src/core/headings/normalise-text.ts`
- [ ] T041 [P] [US1] Implement bookmark naming (injectable random source) until T029 passes, in `src/core/bookmarks/naming.ts`
- [ ] T042 [P] [US1] Implement usable-bookmark selection with the Word-managed list as one exported constant until T030 passes, in `src/core/bookmarks/selection.ts`
- [ ] T043 [P] [US1] Implement location rules, `LocationPolicy` handling and `classifySelection` until T031 passes, in `src/core/location/rules.ts` and `src/core/location/selection.ts`
- [ ] T044 [P] [US1] Implement the format parts model, `sectionNumberText` built-in and preview until T032 passes, in `src/core/formats/parts.ts`, `src/core/formats/built-ins.ts`, `src/core/formats/preview.ts`
- [ ] T106 [P] [US1] Implement the heading list filter until T105 passes, in `src/core/headings/filter.ts`
- [ ] T045 [US1] Implement the `OpenPalette` use case until T033 passes, in `src/core/use-cases/open-palette.ts`
- [ ] T046 [US1] Implement the `InsertReference` use case until T034 passes, in `src/core/use-cases/insert-reference.ts`
- [ ] T047 [US1] Make `FakeGateway` pass every contract case not marked Word-only (1–13 incl. 5a and the before-update part of 7a) in Node (fix the fake, never weaken a case), in `tests/fakes/fake-gateway.ts`
- [ ] T048 [US1] Implement `OfficeJsGateway`: `readHeadings` (one batched load of `body.paragraphs` with `text, styleBuiltIn, outlineLevel, isListItem, tableNestingLevel`, plus the text-box, footnote, endnote, header and footer stories per research R7 "Other stories" and T017, in the same syncs, each heading with its `location`, second batch for `listItemOrNullObject.listString` on headings only, tracked deletions excluded per R9 outcome only when `isSetSupported("WordApi", "1.6")` (otherwise the R9 fallback), usable bookmark via `getBookmarks(true, false)` + range comparison); `checkInsertionPoint(policy)` (`getSelection().parentBody.type` mapped to `SelectionStory`: `Shape` → `textBox`, `Unknown` → `comment`, per research R8 outcome; first paragraph style/outline level, `protectionType` when WordApiDesktop 1.4 is supported else write-error mapping, selection paragraph/table/picture/content-control/shape counts; decided by the core's `classifyLocation`/`classifySelection`); `insertReference` in one `Word.run` and one `sync` on the write path chosen in T017 for a single Undo step (re-check selection and policy, `selfReference` and `needsConfirmation` checks before any write, fingerprint check, ensure bookmark first, over heading text without paragraph mark and, in a note, starting after the reference mark; literals + `insertField(..., removeFormatting = true)` per R5 mapping with `\* CHARFORMAT` on every field (T017); `updateResult()`); `returnFocus` (`range.select()` + hide pane); `readReferences` (`body.fields.getByTypes([ref, pageRef])`, parse `code`), in `src/adapters/office/office-js-gateway.ts`
- [X] T049 [US1] **Dropped by T017** (spike 2 chose `insertField`; research R5). ~~Implement the OOXML REF/PAGEREF fallback (complex field with `w:fldChar`/`w:instrText` and cached result run) used only if T015 chose it, with the same field codes and bookmark layout as the primary path, in `src/adapters/office/ooxml-ref.ts`~~
- [ ] T050 [US1] Implement `OfficeHostShell` for US1 until T037 passes in Word (via the dev contract pane): `onOpenPalette` via `Office.actions.associate("OpenPalette", …)`, `showPane`/`hidePane` (task pane; T014 needs no dialog fallback), every `associate` handler calling `event?.completed()` so ribbon clicks after the first still fire (research R3), `theme()` from `Office.context.officeTheme` (`isDarkTheme`; never the `prefers-color-scheme` media query, research R11), `prefersReducedMotion()` via `matchMedia`, in `src/adapters/office/office-host-shell.ts` and `src/adapters/office/theme.ts`
- [ ] T051 [US1] Register `OfficeJsGateway` and `OfficeHostShell` in the dev contract registry (`src/dev/contract-registry.ts`, through an adapter-side `registerOfficeContracts()` in `src/adapters/office/dev-registration.ts`), then run the gateway and host-shell suites in Word on every fixture until all cases pass (including Word-only 7a, 7c and 14); a case-14 Undo failure is a release blocker raised with the product owner (FR-013), not recorded as an exception, in `src/adapters/office/office-js-gateway.ts` (fixes)
- [ ] T052 [P] [US1] Implement theme and motion styles: apply `data-theme` from `HostTheme.isDark`; Fluent type ramp, spacing, radii and focus ring from tokens only; fade-in and selection-move CSS transitions ≤ 150 ms, opacity/transform only, disabled under `@media (prefers-reduced-motion: reduce)`; no Svelte `transition:` directives, in `src/ui/theme/base.css` and `src/ui/theme/motion.css`
- [ ] T053 [US1] Implement the palette views until T036 passes: `Palette.svelte` (combobox input, listbox, keyboard map, message region), `ResultRow.svelte` (indent, number, text, `<mark>` highlights with bold + underline, location badge), `MessageRegion.svelte` (incl. the selection warning and confirmation state), `FormatStrip.svelte` (shows the current format label and preview in a polite live region; Tab handling arrives in US2), in `src/ui/palette/`
- [ ] T054 [US1] Wire the composition root until T038 passes: a `createApp(ports)` factory in `src/app/create-app.ts` used by the test and by `main.ts` with the real ports (OfficeJsGateway, OfficeHostShell); `HeadingIndex` cache per document, use cases and the palette; on `OpenPalette` show pane, run `OpenPalette`, mount palette with focus; on Enter run `InsertReference` (handling `needsConfirmation` with a second Enter) and `returnFocus`; on Esc hide pane and return focus, in `src/app/main.ts` and `src/adapters/office/bootstrap.ts`
- [ ] T055 [US1] Run quickstart scenarios 1–6, 12–13, 19–21, 23, 25 (default settings part) and 26 in Word and record results in `docs/acceptance-checklist.md`

**Checkpoint**: US1 is a usable MVP: keyboard-only insertion of "§ number text" references that survive F9 and reordering.

---

## Phase 4: User Story 2 — Choose the reference format while inserting (Priority: P2)

**Goal**: Tab/Shift+Tab cycles all seven built-in formats with a live preview; the user's default format persists and the palette always opens on it; a settings view reachable from the ribbon, the palette cog and Ctrl+,.

**Independent Test**: Tab through every format, insert each, F9 → all correct; set default "number", restart Word, palette opens on "number" (quickstart 7, 8, 16).

### Tests for User Story 2 ⚠️

- [ ] T056 [P] [US2] Unit tests for the built-in catalogue: ids and order `text`, `number`, `numberText`, `sectionNumberText`, `page`, `aboveBelow`, `textAboveBelow`; parts for each match research R5 (e.g. `textAboveBelow` = text, " ", aboveBelow); built-ins have `builtIn: true`, in `tests/unit/format-catalogue.test.ts`
- [ ] T057 [P] [US2] Unit tests for the format cycle and preview: Tab = next, Shift+Tab = previous, wrapping at both ends; built-ins then templates in creation order; page previews as "page ?" with warning `pageUnknown`; above/below computed from `precedingHeadingOrder` versus target `order`; palette reopens on the default, not the last used, in `tests/unit/format-cycle.test.ts`
- [ ] T058 [P] [US2] Unit tests for settings: defaults (`schemaVersion: 1`, `defaultFormatId: "sectionNumberText"`, no templates, `allowReferencesInHeadings: false`, `showHeadingsOutsideMainText: true`); load validates and migrates; "unknown versions reset to defaults with a message"; `defaultFormatId` "falls back to `sectionNumberText` if the template was deleted"; `SaveSettings` use case persists through `ISettingsStore`, in `tests/unit/settings.test.ts`
- [ ] T059 [P] [US2] Contract cases: inserting each built-in format produces exactly the R5 field composition and its result equals the preview (page: positive integer); add to `tests/contract/document-gateway.contract.ts`
- [ ] T060 [P] [US2] Component tests: Tab/Shift+Tab change the format strip and announce it politely; focus stays in the search box; Ctrl+, and the cog (with `aria-keyshortcuts="Control+Comma"`) emit open-settings; settings view focuses its first control on open; every settings control has a programmatic label, the default-format radio list is a labelled `radiogroup`, and validation errors are linked to their field with `aria-describedby` and announced; default-format radio list shows a sample preview per format; the Headings section has the "Allow references in headings" (off) and "Show headings outside the main text" (on) checkboxes, each with its description from contracts/palette-ui.md linked by `aria-describedby`; Esc/Close returns to the palette with the query restored when opened from it, otherwise to the document; unsaved changes prompt an in-pane confirmation, in `tests/component/format-strip.test.ts` and `tests/component/settings.test.ts`
- [ ] T061 [P] [US2] Settings-store contract cases: `UserSettings` round-trips exactly; `loadSettings()` returns `null` when nothing is stored; corrupt or unknown-version raw data is returned unvalidated (validation is core logic); add to `tests/contract/host-ports.contract.ts`. Node-only case (mark it so the Word run skips it): saving settings makes no call on the paired `FakeGateway`
- [ ] T062 [P] [US2] Extend the app-flow integration test for settings: the ribbon `OpenSettings` handler opens the settings view with focus on its first control; the palette cog and Ctrl+, open it from the palette; saving default format "number" persists through `FakeSettingsStore` and the next palette open starts on "number"; turning on "Allow references in headings" lets the palette open in a heading (without listing that heading); turning off "Show headings outside the main text" hides the badged headings; Close returns to the palette with its query restored when opened from it, otherwise hides the pane and returns focus to the document, in `tests/component/app-flow.test.ts`

### Implementation for User Story 2

- [ ] T063 [P] [US2] Implement the remaining six built-ins until T056 passes, in `src/core/formats/built-ins.ts`
- [ ] T064 [US2] Implement the format cycle and full preview until T057 passes, in `src/core/formats/cycle.ts` and `src/core/formats/preview.ts`
- [ ] T065 [US2] Implement settings defaults (incl. the two heading settings), validation, migration and the `SaveSettings` use case until T058 passes, and feed `LocationPolicy` and the list filter from the loaded settings, in `src/core/settings/user-settings.ts` and `src/core/use-cases/save-settings.ts`
- [ ] T066 [P] [US2] Implement `OfficeSettingsStore` until T061 passes in Node (fake) and in Word (registered in `src/adapters/office/dev-registration.ts`), on `OfficeRuntime.storage` (one versioned JSON key `radcut.settings`; raw data returned to the core for validation; nothing written to the document), in `src/adapters/office/office-settings-store.ts`
- [ ] T067 [US2] Make both gateways pass the T059 cases (Node and Word), in `tests/fakes/fake-gateway.ts` and `src/adapters/office/office-js-gateway.ts`
- [ ] T068 [US2] Add Tab/Shift+Tab cycling, the cog button and Ctrl+, to the palette until the palette parts of T060 pass, in `src/ui/palette/Palette.svelte` and `src/ui/palette/FormatStrip.svelte`
- [ ] T069 [US2] Implement the settings view shell with the default-format and Headings sections until the settings parts of T060 pass, in `src/ui/settings/Settings.svelte`, `src/ui/settings/FormatPicker.svelte` and `src/ui/settings/HeadingOptions.svelte`
- [ ] T070 [US2] Wire `OpenSettings` (ribbon button via `IHostShell.onOpenSettings`), palette → settings → palette navigation and settings persistence (incl. passing the heading settings to `OpenPalette` and `InsertReference`) in the composition root until T062 passes, in `src/app/create-app.ts`, `src/app/main.ts` and `src/adapters/office/office-host-shell.ts`
- [ ] T071 [US2] Run quickstart scenarios 7, 8, 16, 24 and 25 (settings part) in Word and record results in `docs/acceptance-checklist.md`

**Checkpoint**: US1 and US2 both work; formats are selectable and the default persists.

---

## Phase 5: User Story 3 — Define my own reference wording (Priority: P3)

**Goal**: User templates such as "see §{number} {text}, {abovebelow}" are created, validated, previewed, cycled and usable as the default.

**Independent Test**: Add the example template, see it in the Tab cycle with a correct preview, insert, F9 → all parts update; `{num}` is rejected (quickstart 9).

### Tests for User Story 3 ⚠️

- [ ] T072 [P] [US3] Unit tests for the template parser per contracts/format-templates.md: grammar incl. `{{`/`}}` literals and case-insensitive names; each error message verbatim ("Add at least one of {number}, {text}, {page} or {abovebelow}.", "Unknown placeholder {xyz}. Use {number}, {text}, {page} or {abovebelow}.", "Unmatched { or }. Write {{ or }} for a literal brace.", "Templates can be up to 200 characters.", "A format with this name already exists."); label 1–40 characters unique case-insensitively; repeated placeholders become separate parts; all example rows of the contract table, in `tests/unit/template-parser.test.ts`
- [ ] T073 [P] [US3] Unit tests for template management in settings: add, edit, delete; "At most 20" templates; deleting the default template falls back to `sectionNumberText`; editing or deleting never touches existing references (no gateway calls), in `tests/unit/templates.test.ts`
- [ ] T074 [P] [US3] Component tests for the template editor: live preview against a sample heading (in a polite live region); inline errors next to fields, linked with `aria-describedby` and setting `aria-invalid`; template text and label inputs have programmatic labels; save moves focus to the first error; templates appear after built-ins in the palette cycle, in `tests/component/template-editor.test.ts`

### Implementation for User Story 3

- [ ] T075 [US3] Implement the template parser until T072 passes, in `src/core/formats/template-parser.ts`
- [ ] T076 [US3] Implement template management in settings and include templates in the cycle until T073 passes, in `src/core/settings/templates.ts` and `src/core/formats/cycle.ts`
- [ ] T077 [US3] Implement the templates section of the settings view until T074 passes, in `src/ui/settings/TemplateEditor.svelte` and `src/ui/settings/Settings.svelte`
- [ ] T078 [US3] Run quickstart scenario 9 in Word and record results in `docs/acceptance-checklist.md`

**Checkpoint**: templates work end to end without affecting US1/US2 behaviour.

---

## Phase 6: User Story 4 — Open the palette my way (Priority: P3)

**Goal**: Ribbon "Cross-reference" opens the same palette; the shortcut can be changed safely, and is read-only with an explanation when the user is signed out.

**Independent Test**: Ribbon button opens the palette with focus; a new shortcut works and the old one does not; Ctrl+@ and in-use combinations are refused; UK layout types no stray character (quickstart 10).

### Tests for User Story 4 ⚠️

- [ ] T079 [P] [US4] Unit tests for shortcut rules: at least one modifier; Shift not the only modifier; exactly one key from A–Z, 0–9, `-`, `_`, `+`; Ctrl+@ always refused; normalised display form (e.g. "Ctrl+Shift+Alt+K"), in `tests/unit/shortcut-rules.test.ts`
- [ ] T080 [P] [US4] Unit tests for the `ChangeShortcut` use case against `FakeHostShell`: refuses invalid combinations with a reason; refuses when `isInUse` is true; calls `replace` only after both checks pass; `replace(null)` resets to default; `current()` returning `null` yields "no shortcut assigned"; `canCustomise()` false yields read-only state with explanation, in `tests/unit/change-shortcut.test.ts`
- [ ] T081 [P] [US4] Component tests for shortcut capture: "Record new shortcut" captures the next key combination and shows it; refusal messages shown inline; reset to default; read-only state with explanation; ribbon-opened palette behaves the same as shortcut-opened (same handler), in `tests/component/shortcut-capture.test.ts`
- [ ] T082 [P] [US4] Host-shell shortcut contract cases: `shortcut.current()` returns the assigned combination or `null`; `canCustomise()` is `false` when signed out or when KeyboardShortcuts 1.1 is unsupported; `isInUse()` is `true` for a combination already taken; `replace(combo)` then `current()` returns it; `replace(null)` restores the manifest default; add to `tests/contract/host-ports.contract.ts`

### Implementation for User Story 4

- [ ] T083 [P] [US4] Implement shortcut rules until T079 passes, in `src/core/settings/shortcut-rules.ts`
- [ ] T084 [US4] Implement the `ChangeShortcut` use case until T080 passes, in `src/core/use-cases/change-shortcut.ts`
- [ ] T085 [US4] Implement the shortcut methods of `OfficeHostShell` until T082 passes in Node (fake) and in Word: `getShortcuts`, `areShortcutsInUse`, `replaceShortcuts`, and `canCustomise` = signed in AND `isSetSupported("KeyboardShortcuts", "1.1")`, in `src/adapters/office/office-host-shell.ts`
- [ ] T086 [US4] Implement the shortcut section of the settings view until T081 passes, in `src/ui/settings/ShortcutCapture.svelte` and `src/ui/settings/Settings.svelte`
- [ ] T087 [US4] Confirm the ribbon "Cross-reference" button routes to the same `OpenPalette` handler as the shortcut (manifest action id and associate call), in `manifest.xml` and `src/adapters/office/bootstrap.ts`
- [ ] T088 [US4] Run quickstart scenario 10 in Word (incl. UK layout) and record results in `docs/acceptance-checklist.md`

**Checkpoint**: users can open the palette by button or a shortcut of their choice.

---

## Phase 7: User Story 5 — Recently used headings first (Priority: P4)

**Goal**: With an empty query, up to 5 most recently referenced headings in this document appear first under "Recent".

**Independent Test**: Insert to two headings, reopen with an empty query → both under "Recent", most recent first; typing ranks normally (quickstart 11).

### Tests for User Story 5 ⚠️

- [ ] T089 [P] [US5] Unit tests for `RecentHeadings`: "Most recent first, unique (case-insensitive), at most 5"; entries whose bookmark no longer exists or no longer sits on a heading are dropped on open; "At most 50 documents are kept; the least recently used is dropped"; unsaved documents (`documentId` null) kept in memory only and never sent to the store; recents never affect ranking once a query is typed, in `tests/unit/recents.test.ts`
- [ ] T090 [P] [US5] Component tests: empty query shows `role="group"` "Recent" then "All headings"; typing removes the groups; keyboard navigation crosses groups, in `tests/component/recents.test.ts`
- [ ] T091 [P] [US5] Settings-store recents contract cases: `saveRecents(documentId, bookmarks)` then `loadRecents(documentId)` returns the same list; different `documentId`s are independent; unknown `documentId` returns `[]`; add to `tests/contract/host-ports.contract.ts`

### Implementation for User Story 5

- [ ] T092 [US5] Implement `RecentHeadings` and update `OpenPalette` and `InsertReference` to read and record recents until T089 passes, in `src/core/recents/recent-headings.ts`, `src/core/use-cases/open-palette.ts`, `src/core/use-cases/insert-reference.ts`
- [ ] T093 [US5] Add recents storage keyed by document URL to `OfficeSettingsStore` (key `radcut.recents`) until T091 passes in Node (fake) and in Word, in `src/adapters/office/office-settings-store.ts`
- [ ] T094 [US5] Render the Recent and All headings groups until T090 passes, in `src/ui/palette/Palette.svelte`
- [ ] T095 [US5] Run quickstart scenario 11 in Word and record results in `docs/acceptance-checklist.md`

**Checkpoint**: all five stories work independently.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T096 Add a performance runner to the dev pane that times shortcut-to-palette-ready and per-keystroke filter latency, and flags main-thread tasks over 100 ms (`PerformanceObserver` long tasks), on `spec-300.docx` (targets: ready < 500 ms, filter < 50 ms) and `guide-500.docx` (no task > 100 ms), in `src/dev/perf-pane.ts`
- [ ] T097 [P] Add a Vitest benchmark for `FuzzyMatcher` (500 headings × 20-character queries, target under 5 ms per query) run by `npm run bench`, outside `npm test`, in `tests/bench/fuzzy-matcher.bench.ts`
- [ ] T098 Optimise until T096 meets every budget (background index refresh, batched loads, list rendering), recording measurements in `docs/performance.md`
- [X] T099 [P] **Dropped by T017** (`prefers-reduced-motion` follows Windows; research R11). ~~If T014 showed `prefers-reduced-motion` is not reliable in Word's WebView, add an "Animations" on/off setting (off by default) to `UserSettings` and the settings view, with tests first, in `src/core/settings/user-settings.ts`, `src/ui/settings/Settings.svelte`, `tests/unit/settings.test.ts`~~
- [ ] T100 [P] Write user-facing known behaviours: one Undo per insertion (FR-013; no exceptions are allowed, so this states the guarantee), selection objects not detected for the warning (equations, embedded objects), story fallbacks from T017 if any, tracked-change reject leaving a hidden bookmark, co-authoring outcome, signed-out shortcut limitation, in `docs/known-behaviours.md`
- [ ] T101 [P] Write the per-release manual acceptance checklist from quickstart.md scenarios 1–26, in `docs/acceptance-checklist.md`
- [ ] T102 Verify the release build excludes `src/dev/**` and `src/adapters/office/spikes/**` and the bundle stays under 150 KB gzip (`npm run build`), and that no network requests occur after load (quickstart 18), recording results in `docs/acceptance-checklist.md`
- [ ] T103 Run the full quickstart (scenarios 1–26, incl. 14, 15, 17, 18, 22, 24) on Windows desktop and record pass/fail in `docs/acceptance-checklist.md`; time 10 practised shortcut-to-inserted-reference runs and record the median against SC-001 (under 3 s)
- [ ] T104 [P] Write the README: what RAD·CUT does, install by sideloading, keyboard reference, formats and template syntax, privacy statement, in `README.md`

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: needs Setup. Spikes T014–T016 need T012 and T013; T017 needs all three spikes. T018–T026 can start once Setup is done, in parallel with the spikes, but T048–T050 (adapters) must not start before T017.
- **US1 (Phase 3)**: needs Foundational. This is the MVP.
- **US2 (Phase 4)**: needs Foundational; uses the US1 palette and format model (T044, T053).
- **US3 (Phase 5)**: needs US2 (settings view and cycle).
- **US4 (Phase 6)**: needs Foundational and the US2 settings view shell (T069); otherwise independent of US3.
- **US5 (Phase 7)**: needs US1 (use cases, palette) and T066 (settings store).
- **Polish (Phase 8)**: after the stories you intend to ship.

### Story order

US1 → US2 → (US3 and US4 in parallel) → US5 → Polish.

### Within each story

Tests (fail first) → core units → use cases → fakes/adapters to contract → views → wiring → quickstart run.

### Parallel opportunities

- Setup: T002, T003, T004, T006, T007, T009, T010 in parallel after T001.
- Foundational: T018–T021 in parallel; T023 alongside T022.
- US1 tests T027–T034, T105 and T036–T038 all in parallel; core implementations T039–T044 and T106 in parallel (T045 needs T106); T052 alongside T048–T050.
- US2: T056–T062 in parallel; T063 and T066 in parallel.
- US3 and US4 phases can run side by side after US2's settings shell.

---

## Parallel Example: User Story 1

```text
# Red: write all core and component tests together
Task: "Unit tests for FuzzyMatcher in tests/unit/fuzzy-matcher.test.ts"            (T027)
Task: "Unit tests for HeadingIndex in tests/unit/heading-index.test.ts"            (T028)
Task: "Unit tests for bookmark naming in tests/unit/bookmark-naming.test.ts"       (T029)
Task: "Unit tests for usable-bookmark selection in tests/unit/bookmark-selection.test.ts" (T030)
Task: "Unit tests for location rules in tests/unit/location-rules.test.ts"         (T031)
Task: "Unit tests for heading list filter in tests/unit/heading-filter.test.ts"     (T105)
Task: "Component tests for the palette in tests/component/palette.test.ts"         (T036)
Task: "Host-shell contract cases in tests/contract/host-ports.contract.ts"          (T037)
Task: "App-flow integration test in tests/component/app-flow.test.ts"              (T038)

# Green: implement the core units together
Task: "Implement FuzzyMatcher in src/core/matching/fuzzy-matcher.ts"                (T039)
Task: "Implement HeadingIndex in src/core/headings/heading-index.ts"                (T040)
Task: "Implement bookmark naming in src/core/bookmarks/naming.ts"                   (T041)
Task: "Implement usable-bookmark selection in src/core/bookmarks/selection.ts"      (T042)
Task: "Implement location rules in src/core/location/rules.ts"                      (T043)
Task: "Implement heading list filter in src/core/headings/filter.ts"                 (T106)
```

---

## Implementation Strategy

### MVP first (User Story 1 only)

1. Phase 1 Setup.
2. Phase 2 Foundational, including the three spikes and applying their decisions.
3. Phase 3 US1.
4. **Stop and validate**: quickstart scenarios 1–6, 12–13, 19–21, 23, 25, 26 in Word.
5. Use it on real documents before continuing.

### Incremental delivery

1. Setup + Foundational → foundation ready.
2. US1 → validate → MVP.
3. US2 → formats and settings view.
4. US3 and US4 → templates; ribbon and custom shortcut.
5. US5 → recents.
6. Polish → performance, docs, full acceptance run.

---

## Notes

- [P] tasks touch different files and depend on nothing unfinished.
- Every test task must be seen failing for the expected reason before its implementation task starts.
- Never weaken a contract case to make a gateway pass; fix the fake or the adapter.
- Commit after each task or small group; the PRD and `planning/` stay uncommitted (gitignored).
- Spike outcomes can change later tasks (palette surface, field path, formatting switch, default shortcut); T017 is where those changes are made, before any adapter work.
