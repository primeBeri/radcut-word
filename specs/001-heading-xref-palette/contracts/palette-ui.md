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
| Tab / Shift+Tab | Next / previous format, wrapping; preview updates | FR-015 |
| Enter | Insert selected heading in the shown format | FR-006 |
| Esc | Close, no change, caret restored | FR-006 |
| Ctrl+, | Open settings (same as clicking the cog) | FR-021a |

Tab does not move focus while the palette is open; the cog is reached with Ctrl+, or by mouse.
The cog button stays in the accessibility tree with its shortcut announced
(`aria-keyshortcuts="Control+Comma"`).

## Palette structure and ARIA

- Search input: `role="combobox"`, `aria-expanded="true"`, `aria-controls` → list,
  `aria-activedescendant` → selected row, `aria-autocomplete="list"`.
- Results: `role="listbox"`; each row `role="option"`, `aria-selected` on the selected row;
  accessible name = number + text + level ("4.3 Fire strategy, level 2").
- Recents group (empty query only): `role="group"` labelled "Recent", then a group labelled
  "All headings" (FR-022).
- Highlighted characters use `<mark>` with bold weight and an underline as well as colour
  (FR-005a: not colour alone).
- Format strip: current format name plus preview text, in a polite live region
  (`aria-live="polite"`) so screen readers announce format changes.
- Messages (no headings, no matches, declined, stale, failed): one polite live region; Enter is a
  no-op when there is no selectable row.

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
  Animations (only if research R11 fallback is needed).
- Saving validates everything; errors sit next to their fields and focus moves to the first one.
- Esc or "Close" returns to where the user came from: the palette (if opened from it) with its
  query restored, otherwise the document (FR-021b). Unsaved changes prompt an in-pane
  confirmation (never a browser `confirm()`).
