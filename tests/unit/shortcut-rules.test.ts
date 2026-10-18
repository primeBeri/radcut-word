import { describe, expect, it } from "vitest";
import {
  comboFromKeyPress,
  displayShortcut,
  formatCombo,
  parseCombo,
  SHORTCUT_TEXT,
  shortcutProblem,
  type KeyCombo,
  type KeyPress,
} from "../../src/core/settings/shortcut-rules";

const combo = (key: string, mods: Partial<Omit<KeyCombo, "key">> = {}): KeyCombo => ({
  ctrl: false,
  alt: false,
  shift: false,
  meta: false,
  ...mods,
  key,
});

const press = (key: string, code: string, mods: Partial<Pick<KeyPress, "ctrlKey" | "altKey" | "shiftKey" | "metaKey">> = {}): KeyPress => ({
  key,
  code,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...mods,
});

describe("shortcut rules (FR-020, research R4)", () => {
  it("accepts one key from A–Z, 0–9, - or + with Ctrl or Alt, Shift optional", () => {
    for (const ok of [
      combo("Y", { ctrl: true, shift: true }),
      combo("J", { ctrl: true, alt: true }),
      combo("7", { alt: true }),
      combo("-", { ctrl: true }),
      combo("_", { alt: true, shift: true }),
      combo("+", { ctrl: true, shift: true, alt: true }),
    ]) {
      expect(shortcutProblem(ok), formatCombo(ok)).toBeNull();
    }
  });

  it("needs at least one modifier", () => {
    expect(shortcutProblem(combo("K"))).toBe(SHORTCUT_TEXT.needsModifier);
  });

  it("refuses Shift as the only modifier", () => {
    expect(shortcutProblem(combo("K", { shift: true }))).toBe(SHORTCUT_TEXT.shiftOnly);
  });

  it("refuses a key outside A–Z, 0–9, - and +", () => {
    for (const key of ["F5", "Enter", "Space", ";", "ArrowUp"]) {
      expect(shortcutProblem(combo(key, { ctrl: true, alt: true })), key).toBe(SHORTCUT_TEXT.badKey);
    }
  });

  it("always refuses Ctrl+@, Word's accent key, with its own reason", () => {
    expect(shortcutProblem(combo("@", { ctrl: true }))).toBe(SHORTCUT_TEXT.ctrlAt);
    expect(shortcutProblem(combo("@", { ctrl: true, shift: true }))).toBe(SHORTCUT_TEXT.ctrlAt);
    expect(shortcutProblem(combo("@", { ctrl: true, alt: true }))).toBe(SHORTCUT_TEXT.ctrlAt);
    expect(SHORTCUT_TEXT.ctrlAt).toMatch(/^Ctrl\+@ /);
  });

  it("refuses the Windows key", () => {
    expect(shortcutProblem(combo("K", { ctrl: true, meta: true }))).toBe(SHORTCUT_TEXT.windowsKey);
  });

  it("writes a combination as Ctrl+Shift+Alt+key, the key upper case", () => {
    expect(formatCombo(combo("k", { alt: true, shift: true, ctrl: true }))).toBe("Ctrl+Shift+Alt+K");
    expect(formatCombo(combo("Y", { shift: true, ctrl: true }))).toBe("Ctrl+Shift+Y");
    expect(formatCombo(combo("+", { ctrl: true }))).toBe("Ctrl++");
    expect(formatCombo(combo("@", { ctrl: true, shift: true }))).toBe("Ctrl+@");
  });

  it("reads a combination as Office writes it, in any case and order", () => {
    expect(parseCombo("Ctrl+Shift+Y")).toEqual(combo("Y", { ctrl: true, shift: true }));
    expect(parseCombo("alt+ctrl+j")).toEqual(combo("J", { ctrl: true, alt: true }));
    expect(parseCombo("Ctrl++")).toEqual(combo("+", { ctrl: true }));
    expect(parseCombo("Ctrl+Shift")).toBeNull();
    expect(parseCombo("Ctrl+Ctrl+K")).toBeNull();
    expect(parseCombo("Hyper+K")).toBeNull();
    expect(parseCombo("")).toBeNull();
  });

  it("shows a combination in the normal form; one it cannot read, as it is", () => {
    expect(displayShortcut("shift+ctrl+y")).toBe("Ctrl+Shift+Y");
    expect(displayShortcut("Ctrl+_")).toBe("Ctrl+-");
    expect(displayShortcut("Something odd")).toBe("Something odd");
  });

  describe("from a key press", () => {
    it("is nothing while only modifiers are down", () => {
      for (const key of ["Control", "Shift", "Alt", "Meta", "AltGraph"]) {
        expect(comboFromKeyPress(press(key, "ShiftLeft", { ctrlKey: true }))).toBeNull();
      }
    });

    it("takes letters and digits from the physical key, whatever Shift or the layout makes of them", () => {
      expect(comboFromKeyPress(press("Y", "KeyY", { ctrlKey: true, shiftKey: true }))).toEqual(combo("Y", { ctrl: true, shift: true }));
      expect(comboFromKeyPress(press("j", "KeyJ", { ctrlKey: true, altKey: true }))).toEqual(combo("J", { ctrl: true, alt: true }));
      expect(comboFromKeyPress(press("£", "Digit3", { ctrlKey: true, shiftKey: true }))).toEqual(combo("3", { ctrl: true, shift: true }));
      expect(comboFromKeyPress(press("7", "Numpad7", { altKey: true }))).toEqual(combo("7", { alt: true }));
    });

    it("takes - and + from their keys, so _ and = count as their synonyms", () => {
      expect(comboFromKeyPress(press("_", "Minus", { ctrlKey: true, shiftKey: true }))).toEqual(combo("-", { ctrl: true, shift: true }));
      expect(comboFromKeyPress(press("=", "Equal", { ctrlKey: true }))).toEqual(combo("+", { ctrl: true }));
      expect(comboFromKeyPress(press("+", "NumpadAdd", { altKey: true }))).toEqual(combo("+", { alt: true }));
    });

    it("keeps @ as typed, so Ctrl+@ is caught on any layout", () => {
      // US: Shift+2; UK: Shift+'.
      expect(comboFromKeyPress(press("@", "Digit2", { ctrlKey: true, shiftKey: true }))).toEqual(combo("@", { ctrl: true, shift: true }));
      expect(comboFromKeyPress(press("@", "Quote", { ctrlKey: true, shiftKey: true }))).toEqual(combo("@", { ctrl: true, shift: true }));
    });

    it("names other keys as the browser does", () => {
      expect(comboFromKeyPress(press("F5", "F5", { ctrlKey: true }))).toEqual(combo("F5", { ctrl: true }));
      expect(comboFromKeyPress(press(" ", "Space", { ctrlKey: true }))).toEqual(combo("Space", { ctrl: true }));
      expect(comboFromKeyPress(press(";", "Semicolon", { ctrlKey: true }))).toEqual(combo(";", { ctrl: true }));
      expect(comboFromKeyPress(press("k", "KeyK", { ctrlKey: true, metaKey: true }))).toEqual(combo("K", { ctrl: true, meta: true }));
    });
  });
});
