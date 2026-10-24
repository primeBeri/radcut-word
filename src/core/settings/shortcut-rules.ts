/**
 * Which key combinations can open the palette (FR-020, research R4), and how they are written.
 * Office's own rules: at least one modifier, Shift never the only one, and one key from A–Z, 0–9,
 * `-`, `_` or `+` (`-` and `_`, `=` and `+` share a key, so Office treats them as the same).
 * Ctrl+@ is Word's accent key and is always refused.
 */

/** A combination as pressed: the modifiers held and the one other key. */
export interface KeyCombo {
  readonly ctrl: boolean;
  readonly alt: boolean;
  readonly shift: boolean;
  /** The Windows key, which Office shortcuts cannot use. */
  readonly meta: boolean;
  /** Upper-case letter, digit, `-`, `_`, `+`, `@`, or the browser's name for any other key. */
  readonly key: string;
}

/** What a keydown event carries, so the rules need no DOM. */
export interface KeyPress {
  readonly key: string;
  readonly code: string;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
}

export const SHORTCUT_TEXT = {
  ctrlAt: "Ctrl+@ is Word's key for typing accents, so it can't open the palette.",
  windowsKey: "The Windows key can't be part of the shortcut.",
  needsModifier: "Hold Ctrl or Alt with the key.",
  shiftOnly: "Shift needs Ctrl or Alt with it.",
  badKey: "Use a letter, a digit, - or + as the key.",
  inUse: (combo: string) => `${combo} is already used by Word or another add-in. Try another.`,
  readOnly: "To change the shortcut, sign in to Word with a Microsoft 365 account.",
  noShortcut: "No shortcut assigned",
  failed: "The shortcut couldn't be changed. Try again.",
  refused: (combo: string) => `Word wouldn't accept ${combo} and gave no reason. Try another.`,
  resetRefused: "Word wouldn't restore the default shortcut and gave no reason. Try again later.",
  /** Word ran one of its own commands on the key, so the pane saw only the modifiers. */
  keptByWord: "Word kept that combination for one of its own commands. Try another.",
} as const;

const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta", "AltGraph", "OS"]);
const ALLOWED_KEY = /^[A-Z0-9_+-]$/;

/** Ctrl, Shift, Alt or the Windows key on its own. */
export function isModifierKey(key: string): boolean {
  return MODIFIER_KEYS.has(key);
}

/** The combination a key press makes, or null while only modifiers are down. */
export function comboFromKeyPress(press: KeyPress): KeyCombo | null {
  if (isModifierKey(press.key)) return null;
  return { ctrl: press.ctrlKey, alt: press.altKey, shift: press.shiftKey, meta: press.metaKey, key: keyOf(press) };
}

function keyOf({ key, code }: KeyPress): string {
  // Ctrl+@ is a character, so it is caught wherever the layout puts @ (US Shift+2, UK Shift+').
  if (key === "@") return "@";
  // Letters and digits by physical key, so Shift or the layout cannot turn 3 into £.
  const physical = /^(?:Key([A-Z])|Digit([0-9])|Numpad([0-9]))$/.exec(code);
  if (physical) return physical[1] ?? physical[2] ?? physical[3] ?? key;
  if (code === "Minus" || code === "NumpadSubtract") return "-";
  if (code === "Equal" || code === "NumpadAdd") return "+";
  if (key === " ") return "Space";
  return key.length === 1 ? key.toUpperCase() : key;
}

/** Why `combo` cannot open the palette, or null if it can (the host still checks it is free). */
export function shortcutProblem(combo: KeyCombo): string | null {
  if (combo.ctrl && combo.key === "@") return SHORTCUT_TEXT.ctrlAt;
  if (combo.meta) return SHORTCUT_TEXT.windowsKey;
  if (!combo.ctrl && !combo.alt && !combo.shift) return SHORTCUT_TEXT.needsModifier;
  if (!combo.ctrl && !combo.alt) return SHORTCUT_TEXT.shiftOnly;
  if (!ALLOWED_KEY.test(combo.key)) return SHORTCUT_TEXT.badKey;
  return null;
}

/** "Ctrl+Shift+Alt+K": modifiers in that order, `_` as its synonym `-`; Shift is part of @, so not shown. */
export function formatCombo(combo: KeyCombo): string {
  const key = combo.key === "_" ? "-" : combo.key.length === 1 ? combo.key.toUpperCase() : combo.key;
  const parts = [
    combo.meta && "Win",
    combo.ctrl && "Ctrl",
    combo.shift && key !== "@" && "Shift",
    combo.alt && "Alt",
  ].filter((part): part is string => typeof part === "string");
  return [...parts, key].join("+");
}

/** Read a combination as Office writes it ("Ctrl+Shift+Y", any case or order), or null. */
export function parseCombo(text: string): KeyCombo | null {
  // A trailing "++" is the + key.
  const plusKey = text.endsWith("++");
  const parts = (plusKey ? text.slice(0, -2) : text).split("+");
  const key = plusKey ? "+" : parts.pop();
  if (!key) return null;
  const mods = { ctrl: false, alt: false, shift: false, meta: false };
  const names: Record<string, keyof typeof mods> = { ctrl: "ctrl", control: "ctrl", alt: "alt", shift: "shift" };
  for (const part of parts) {
    const mod = names[part.trim().toLowerCase()];
    if (!mod || mods[mod]) return null;
    mods[mod] = true;
  }
  const name = key.trim();
  if (name === "" || names[name.toLowerCase()]) return null;
  return { ...mods, key: name.length === 1 ? name.toUpperCase() : name };
}

/** A shortcut from the host in the normal form; one that cannot be read is shown as it is. */
export function displayShortcut(text: string): string {
  const combo = parseCombo(text);
  return combo ? formatCombo(combo) : text;
}
