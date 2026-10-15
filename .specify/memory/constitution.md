# RAD·CUT Constitution

## Core Principles

### I. Clean Architecture: Ports and Adapters

- The core (domain entities and use cases such as `HeadingIndex`, `FuzzyMatcher`, bookmark
  naming and `InsertReference`) MUST be pure TypeScript with no import of Office.js, the DOM,
  or any UI framework.
- Dependencies MUST point inwards: UI and host adapters depend on the core; the core depends
  only on ports it defines (for example `IDocumentGateway`).
- `OfficeJsGateway` (and any future host adapter) is the ONLY code permitted to call Office.js.
  The palette, shortcut handler and ribbon commands talk to the core, never to Office.js.
- Adapters MUST stay thin: translation between Word and the port, no business rules.
  Any decision logic found in an adapter MUST move into the core with a test.
- Headings and references MUST be keyed by bookmark name, never by position or heading text,
  so that later views (for example backlinks over a `ReferenceIndex`) are additions, not
  rewrites.

**Rationale:** Word is slow and awkward to automate in tests. Keeping every rule in a pure core
lets almost all behaviour be tested in milliseconds, and lets Mac and web support arrive as new
adapters on the same codebase.

### II. Test-First, Red-Green-Refactor (NON-NEGOTIABLE)

- No production code is written without a failing test that demands it. Each change follows
  the cycle: **Red** (write a test, run it, watch it fail for the expected reason) →
  **Green** (the smallest change that makes it pass) → **Refactor** (improve design with all
  tests green).
- Core units MUST be unit-tested with Vitest against `FakeGateway`, without Word running.
- One shared **contract suite** MUST run against both `FakeGateway` and `OfficeJsGateway`
  (the latter inside Word). A behaviour the fake exhibits but real Word does not is a defect
  in the fake.
- Every bug fix starts with a test that reproduces the bug.
- Tests MUST exercise behaviour through public interfaces, not private implementation details,
  and MUST be deterministic (no reliance on timing, ordering or network).
- Tasks in `tasks.md` MUST place each test task before the implementation task it drives.

**Rationale:** The product's promise is that references never silently break. Tests written
first are the executable form of that promise, and the contract suite stops the fake drifting
from real Word.

### III. Native, Portable Word Output

- The add-in MUST emit only native Word constructs: bookmarks and REF fields with the `\h`
  switch. Documents MUST open, update (F9) and navigate correctly without the add-in installed.
- An existing bookmark on the target heading MUST be reused; duplicate bookmarks MUST NOT be
  created.
- Generated bookmark names MUST start with `_` (hidden), be unique within the document, remain
  stable across edits, and fit Word's 40-character limit.
- Every part of an inserted reference (number via `\w`, text via plain REF, position via `\p`)
  MUST be a field that updates on F9; literal text is allowed only as fixed separators.
- Headings are paragraphs using built-in Heading 1–9 styles or outline levels. Manually
  formatted text is out of scope.
- An insertion MUST be a single undo step wherever the API allows; where it does not, the
  limitation MUST be documented in the feature's plan.

**Rationale:** Portability is the product's core differentiator. A document that depends on the
add-in to read correctly has failed its users.

### IV. Lightweight, Responsive, Keyboard-First UI

- Every user flow MUST be completable from the keyboard alone: shortcut to open, type to
  filter, ↑ ↓ to move, Tab to cycle format, Enter to insert, Esc to cancel with no change.
- When the palette opens, keyboard focus MUST be in the search box; after insert or cancel,
  focus MUST return to the document.
- Performance budgets (measured, not estimated):
  - palette open under 500 ms on a 300-heading document;
  - filter results rendered within 50 ms of a keystroke at 300 headings;
  - no main-thread task over 100 ms during palette use on a 500-heading document.
- Long-running work (heading enumeration, index refresh) MUST be cached and refreshed in the
  background; it MUST NOT block typing.
- The UI layer MUST stay small: plain TypeScript or a minimal view library. The palette bundle
  MUST stay under 150 KB minified and gzipped; any dependency that pushes past this, or any new
  runtime UI dependency, MUST be justified in the plan's Complexity Tracking.
- The palette MUST follow the Office theme (light and dark), be usable with a screen reader
  (labelled controls, announced selection), and never rely on colour alone.

**Rationale:** The interaction is meant to be a two-keystroke habit. A palette that lags, steals
the mouse or loses focus defeats the reason the product exists.

### V. Local-Only and Private

- The add-in MUST NOT make network calls beyond loading its own static assets. No telemetry,
  analytics or remote logging without an explicit constitutional amendment.
- Document content MUST NOT leave the machine or be persisted outside the document and Office's
  own add-in settings storage.
- Development-only tooling (test panes, local result collectors) MUST be excluded from release
  builds and MUST bind to localhost only.

**Rationale:** Users work on confidential specifications and reports. Trust depends on the add-in
being provably inert outside Word.

### VI. Simplicity and Verified Assumptions

- Build only what the current phase's requirements call for (YAGNI). Abstractions MUST earn
  their place with at least two concrete uses or a principle above that demands them.
- Host API behaviour marked unverified (for example REF insertion paths, heading numbers via
  `listString`, focus on shortcut) MUST be proven by a spike or contract test before features
  depend on it. Each such dependency MUST name its fallback path.
- Prefer the platform: use Office.js and Word features before writing custom machinery.

**Rationale:** The main risks in this product are host-platform behaviours, not algorithms.
Proving them early is cheaper than building on guesses.

## Platform and Technology Constraints

- **Language and host:** TypeScript (strict mode) on Office.js using the shared runtime, which
  custom keyboard shortcuts in Word require.
- **Target platforms:** Word for Windows desktop for the MVP. Mac and web are later phases and
  MUST arrive as adapters and fallbacks, not forks of the core.
- **Shortcut:** default Ctrl+Shift+Y (Word already uses Ctrl+Alt+K; Ctrl+Shift+Y is free and,
  having no Alt, cannot clash with AltGr on any layout). It MUST be user-configurable. Ctrl+@
  MUST NOT be used.
- **Fallbacks:** if the task pane cannot take focus, the palette falls back to a
  `displayDialogAsync` popup; if `insertField` with Ref is unavailable, insertion falls back to
  OOXML. Fallbacks live in the adapter, behind the same port. On Word for Windows the spikes
  (2026-10-11) showed the task pane takes focus and `insertField` works, so neither fallback is
  built for the MVP; they remain the documented route if a later platform needs them.
- **Testing:** Vitest for unit and contract suites; the Office.js contract run happens inside
  Word (Script Lab or a dev task pane).
- **Licensing and repository hygiene:** the project is free and open source. Internal planning
  documents are gitignored and MUST NOT be committed or copied into specs, plans, commits or
  issues beyond what is fit for a public repository.

## Development Workflow and Quality Gates

- Features follow the spec-kit flow: specify → (clarify) → plan → tasks → (analyze) →
  implement. Specs live under `specs/<feature>/`.
- Every `plan.md` MUST pass the Constitution Check before research and again after design.
  Any violation MUST be recorded in Complexity Tracking with the simpler alternative that was
  rejected and why.
- A change is mergeable only when:
  1. all unit and contract tests pass, and new behaviour was introduced test-first;
  2. type-checking and linting pass with no new suppressions left unexplained;
  3. no Office.js import exists outside the adapter layer (enforced by a lint or
     dependency rule once the scaffold exists);
  4. performance budgets in Principle IV are met for changes touching the palette or heading
     index;
  5. the manual acceptance checklist for the target platform passes before a release.
- Requirement changes go through spec refinement (update the spec, then propagate to plan and
  tasks) rather than regenerating artefacts from scratch.

## Governance

- This constitution supersedes other practices and guidance in the repository. Where
  `CLAUDE.md` or other guidance conflicts with it, the constitution wins and the guidance MUST
  be corrected.
- **Amendments** are made with `/speckit-constitution`, recorded in a commit that states the
  version change and rationale, and MUST include any migration needed for in-flight specs and
  plans.
- **Versioning** follows semantic versioning:
  - MAJOR: a principle removed or redefined in a backward-incompatible way;
  - MINOR: a principle or section added, or guidance materially expanded;
  - PATCH: clarifications and wording with no change in meaning.
- **Compliance review:** every plan's Constitution Check, every `/speckit-analyze` run and every
  post-implementation review MUST verify compliance with these principles. Unjustified
  complexity is grounds to reject a change.
- Runtime development guidance for agents lives in `CLAUDE.md`.

**Version**: 1.1.0 | **Ratified**: 2026-10-10 | **Last Amended**: 2026-10-11
