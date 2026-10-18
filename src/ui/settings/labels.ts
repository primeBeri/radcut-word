/** Fixed texts of the settings view (contracts/palette-ui.md, "Settings view"). */
export const SETTINGS_TEXT = {
  allowReferencesInHeadings:
    "Not recommended. Headings feed the table of contents, the navigation pane and text references to that heading, so a reference inside a heading gets copied into them and can nest or loop. A heading can never refer to itself.",
  showHeadingsOutsideMainText:
    "List headings in tables, text boxes, footnotes, endnotes, headers and footers, each marked with where it is.",
  saved: "Settings saved.",
  saveFailed: "The settings couldn't be saved. Try again.",
  settingsReset: "Your saved settings couldn't be read, so the defaults are in use. Save to keep new ones.",
  templatesIntro: "Your own wording, offered after the built-in formats when you press Tab.",
  noTemplates: "No templates yet.",
  templateHelp: "Use {number}, {text}, {page} and {abovebelow}; write {{ or }} for a brace.",
  noPreview: "The preview appears once the template is valid.",
  templateDropped: "A saved template couldn't be read, so it was left out.",
  shortcutIntro: "Opens the palette:",
  recordShortcut: "Record new shortcut",
  recordingShortcut: "Press the new shortcut",
  recordingHint:
    "Hold Ctrl or Alt, with Shift if you like, and press a letter, digit, - or +. Word keeps many combinations for itself; Ctrl+Shift with a digit is usually free. Esc cancels.",
  shortcutChanged: (combo: string) => `The palette now opens with ${combo}.`,
  unsavedTitle: "Unsaved changes",
  unsavedBody: "Your changes haven't been saved.",
} as const;
