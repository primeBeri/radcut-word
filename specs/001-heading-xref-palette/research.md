# Research: Heading Cross-Reference Palette (MVP)

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-10-10

Each entry records a decision, why it was made, and what else was considered. Items marked
**SPIKE** are proven (or overturned) by the Phase 0 spikes before feature work depends on them
(Constitution VI). Each spike-dependent decision names its fallback.

Requirement-set builds referenced below (Word on Windows, Microsoft 365): WordApi 1.3 = 1612,
1.4 = 2208, 1.5 = 2302; WordApiDesktop 1.4 = 2508; SharedRuntime 1.1 = 2205;
KeyboardShortcuts 1.1 = 2408.

---

## R1. Manifest type and runtime

- **Decision**: Add-in only XML manifest, shared runtime (`<Runtimes>` with `lifetime="long"`),
  keyboard shortcuts via `<ExtendedOverrides>` pointing at `shortcuts.json`.
- **Rationale**: Custom shortcuts in Word require the shared runtime. The XML manifest is the
  production-grade path for Word; the unified JSON manifest is still described as preview for
  Word in Microsoft's tooling docs, despite the overview listing support from build 2501.
- **Alternatives**: Unified JSON manifest (rejected for now: conflicting support statements;
  revisit in the web/Mac phase). Non-shared runtime (rejected: shortcuts would not work).
- **Sources**: learn.microsoft.com — design/keyboard-shortcuts; develop/configure-your-add-in-to-use-a-shared-runtime; develop/unified-manifest-overview.

## R2. Build tooling and scaffold

- **Decision**: Vite + Svelte + TypeScript project, with the XML manifest generated from
  `yo office` ("manifest only") and converted by hand to the shared runtime. Sideload and HTTPS
  via `office-addin-dev-certs` and `office-addin-debugging`. Vitest for tests.
- **Rationale**: Svelte and Vitest are native to Vite, giving one toolchain for build, dev server
  and tests. The Yeoman templates are webpack and React based; converting them costs more than
  starting from a manifest.
- **Risk**: Vite is not officially supported by Microsoft's Office tooling. Mitigation: spike 1
  is built on this toolchain, so any sideload or HTTPS problem shows up on day one; fallback is
  the Yeoman webpack template with `svelte-loader`.
- **Alternatives**: `yo office` TypeScript/webpack (fallback). Microsoft 365 Agents Toolkit
  (rejected: unified manifest only, Word in preview).

## R3. Palette surface and focus — SPIKE 1

- **Decision**: The palette lives in the task pane, shown with `Office.addin.showAsTaskpane()`
  from the shortcut's `Office.actions.associate` handler; on show, the search input is focused.
  After insert or Esc, `Office.addin.hide()` and `range.select()` return the caret to the
  document.
- **Rationale**: One runtime, one bundle, no cross-window messaging; settings live in the same
  pane (spec FR-021a).
- **Unverified**: whether the pane takes keyboard focus when opened by shortcut, and whether
  `range.select()` moves keyboard focus back to the document. No documentation either way.
- **Fallback**: `displayDialogAsync` popup for the palette only (separate runtime, talks to the
  shared runtime by `messageParent`/`messageChild`; DialogApi 1.2 checked at runtime). Settings
  stay in the task pane. Accept up to ~1 s open time in the fallback and record it.
- **Distribution note**: since 2026-02-23 `showAsTaskpane()` is ignored for Marketplace-published
  add-ins unless triggered by an explicit user action. This MVP is sideloaded, so it does not
  apply now; whether a keyboard shortcut counts as explicit user action must be re-checked before
  store publication.

## R4. Default shortcut and customisation — SPIKE 1

- **Decision**: Keep **Ctrl+Alt+K** as the default (spec FR-001) provisionally. Spike 1 runs
  `Office.actions.areShortcutsInUse(["Ctrl+Alt+K"])` and a UK-layout test. If Ctrl+Alt+K is taken
  by Word or produces a character, switch the default to **Ctrl+Shift+Alt+K** (Microsoft's
  recommended pattern) and update the spec via `/speckit-refine-update`.
- **Customisation**: `Office.actions.replaceShortcuts({ OpenPalette: "<combo>" })`; read back
  with `getShortcuts()`; check with `areShortcutsInUse()` before saving and refuse combinations
  in use (FR-020). Validation of the combination rules (at least one modifier, Shift not the only
  modifier, one key from A–Z/0–9/`-`/`_`/`+`, never Ctrl+@) is a pure core function.
- **Constraints found**:
  - Custom shortcuts are stored by Office in the user's roaming settings and only work when the
    user is signed in to Microsoft 365. When signed out, the settings view shows the shortcut as
    read-only with that explanation.
  - When a shortcut conflicts, Office itself asks the user once which action wins; if the user
    picks Word's, `getShortcuts()` returns `null` for our action. The settings view MUST show
    "no shortcut assigned" in that case.
  - AltGr is sent as Ctrl+Alt on Windows, so Ctrl+Alt+letter can collide on European layouts.
    UK AltGr only affects vowels and 4; K is believed safe but is tested in the spike.

## R5. Inserting cross-references — SPIKE 2

- **Decision**: In one `Word.run` and one `sync`: ensure the target bookmark, then insert literal
  text and fields at the captured range with `Range.insertField(location, Word.FieldType.ref |
  pageRef, "<bookmark> <switches>")` (WordApi 1.5), then `updateResult()` on each new field.
- **Format → field mapping** (all with `\h`):

  | Format | Composition |
  |---|---|
  | text | REF `bm \h` |
  | number | REF `bm \w \h` |
  | number + text | REF `bm \w \h` + " " + REF `bm \h` |
  | § number text (default) | "§ " + REF `bm \w \h` + " " + REF `bm \h` |
  | page | PAGEREF `bm \h` |
  | above/below | REF `bm \p \h` |
  | text + above/below | REF `bm \h` + " " + REF `bm \p \h` |

- **Formatting (FR-012a)**: the reference must look like the surrounding text and stay that way
  after F9. Fields are inserted with `removeFormatting = true` so no heading formatting is
  copied, and the add-in sets no character formatting. Heading paragraph styles do not travel
  with a REF result, but direct character formatting inside a heading may. If spike 2 shows the
  result picking up heading formatting or losing the surrounding formatting on F9, add
  `\* CHARFORMAT` to every field (result takes the formatting of the field code's first
  character, which is inserted in the surrounding formatting). The switch is then part of the
  R5 mapping for all formats.
- **Unverified**: the exact `text` argument shape for Ref/PageRef (no Microsoft example), the
  formatting behaviour above, and whether `updateResult()` is needed for a correct initial
  display.
- **Fallback**: `insertOoxml` with complex fields (`w:fldChar` begin/separate/end, `w:instrText`,
  cached result run), followed by `updateResult()`. Watch for extra paragraphs and imported
  styles.
- **Undo (FR-013)**: there is no undo-grouping API for Word. All writes go in one `sync`; spike 2
  measures how many Undo presses remove an insertion. Any case over one is documented.

## R6. Bookmarks

- **Decision**:
  - Read: `paragraphRange.getBookmarks(includeHidden = true, includeAdjacent = false)` and
    `document.getBookmarkRangeOrNullObject(name)` (WordApi 1.4).
  - Reuse rule (spec FR-011): a bookmark is **usable** only if
    1. its range spans exactly the heading's text, not the paragraph mark (otherwise a text REF
       would pull in a paragraph break and heading style), and
    2. it is not Word-managed. Word-managed names are matched case-insensitively against a
       core exclusion list: `_Toc` prefix (table-of-contents entries, deleted and recreated
       when the TOC updates), `_GoBack` (last edit position), `_Hlk` prefix (hyperlink targets
       Word may tidy away). The list lives in one core constant with unit tests so additions
       are cheap.

    Among usable bookmarks, pick the first in case-insensitive name order, so the choice is the
    same every time. Word's own cross-reference bookmarks (`_Ref` prefix) are usable. If none is
    usable, create one. Unusable bookmarks are left untouched, so no duplicate of a usable
    bookmark is ever made.
  - Reading extents: compare each bookmark's range with the heading text range
    (`getBookmarkRangeOrNullObject(name)` then `compareLocationWith`, WordApi 1.4/1.3). Spike 2
    confirms this works for hidden bookmarks and `_Toc…` bookmarks.
  - Create: `range.insertBookmark(name)` over the heading text (paragraph range minus the
    paragraph mark).
  - Naming: `_RC` + 10 characters from `[a-z0-9]` (random), checked against all existing names
    (case-insensitive) and regenerated on collision. 13 characters, inside the 40 limit; only
    letters, digits and underscore; the leading `_` hides it. The name never derives from heading
    text or position, so it is stable under edits (FR-012).
- **Rationale**: Word's naming rules (alphanumeric and underscore, start with a letter or `_` for
  hidden, max 40, case-insensitive; inserting an existing name moves it) are documented on
  `Word.Range.insertBookmark`.
- **Alternatives**: deriving names from heading text like Word's `_Ref` + number (rejected:
  leaks content shape, no benefit); always creating a new bookmark (violates FR-011).

## R7. Reading headings and numbers — SPIKE 2

- **Decision**: One batched load of `body.paragraphs` selecting `text, styleBuiltIn,
  outlineLevel, isListItem`; a second batch loads `listItemOrNullObject.listString` for heading
  paragraphs only. A paragraph is a heading if `styleBuiltIn` is Heading1–Heading9 or
  `outlineLevel` is 1–9 (values unverified; body text believed to be 10).
- **Numbers**: `listString` is used as the displayed number if the spike shows it returns the
  full-context number ("4.3"). If it returns only the level's own part ("3"), the core composes
  the full number from ancestor headings in `HeadingIndex`. The number is only for display and
  matching; the inserted field (`\w`) always gets Word's real number.
- **Performance**: target palette ready < 500 ms at 300 headings. The index is cached in memory
  per document and refreshed in the background when the palette opens; the palette shows the
  cached list immediately and swaps in the fresh one without moving the selection.

## R8. Where the cursor is

- **Decision**: In the shortcut handler, load `getSelection()` with `parentBody.type` and the
  first paragraph's `styleBuiltIn` and `outlineLevel`.
  - Allowed: `MainDoc`, `Footnote`, `Endnote`, `NoteItem`, and `TableCell` whose chain leads
    to the main document.
  - Declined with a message: `Header`, `Footer`, `Unknown` (comments and text boxes are expected
    to report this — spike 1 confirms), and any heading, Title or Subtitle paragraph.
  - Read-only: check `document.protectionType` when WordApiDesktop 1.4 is available; otherwise
    catch the access-denied error on write and show the same message.
- **When the check runs** (spec FR-008): twice. When the palette opens, so a disallowed place is
  reported straight away and the above/below preview has a position. Then again inside the
  insertion transaction at Enter, reading Word's selection afresh: the reference goes wherever
  the cursor is at that moment, and if the place is now disallowed or protected the
  transaction writes nothing and returns a decline reason. No range is tracked between open and
  Enter, which also avoids leaking tracked objects. Spike 1 checks that showing the pane does
  not move Word's selection and that it can be read from the pane.

## R9. Tracked changes and co-authoring — SPIKE 3

- **Decision**: No special handling for insertion. Insert as normal with tracking on; the spike
  verifies the inserted text and fields appear as one tracked insertion and the reference still
  updates. Co-authoring is a manual checklist item; results are recorded in user documentation.
- **Rejected references** (spec edge case): rejecting removes the text and fields; a bookmark
  created for the reference may remain on the heading. That is accepted: it is hidden, usable
  and reused by the next reference. The spike records what actually happens, and the user
  documentation states it.
- **Headings that are tracked changes** (spec FR-003): headings shown as tracked deletions are
  not listed; tracked insertions are. Detection: `paragraph.getTrackedChanges()` /
  `Range.getTrackedChanges()` (WordApi 1.6) filtered for type `deleted` covering the whole
  heading text. **Unverified** — spike 3 confirms the API on build 2408+; fallback is to list
  such headings with a "(deleted)" suffix rather than hide them, and note it.

## R10. UI layer

- **Decision**: **Svelte 5** (runes) compiled by Vite, styled with **Fluent 2 design tokens**
  (`@fluentui/tokens`, `webLightTheme`/`webDarkTheme` emitted as CSS custom properties at build
  time), and a hand-built WAI-ARIA combobox/listbox for the palette. No component library in the
  palette.
- **Rationale**: the palette and settings view hold state that changes on every keystroke (query,
  ranked results with highlight ranges, selection, format, preview, recents, messages, form
  fields). Svelte compiles that to direct DOM updates with a runtime of roughly 10 KB, which fits
  the constitution's 150 KB budget with a wide margin. Tokens give the Office Fluent look
  (FR-025) without a component framework.
- **Alternatives**:
  - Plain TypeScript + tokens: smallest, but the settings forms and template editor need
    hand-written binding. Kept as the fallback if Svelte causes trouble in the add-in WebView.
  - Fluent UI Web Components v3: good settings controls (~35–50 KB for a realistic set), but
    the dropdown is a form control, not a command palette, and shadow DOM complicates
    `aria-activedescendant`. May be lazy-loaded later for settings only if hand-built controls
    fall short.
  - Fluent UI React v9: best fidelity, but React plus Griffel is likely 100–150 KB gzip before
    our code. Rejected on budget.
  - Preact + signals, Solid, Lit: viable, but no advantage over Svelte here.
- **No maintained Fluent-styled Svelte library exists** (fluent-svelte and svelte-fui are
  inactive or pre-release), so tokens it is.

## R11. Theme and motion

- **Decision**:
  - Theme: on every palette or settings show, read `Office.context.officeTheme`
    (`isDarkTheme`, colours; `fluentThemeData` on Windows) and apply the light or dark token
    set. There is no `OfficeThemeChanged` event in Word (Outlook only), but reading on each show
    is enough because the views are shown fresh each time.
  - Motion: CSS transitions only (≤150 ms, opacity and transform), disabled by a
    `@media (prefers-reduced-motion: reduce)` rule. Svelte `transition:` directives are not used,
    because they ignore that media query.
- **Unverified**: whether the WebView2 inside Word reflects Windows "reduce animation" in
  `prefers-reduced-motion`. Spike 1 logs `matchMedia` results. Fallback: an "Animations" on/off
  toggle in settings, off by default if the media query cannot be trusted.

## R12. Fuzzy matching

- **Decision**: In-house fzy-style scorer in the core (`FuzzyMatcher`): dynamic programming over
  query × candidate, with bonuses for word starts, after separators (space, `.`, `-`) and
  consecutive runs, a gap penalty, and backtracking to return matched character positions for
  highlighting (FR-005a). It matches against the number and text together ("4.3 Fire strategy").
- **Rationale**: zero dependencies, under 1 KB, trivially fast at 500 items, tunable for heading
  numbers, and fully testable with a table of real abbreviations ("fstrat" → "Fire strategy",
  "4.3", "mos").
- **Alternatives**: fuzzysort 4 (8 KB, good results; used as a dev-only benchmark in tests to
  check ranking quality); uFuzzy (does not match "fstrat" across a space by default); fzf-for-js
  (fine, but larger than needed); fuse.js (poor for abbreviations).

## R13. Persistence

- **Decision**:
  - User settings (default format, templates) are stored in `OfficeRuntime.storage` under one
    versioned JSON key. The shortcut itself is stored by Office (R4).
  - Recents are stored in `OfficeRuntime.storage` keyed by `Office.context.document.url`, as
    bookmark names, at most 5 per document, and at most 50 documents (oldest dropped).
  - Unsaved documents (`url` empty or null) keep recents in memory for the session only.
- **Rationale**: per-user and outside the document (FR-021); 10 MB per-domain limit is far beyond
  need; no network (FR-023). `localStorage` also works in Word on Windows but
  `OfficeRuntime.storage` is the documented shared-runtime store.
- **Alternatives**: document settings or custom XML parts (rejected: stored in the document);
  `roamingSettings` (Outlook only).

## R14. Testing strategy

- **Decision**:
  - **Unit (Vitest, node)**: all core units against `FakeGateway`, `FakeSettingsStore`,
    `FakeHostShell`.
  - **Component (Vitest + @testing-library/svelte, jsdom)**: palette and settings behaviour —
    keyboard, ARIA roles and states, highlighting, preview, focus.
  - **Contract**: shared suites for every port — `tests/contract/document-gateway.contract.ts`
    and `tests/contract/host-ports.contract.ts` — run in Node against the fakes and inside Word
    against the Office adapters from a dev-only test pane that prints results in the pane.
    Fixture documents live in `tests/fixtures/`.
  - **App flow**: one integration test mounts the app from `createApp(ports)` with fakes.
  - **Performance**: the dev test pane times palette-ready and filter latency on the 300- and
    500-heading fixtures and reports against the budgets. Matcher speed is a Vitest benchmark
    (`npm run bench`). Unit tests never assert on timing (Constitution II).
  - **Manual acceptance**: checklist per release (focus, undo, tracked changes, co-authoring, UK
    layout, opening references without the add-in).
- **Boundary enforcement**: ESLint `no-restricted-globals` bans `Office`, `Word` and
  `OfficeRuntime` outside `src/adapters/`, with no exemptions (the composition root in
  `src/app/` and the dev panes in `src/dev/` reach Office only through adapter functions; the
  dev-only spike scripts live in `src/adapters/office/spikes/` and are excluded from release
  builds), and `no-restricted-imports` stops `src/core/` importing from
  `ui`, `adapters` or `app`, and `src/ui/` importing from `adapters`.
- **Deferred**: the earlier idea of a fully automated Word-driving harness (UI Automation, COM,
  OOXML checks) is not needed for this MVP. Reconsider if manual acceptance becomes the
  bottleneck.
