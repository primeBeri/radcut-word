import { fireEvent, screen, waitFor, within } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, type App } from "../../src/app/create-app";
import { messageText } from "../../src/core/messages";
import { fakeFixtures } from "../fakes/fake-documents";
import { FakeGateway } from "../fakes/fake-gateway";
import { FakeHostShell } from "../fakes/fake-host-shell";
import { FakeSettingsStore } from "../fakes/fake-settings-store";

let app: App | null = null;

afterEach(() => {
  app?.destroy();
  app = null;
  document.body.innerHTML = "";
  delete document.documentElement.dataset.theme;
});

function start() {
  const gateway = new FakeGateway(fakeFixtures["spec-300"]());
  const shell = new FakeHostShell();
  const target = document.createElement("div");
  document.body.append(target);
  app = createApp({ gateway, shell, settings: new FakeSettingsStore() }, target);
  return { gateway, shell };
}

async function open(shell: FakeHostShell) {
  shell.pressShortcut();
  return waitFor(() => screen.getByRole("combobox"));
}

describe("app flow", () => {
  it("opens on the shortcut, types fstrat, Enter inserts the selected heading and returns focus", async () => {
    const { gateway, shell } = start();
    const input = await open(shell);
    expect(shell.visible).toBe(true);
    expect(input).toHaveFocus();
    await fireEvent.input(input, { target: { value: "fstrat" } });
    await fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(gateway.insertions()).toHaveLength(1));
    const [inserted] = gateway.insertions();
    expect(gateway.insertionText(inserted!.id)).toBe("§ 4.3 Fire strategy");
    await waitFor(() => expect(shell.visible).toBe(false));
    expect(gateway.focusReturned).toEqual({ after: inserted!.id });
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("the shortcut with the palette already open refocuses the search box and keeps what was typed", async () => {
    const { gateway, shell } = start();
    const input = await open(shell);
    await fireEvent.input(input, { target: { value: "fstrat" } });
    input.blur();
    shell.pressShortcut();
    await waitFor(() => expect(input).toHaveFocus());
    // Let any refresh of the heading list settle; the same palette must still be there.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByRole("combobox")).toBe(input);
    expect(input).toHaveValue("fstrat");
    expect(within(screen.getByRole("listbox")).getAllByRole("option")[0]).toHaveAccessibleName("4.3 Fire strategy, level 2");
    await fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(gateway.insertions()).toHaveLength(1));
  });

  it("after the user closes the pane with ×, the shortcut opens a fresh palette and checks the cursor again", async () => {
    const { gateway, shell } = start();
    const input = await open(shell);
    await fireEvent.input(input, { target: { value: "fstrat" } });
    shell.closePaneByUser();
    await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull());

    const fresh = await open(shell);
    expect(fresh).not.toBe(input);
    expect(fresh).toHaveValue("");

    shell.closePaneByUser();
    gateway.select("Fire strategy");
    shell.pressShortcut();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(messageText("headingParagraph")));
  });

  it("opens the same palette from the ribbon button", async () => {
    const { shell } = start();
    shell.clickCrossReferenceButton();
    expect(await waitFor(() => screen.getByRole("combobox"))).toHaveFocus();
  });

  it("Esc hides the pane, returns the caret and changes nothing", async () => {
    const { gateway, shell } = start();
    const before = gateway.documentState();
    const input = await open(shell);
    await fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(shell.visible).toBe(false));
    expect(gateway.focusReturned).toEqual({ after: null });
    expect(gateway.documentState()).toEqual(before);
  });

  it("shows a declined location as a message naming the setting, and Esc closes it", async () => {
    const { gateway, shell } = start();
    gateway.select("Fire strategy");
    shell.pressShortcut();
    const status = await waitFor(() => screen.getByRole("status"));
    expect(status).toHaveTextContent(messageText("headingParagraph"));
    expect(status).toHaveTextContent("Allow references in headings");
    expect(screen.queryByRole("combobox")).toBeNull();
    const close = screen.getByRole("button", { name: "Close" });
    expect(close).toHaveFocus();
    await fireEvent.keyDown(close, { key: "Escape" });
    await waitFor(() => expect(shell.visible).toBe(false));
  });

  it("needs a second Enter for a two-paragraph selection", async () => {
    const { gateway, shell } = start();
    gateway.select("First of two paragraphs.", { length: 5, paragraphs: 2 });
    const input = await open(shell);
    await fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("status")).toHaveTextContent(messageText("selectionWarning"));
    expect(gateway.insertions()).toHaveLength(0);
    await fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(gateway.insertions()).toHaveLength(1));
    expect(gateway.insertions()[0]!.replacedText).toBe("First");
  });

  it("lists headings in a text box and a footnote with badges under default settings", async () => {
    const { shell } = start();
    await open(shell);
    const box = screen.getByRole("option", { name: "Heading in a text box, level 1, in text box" });
    expect(within(box).getByText("Text box")).toBeInTheDocument();
    const note = screen.getByRole("option", { name: "Heading in a footnote, level 1, in footnote" });
    expect(within(note).getByText("Footnote")).toBeInTheDocument();
  });

  it("applies the Office theme as data-theme on every show", async () => {
    const { shell } = start();
    shell.currentTheme = { isDark: true, background: "#1f1f1f", foreground: "#ffffff" };
    await open(shell);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("shows a fresh palette each time it opens", async () => {
    const { shell } = start();
    const first = await open(shell);
    await fireEvent.input(first, { target: { value: "fstrat" } });
    await fireEvent.keyDown(first, { key: "Escape" });
    await waitFor(() => expect(shell.visible).toBe(false));
    const second = await open(shell);
    expect(second).toHaveValue("");
  });
});
