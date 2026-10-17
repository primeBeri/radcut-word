import type { ReferenceFormat } from "../../core/formats/types";
import type { UserSettings } from "../../core/settings/types";
import type { LoadedSettings } from "../../core/settings/user-settings";
import type { SaveSettingsResult } from "../../core/use-cases/save-settings";

export interface SettingsProps {
  /** As loaded; the view edits a copy. */
  settings: UserSettings;
  /** Every format, for the default-format list: built-ins, then templates. */
  formats: readonly ReferenceFormat[];
  /** Why the defaults are in use, if the stored settings could not be read. */
  notice: LoadedSettings["notice"];
  save: (settings: UserSettings) => Promise<SaveSettingsResult>;
  /** Esc or Close, once any unsaved changes are saved or discarded (FR-021b). */
  close: () => void;
}
