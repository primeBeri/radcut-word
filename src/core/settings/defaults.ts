import { DEFAULT_FORMAT_ID } from "../formats/built-ins";
import type { UserSettings } from "./types";

/** Out-of-the-box settings (data-model "UserSettings"). */
export const DEFAULT_SETTINGS: UserSettings = {
  schemaVersion: 1,
  defaultFormatId: DEFAULT_FORMAT_ID,
  templates: [],
  allowReferencesInHeadings: false,
  showHeadingsOutsideMainText: true,
};
