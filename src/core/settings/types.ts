export interface TemplateDefinition {
  readonly id: string;
  readonly label: string;
  /** The template string, validated on save and on load. */
  readonly source: string;
}

/** Stored per user, outside documents (FR-021). The shortcut is stored by Office, not here. */
export interface UserSettings {
  readonly schemaVersion: 1;
  readonly defaultFormatId: string;
  /** At most 20. */
  readonly templates: readonly TemplateDefinition[];
  /** FR-001b; feeds LocationPolicy.allowInHeadings. */
  readonly allowReferencesInHeadings: boolean;
  /** FR-003a; when false, headings outside the main text are left out of the list. */
  readonly showHeadingsOutsideMainText: boolean;
}
