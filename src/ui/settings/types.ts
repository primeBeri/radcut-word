import type { KeyCombo } from "../../core/settings/shortcut-rules";
import type { UserSettings } from "../../core/settings/types";
import type { LoadedSettings } from "../../core/settings/user-settings";
import type { ChangeShortcutResult, ShortcutStatus } from "../../core/use-cases/change-shortcut";
import type { SaveSettingsResult } from "../../core/use-cases/save-settings";

/** The ChangeShortcut use case, bound to the host (FR-020). */
export interface ShortcutControl {
  read(): Promise<ShortcutStatus>;
  /** null = reset to the default. Applies at once: Office stores the shortcut, not the settings store. */
  change(combo: KeyCombo | null): Promise<ChangeShortcutResult>;
}

export interface SettingsProps {
  /** As loaded; the view edits a copy. */
  settings: UserSettings;
  /** Why the defaults are in use, if the stored settings could not be read. */
  notice: LoadedSettings["notice"];
  save: (settings: UserSettings) => Promise<SaveSettingsResult>;
  /** Esc or Close, once any unsaved changes are saved or discarded (FR-021b). */
  close: () => void;
  shortcut: ShortcutControl;
  /** A fresh unique id for a new template (default: `crypto.randomUUID`). */
  newId?: () => string;
}
