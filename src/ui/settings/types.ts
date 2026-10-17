import type { UserSettings } from "../../core/settings/types";
import type { LoadedSettings } from "../../core/settings/user-settings";
import type { SaveSettingsResult } from "../../core/use-cases/save-settings";

export interface SettingsProps {
  /** As loaded; the view edits a copy. */
  settings: UserSettings;
  /** Why the defaults are in use, if the stored settings could not be read. */
  notice: LoadedSettings["notice"];
  save: (settings: UserSettings) => Promise<SaveSettingsResult>;
  /** Esc or Close, once any unsaved changes are saved or discarded (FR-021b). */
  close: () => void;
  /** A fresh unique id for a new template (default: `crypto.randomUUID`). */
  newId?: () => string;
}
