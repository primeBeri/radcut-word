# Feature Specification: Heading Cross-Reference Palette (MVP)

**Feature Branch**: `001-heading-xref-palette`

**Created**: 2026-10-10

**Status**: Refined

**Refined**: 2026-10-10 — Resolved document-integrity checklist items CHK002, CHK004, CHK005, CHK014, CHK024, CHK026, CHK027: bookmark reuse limited to usable, non-Word-managed bookmarks; bookmark extent defined; references take surrounding formatting; insertion point is the cursor at Enter, re-checked; tracked-change handling of headings and rejected references defined.

**Refined**: 2026-10-10 — Analysis fixes: minimum Word build stated in Assumptions (2408+, 2508+ for the full feature set, matching the plan); "Look and feel" requirements moved after "Privacy and feedback" so FR numbers read in order. No requirement changed meaning; plan already matches.

**Refined**: 2026-10-10 — Resolved document-integrity checklist items CHK001, CHK003, CHK005, CHK013, CHK014, CHK025: the add-in never polices bookmarks or fields made elsewhere; output mimics Word's own cross-reference dialog; new setting to allow references inside headings (off by default, never self-referencing); selections spanning paragraphs or containing tables or pictures need confirmation; every insertion is one atomic undo step, and failing that is a blocker; headings outside the main text are listed with a location badge and can be hidden by a setting.

**Refined**: 2026-10-11 — Default shortcut changed from Ctrl+Alt+K to Ctrl+Shift+Y (FR-001), from the spike 1 outcome (research R4): Word already uses Ctrl+Alt+K and prompts on conflict; a three-key combination was wanted, and Ctrl+Shift+Y is free in Word and has no AltGr clash on any layout. Still user-configurable; no other requirement changed.

**Refined**: 2026-10-11 — From the US1 acceptance run (T055): a selection containing a table is now declined rather than replaced after confirmation (FR-008a); a cursor inside an existing field asks for confirmation and then replaces the field (new FR-008b); a write that fails part-way must not claim the document is unchanged (FR-014).

**Refined**: 2026-10-12 — From the in-Word contract run: at the very start of a paragraph a reference takes the paragraph's own formatting, as Word's own dialog does (FR-012a clarified; no behaviour change).

**Input**: User description: "Review the PRD `planning` for the PRD and first phase requirements. The roadmap and context draft are from a earlier abandoned spec driven development attempt. They can be refered to but do not take as gosple."

## Scope Summary

The first deliverable phase of RAD·CUT: in Word for Windows desktop, an author presses a
shortcut, picks a heading from a keyboard-driven palette with fuzzy search, and a live Word
cross-reference to that heading is inserted at the cursor. The output is made only of Word's own
bookmarks and cross-reference fields, so documents keep working for people who do not have the
add-in.

Feasibility checks on the riskiest platform behaviours (palette focus when opened by shortcut,
cross-references surviving field update, bookmark insertion under tracked changes) are treated
as prerequisites of this feature and are verified during planning, not specified as separate
user-facing features.

## Clarifications

### Session 2026-10-10

- Q: How should the palette look: like part of Office, with its own RadBeri style, or deliberately bare? → A: Match Office's native look and feel (Fluent), following the Office theme.
- Q: Should the results list highlight which letters of each heading matched what the user typed? → A: Yes, highlight matched characters in heading text and number.
- Q: Where should users change their settings: the default format, their templates and the shortcut? → A: A separate settings view in the add-in pane, opened from the ribbon, plus a cog icon in a corner of the palette that opens it directly.
- Q: Should the palette use animation, or should every change appear instantly? → A: Subtle motion (≤150 ms, never blocks input), turned off when the system asks for reduced motion.
- Q: If the cursor is somewhere other than the main text, should the palette insert the reference there, or decline with a message? → A: Insert in the main text, footnotes and endnotes, in any paragraph style (quotes, captions, list items, table cells) except headings, Title and Subtitle; decline everywhere else with a message.
- Q: Should the add-in refuse to reuse or police bookmarks and fields that users made by hand or with Word's dialogs? → A: No. It only governs what it creates itself; existing bookmarks and fields are never altered or flagged. Advice on bad practice (circular references, references inside headings) belongs to the later backlinks and broken-reference phase.
- Q: Should references ever be insertable inside headings? → A: Not by default. A setting, off by default, allows it, with an explanation of why it is discouraged. A heading can never refer to itself.
- Q: What should the bookmark and reference look like? → A: Mimic what Word's own cross-reference dialog produces wherever possible. The add-in keeps its own `_RC…` bookmark names.
- Q: What happens when the selection is large when Enter is pressed? → A: Any selection within one paragraph is replaced without warning. A selection spanning several paragraphs, or containing a table or picture, needs confirmation (Enter again, or Esc).
- Q: How many undo steps may an insertion take? → A: Exactly one. A stream of undo entries is not acceptable; if Word's API cannot achieve one step, that blocks the release and is raised with the product owner.
- Q: Should headings in table cells, text boxes, footnotes, endnotes, headers and footers be listed? → A: Yes, marked with a location badge; a setting (on by default) hides them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Insert a cross-reference to a heading without the mouse (Priority: P1)

An author drafting a long specification wants to write "see § 4.3 Fire strategy". With the cursor
where the reference should go, they press the shortcut. A palette opens listing every heading in
the document, in order, indented by level and showing its number. Typing is captured by the
palette's search box immediately. They type "fstrat"; the list narrows and ranks "4.3 Fire
strategy" first. They press Enter. "§ 4.3 Fire strategy" appears at the cursor as a live
cross-reference, the palette closes, and they carry on typing in the document.

**Why this priority**: This is the product. Every other story refines it. On its own it already
replaces Word's slow, mouse-heavy cross-reference dialog for the most common case.

**Independent Test**: In a document with numbered headings, use only the keyboard to insert a
reference to a chosen heading; then update all fields, reorder headings, update again, and
confirm the reference shows the new number and jumps to the heading when followed.

**Acceptance Scenarios**:

1. **Given** a document with Heading 1–9 paragraphs and the cursor in a non-heading paragraph of
   the main text, a footnote or an endnote, **When** the
   user presses the shortcut, **Then** the palette opens listing all headings in document order,
   each with its level indentation and number (where the heading is numbered), headings outside
   the main text flow marked with a location badge, and keystrokes go straight into the search
   box.
2. **Given** the palette is open, **When** the user types a query, **Then** the list filters on
   each keystroke by fuzzy match against heading text and number, best matches first, with the
   matched characters highlighted in each result.
3. **Given** a filtered list, **When** the user presses ↑ or ↓, **Then** the selection moves
   accordingly and stays visible in the list.
4. **Given** a heading is selected, **When** the user presses Enter, **Then** a cross-reference in
   the default format ("§ number text", e.g. "§ 4.3 Fire strategy") is inserted at the document's
   current cursor position, in the formatting of the surrounding text, the palette closes, and
   the cursor is back in the document directly after the inserted reference.
5. **Given** the palette is open, **When** the user presses Esc, **Then** the palette closes, the
   document is unchanged, and the cursor is back where it was.
6. **Given** a reference has been inserted, **When** the user updates fields, reorders or renames
   headings and updates fields again, **Then** the reference shows the heading's current number
   and text.
7. **Given** a reference has been inserted, **When** the user Ctrl+clicks it, **Then** Word jumps
   to the target heading.
8. **Given** the target heading already carries a usable bookmark (see FR-011), **When** the user
   inserts a reference to it, **Then** the existing bookmark is reused and no new bookmark is
   added.
9. **Given** a document containing inserted references, **When** it is opened and its fields
   updated on a machine without the add-in, **Then** every reference displays and updates
   correctly.
10. **Given** a reference has just been inserted, **When** the user presses Undo once, **Then**
    the reference, any bookmark added for it and any replaced selection are reverted in that
    single step.
11. **Given** the selection spans more than one paragraph or contains a table or picture,
    **When** the user presses Enter, **Then** the palette shows an inline warning and changes
    nothing; a second Enter replaces the selection with the reference, Esc cancels.

---

### User Story 2 - Choose the reference format while inserting (Priority: P2)

Different sentences need different wording: "see 4.3", "the Fire strategy section", "on page 12",
"described above". While the palette is open the author presses Tab to cycle through the
available formats; a live preview shows exactly what will be inserted for the selected heading.
Enter inserts in the format shown. They can also choose which format the palette starts on, so
their usual style needs no Tab presses.

**Why this priority**: Format choice is what makes the palette faster than typing the reference
by hand in everyday writing, but the P1 default format already delivers value without it.

**Independent Test**: Open the palette, select a heading, press Tab repeatedly and confirm each
built-in format is previewed in turn and inserts exactly as previewed; change the default format,
reopen the palette and confirm it starts on the new default.

**Acceptance Scenarios**:

1. **Given** a heading is selected in the palette, **When** the user presses Tab, **Then** the
   format advances to the next one and the preview updates to show the exact text that will be
   inserted; Shift+Tab moves to the previous format; cycling wraps at either end.
2. **Given** the built-in formats, **Then** the cycle contains: text; number; number + text;
   § number text; page; above/below; text + above/below.
3. **Given** a format is shown, **When** the user presses Enter, **Then** the inserted reference
   matches the preview and every part of it (number, text, page, above/below) updates when fields
   are updated.
4. **Given** the user has set a default format, **When** they open the palette in any document,
   including after restarting Word, **Then** the palette starts on that default.
5. **Given** the user cycles to a non-default format and inserts, **When** they next open the
   palette, **Then** it starts on the default format again, not the last one used.

---

### User Story 3 - Define my own reference wording (Priority: P3)

An author's house style says "see §4.3 Fire strategy, above". They define a template such as
"see §{number} {text}, {abovebelow}" once; it then appears in the Tab cycle alongside the
built-in formats and can be chosen as the default.

**Why this priority**: Valuable for teams with a house style, but the built-in formats cover most
writing.

**Independent Test**: Create a template, confirm it appears in the Tab cycle with a correct
preview, insert it, update fields and confirm every placeholder part updates.

**Acceptance Scenarios**:

1. **Given** the user creates a template using the placeholders {number}, {text}, {page} and
   {abovebelow} plus literal text, **When** they open the palette and press Tab, **Then** the
   template appears in the cycle after the built-in formats with a live preview.
2. **Given** a template is inserted, **When** fields are updated, **Then** each placeholder part
   updates and the literal text is unchanged.
3. **Given** the user enters a template with an unknown placeholder or no placeholder at all,
   **When** they try to save it, **Then** it is rejected with a message naming the problem.
4. **Given** the user edits or deletes a template, **Then** references already inserted with it
   are unaffected.

---

### User Story 4 - Open the palette my way (Priority: P3)

Some users prefer a button; others type on keyboard layouts where Ctrl+Alt combinations produce
characters (AltGr). The author can open the palette from a ribbon button, and can change the
shortcut to one that works on their layout.

**Why this priority**: Removes adoption blockers for specific users rather than adding new
capability.

**Independent Test**: Open the palette from the ribbon button and insert a reference; change the
shortcut, confirm the new one opens the palette and the old one no longer does, including with a
UK keyboard layout active.

**Acceptance Scenarios**:

1. **Given** the add-in is loaded, **When** the user clicks the ribbon button, **Then** the same
   palette opens with focus in its search box and behaves exactly as when opened by shortcut.
2. **Given** the user changes the shortcut, **When** they press the new combination, **Then** the
   palette opens; the previous combination no longer opens it.
3. **Given** the user tries to assign Ctrl+@ or a combination Word or the system reserves,
   **Then** the assignment is refused with an explanation.
4. **Given** a UK keyboard layout is active, **When** the user presses the default shortcut,
   **Then** the palette opens and no character is typed into the document.

---

### User Story 5 - Recently used headings first (Priority: P4)

Authors often reference the same few sections repeatedly. When the palette opens with an empty
query, the headings they referenced most recently in this document appear first.

**Why this priority**: A convenience that saves keystrokes once the core habit is established.

**Independent Test**: Insert references to two headings, reopen the palette and confirm they are
listed first, most recent at the top; type a query and confirm normal ranking applies.

**Acceptance Scenarios**:

1. **Given** the user has inserted references to headings in this document, **When** they open
   the palette with an empty query, **Then** up to 5 recently referenced headings appear first,
   most recent first, visually separated from the full list in document order.
2. **Given** the user types a query, **Then** ranking is by match quality only and recents get no
   boost.
3. **Given** a recently used heading has since been deleted, **Then** it no longer appears.

---

### Edge Cases

- **No headings**: the palette opens with a message explaining that headings must use Word's
  heading styles or outline levels; Esc closes it.
- **No matches**: the list shows an empty-state message; Enter does nothing; Esc closes.
- **Unnumbered heading with a number format**: the preview shows what Word will display (empty or
  an error) and a warning; the user can still insert or Tab to another format.
- **Duplicate heading text**: both headings are listed and distinguishable by number, level and
  position; each reference targets the heading actually selected.
- **Heading with several usable bookmarks**: the first by case-insensitive name order is reused,
  the same one every time for that heading; none are added.
- **Heading whose only bookmarks are unusable** (Word-managed, or spanning the paragraph mark or
  only part of the text): those bookmarks are left untouched and one new hidden bookmark is
  created.
- **Text selected when Enter is pressed**: the reference replaces the selection, as typing
  would. A selection within one paragraph, of any length, is replaced without warning. A
  selection spanning more than one paragraph, or containing a picture or other object, is
  likely a mis-click: the palette shows an inline warning (never a browser dialog) and needs a
  second Enter to go ahead; Esc cancels. Either way, one Undo restores the selection. A
  selection containing a table is declined with a message (FR-008a).
- **Cursor inside an existing field** (for example inside another cross-reference): inserting
  there would put the new reference inside the old field's result, where the next field update
  erases it. The palette warns that the field will be replaced; a second Enter replaces the whole
  field, Esc cancels (FR-008b).
- **Headings outside the main text flow** (in table cells, text boxes, footnotes, endnotes,
  headers or footers): listed in document order with a badge naming the location, and hidden
  when the user turns off "Show headings outside the main text". A heading in a header or footer
  repeats on every page, so its "page" and "above/below" parts show whatever Word computes.
- **Bookmarks and fields made outside the add-in** (by hand or with Word's dialogs): never
  altered, removed or flagged. Usable ones are reused (FR-011); everything else is left alone.
- **Cursor moved while the palette is open** (for example the user clicks into the document):
  the reference goes to where the cursor is when Enter is pressed. If that place is not allowed
  (FR-001a) or the document has become protected, the palette shows a message, stays open and
  changes nothing.
- **Headings that are tracked changes**: a heading shown as a tracked deletion is not listed; a
  heading shown as a tracked insertion is listed like any other.
- **Rejecting a tracked reference**: the reference text and fields are removed; a hidden bookmark
  created for it may remain on the heading. This is harmless, is reused by later references,
  and is documented.
- **Cursor in a heading, Title or Subtitle paragraph**: by default the palette explains that
  references cannot be inserted in headings or titles, points to the setting that allows it, and
  makes no change. With "Allow references in headings" turned on, insertion works as in a normal
  paragraph, except that the heading containing the cursor is not offered as a target (a heading
  never refers to itself).
- **Cursor in a quote, caption, list item or table cell** in the main text, a footnote or an
  endnote: insertion works as in a normal paragraph.
- **Cursor in a header, footer, comment or text box**: the palette explains that insertion is
  not supported there and makes no change; it never inserts somewhere else.
- **Read-only or protected document**: the palette explains that the document cannot be edited
  and makes no change.
- **Tracked changes on**: insertion succeeds; the reference appears as a tracked insertion and
  the document remains valid when changes are accepted or rejected.
- **Co-authored document**: insertion succeeds or fails cleanly with a message; observed
  behaviour is recorded in user documentation.
- **Target heading deleted or changed between opening the palette and pressing Enter**: the
  insertion is refused with a message and the list refreshes; nothing is inserted elsewhere.
- **Very long heading text**: truncated in the list with the full text available in the preview;
  the full heading is referenced.
- **Large documents (500+ headings)**: the palette stays responsive while typing; the list may
  refresh in the background after opening.
- **Bookmark name collision**: a generated name never clashes with an existing bookmark,
  including hidden ones.

## Requirements *(mandatory)*

### Functional Requirements

**Opening and listing**

- **FR-001**: Users MUST be able to open the palette with a keyboard shortcut (default
  Ctrl+Shift+Y) from anywhere in the document.
- **FR-001a**: Insertion MUST be supported in the main text, footnotes and endnotes, in any
  paragraph style (including quotes, captions, list items and table cells) except paragraphs that
  are headings (heading style or outline level), Title or Subtitle. In those excluded paragraphs,
  and in headers, footers, comments and text boxes, the palette MUST decline with a message and
  make no change.
- **FR-001b**: A per-user setting "Allow references in headings", off by default, MUST lift the
  exclusion of heading, Title and Subtitle paragraphs in FR-001a. The setting MUST carry a short
  explanation of why it is discouraged (headings feed the table of contents, the navigation pane
  and text references to that heading, so references inside them can nest or loop). Whatever the
  setting, the heading containing the cursor MUST NOT be offered as a target.
- **FR-002**: When the palette opens, keyboard input MUST go to its search box without any click.
- **FR-003**: The palette MUST list every heading in the document (paragraphs using built-in
  Heading 1–9 styles or an outline level), in document order, showing level indentation and the
  heading number where one exists. Headings shown as tracked deletions MUST NOT be listed.
  Headings in table cells, text boxes, footnotes, endnotes, headers and footers MUST be listed.
- **FR-003a**: Headings outside the main text flow (table cells, text boxes, footnotes, endnotes,
  headers, footers) MUST carry a visible location badge, not relying on colour alone. A per-user
  setting "Show headings outside the main text", on by default, MUST hide them from the list when
  turned off.
- **FR-004**: Paragraphs formatted to look like headings without a heading style or outline level
  MUST NOT be listed.

**Filtering and navigation**

- **FR-005**: The list MUST filter on every keystroke using fuzzy matching on heading text and
  number, ranked by match quality.
- **FR-005a**: Each listed result MUST visibly highlight the characters of its text and number
  that matched the query; highlighting MUST not rely on colour alone and MUST update on every
  keystroke.
- **FR-006**: ↑ and ↓ MUST move the selection; Enter MUST insert the selected heading's reference;
  Esc MUST close the palette with no change to the document.
- **FR-007**: The first result MUST be selected automatically whenever the list changes.

**Inserting**

- **FR-008**: Insertion MUST place the reference at the document's cursor position (or replace
  the selection) as it is at the moment the user presses Enter, then close the palette and return
  the cursor to the document immediately after the reference. The location rules (FR-001a) and
  document protection MUST be re-checked at that moment; if they now forbid insertion, the
  palette MUST show a message, stay open and leave the document unchanged.
- **FR-008a**: A selection within a single paragraph MUST be replaced without warning. If the
  selection spans more than one paragraph or contains a picture or other non-text object,
  the first Enter MUST show an inline warning in the palette (not a browser or system dialog) and
  change nothing; a second Enter MUST go ahead and Esc MUST cancel. ~~A selection containing a
  table is replaced after the same confirmation.~~ (changed 2026-10-11 after the US1 acceptance
  run: replacing a table is not an intended use and Word handled it badly.) A selection
  containing a table MUST be declined with a message and no change.
- **FR-008b**: If the cursor or selection is inside an existing field (for example a
  cross-reference), the first Enter MUST show an inline warning that the field will be replaced
  and change nothing; a second Enter MUST replace the whole field with the new reference, and Esc
  MUST cancel. The replacement is one Undo step like any other insertion (FR-013).
- **FR-009**: References MUST consist only of Word's native bookmarks and hyperlinked
  cross-reference fields plus fixed literal text, so that documents display, update and navigate
  correctly without the add-in.
- **FR-010**: Every variable part of a reference (number, text, page, above/below) MUST update
  when Word fields are updated.
- **FR-011**: If the target heading already has a **usable** bookmark, it MUST be reused, and the
  add-in MUST NOT create a second bookmark on a heading that has one. A bookmark is usable only if
  it spans exactly the heading's text without the paragraph mark and is not one Word manages and
  may delete or recreate itself (such as table-of-contents `_Toc…` bookmarks and `_GoBack`).
  When several are usable, the first by case-insensitive name order MUST be chosen. When none is
  usable, the add-in MUST create one and MUST leave the unusable bookmarks untouched.
- **FR-012**: Bookmarks the add-in creates MUST span the heading's text without the paragraph
  mark, be hidden from Word's normal bookmark list, be unique in the document, stay unchanged by
  later edits to heading text, numbering, style or position, and fit within Word's bookmark-name
  length limit. This extent matches the bookmarks Word's own cross-reference dialog creates; where
  a choice is open, the add-in's output MUST mimic that dialog's output.
- **FR-011a**: The add-in MUST NOT alter, remove or flag bookmarks or fields it did not create,
  including those made by hand or with Word's dialogs.
- **FR-012a**: An inserted reference MUST take the character formatting of the surrounding text
  at the insertion point, not the heading's formatting, and MUST keep it after fields are
  updated. The add-in MUST NOT apply any character formatting of its own in this phase. At the
  very start of a paragraph there is no preceding text to take formatting from; the reference
  then has the paragraph's own formatting, exactly as Word's cross-reference dialog gives
  (checked 2026-10-12; Word's dialog does not take surrounding formatting anywhere).
- **FR-013**: ~~Each insertion MUST be undoable as a single step wherever Word allows; any case
  where it cannot be MUST be documented.~~ (replaced 2026-10-10: documenting exceptions is not
  enough.) Each insertion, covering any replaced selection, any new bookmark, literal text and
  fields, MUST be one atomic Undo step; the add-in MUST NOT leave a series of Undo entries. If the
  feasibility checks show Word's API cannot achieve this, it is a release blocker to be raised
  with the product owner, not a documented exception.
- **FR-014**: If insertion fails, the document MUST be left unchanged (no orphan bookmark, no
  partial reference) and the user MUST see a short message saying what happened. Every check MUST
  run before the first write. If Word nevertheless fails part-way through writing, the message
  MUST NOT claim the document is unchanged; it MUST say part of the reference may have been
  written and that one Undo removes it.

**Formats**

- **FR-015**: Tab and Shift+Tab MUST cycle forwards and backwards through the formats while the
  palette is open, with a live preview of the exact text to be inserted for the selected heading.
- **FR-016**: The built-in formats MUST be: text; number; number + text; § number text; page;
  above/below; text + above/below.
- **FR-017**: Users MUST be able to choose a default format; the palette MUST open on it in every
  document and session. The out-of-the-box default MUST be "§ number text".
- **FR-018**: Users SHOULD be able to create, edit and delete format templates combining literal
  text with the placeholders {number}, {text}, {page} and {abovebelow}; templates MUST appear in
  the Tab cycle and be selectable as the default; invalid templates MUST be rejected with a
  reason.

**Access and settings**

- **FR-019**: Users SHOULD be able to open the same palette from a ribbon button.
- **FR-020**: Users MUST be able to change the shortcut; Ctrl+@ and combinations reserved by Word
  or the system MUST be refused with an explanation.
- **FR-021**: Settings (default format, templates, shortcut, "Allow references in headings",
  "Show headings outside the main text") MUST persist per user across
  documents and Word restarts, and MUST NOT be stored in the documents themselves.
- **FR-021a**: Settings MUST be edited in a dedicated settings view in the add-in pane, separate
  from the palette. The settings view MUST be reachable from the ribbon and from a cog icon in a
  corner of the palette; the cog MUST also be reachable from the keyboard and MUST open the
  settings view directly, with focus on its first control, without the user hunting through
  other panes.
- **FR-021b**: Leaving the settings view MUST return the user to the document (or to the palette
  if it was opened from there) with focus restored.

**Recents**

- **FR-022**: With an empty query, the palette COULD list up to 5 headings most recently
  referenced in the current document first, most recent first; recents MUST NOT affect ranking
  once a query is typed.

**Privacy and feedback**

- **FR-023**: The add-in MUST NOT send document content or usage data anywhere; it MUST work with
  no network connection once loaded.
- **FR-024**: Every situation where the palette cannot act (no headings, protected document,
  unsupported cursor location, stale target) MUST show a plain-language message rather than fail
  silently.

**Look and feel**

- **FR-025**: The palette and settings MUST match Office's native look and feel (Office's
  typography, spacing, controls and focus indicators) and MUST follow the active Office theme,
  including light and dark, with no separate product branding in this phase.
- **FR-026**: Motion (for example the palette appearing or the selection moving) MUST be subtle,
  last no more than 150 ms, and never delay input, filtering or insertion; keystrokes typed
  during an animation MUST be applied. When Windows is set to reduce animation, all motion MUST
  be turned off.

### Key Entities

- **Heading**: a paragraph in the document with a heading style or outline level. Attributes:
  level (1–9), text, displayed number (may be absent), position in document order, location
  (main text, table cell, text box, footnote, endnote, header, footer), and its bookmark
  identity once one exists. Identified by its bookmark, never by position or text.
- **Heading Bookmark**: Word's named marker on a heading that references point to. Either
  pre-existing (reused) or created by the add-in (hidden, unique, stable).
- **Cross-Reference**: inserted content made of fixed literal text and one or more live fields
  pointing at a single Heading Bookmark.
- **Reference Format**: a named recipe for a Cross-Reference — built-in or user-defined
  template — combining literal text with number, text, page and above/below parts.
- **User Settings**: per-user preferences — default format, templates, shortcut, allow
  references in headings, show headings outside the main text — edited in the settings view.
- **Recent Headings**: per-document list of the headings most recently referenced, in recency
  order.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A practised user goes from pressing the shortcut to a correctly inserted reference
  in under 3 seconds.
- **SC-002**: The palette is ready for typing within 0.5 seconds of the shortcut on a document
  with 300 headings.
- **SC-003**: Filtered results appear with no perceptible delay while typing (within 50 ms of a
  keystroke) at 300 headings, and typing never stalls on a 500-heading document.
- **SC-004**: 100 % of inserted references show the correct, current value after updating fields,
  across all built-in formats.
- **SC-005**: 100 % of inserted references still resolve to the right heading, with its new
  number, after headings are reordered, renamed and fields updated.
- **SC-006**: 0 duplicate bookmarks are created across a test run that references every heading
  in each test document at least twice.
- **SC-007**: 100 % of references created with the add-in display and update correctly when the
  document is opened on a machine without the add-in.
- **SC-008**: Every user flow in this specification can be completed without touching the mouse
  (except the ribbon-button story, which is mouse-first by design).
- **SC-009**: ~~A single Undo removes an inserted reference in every case where Word allows it,
  and every exception is documented.~~ (replaced 2026-10-10, see FR-013.) In 100 % of tested
  insertions on the supported build, including selection replacement, new bookmarks and tracked
  changes, a single Undo restores the document exactly as it was.

## Assumptions

- "First phase" means the first user-facing release (the MVP). Feasibility checks for palette
  focus, cross-reference fields and tracked changes are prerequisites done during planning, and
  their outcomes may choose between equivalent fallbacks (for example a pop-up window instead of
  a side pane) without changing this specification.
- Target platform is Word for Windows desktop (Microsoft 365), build 2408 or later; build 2508 or
  later gives the full feature set (for example detecting protected documents before writing).
  Word on the web and Mac are later phases.
- Users structure documents with Word's heading styles or outline levels. Bold-text pseudo
  headings are out of scope.
- Heading numbers are whatever Word's own numbering displays; the add-in does not number or
  renumber headings.
- "Above/below" and page parts use Word's own wording and page calculation.
- Recents are per document and per user, kept outside the document.
- Co-authoring on shared cloud documents is checked by hand and its behaviour documented, not
  guaranteed.
- Out of scope for this feature: links between documents; backlinks or graph views; references to
  figures, tables, captions or arbitrary bookmarks; a command that validates or repairs broken
  references; changing heading text or numbering; applying character styles to all or part of a
  reference (a later phase); store publication (distribution is by sideloading); advisory
  reporting of bad practice such as circular references or references inside headings (planned
  for the backlinks and broken-reference phase).
- Where the specification leaves a detail of the output open, the add-in follows what Word's own
  cross-reference dialog would produce.
