export interface TemplateDefinition {
  readonly id: string;
  readonly label: string;
  /** The template string, validated on save and on load. */
  readonly source: string;
}

/** Stored per user, outside documents (FR-021). The shortcut is stored by Office, not here. */
export interface UserSettings {
  readonly schemaVersion: 2;
  /** The format list: built-in and template ids in Tab order (FR-015, FR-017). Never empty. */
  readonly formatOrder: readonly string[];
  /** At most 20; each is in `formatOrder` exactly once. */
  readonly templates: readonly TemplateDefinition[];
  /** FR-017a: open on the format of the last inserted reference instead of the first. */
  readonly rememberLastFormat: boolean;
  /** Written after each insertion while `rememberLastFormat` is on; not edited in the settings view. */
  readonly lastFormatId: string | null;
  /** FR-001b; feeds LocationPolicy.allowInHeadings. */
  readonly allowReferencesInHeadings: boolean;
  /** FR-003a; when false, headings outside the main text are left out of the list. */
  readonly showHeadingsOutsideMainText: boolean;
}
