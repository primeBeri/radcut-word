# Backlog

Ideas raised during development that are not yet in a spec. Each needs `/speckit-refine-update`
(or a new feature spec) before it is built.

- **Keep the pane open after inserting** (US1 acceptance run, 2026-10-11). Hiding and showing the
  task pane on every use reflows the document in multi-page view, which is jarring. An option
  (default off) could leave the pane open and only return keyboard focus to the document. Decide
  with the US2 settings work or after the MVP.
- **Replace a whole reference, not just the field under the caret** (US1 rerun, 2026-10-11).
  With the caret in the text field of "§ 4.3 Fire strategy", FR-008b replaces only that field
  and leaves "§ 4.3 " behind. A possible rule: also take neighbouring REF/PAGEREF fields to the
  same bookmark in the same paragraph, plus the literal text between them. Leading or trailing
  literals ("§ ", "see ") cannot be told apart from ordinary text once custom templates exist
  (US3), so this needs a decision on how far the add-in may guess.
- **Plain-text content controls, post V1** (002 M1, 2026-10-15). Plain-text content controls are
  rare in the documents RAD·CUT targets, and both Office.js and the test harness handle them
  awkwardly: Office.js cannot create one (`insertContentControl("PlainText")` fails), and after an
  `insertOoxml` restore it stops listing an existing one in `contentControls`, so a whole-control
  selection is not recognised. The V1 rules stay as built (FR-001a: declined inside; FR-008a:
  confirmation when selected whole) and are tested against `FakeGateway`; in Word, the "inside"
  case (5d) is automated, while the whole-control case (10f) and its hand check are deferred.
  Revisit after V1: check the gateway on a plain-text control in a document that was never
  restored, and decide whether to keep FR-008a's plain-text part.
