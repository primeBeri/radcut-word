import { fireEvent, render, screen, waitFor, within } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, type App } from "../../src/app/create-app";
import { DEFAULT_SETTINGS } from "../../src/core/settings/defaults";
import { SHORTCUT_TEXT } from "../../src/core/settings/shortcut-rules";
import Settings from "../../src/ui/settings/Settings.svelte";
import type { SettingsProps } from "../../src/ui/settings/types";
import { fakeFixtures } from "../fakes/fake-documents";
import { FakeGateway } from "../fakes/fake-gateway";
import { DEFAULT_SHORTCUT, FakeHostShell, shortcutControl } from "../fakes/fake-host-shell";
import { FakeSettingsStore } from "../fakes/fake-settings-store";

let app: App | null = null;

afterEach(() => {
  app?.destroy();
  app = null;
  document.body.innerHTML = "";
});

function setup(prepare: (shell: FakeHostShell) => void = () => {}) {
  const shell = new FakeHostShell();
  shell.inUse.add("ctrl+alt+k");
  prepare(shell);
  const close = vi.fn();
  const props: SettingsProps = {
    settings: DEFAULT_SETTINGS,
    notice: null,
    save: async () => ({ ok: true }),
    close,
    shortcut: shortcutControl(shell),
  };
  render(Settings, { props });
  const section = () => screen.getByRole("region", { name: "Shortcut" });
  const current = () => within(section()).getByTestId("current-shortcut");
  return { shell, close, section, current };
}

/** A click, which in a browser also focuses the button. */
async function clickRecord(button: HTMLElement) {
  button.focus();
  await fireEvent.click(button);
}

/** A key press while recording, as Chromium reports it. */
const press = (key: string, code: string, mods: { ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean } = {}) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key, code, ...mods });

describe("shortcut section of the settings view (FR-020, contracts/palette-ui.md)", () => {
  it("shows the current shortcut, with Record new shortcut and Reset to default", async () => {
    const { section, current } = setup();
    await waitFor(() => expect(current()).toHaveTextContent(DEFAULT_SHORTCUT));
    expect(within(section()).getByRole("button", { name: "Record new shortcut" })).toBeEnabled();
    expect(within(section()).getByRole("button", { name: "Reset to default" })).toBeEnabled();
  });

  it("shows No shortcut assigned when Word gave the combination to something else", async () => {
    const { current } = setup((shell) => (shell.assignedShortcut = null));
    await waitFor(() => expect(current()).toHaveTextContent(SHORTCUT_TEXT.noShortcut));
  });

  it("Record new shortcut captures the next combination, ignoring modifiers on their own, and shows it", async () => {
    const { shell, section, current } = setup();
    await waitFor(() => expect(current()).toHaveTextContent(DEFAULT_SHORTCUT));
    const button = within(section()).getByRole("button", { name: "Record new shortcut" });
    await clickRecord(button);
    expect(button).toHaveFocus();
    expect(button).toHaveAccessibleName("Press the new shortcut");
    expect(button).toHaveAttribute("aria-pressed", "true");
    await press("Control", "ControlLeft", { ctrlKey: true });
    await press("Alt", "AltLeft", { ctrlKey: true, altKey: true });
    expect(shell.assignedShortcut).toBe(DEFAULT_SHORTCUT);
    await press("j", "KeyJ", { ctrlKey: true, altKey: true });
    await waitFor(() => expect(current()).toHaveTextContent("Ctrl+Alt+J"));
    expect(shell.assignedShortcut).toBe("Ctrl+Alt+J");
    expect(button).toHaveAccessibleName("Record new shortcut");
    expect(screen.getByRole("status")).toHaveTextContent("The palette now opens with Ctrl+Alt+J.");
  });

  it("shows a refusal inline and keeps recording, so the next try needs no click", async () => {
    const { shell, section, current } = setup();
    await waitFor(() => expect(current()).toHaveTextContent(DEFAULT_SHORTCUT));
    const button = within(section()).getByRole("button", { name: "Record new shortcut" });
    await clickRecord(button);
    await press("@", "Digit2", { ctrlKey: true, shiftKey: true });
    const alert = await within(section()).findByRole("alert");
    expect(alert).toHaveTextContent(SHORTCUT_TEXT.ctrlAt);
    expect(button).toHaveAccessibleDescription(expect.stringContaining(SHORTCUT_TEXT.ctrlAt));
    await press("k", "KeyK", { ctrlKey: true, altKey: true });
    await waitFor(() => expect(within(section()).getByRole("alert")).toHaveTextContent(SHORTCUT_TEXT.inUse("Ctrl+Alt+K")));
    expect(button).toHaveAttribute("aria-pressed", "true");
    await press("Q", "KeyQ", { ctrlKey: true, altKey: true });
    await waitFor(() => expect(current()).toHaveTextContent("Ctrl+Alt+Q"));
    expect(within(section()).queryByRole("alert")).toBeNull();
    expect(shell.assignedShortcut).toBe("Ctrl+Alt+Q");
  });

  it("Esc stops recording without leaving settings; Tab moves on and stops it too", async () => {
    const { shell, close, section, current } = setup();
    await waitFor(() => expect(current()).toHaveTextContent(DEFAULT_SHORTCUT));
    const button = within(section()).getByRole("button", { name: "Record new shortcut" });
    await clickRecord(button);
    await press("Escape", "Escape");
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(close).not.toHaveBeenCalled();
    await clickRecord(button);
    await fireEvent.blur(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(shell.assignedShortcut).toBe(DEFAULT_SHORTCUT);
  });

  it("Reset to default restores the manifest shortcut", async () => {
    const { shell, section, current } = setup((s) => (s.assignedShortcut = "Ctrl+Alt+J"));
    await waitFor(() => expect(current()).toHaveTextContent("Ctrl+Alt+J"));
    await fireEvent.click(within(section()).getByRole("button", { name: "Reset to default" }));
    await waitFor(() => expect(current()).toHaveTextContent(DEFAULT_SHORTCUT));
    expect(shell.assignedShortcut).toBe(DEFAULT_SHORTCUT);
    expect(screen.getByRole("status")).toHaveTextContent(`The palette now opens with ${DEFAULT_SHORTCUT}.`);
  });

  it("names a combination Word refuses, announced, and keeps recording for another", async () => {
    const { shell, section, current } = setup((s) => s.refused.add("ctrl+alt+j"));
    await waitFor(() => expect(current()).toHaveTextContent(DEFAULT_SHORTCUT));
    const button = within(section()).getByRole("button", { name: "Record new shortcut" });
    await clickRecord(button);
    await press("j", "KeyJ", { ctrlKey: true, altKey: true });
    await waitFor(() => expect(within(section()).getByRole("alert")).toHaveTextContent(SHORTCUT_TEXT.refused("Ctrl+Alt+J")));
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(current()).toHaveTextContent(DEFAULT_SHORTCUT);
    await press("!", "Digit1", { ctrlKey: true, shiftKey: true });
    await waitFor(() => expect(current()).toHaveTextContent("Ctrl+Shift+1"));
    expect(shell.assignedShortcut).toBe("Ctrl+Shift+1");
  });

  it("says Word kept a combination when only its modifiers reached the pane, and keeps recording", async () => {
    const { shell, section, current } = setup();
    await waitFor(() => expect(current()).toHaveTextContent(DEFAULT_SHORTCUT));
    const button = within(section()).getByRole("button", { name: "Record new shortcut" });
    await clickRecord(button);
    // Ctrl+B: Word bolds and the pane sees Ctrl down and up only.
    await press("Control", "ControlLeft", { ctrlKey: true });
    await fireEvent.keyUp(button, { key: "Control", code: "ControlLeft" });
    await waitFor(() => expect(within(section()).getByRole("alert")).toHaveTextContent(SHORTCUT_TEXT.keptByWord));
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(shell.assignedShortcut).toBe(DEFAULT_SHORTCUT);
    // Shift on its own, or released before Ctrl, is not reported.
    await press("j", "KeyJ", { ctrlKey: true, altKey: true });
    await waitFor(() => expect(current()).toHaveTextContent("Ctrl+Alt+J"));
    await clickRecord(button);
    await press("Shift", "ShiftLeft", { shiftKey: true });
    await fireEvent.keyUp(button, { key: "Shift", code: "ShiftLeft" });
    expect(within(section()).queryByRole("alert")).toBeNull();
  });

  it("is read-only with the explanation when shortcuts cannot be customised", async () => {
    const { section, current } = setup((shell) => (shell.customisable = false));
    await waitFor(() => expect(current()).toHaveTextContent(DEFAULT_SHORTCUT));
    expect(within(section()).getByText(SHORTCUT_TEXT.readOnly)).toBeInTheDocument();
    expect(within(section()).queryByRole("button")).toBeNull();
  });
});

describe("ribbon and shortcut (US4 scenario 1)", () => {
  it("are one handler: a palette opened from the ribbon is the one the shortcut refocuses, query kept", async () => {
    const shell = new FakeHostShell();
    const target = document.createElement("div");
    document.body.append(target);
    app = createApp({ gateway: new FakeGateway(fakeFixtures["spec-300"]()), shell, settings: new FakeSettingsStore() }, target);
    shell.clickCrossReferenceButton();
    const input = await waitFor(() => screen.getByRole("combobox"));
    expect(input).toHaveFocus();
    await fireEvent.input(input, { target: { value: "fstrat" } });
    shell.pressShortcut();
    await waitFor(() => expect(screen.getByRole("combobox")).toBe(input));
    expect(input).toHaveValue("fstrat");
    expect(input).toHaveFocus();
  });
});
