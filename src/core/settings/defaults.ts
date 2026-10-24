import { DEFAULT_FORMAT_ORDER } from "../formats/built-ins";
import type { UserSettings } from "./types";

/** Out-of-the-box settings (data-model "UserSettings"). */
export const DEFAULT_SETTINGS: UserSettings = {
  schemaVersion: 2,
  formatOrder: DEFAULT_FORMAT_ORDER,
  templates: [],
  rememberLastFormat: false,
  lastFormatId: null,
  allowReferencesInHeadings: false,
  showHeadingsOutsideMainText: true,
  showRecentHeadings: true,
};
