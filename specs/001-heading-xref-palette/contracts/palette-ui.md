# Contract: palette and settings UI behaviour

The user-facing contract for the views. Component tests (Vitest + Testing Library) assert every
row; the manual acceptance checklist repeats the focus rows in real Word.

## Palette keyboard map

| Key | Effect | Spec |
|---|---|---|
| (open) | Search box focused, empty query, default format, first row selected | FR-002, FR-017 |
| Printable keys | Edit query; results re-ranked; first row selected | FR-005, FR-007 |
| ↑ / ↓ | Move selection, no wrap; selected row scrolled into view | FR-006 |
| Page Up / Page Down | Move selection by one visible page | (convenience) |
| Tab / Shift+Tab | Next / previous format, wrapping; preview updates. With the cursor in a footnote, endnote, header, footer or text box, formats with an above/below part are left out (opening on the next offered format if the default is one) and the format strip says why | FR-015, FR-016a |
| Enter | Insert selected heading in the shown format; with an extended selection, or the cursor inside a field, the first Enter shows the warning and changes nothing, the second inserts | FR-006, FR-008a, FR-008b |
| Esc | Close, no change, caret restored; while the selection warning is shown, dismiss the warning only | FR-006, FR-008a |
| Ctrl+, | Open settings (same as clicking the cog) | FR-021a |
| Shortcut, with the palette still on screen | Search box focused again; query, format and selection kept; the list refreshes in place | FR-002 |
| Shortcut, after the pane was closed (Esc, insert or ×) | A fresh palette: empty query, default format, cursor checked again | FR-002 |

Tab does not move focus while the palette is open; the cog is reached with Ctrl+, or by mouse.
The cog button stays in the accessibility tree with its shortcut announced
(`aria-keyshortcuts="Control+Comma"`).

## Palette structure and ARIA

- Search input: `role="combobox"`, `aria-expanded="true"`, `aria-controls` → list,
  `aria-activedescendant` → selected row, `aria-autocomplete="list"`.
- Results: `role="listbox"`; each row `role="option"`, `aria-selected` on the selected row;
  accessible name = number + text + level, plus location outside the main text ("4.3 Fire
  strategy, level 2"; "Summary, level 1, in text box").
- Location badge (FR-003a): rows for headings outside the main text show a text badge after the
  heading text — "Table", "Text box", "Footnote", "Endnote", "Header" or "Footer" — styled with
  Fluent tokens and never colour alone. Each location has its own Fluent palette tint
  (`colorPalette<Name>Background2` / `Foreground2` / `BorderActive`), so they can be told apart
  at a glance; the text still names the location.
- Recents group (empty query only): `role="group"` labelled "Recent", then a group labelled
  "All headings" (FR-022).
- Highlighted characters use `<mark>` with bold weight and an underline as well as colour
  (FR-005a: not colour alone).
- Format strip: current format name plus preview text, in a polite live region
  (`aria-live="polite"`) so screen readers announce format changes.
- Messages (no headings, no matches, declined, stale, failed, selection warning): one polite live
  region; Enter is a no-op when there is no selectable row. Fixed texts:
  - Selection warning: "The selection covers more than one paragraph or a picture.
    Press Enter again to replace it, or Esc to keep it."
  - Field warning (FR-008b): "The cursor is inside a field. Press Enter again to replace the
    whole field, or Esc to keep it."
  - Table selected (FR-008a): "References can't replace a table. Select text, or put the cursor
    where the reference should go."
  - Failed before writing: "The reference couldn't be inserted. The document hasn't been changed."
  - Failed while writing (FR-014): "Word stopped part-way through inserting the reference. Press
    Ctrl+Z once to remove anything it wrote."
  - Both warnings appear directly under the selected row (still in the polite live region), so
    they sit next to what the second Enter will insert; other messages stay at the foot of the
    list.
  - Declined in a heading or title: "References can't go in headings or titles. To allow them,
    turn on “Allow references in headings” in Settings."
  - Self reference: "A heading can't refer to itself."
- The heading containing the cursor is never listed (FR-001b).

## Look and motion

- Colours, type ramp, spacing, radii and focus ring come only from Fluent 2 tokens, light or dark
  per `HostTheme` (FR-025). No product branding.
- Indent per heading level: one token step (`spacingHorizontalL`) per level, capped at level 6.
- Long text truncates with an ellipsis in the row; the full text appears in the preview and the
  row's `title`.
- Motion (FR-026): pane content fade-in and selection highlight move, each ≤ 150 ms, CSS
  transitions only, never awaited before handling input; all disabled under
  `prefers-reduced-motion: reduce` (or the settings toggle, per research R11).

## Settings view

- Opened from the ribbon "Settings" button, the palette cog, or Ctrl+, in the palette; focus on
  the first control (FR-021a).
- Sections: Default format (radio list of all formats with a sample preview); Templates (list
  with add, edit, delete; editor shows live preview against a sample heading and inline
  validation errors from [format-templates.md](format-templates.md)); Shortcut (current value,
  "Record new shortcut" capture, reset to default; read-only with explanation when signed out);
  Headings (two checkboxes, each with a description linked by `aria-describedby`):
  - "Allow references in headings" (off): "Not recommended. Headings feed the table of
    contents, the navigation pane and text references to that heading, so a reference inside a
    heading gets copied into them and can nest or loop. A heading can never refer to itself."
  - "Show headings outside the main text" (on): "List headings in tables, text boxes,
    footnotes, endnotes, headers and footers, each marked with where it is."
  No Animations setting: motion follows Windows through `prefers-reduced-motion` (research R11).
- Saving validates everything; errors sit next to their fields and focus moves to the first one.
- Esc or "Close" returns to where the user came from: the palette (if opened from it) with its
  query restored, otherwise the document (FR-021b). Unsaved changes prompt an in-pane
  confirmation (never a browser `confirm()`).
