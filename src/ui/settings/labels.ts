/** Fixed texts of the settings view (contracts/palette-ui.md, "Settings view"). */
export const SETTINGS_TEXT = {
  allowReferencesInHeadings:
    "Not recommended. Headings feed the table of contents, the navigation pane and text references to that heading, so a reference inside a heading gets copied into them and can nest or loop. A heading can never refer to itself.",
  showHeadingsOutsideMainText:
    "List headings in tables, text boxes, footnotes, endnotes, headers and footers, each marked with where it is.",
  saved: "Settings saved.",
  saveFailed: "The settings couldn't be saved. Try again.",
  settingsReset: "Your saved settings couldn't be read, so the defaults are in use. Save to keep new ones.",
  unsavedTitle: "Unsaved changes",
  unsavedBody: "Your changes haven't been saved.",
} as const;
