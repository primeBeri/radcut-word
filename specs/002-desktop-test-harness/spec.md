# Feature Specification: Desktop Test Harness for the In-Word Checks

**Feature Branch**: `002-desktop-test-harness`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "A Windows desktop test harness that runs RAD·CUT's in-Word checks without a human, as described in `docs/proposals/0001-automated-testing.md`: M0 feasibility, M1 contract run fast and automated, M2 document verification, M3 US1 regression, M4 performance timing from outside. Out of scope: hosted CI, Mac and web, screenshots as pass/fail, the 001 task rewording and constitution amendment."

## Context

Everything that does not need Word already runs under `npm test`. What still needs the project
owner is everything that does: starting and reading the in-Word contract run (20–25 minutes per
run, plus cases checked by hand), and the quickstart scenarios of feature 001 at the end of each
user story and before each release. Progress waits on the owner's free time. This feature makes
those checks a single unattended command that Claude Code (or the owner) can run on the Windows
desktop, and that reports results it can act on without asking.

"The developer" below means whoever runs the checks: the project owner or Claude Code on the
owner's Windows machine.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prove the harness can reach Word and the add-in (Priority: P1)

The developer runs one command. It starts the add-in's dev server, makes the add-in available
in Word, opens Word on a throwaway copy of a fixture document, connects to the document, reads
something from the add-in's task pane, presses the real shortcut and sees the palette's search
box take focus, then shuts everything down. The routes that worked are written down. If the task
pane cannot be reached by any route, the work stops and the developer is told why.

**Why this priority**: It is the go/no-go for everything else. Every later story depends on
reaching Word, the document and the pane from a script.

**Independent Test**: Run the feasibility checks on a machine with Word closed; they pass,
leave no Word process or scratch file behind, and the route notes exist.

**Acceptance Scenarios**:

1. **Given** Word is closed and the dev certificate is installed, **When** the developer runs the
   feasibility checks, **Then** Word opens a scratch copy of a fixture with the add-in available,
   the harness reads one known element of the task pane and one known paragraph of the document,
   and reports success.
2. **Given** the feasibility checks have opened the document, **When** the harness sends the
   default shortcut to Word, **Then** the palette's search box has keyboard focus within the
   palette-open budget.
3. **Given** Word is already running, **When** the developer runs any harness check, **Then** the
   harness refuses to start, says that Word must be closed, and leaves the running Word untouched.
4. **Given** a check has finished (pass or fail), **When** the harness shuts down, **Then** no Word
   process it started remains, the original fixture is unchanged and nothing was saved over it.

---

### User Story 2 - Run the in-Word contract suite fast and unattended (Priority: P1)

The developer runs one command and every registered in-Word contract suite runs on a fresh copy
of its fixture, with each contract case reported as its own pass, fail or skip. The cases that
are checked by hand today (caret in a comment, protected document, Undo after replacing a content
control or picture, the shortcut, the ribbon button and closing the pane, the plain-text content
control parts of cases 5d and 10f, and the text box heading part of case 5b) are set up and
checked by the harness. The full gateway suite runs in a fraction of today's 20–25 minutes, and
the time per case is visible so the next slowdown is easy to find.

**Why this priority**: The contract run is the check repeated most often (after every adapter
change), and it is both the slowest and the one with hand-checked gaps. Making it fast benefits
the manual pane run at once, before the rest of the harness exists.

**Independent Test**: Run the contract checks with Word closed; they report one result per
case with no case asking for a person, finish in under 5 minutes for the gateway suite, and
match what the manual pane run reports for the same build.

**Acceptance Scenarios**:

1. **Given** the dev contract pane, **When** a suite is run by hand, **Then** each case shows how
   long it took and the summary shows the total and the slowest cases.
2. **Given** a case that does not change the document, **When** the next case starts, **Then**
   the document is not restored again, and the next case still sees the fixture exactly as it was.
3. **Given** the developer runs the contract checks, **When** they finish, **Then** each contract
   case appears as its own result with its name, outcome, duration and any failure message.
4. **Given** a contract case that is checked by hand today, **When** the harness runs it, **Then**
   the harness sets up the state the case needs and the case passes or fails without a person.
5. **Given** a contract case fails, **When** the run ends, **Then** the evidence (the pane's log,
   a picture of the Word window, the scratch document) is kept where the developer can read it.

---

### User Story 3 - Verify what is in the saved document (Priority: P2)

After an insertion, the harness inspects the document through Word itself, independently of the
add-in: the fields, their switches and results after an update, the bookmarks and where they sit,
revisions, the formatting of each reference, and whether one Undo restores the document. It
compares RAD·CUT's output with what Word's own cross-reference dialog produces. Quickstart
scenarios 3, 4, 6, 14, 19, 20 and 26 of feature 001 run this way.

**Why this priority**: These checks prove the product's main promise (references that are
native Word, survive edits and work without the add-in) and are needed by US2 of feature 001
(scenario 7: preview equals result).

**Independent Test**: Run the document-verification checks; each named scenario passes on the
current build, and a deliberately broken output (for example a missing switch) makes the
matching check fail.

**Acceptance Scenarios**:

1. **Given** a reference inserted by RAD·CUT, **When** the document is updated and the heading is
   moved, **Then** the harness confirms the reference shows the new number and still points at the
   heading.
2. **Given** a heading that already has a usable bookmark, **When** a second reference to it is
   inserted, **Then** the harness confirms no new bookmark was created.
3. **Given** a saved document with RAD·CUT references, **When** Word opens it without the add-in,
   **Then** the harness confirms every reference updates correctly.
4. **Given** the same heading referenced by RAD·CUT and by Word's own dialog, **When** the harness
   compares them, **Then** field types, switches and bookmark extents match as feature 001 expects.
5. **Given** whether a script can follow a reference's hyperlink is unknown, **When** the harness
   tries it, **Then** it either checks the jump or records that the jump stays a human check.

---

### User Story 4 - Rerun the US1 acceptance scenarios without a person (Priority: P2)

The harness drives the palette as a user would (shortcut, typing, Enter, Esc, Undo) in the
document states each scenario needs, and checks the palette's state and the document afterwards.
Quickstart scenarios 1, 2, 5, 12, 13, 21, 22, 23, 25 and 27 of feature 001 run this way. The
run ends with a summary in the format of the acceptance checklist, ready to paste in.

**Why this priority**: Together with US3 it replaces the two-evening manual US1 run, and it is
the regression net for every later story. It is needed before a release, not before US2.

**Independent Test**: Run the US1 scenario checks; each passes on the current build and the
summary file lists every scenario with its outcome.

**Acceptance Scenarios**:

1. **Given** the cursor in body text, **When** the harness presses the shortcut, types a fuzzy
   query and presses Enter, **Then** the expected heading ranks first, the expected text is
   inserted and the caret sits after it.
2. **Given** the cursor in each place the spec allows or declines (heading, Title, comment,
   plain-text content control, header, footer, text box, caption, quote, table cell, footnote,
   protected document), **When** the shortcut is pressed, **Then** the palette shows the expected
   message or the reference is inserted as feature 001 requires.
3. **Given** any scenario run, **When** it ends, **Then** an acceptance summary lists each scenario
   with pass or fail and a short note.

---

### User Story 5 - Time the palette from outside (Priority: P3)

The harness measures, as a user would experience it, the time from the shortcut to the search
box being ready, and from a keystroke to the list updating, on the large fixtures, and checks
them against feature 001's budgets.

**Why this priority**: Useful before release and for the performance work in feature 001 (T096,
T098), but nothing else depends on it.

**Independent Test**: Run the timing checks; they report the measured times and pass or fail
against the budgets.

**Acceptance Scenarios**:

1. **Given** `spec-300.docx` open, **When** the harness opens the palette ten times, **Then** it
   reports the median and worst time to ready and fails if the median exceeds 500 ms.
2. **Given** the palette open on `guide-500.docx`, **When** the harness types a query, **Then** it
   reports the time per keystroke and fails if the median exceeds 50 ms.

---

### Edge Cases

- Word is already running: refuse and say so; never close, kill or attach to it.
- The screen is locked, a screensaver is on, or there is no interactive desktop: keyboard and
  focus checks are reported as skipped with that reason, not failed; checks that need no
  keyboard still run.
- Someone uses the keyboard or mouse during a run, or another window takes the foreground: the
  harness brings Word back to the front before each keystroke and fails the check (rather than
  typing elsewhere) if it cannot.
- The dev server port is already in use, or the certificate is missing or untrusted: fail fast
  with a message naming the problem.
- The repository path contains `·`: the add-in manifest and scratch documents are used from an
  ASCII-only folder.
- A check hangs: every wait has a time limit; when it expires the check fails, evidence is
  kept and Word is shut down.
- A failed run leaves a Word process or scratch files behind: the next run detects leftovers it
  created and cleans them up, but never a Word it did not start.
- The fixture text in the documents, the fake documents and the harness drift apart: all three
  read the same paragraph texts, and a missing paragraph fails with its text named.
- A check is flaky: it is treated as a defect and fixed, never skipped or quarantined.

## Requirements *(mandatory)*

### Functional Requirements

**Running and safety**

- **FR-001**: The developer MUST be able to run all harness checks, or one group of them
  (feasibility, contract, document, scenarios, timing), or a single check, with one command each.
- **FR-002**: Each run MUST end with an exit status (zero only if nothing failed), a
  machine-readable test report, and a short human-readable summary.
- **FR-003**: The harness MUST refuse to start if Word is already running, and MUST never close,
  kill, reuse or attach to a Word it did not start.
- **FR-004**: Each check MUST work on its own fresh copy of a fixture document in an ASCII-only
  scratch folder, and MUST never save over a fixture.
- **FR-005**: The harness MUST shut down every Word process and server it started, on success,
  failure or time-out.
- **FR-006**: Every wait MUST be for a condition with a time limit; fixed delays are not allowed.
- **FR-007**: On failure, the harness MUST keep the evidence needed to diagnose it without a
  person: the task pane's log, a picture of the Word window, the scratch document and a trace of
  the pane session.
- **FR-008**: Any debugging access the harness opens to the task pane MUST be reachable from the
  local machine only and MUST apply to the Word process the harness started, never machine-wide
  or to other applications.
- **FR-009**: Harness code and any dev-only hooks it relies on MUST stay out of the release build;
  the release build MUST fail if they are present.
- **FR-010**: Checks that need the keyboard or screen MUST report "skipped: no interactive
  desktop" when none is available, and MUST bring Word to the foreground and confirm it before
  every keystroke.

**Feasibility (US1)**

- **FR-011**: The feasibility checks MUST demonstrate, on a scratch fixture copy: starting the dev
  server and making the add-in available (both the normal and the dev-pane builds); opening Word
  on the copy; reading the document from the harness; reading an element of the task pane; the
  real default shortcut focusing the palette's search box; and a clean shutdown.
- **FR-012**: The routes that worked (and those that did not, with why) MUST be recorded in the
  harness's README. If no route reaches the task pane, the feasibility checks MUST say so and the
  remaining stories wait on a revised plan.

**Contract run (US2)**

- **FR-013**: The in-Word contract runner MUST record each case's duration and show the total and
  the slowest cases, in the pane and in its results.
- **FR-014**: The contract cases MUST run on a fixture that contains what the cases need and
  nothing else; the large fixtures remain for performance only. The fake documents MUST match the
  new fixture paragraph for paragraph.
- **FR-015**: The contract harness MUST restore the document only after a case that changed it
  (or may have), and MUST otherwise leave it as it is; every case MUST still start from the
  fixture's state.
- **FR-016**: No contract case MAY be weakened, removed or skipped to make the run faster; a
  speed change that alters any case's outcome is a defect.
- **FR-017**: The full gateway contract suite MUST complete in under 5 minutes on the owner's
  machine; the before and after timings MUST be recorded.
- **FR-018**: The dev contract pane MUST be able to start a named suite without a click and MUST
  publish its results (name, outcome, duration, message per case) in a form the harness can read;
  the manual pane behaviour stays as it is.
- **FR-019**: The harness MUST report each contract case as its own result, for every registered
  in-Word suite, each on a fresh copy of its fixture.
- **FR-020**: The cases checked by hand today MUST be set up and checked by the harness: caret in
  a comment; protected document; content control and picture replacement followed by one Undo;
  shortcut, ribbon button and closing the pane; the plain-text content control parts of cases 5d
  and 10f; the text box heading part of case 5b.

**Document verification (US3)**

- **FR-021**: The harness MUST inspect documents through Word independently of the add-in: fields
  with their codes and results (after update), bookmarks with names and extents, revisions,
  character formatting of references, and a comparable snapshot of the whole document for
  "unchanged" and Undo checks.
- **FR-022**: Quickstart scenarios 3, 4, 6, 14, 19, 20 and 26 of feature 001 MUST be automated
  with these checks.
- **FR-023**: The harness MUST establish whether a script can follow a reference's hyperlink to
  its heading; if not, that jump MUST be listed as a human check.

**US1 scenarios (US4)**

- **FR-024**: Quickstart scenarios 1, 2, 5, 12, 13, 21, 22, 23, 25 and 27 of feature 001 MUST be
  automated, driving the palette with real keystrokes and checking both the palette and the
  document.
- **FR-025**: A scenario run MUST write an acceptance summary in the table format of
  `docs/acceptance-checklist.md`.

**Timing (US5)**

- **FR-026**: The harness MUST measure shortcut-to-ready and keystroke-to-list-updated times from
  outside the add-in and check them against feature 001's budgets (ready under 500 ms on
  `spec-300.docx`, filter under 50 ms on `guide-500.docx`); when feature 001's own performance
  runner exists (T096), the harness MUST also read and report its results.

### Key Entities

- **Fixture document**: a committed Word document built by the fixture script, identified by
  name; its paragraph texts are shared with the fake documents and the harness.
- **Scratch copy**: a per-check copy of a fixture in an ASCII-only folder, deleted or kept as
  evidence after the check.
- **Contract case result**: suite, case name, outcome (pass, fail, skip), duration and message.
- **Document snapshot**: text, fields (code, result), bookmarks (name, extent) and revisions of a
  document at a moment, comparable for equality.
- **Evidence bundle**: what a failed check leaves behind for diagnosis.
- **Acceptance summary**: one row per quickstart scenario with outcome and note.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: One command with Word closed runs every automatable in-Word check and returns a
  result with no person involved after it starts.
- **SC-002**: The in-Word gateway contract suite completes in under 5 minutes (from 20–25 today),
  with no case weakened or removed.
- **SC-003**: Zero contract cases need a person; the hand-check lists of T051, T138 and T142 are
  empty.
- **SC-004**: The 17 quickstart scenarios of feature 001 named in US3 and US4 are automated, and
  the harness can express the remaining automatable ones (24 of 27 in all) as feature 001's later
  stories reword their in-Word tasks; the human per-release list then takes about 10 minutes.
- **SC-005**: Every failed check leaves enough evidence for its cause to be diagnosed without
  rerunning it with a person watching.
- **SC-006**: Over ten consecutive runs on an unchanged build, no check changes outcome.
- **SC-007**: After any run, no Word process started by the harness is left, and no fixture
  document has changed.

## Assumptions

- The proposal `docs/proposals/0001-automated-testing.md` is the design source; its tool choices
  (a .NET test project driving Word through its automation interface, the task pane through the
  browser debugging protocol, and the keyboard through UI Automation) are taken as given, and the
  feasibility story verifies them.
- It runs on the owner's Windows 11 machine with Word for Microsoft 365 desktop (current channel,
  signed in), Node.js 22, the .NET SDK and the dev certificate installed.
- While a run uses the keyboard and screen, nobody uses the machine; running in a separate
  Windows session is a later option.
- Hosted CI is out of scope (no licensed Word there); a self-hosted runner on this machine is a
  later option.
- Mac and web, and pictures as pass/fail checks, are out of scope.
- Rewording feature 001's "run quickstart scenarios in Word" tasks, the acceptance checklist
  split and the constitution amendment (1.1.0 → 1.2.0) happen when this feature merges into
  `001-heading-xref-palette` after US3, not in this feature.
- Co-authoring, a physical UK keyboard, a visual check of the themes and a screen-reader pass stay
  human checks.
- The existing contract runner, contract registry, fixture script and ASCII-path sideload rule are
  reused, not rebuilt.
