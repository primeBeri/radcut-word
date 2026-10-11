# Data Model: Heading Cross-Reference Palette (MVP)

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-10-10

All types below live in the pure core (`src/core/`). None of them references Office.js. Field
types are TypeScript-style for precision; they describe shape, not implementation.

## Heading

A paragraph with a built-in Heading 1–9 style or outline level 1–9 (FR-003, FR-004). Headings
shown as tracked deletions are excluded from snapshots (FR-003). Headings in every story are
included: main text (with table cells), text boxes, footnotes, endnotes, headers and footers
(FR-003, FR-003a).

| Field | Type | Rules |
|---|---|---|
| `key` | `HeadingKey` | See below. Stable identity used by UI, recents and use cases. |
| `level` | `1..9` | From style (Heading N) or outline level. |
| `text` | `string` | Paragraph text, trimmed; may be empty (listed as "(untitled heading)"). |
| `number` | `string \| null` | Displayed number, e.g. "4.3"; `null` if unnumbered. Display and matching only. |
| `order` | `number` | 0-based position among headings in document order, valid for one snapshot. Document order is Word's story order: main text (table cells in place), then text boxes, footnotes, endnotes, headers, footers, each in its own order (research R7). |
| `location` | `"main" \| "tableCell" \| "textBox" \| "footnote" \| "endnote" \| "header" \| "footer"` | Anything but `main` is outside the main text flow: shown with a badge and hidden when `showHeadingsOutsideMainText` is off (FR-003a). |
| `bookmark` | `string \| null` | Usable bookmark already on the heading (see Heading Bookmark), if any. |

**HeadingKey**: `{ kind: "bookmark", name }` when `bookmark` is set; otherwise
`{ kind: "provisional", order, fingerprint }` where `fingerprint` = level + location + text. A provisional key
is valid only within the snapshot it came from. Once a bookmark is created, the heading's key
becomes the bookmark key (Constitution I: keyed by bookmark name, never by position or text).

## HeadingSnapshot

The result of one read of the document's headings.

| Field | Type | Rules |
|---|---|---|
| `documentId` | `string \| null` | Document URL, or `null` for unsaved documents. |
| `headings` | `Heading[]` | In document order; `order` is 0..n-1 without gaps. |
| `takenAt` | `number` | Monotonic timestamp, for cache freshness. |

**HeadingIndex** (core unit) builds and caches the snapshot per document, composes full numbers
when the host returns only level parts (research R7), and answers `byKey(key)`.

## Heading Bookmark

| Field | Type | Rules |
|---|---|---|
| `name` | `string` | Case-insensitive identity. |
| `origin` | `"existing" \| "created"` | Created bookmarks use the RAD·CUT naming scheme. |
| `spansHeadingText` | `boolean` | Range equals the heading text exactly, without the paragraph mark. |
| `wordManaged` | `boolean` | Name matches the Word-managed list (case-insensitive): prefix `_Toc`, prefix `_Hlk`, exactly `_GoBack`. |
| `usable` | `boolean` | Derived: `spansHeadingText && !wordManaged`. |

**Extent of created bookmarks** (FR-012): exactly the heading text, without the paragraph mark.

**Naming rules for created bookmarks** (FR-012, research R6): pattern `^_RC[a-z0-9]{10}$`
(13 characters, ≤ 40), unique case-insensitively against every bookmark in the document
including hidden ones; never derived from heading text or position.

**Reuse rule** (FR-011): if any usable bookmark exists, choose the first by case-insensitive name
order; create a new one only when none is usable; never modify or delete unusable bookmarks.

**Hands off** (FR-011a): the add-in never renames, moves, removes or flags a bookmark or field it
did not create. The extent and field layout mimic Word's own cross-reference dialog (spec
Assumptions, research R5); only the name prefix differs (`_RC`, not Word's `_Ref`).

## InsertionPoint

Read from Word's current selection, twice: when the palette opens (early decline message and
preview) and again inside the insertion transaction at Enter, where the second reading is the
one used (FR-008). Nothing is kept or tracked between the two readings.

| Field | Type | Rules |
|---|---|---|
| `location` | `"main" \| "footnote" \| "endnote" \| "tableCellInMain"` | Only allowed locations reach this type. |
| `selection` | `"none" \| "inline" \| "extended"` | `inline`: within one paragraph, replaced without warning. `extended`: spans more than one paragraph or contains a table, picture, shape or content control; replaced only after confirmation (FR-008a). |
| `inHeadingOrder` | `number \| null` | Order of the heading paragraph containing the cursor (only possible when `allowInHeadings` is on); that heading is not offered as a target (FR-001b). |
| `precedingHeadingOrder` | `number \| null` | Heading order just before the point; used for the above/below preview. |

**Location check** (FR-001a, FR-001b) produces either an `InsertionPoint` or a `Declined` reason:
`"header" | "footer" | "comment" | "textBox" | "headingParagraph" | "titleParagraph" |
"selfReference" | "protected" | "unknown"`. `selfReference` arises only at Enter, when the target
is the heading containing the cursor.

**LocationPolicy** = `{ allowInHeadings: boolean }`, taken from `UserSettings`. With it on,
heading, Title and Subtitle paragraphs are allowed. The rules live once in the core
(`classifyLocation(facts, policy)` and `classifySelection(facts)`); both gateways read raw facts
and call them, so the fake and Word cannot disagree on the rules.

## ReferenceFormat

| Field | Type | Rules |
|---|---|---|
| `id` | `string` | Built-ins: `text`, `number`, `numberText`, `sectionNumberText`, `page`, `aboveBelow`, `textAboveBelow`. Templates: `tpl:<uuid>`. |
| `label` | `string` | Shown in the palette. |
| `parts` | `FormatPart[]` | Non-empty; at least one non-literal part. |
| `builtIn` | `boolean` | Built-ins cannot be edited or deleted. |

**FormatPart** = `{ kind: "literal", text }` | `{ kind: "number" }` | `{ kind: "text" }` |
`{ kind: "page" }` | `{ kind: "aboveBelow" }`. Adjacent literals are merged; empty literals are
dropped. Each non-literal part maps to exactly one field (research R5).

**Template grammar** (FR-018): see [contracts/format-templates.md](contracts/format-templates.md).

**Format cycle** (FR-015, FR-016): built-ins in the order of FR-016, then templates in creation
order. Tab = next, Shift+Tab = previous, wrapping at both ends.

## ReferencePreview

| Field | Type | Rules |
|---|---|---|
| `text` | `string` | What the reference will display now, e.g. "§ 4.3 Fire strategy". |
| `warnings` | `("noNumber" \| "pageUnknown" \| "positionUnknown")[]` | `noNumber` when the format has a number part and the heading is unnumbered. `positionUnknown` when the format has an above/below part and the target is in a text box, header or footer (Word decides; preview shows "above/below ?"). |

Page is shown as "page ?" because the page cannot be computed before insertion; above/below is
computed from `InsertionPoint.precedingHeadingOrder` versus the target's `order`.

## MatchResult

| Field | Type | Rules |
|---|---|---|
| `key` | `HeadingKey` | |
| `score` | `number` | Higher is better; ties broken by document order. |
| `numberRanges` | `[start, end][]` | Matched character ranges in `number`, for highlighting. |
| `textRanges` | `[start, end][]` | Matched character ranges in `text`. |

## UserSettings

Stored per user, outside documents (FR-021).

| Field | Type | Rules |
|---|---|---|
| `schemaVersion` | `1` | Bumped on breaking change; older versions are migrated, unknown versions reset to defaults with a message. |
| `defaultFormatId` | `string` | Must name an existing format; falls back to `sectionNumberText` if the template was deleted. |
| `templates` | `{ id, label, source }[]` | `source` is the template string; validated on save and on load. At most 20. |
| `allowReferencesInHeadings` | `boolean` | Default `false` (FR-001b). Feeds `LocationPolicy.allowInHeadings`. |
| `showHeadingsOutsideMainText` | `boolean` | Default `true` (FR-003a). When `false`, headings whose `location` is not `main` are left out of the list. |

The shortcut is not part of `UserSettings`: Office stores it (research R4). The settings view
reads and writes it through the `HostShell` port.

## RecentHeadings

| Field | Type | Rules |
|---|---|---|
| `documentId` | `string` | Document URL; unsaved documents use an in-memory list only. |
| `bookmarks` | `string[]` | Most recent first, unique (case-insensitive), at most 5. |

Entries whose bookmark no longer exists, or no longer sits on a heading, are dropped when the
palette opens (spec User Story 5, scenario 3). At most 50 documents are kept; the least recently
used is dropped.

## State transitions

### Palette session

```text
Closed ──shortcut/ribbon──▶ Checking location
Checking location ──declined──▶ Message ──Esc/close──▶ Closed
Checking location ──ok──▶ Open(query="", format=default, selection=first)
Open ──type──▶ Open (re-rank, selection=first)              FR-005, FR-007
Open ──↑/↓──▶ Open (move selection)                          FR-006
Open ──Tab/Shift+Tab──▶ Open (next/previous format)          FR-015
Open ──cog──▶ Settings(from=palette)                         FR-021a
Open ──Esc──▶ Closed (no change, caret restored)             FR-006
Open ──Enter──▶ Inserting
Inserting ──ok──▶ Closed (caret after reference, recents updated)
Inserting ──extended selection, not confirmed──▶ Confirming (warning, no change)   FR-008a
Confirming ──Enter──▶ Inserting (confirmed)
Confirming ──Esc──▶ Open (warning dismissed, no change)
Confirming ──type/↑/↓/Tab──▶ Open (warning dismissed, key applied)
Inserting ──cursor now disallowed/protected/self reference──▶ Open (message, no change)   FR-008
Inserting ──stale target──▶ Open (message, list refreshed)   Edge case
Inserting ──failed──▶ Open (message, document unchanged)     FR-014
```

### Heading key

```text
provisional(order, fingerprint) ──bookmark created on insert──▶ bookmark(name)
```

### Settings

```text
Loaded ──edit──▶ Dirty ──save (valid)──▶ Loaded
Dirty ──save (invalid)──▶ Dirty (field errors shown)
Dirty ──close──▶ Loaded (changes discarded after confirmation)
```
