import { fireEvent, screen, waitFor, within } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, type App } from "../../src/app/create-app";
import { messageText } from "../../src/core/messages";
import { SETTINGS_TEXT } from "../../src/ui/settings/labels";
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
  const settings = new FakeSettingsStore();
  const target = document.createElement("div");
  document.body.append(target);
  app = createApp({ gateway, shell, settings }, target);
  return { gateway, shell, settings };
}

/** The settings view's format list; waits for the view to mount. */
async function settingsView() {
  return waitFor(() => screen.getByRole("list", { name: SETTINGS_TEXT.formatList }));
}

/** Saves the settings view as it stands and closes it, back to the document. */
async function saveAndClose(shell: FakeHostShell) {
  await fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Settings saved."));
  await fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => expect(shell.visible).toBe(false));
}

/** A new app over the same store, as after restarting Word. */
function restart(settings: FakeSettingsStore) {
  app?.destroy();
  document.body.innerHTML = "";
  const shell = new FakeHostShell();
  const target = document.createElement("div");
  document.body.append(target);
  app = createApp({ gateway: new FakeGateway(fakeFixtures["spec-300"]()), shell, settings }, target);
  return shell;
}

const formatLabel = () => screen.getByTestId("format-preview").querySelector(".label")?.textContent;

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
    expect(status).toHaveTextContent("Allow cross references in headings");
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

  it("refuses to replace a selection that runs into the chosen heading, even after the second Enter", async () => {
    const { gateway, shell } = start();
    gateway.select("The fire strategy is described here.", { length: 5, paragraphs: 2 });
    const before = gateway.documentState();
    const input = await open(shell);
    await fireEvent.input(input, { target: { value: "bold word" } });
    await fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("status")).toHaveTextContent(messageText("selectionWarning"));
    await fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(messageText("selfReference")));
    expect(gateway.documentState()).toEqual(before);
  });

  it("a heading edited after opening: says so, shows the fresh list after one read, and inserts on the next try", async () => {
    const { gateway, shell } = start();
    const input = await open(shell);
    let reads = 0;
    const readHeadings = gateway.readHeadings.bind(gateway);
    gateway.readHeadings = () => {
      reads++;
      return readHeadings();
    };
    gateway.setParagraphText("Fire strategy", "Fire safety strategy");
    await fireEvent.input(input, { target: { value: "fstrat" } });
    await fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(messageText("staleTarget")));
    expect(reads).toBe(1);
    expect(within(screen.getByRole("listbox")).getAllByRole("option")[0]).toHaveAccessibleName(
      "4.3 Fire safety strategy, level 2",
    );
    await fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(gateway.insertions()).toHaveLength(1));
    expect(gateway.insertionText(gateway.insertions()[0]!.id)).toBe("§ 4.3 Fire safety strategy");
  });

  describe("when the user is faster than Word", () => {
    /** Holds a gateway call until `release` is called. */
    function hold<T>(call: () => Promise<T>) {
      let release!: () => void;
      const gate = new Promise<void>((resolve) => (release = resolve));
      return { held: async () => (await gate, call()), release: () => release() };
    }

    it("an open that finishes after the user closed the pane with × shows nothing", async () => {
      const { gateway, shell } = start();
      const { held, release } = hold(gateway.checkInsertionPoint.bind(gateway, { allowInHeadings: false }));
      gateway.checkInsertionPoint = held;
      shell.pressShortcut();
      await waitFor(() => expect(shell.visible).toBe(true));
      shell.closePaneByUser();
      release();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(screen.queryByRole("combobox")).toBeNull();
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("a palette reopened while an insertion is still finishing stays open", async () => {
      const { gateway, shell } = start();
      const input = await open(shell);
      const { held, release } = hold(gateway.returnFocus.bind(gateway));
      gateway.returnFocus = held;
      await fireEvent.keyDown(input, { key: "Enter" });
      await waitFor(() => expect(shell.visible).toBe(false));
      await open(shell);
      release();
      await waitFor(() => expect(gateway.insertions()).toHaveLength(1));
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(shell.visible).toBe(true);
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("a background refresh that arrives after Esc changes nothing on screen", async () => {
      const { gateway, shell } = start();
      const first = await open(shell);
      await fireEvent.keyDown(first, { key: "Escape" });
      await waitFor(() => expect(shell.visible).toBe(false));
      const { held, release } = hold(gateway.readHeadings.bind(gateway));
      gateway.readHeadings = held;
      const input = await open(shell);
      await fireEvent.keyDown(input, { key: "Escape" });
      await waitFor(() => expect(shell.visible).toBe(false));
      release();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(screen.queryByRole("combobox")).toBeNull();
    });
  });

  describe("when Word fails", () => {
    const failure = () => Promise.reject(new Error("Word is busy."));

    it("reading the cursor on open: shows the host error instead of a blank pane", async () => {
      const { gateway, shell } = start();
      gateway.checkInsertionPoint = failure;
      shell.pressShortcut();
      await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(messageText("hostError")));
      expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    });

    it("reading the headings on first open: shows the host error", async () => {
      const { gateway, shell } = start();
      gateway.readHeadings = failure;
      shell.pressShortcut();
      await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(messageText("hostError")));
    });

    it("refreshing in the background: keeps the cached list on screen", async () => {
      const { gateway, shell } = start();
      const first = await open(shell);
      await fireEvent.keyDown(first, { key: "Escape" });
      await waitFor(() => expect(shell.visible).toBe(false));
      gateway.readHeadings = failure;
      const input = await open(shell);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(screen.getByRole("combobox")).toBe(input);
      expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
    });

    it("refreshing on a second shortcut press: keeps the palette and what was typed", async () => {
      const { gateway, shell } = start();
      const input = await open(shell);
      await fireEvent.input(input, { target: { value: "fstrat" } });
      gateway.checkInsertionPoint = failure;
      shell.pressShortcut();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(screen.getByRole("combobox")).toHaveValue("fstrat");
    });

    it("listing bookmarks at Enter: shows the host error and keeps the palette open", async () => {
      const { gateway, shell } = start();
      const input = await open(shell);
      gateway.listBookmarkNames = failure;
      await fireEvent.keyDown(input, { key: "Enter" });
      await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(messageText("hostError")));
      expect(screen.getByRole("combobox")).toBe(input);
      expect(gateway.insertions()).toHaveLength(0);
    });

    it("a palette insert that rejects outright still shows the host error", async () => {
      const { gateway, shell } = start();
      const input = await open(shell);
      gateway.insertReference = failure;
      await fireEvent.keyDown(input, { key: "Enter" });
      await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(messageText("hostError")));
    });

    it("hiding the pane after a successful insert: the palette closes, so a second Enter cannot insert again", async () => {
      const { gateway, shell } = start();
      const input = await open(shell);
      shell.hidePane = failure;
      await fireEvent.keyDown(input, { key: "Enter" });
      await waitFor(() => expect(gateway.insertions()).toHaveLength(1));
      await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull());
      await fireEvent.keyDown(input, { key: "Enter" });
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(gateway.insertions()).toHaveLength(1);
    });

    it("hiding the pane on Esc: still returns the caret", async () => {
      const { gateway, shell } = start();
      const input = await open(shell);
      shell.hidePane = failure;
      await fireEvent.keyDown(input, { key: "Escape" });
      await waitFor(() => expect(gateway.focusReturned).toEqual({ after: null }));
    });
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

  describe("settings (FR-017, FR-017a, FR-021, FR-021a, FR-021b)", () => {
    it("the ribbon Settings button opens the settings view with focus on its first control", async () => {
      const { shell } = start();
      shell.clickSettingsButton();
      await settingsView();
      expect(shell.visible).toBe(true);
      await waitFor(() => expect(screen.getByRole("button", { name: "Cross Reference Formats" })).toHaveFocus());
    });

    it("the cog and Ctrl+, open it from the palette", async () => {
      const { shell } = start();
      const input = await open(shell);
      await fireEvent.keyDown(input, { key: ",", ctrlKey: true });
      await settingsView();
      await fireEvent.click(screen.getByRole("button", { name: "Close" }));
      await fireEvent.click((await waitFor(() => screen.getByRole("button", { name: "Settings" }))));
      await settingsView();
    });

    it("a format moved to the top of the saved list is where the next palette opens, after a restart too", async () => {
      const { shell, settings } = start();
      shell.clickSettingsButton();
      await settingsView();
      await fireEvent.click(screen.getByRole("button", { name: "Move Number Only up" }));
      await saveAndClose(shell);
      expect(settings.raw).toMatchObject({ schemaVersion: 2, formatOrder: ["number", "sectionNumberText", "text", "numberText"] });
      const input = await open(shell);
      expect(formatLabel()).toBe("Number Only");
      await fireEvent.keyDown(input, { key: "Tab" });
      expect(formatLabel()).toBe("§ Number & Text");
      await fireEvent.keyDown(input, { key: "Escape" });
      await waitFor(() => expect(shell.visible).toBe(false));

      const restarted = restart(settings);
      await open(restarted);
      expect(formatLabel()).toBe("Number Only");
    });

    it("after inserting in another format, the next palette opens on the first again, and nothing is written", async () => {
      const { shell, settings } = start();
      const input = await open(shell);
      await fireEvent.keyDown(input, { key: "Tab" });
      expect(formatLabel()).toBe("Number Only");
      await fireEvent.keyDown(input, { key: "Enter" });
      await waitFor(() => expect(shell.visible).toBe(false));
      await open(shell);
      expect(formatLabel()).toBe("§ Number & Text");
      expect(settings.raw).toBeNull();
    });

    it("with Remember the last used format on, the next palette opens on the format last inserted, after a restart too", async () => {
      const { shell, settings } = start();
      shell.clickSettingsButton();
      await settingsView();
      await fireEvent.click(screen.getByRole("checkbox", { name: SETTINGS_TEXT.rememberLastFormat }));
      await saveAndClose(shell);
      let input = await open(shell);
      await fireEvent.keyDown(input, { key: "Tab" });
      await fireEvent.keyDown(input, { key: "Tab" });
      expect(formatLabel()).toBe("Text Only");
      await fireEvent.keyDown(input, { key: "Enter" });
      await waitFor(() => expect(shell.visible).toBe(false));
      await waitFor(() => expect(settings.raw).toMatchObject({ rememberLastFormat: true, lastFormatId: "text" }));
      input = await open(shell);
      expect(formatLabel()).toBe("Text Only");
      await fireEvent.keyDown(input, { key: "Escape" });
      await waitFor(() => expect(shell.visible).toBe(false));

      const restarted = restart(settings);
      await open(restarted);
      expect(formatLabel()).toBe("Text Only");
    });

    it("turning on Allow references in headings lets the palette open in a heading, without listing it", async () => {
      const { gateway, shell } = start();
      shell.clickSettingsButton();
      await settingsView();
      await fireEvent.click(screen.getByRole("button", { name: "Headings" }));
      await fireEvent.click(screen.getByRole("checkbox", { name: "Allow cross references in headings" }));
      await saveAndClose(shell);
      gateway.select("Fire strategy");
      await open(shell);
      expect(screen.queryByRole("option", { name: "4.3 Fire strategy, level 2" })).toBeNull();
      expect(screen.getByRole("option", { name: "4.1 Means of escape, level 2" })).toBeInTheDocument();
    });

    it("turning off Show headings outside the main text hides the badged headings", async () => {
      const { shell } = start();
      shell.clickSettingsButton();
      await settingsView();
      await fireEvent.click(screen.getByRole("button", { name: "Headings" }));
      await fireEvent.click(screen.getByRole("checkbox", { name: "Show headings outside of the main text" }));
      await saveAndClose(shell);
      await open(shell);
      expect(screen.queryByRole("option", { name: /in footnote$/ })).toBeNull();
      expect(screen.queryByRole("option", { name: /in text box$/ })).toBeNull();
    });

    it("Close returns to the palette with its query restored when opened from it", async () => {
      const { shell } = start();
      const input = await open(shell);
      await fireEvent.input(input, { target: { value: "fstrat" } });
      await fireEvent.keyDown(input, { key: ",", ctrlKey: true });
      await settingsView();
      await fireEvent.keyDown(document.activeElement!, { key: "Escape" });
      const back = await waitFor(() => screen.getByRole("combobox"));
      expect(back).toHaveValue("fstrat");
      await waitFor(() => expect(back).toHaveFocus());
      expect(shell.visible).toBe(true);
    });

    it("Close from the ribbon's settings hides the pane and returns focus to the document", async () => {
      const { gateway, shell } = start();
      shell.clickSettingsButton();
      await settingsView();
      await fireEvent.click(screen.getByRole("button", { name: "Close" }));
      await waitFor(() => expect(shell.visible).toBe(false));
      expect(gateway.focusReturned).toEqual({ after: null });
      expect(screen.queryByRole("list", { name: SETTINGS_TEXT.formatList })).toBeNull();
    });

    it("settings that cannot be read give the defaults, and the settings view says so", async () => {
      const { shell, settings } = start();
      settings.raw = "{not json";
      const input = await open(shell);
      expect(formatLabel()).toBe("§ Number & Text");
      await fireEvent.keyDown(input, { key: ",", ctrlKey: true });
      await settingsView();
      expect(screen.getByRole("status")).toHaveTextContent(SETTINGS_TEXT.settingsReset);
    });
  });

  describe("recents (US5, FR-022, FR-022a)", () => {
    const DOC = "https://example.invalid/spec-300.docx";

    /** Open, type `query`, Enter, and wait for the pane to close. */
    async function insertTo(shell: FakeHostShell, query: string) {
      const input = await open(shell);
      await fireEvent.input(input, { target: { value: query } });
      await fireEvent.keyDown(input, { key: "Enter" });
      await waitFor(() => expect(shell.visible).toBe(false));
    }

    const recentNames = () =>
      within(screen.getByRole("group", { name: "Recent" }))
        .getAllByRole("option")
        .map((o) => o.getAttribute("aria-label"));

    it("after inserting to two headings, an empty query lists both under Recent, most recent first", async () => {
      const { shell, settings } = start();
      await insertTo(shell, "scope");
      await insertTo(shell, "fstrat");
      await open(shell);
      await waitFor(() => expect(recentNames()).toEqual(["4.3 Fire strategy, level 2", "1.1 Scope, level 2"]));
      expect(screen.getByRole("group", { name: "All headings" })).toBeInTheDocument();
      expect(await settings.loadRecents(DOC)).toHaveLength(2);
    });

    it("keeps them across a restart of Word", async () => {
      const { shell, settings } = start();
      // Scope's bookmark is in the fixture, so the restarted (fresh) fake document has it too.
      await insertTo(shell, "scope");
      const again = restart(settings);
      await open(again);
      await waitFor(() => expect(recentNames()).toEqual(["1.1 Scope, level 2"]));
    });

    it("with Show recently used headings off, shows no Recent group and records nothing; back on, the earlier ones return", async () => {
      const { shell, settings } = start();
      await insertTo(shell, "scope");

      shell.clickSettingsButton();
      await settingsView();
      await fireEvent.click(screen.getByRole("button", { name: "Headings" }));
      await fireEvent.click(screen.getByRole("checkbox", { name: "Show recently used headings" }));
      await saveAndClose(shell);

      await open(shell);
      // Let the background refresh settle: the groups must stay away.
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(screen.queryByRole("group")).toBeNull();
      await fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
      await waitFor(() => expect(shell.visible).toBe(false));
      await insertTo(shell, "fstrat");
      expect(await settings.loadRecents(DOC)).toEqual(["_Ref200000001"]);

      shell.clickSettingsButton();
      await settingsView();
      await fireEvent.click(screen.getByRole("button", { name: "Headings" }));
      await fireEvent.click(screen.getByRole("checkbox", { name: "Show recently used headings" }));
      await saveAndClose(shell);
      await open(shell);
      await waitFor(() => expect(recentNames()).toEqual(["1.1 Scope, level 2"]));
    });
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
