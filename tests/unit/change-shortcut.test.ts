import { describe, expect, it, vi } from "vitest";
import { parseCombo, SHORTCUT_TEXT, type KeyCombo } from "../../src/core/settings/shortcut-rules";
import { changeShortcut, readShortcut } from "../../src/core/use-cases/change-shortcut";
import { DEFAULT_SHORTCUT, FakeHostShell } from "../fakes/fake-host-shell";

const combo = (text: string): KeyCombo => {
  const parsed = parseCombo(text);
  if (!parsed) throw new Error(`Not a combination: ${text}`);
  return parsed;
};

function setup() {
  const shell = new FakeHostShell();
  const replace = vi.spyOn(shell.shortcut, "replace");
  return { shell, shortcut: shell.shortcut, replace };
}

describe("ChangeShortcut (FR-020, contracts/host-ports.md behaviours 2–4, 6)", () => {
  it("reads the current shortcut in its normal form, and whether it can be changed", async () => {
    const { shell, shortcut } = setup();
    shell.assignedShortcut = "shift+ctrl+y";
    expect(await readShortcut(shortcut)).toEqual({ current: "Ctrl+Shift+Y", customisable: true });
  });

  it("reads null, unassigned or lost to a Word conflict, as no shortcut", async () => {
    const { shell, shortcut } = setup();
    shell.assignedShortcut = null;
    expect(await readShortcut(shortcut)).toEqual({ current: null, customisable: true });
    expect(SHORTCUT_TEXT.noShortcut).toBe("No shortcut assigned");
  });

  it("is read-only when the host cannot customise shortcuts (signed out, or no KeyboardShortcuts 1.1)", async () => {
    const { shell, shortcut, replace } = setup();
    shell.customisable = false;
    expect(await readShortcut(shortcut)).toEqual({ current: DEFAULT_SHORTCUT, customisable: false });
    expect(await changeShortcut(shortcut, combo("Ctrl+Alt+J"))).toEqual({ ok: false, error: SHORTCUT_TEXT.readOnly });
    expect(await changeShortcut(shortcut, null)).toEqual({ ok: false, error: SHORTCUT_TEXT.readOnly });
    expect(replace).not.toHaveBeenCalled();
  });

  it("refuses a combination the rules refuse, with the reason, before asking the host anything", async () => {
    const { shortcut, replace } = setup();
    const inUse = vi.spyOn(shortcut, "isInUse");
    expect(await changeShortcut(shortcut, combo("Shift+K"))).toEqual({ ok: false, error: SHORTCUT_TEXT.shiftOnly });
    expect(await changeShortcut(shortcut, { ctrl: true, alt: false, shift: true, meta: false, key: "@" })).toEqual({
      ok: false,
      error: SHORTCUT_TEXT.ctrlAt,
    });
    expect(inUse).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("refuses a combination already in use by Word or another add-in", async () => {
    const { shell, shortcut, replace } = setup();
    shell.inUse.add("ctrl+alt+k");
    expect(await changeShortcut(shortcut, combo("Ctrl+Alt+K"))).toEqual({ ok: false, error: SHORTCUT_TEXT.inUse("Ctrl+Alt+K") });
    expect(replace).not.toHaveBeenCalled();
  });

  it("replaces the shortcut once both checks pass, and gives what the host now holds", async () => {
    const { shell, shortcut, replace } = setup();
    expect(await changeShortcut(shortcut, combo("alt+ctrl+j"))).toEqual({ ok: true, current: "Ctrl+Alt+J" });
    expect(replace).toHaveBeenCalledExactlyOnceWith("Ctrl+Alt+J");
    expect(shell.assignedShortcut).toBe("Ctrl+Alt+J");
  });

  it("leaves the shortcut alone when it is chosen again", async () => {
    const { shortcut, replace } = setup();
    const inUse = vi.spyOn(shortcut, "isInUse");
    expect(await changeShortcut(shortcut, combo(DEFAULT_SHORTCUT))).toEqual({ ok: true, current: DEFAULT_SHORTCUT });
    expect(inUse).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("treats choosing the manifest default, which Word reports as in use by the add-in, as a reset", async () => {
    const { shell, shortcut, replace } = setup();
    shell.assignedShortcut = "Ctrl+Alt+B";
    shell.inUse.add(DEFAULT_SHORTCUT.toLowerCase());
    expect(await changeShortcut(shortcut, combo(DEFAULT_SHORTCUT))).toEqual({ ok: true, current: DEFAULT_SHORTCUT });
    expect(replace).toHaveBeenCalledExactlyOnceWith(null);
  });

  it("resets to the manifest default with replace(null)", async () => {
    const { shell, shortcut, replace } = setup();
    shell.assignedShortcut = "Ctrl+Alt+J";
    expect(await changeShortcut(shortcut, null)).toEqual({ ok: true, current: DEFAULT_SHORTCUT });
    expect(replace).toHaveBeenCalledExactlyOnceWith(null);
  });

  it("names the combination a host refuses, the shortcut as it was, and another can still be tried (Word 2609, research R4)", async () => {
    const { shell, shortcut, replace } = setup();
    shell.refused.add("ctrl+alt+j");
    expect(await changeShortcut(shortcut, combo("Ctrl+Alt+J"))).toEqual({ ok: false, error: SHORTCUT_TEXT.refused("Ctrl+Alt+J") });
    expect(shell.assignedShortcut).toBe(DEFAULT_SHORTCUT);
    expect(await changeShortcut(shortcut, combo("Ctrl+Shift+1"))).toEqual({ ok: true, current: "Ctrl+Shift+1" });
    expect(replace).toHaveBeenCalledTimes(2);
  });

  it("says so when the host refuses even the reset", async () => {
    const { shell, shortcut } = setup();
    shell.assignedShortcut = "Ctrl+Alt+J";
    shell.refusesReplace = true;
    expect(await changeShortcut(shortcut, null)).toEqual({ ok: false, error: SHORTCUT_TEXT.resetRefused });
    expect(shell.assignedShortcut).toBe("Ctrl+Alt+J");
  });

  it("says so when the host fails, and logs it locally", async () => {
    const { shortcut, replace } = setup();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    replace.mockRejectedValue(new Error("boom"));
    expect(await changeShortcut(shortcut, combo("Ctrl+Alt+J"))).toEqual({ ok: false, error: SHORTCUT_TEXT.failed });
    expect(log).toHaveBeenCalledWith("[xref:change-shortcut]", expect.any(Error));
    log.mockRestore();
  });
});
