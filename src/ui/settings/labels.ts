/** Fixed texts of the settings view (contracts/palette-ui.md, "Settings view"). */
export const SETTINGS_TEXT = {
  allowReferencesInHeadings:
    "Not recommended (Disabled as default). Headings feed the 'table of contents', the 'navigation pane' and 'text references' to that heading, so the inserted cross reference would also be added to these elements which is generally not a desired behaviour.\n\nInserting a cross reference inside a heading also risks creating broken circular references",
  showHeadingsOutsideMainText:
    "When enabled (Enabled as default), headings outside of the main text will also be listed as potential cross references.\n\nThis includes headings located in 'tables', 'text boxes', 'footnotes', 'endnotes', 'headers' and 'footers'. A badge will be shown next to these headings in the palette indicating their location.",
  showRecentHeadings:
    "When enabled (Enabled as default), the palette lists the headings you referenced most recently in this document, up to 5, at the top under 'Recent' while the search box is empty.\n\nWhen disabled, they are not shown and new cross references are not remembered; the ones remembered before are kept for when you enable it again.",
  saved: "Settings saved.",
  saveFailed: "The settings couldn't be saved. Try again.",
  settingsReset: "Your saved settings couldn't be read, and have been restored to default values. Save to keep the new settings.",
  formatList: "Cross reference formats, in 'Tab' order",
  formatsInfo: "The order of cross reference formats in this list is the order in which they are cycled through when you press the 'Tab' key in the palette.\n\n The first cross reference format in this list will be selected as default when you open the palette unless 'Remember last used format' is selected",
  firstFormatBadge: "Default",
  rememberLastFormat: "Remember last used format",
  rememberLastFormatInfo: "If enabled, the next time you open the palette, the last used cross reference format will be selected, rather than the first one in the 'Cross Reference Formats' list.",
  addFormat: "Add Default Format",
  newTemplate: "Add Custom Format",
  unnamedTemplate: "New custom format",
  formatAdded: (name: string) => `${name} added at the end.`,
  formatMoved: (name: string, position: number, total: number) => `${name} is now ${position} of ${total}.`,
  formatRemoved: (name: string) => `${name} removed.`,
  templateHelp: "Use '{number}', '{text}', '{page}' and '{abovebelow}'.\n\nWrite '{{' or '}}' if you need a brace symbol to appear in your cross reference text.",
  noPreview: "Preview once valid",
  templateDropped: "A saved custom cross reference format couldn't be read, so it has been omitted.",
  shortcutIntro: "Opens cross reference palette: ",
  recordShortcut: "Record a new keyboard shortcut",
  recordingShortcut: "Press the new keyboard shortcut",
  recordingHint:
    "Hold 'Ctrl' or 'Alt', in combination with 'Shift' if you like, and press a letter, digit or symbol. Word reserves many keyboard combinations for itself and you will be informed if it is in use; Ctrl+Shift with a digit is usually free. Esc cancels.",
  shortcutChanged: (combo: string) => `The cross reference palette now opens with ${combo}.`,
  unsavedTitle: "Unsaved changes",
  unsavedBody: "Your changes haven't been saved.",
} as const;
