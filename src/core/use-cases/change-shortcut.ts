import type { HostShortcut } from "../ports/host-shell";
import { displayShortcut, formatCombo, SHORTCUT_TEXT, shortcutProblem, type KeyCombo } from "../settings/shortcut-rules";

/** The palette's shortcut as the settings view shows it. */
export interface ShortcutStatus {
  /** Normal form; null = unassigned or lost to a Word conflict ("No shortcut assigned"). */
  readonly current: string | null;
  /** False when signed out or KeyboardShortcuts 1.1 is unsupported: the section is read-only. */
  readonly customisable: boolean;
}

export type ChangeShortcutResult =
  | { readonly ok: true; readonly current: string | null }
  | { readonly ok: false; readonly error: string };

const normal = (text: string | null): string | null => (text === null ? null : displayShortcut(text));

/** What the host holds now; a host that cannot say is treated as read-only (logged locally). */
export async function readShortcut(shortcut: HostShortcut): Promise<ShortcutStatus> {
  try {
    const [current, customisable] = await Promise.all([shortcut.current(), shortcut.canCustomise()]);
    return { current: normal(current), customisable };
  } catch (error) {
    console.error("[radcut:read-shortcut]", error);
    return { current: null, customisable: false };
  }
}

/**
 * Give the palette a new shortcut, or the manifest default with `null` (FR-020, contracts/host-ports.md
 * behaviour 2): the core's rules first, then that the host allows customising and the combination
 * is free; only then `replace`. The result is what the host holds afterwards.
 */
export async function changeShortcut(shortcut: HostShortcut, combo: KeyCombo | null): Promise<ChangeShortcutResult> {
  const problem = combo && shortcutProblem(combo);
  if (problem) return { ok: false, error: problem };
  try {
    if (!(await shortcut.canCustomise())) return { ok: false, error: SHORTCUT_TEXT.readOnly };
    let text = combo && formatCombo(combo);
    if (text) {
      const current = await shortcut.current();
      // Ours is "in use" too; choosing it again changes nothing.
      if (current !== null && displayShortcut(current) === text) return { ok: true, current: text };
      // Word reports the manifest default as in use, by this add-in, so choosing it is a reset.
      if (text === displayShortcut(shortcut.manifestDefault)) text = null;
      else if (await shortcut.isInUse(text)) return { ok: false, error: SHORTCUT_TEXT.inUse(text) };
    }
    // Word refuses some free combinations and not others, with no reason (research R4), so a
    // refusal is about this combination only and another can be tried.
    if ((await shortcut.replace(text)) === "refused") {
      return { ok: false, error: text ? SHORTCUT_TEXT.refused(text) : SHORTCUT_TEXT.resetRefused };
    }
    return { ok: true, current: normal(await shortcut.current()) };
  } catch (error) {
    console.error("[radcut:change-shortcut]", error);
    return { ok: false, error: SHORTCUT_TEXT.failed };
  }
}
