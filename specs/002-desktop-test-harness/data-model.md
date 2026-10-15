# Data Model: Desktop Test Harness

Entities the harness and the in-Word runner share. Names in `code` are those the code uses.

## CaseResult (TypeScript, `src/dev/mini-test.ts`)

| Field | Type | Rule |
|---|---|---|
| `name` | string | `describe` prefixes joined with " > ", then the case name; unique within a suite |
| `status` | `"pass" \| "fail" \| "skip"` | |
| `durationMs` | number | wall time of the case body, ≥ 0; 0 for `skip` |
| `error` | string? | present only when `status` is `fail` |
| `timings` | `Record<string, number>`? | optional named phases measured by the Word harness (`restore`, `select`, `state`), in ms |

## ContractRunResults (TypeScript → JSON, read by C#)

| Field | Type | Rule |
|---|---|---|
| `suite` | string | the registration label |
| `fixture` | string \| null | the fixture the suite needs |
| `startedAt` | string | ISO 8601 |
| `totalMs` | number | |
| `cases` | `CaseResult[]` | in run order |

Published as described in [contracts/contract-pane-automation.md](contracts/contract-pane-automation.md).

## DirtyState (TypeScript, inside `wordHarness`)

States: `clean` → (any write) → `dirty` → (restore) → `clean`. The first case of a document takes
the snapshot and starts `clean`.

- Writes: `gateway.insertReference`, harness `setParagraphText` and `failNextWrite`, any
  Word-only case body that edits the document directly, and any gateway method not on the
  read-only list.
- Read-only list: `readHeadings`, `checkInsertionPoint`, `listBookmarkNames`, `readReferences`,
  `returnFocus` (moves the selection only), and the harness readers (`select`, `bookmarks`,
  `fields`, `documentState`, `insertionText`, `insertionParagraph`, `replacedText`).
- Guard: when the state is `clean`, the next case still compares the main text's length and the
  bookmark count with the snapshot's; a mismatch forces a restore and logs a warning naming the
  previous case, so a missed write is found, not hidden.

## ScratchCopy (C#)

| Field | Rule |
|---|---|
| `Fixture` | one of `spec-contract`, `spec-300`, `guide-500`, `tracked`, `plain-headings` |
| `Path` | `%LOCALAPPDATA%\radcut-dev\scratch\<run id>\<test id>\<fixture>.docx`; ASCII only |
| Lifecycle | created per test; deleted after a pass; copied into the evidence after a fail |

## WordSession (C#)

| Field | Rule |
|---|---|
| `ProcessId` | the WINWORD process the harness started; the only one it may stop |
| `Application` | COM object bound to that process (research D4) |
| `CdpEndpoint` | `http://127.0.0.1:<port>`, or null when no route works |
| States | `NotStarted` → `Starting` → `Ready` → `Closing` → `Closed`; `Failed` from any state, which still closes |

## DocumentSnapshot (C#)

| Field | Rule |
|---|---|
| `Text` | per story, in story order |
| `Fields` | per story: code (whitespace normalised) and result, without updating |
| `Bookmarks` | name, story, start, end, text of the paragraph holding the start |
| `Revisions` | type and text |

Equality is item by item; a difference is reported as the first differing item.

## ReferenceFieldInfo (C#, `DocumentInspector`)

`Bookmark`, `Switches` (set), `Result`, `ResultAfterUpdate`, `FontBold`, `FontItalic`,
`SurroundingFormat`, `Story`.

## EvidenceBundle (C#)

Folder `tests/desktop/test-results/<test name>/` with `trace.zip`, `word.png`, `scratch.docx`,
`pane-console.log` and `harness.log`.

## ScenarioOutcome (C#)

`Number` (1–27), `Result` (`Pass`, `Fail`, `Skipped: <reason>`, `Human`), `Note`. Written one row
each to `acceptance-summary.md`.
