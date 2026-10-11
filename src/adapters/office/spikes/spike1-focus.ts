/**
 * Spike 1 — shortcut and focus (research R3, R4, R8, R11). Decides: task pane or dialog palette;
 * default shortcut. Most checks need a person at the keyboard; the log records what happened.
 */
import type { Log, Spike } from "./spike-kit";

type Surface = "taskpane" | "dialog";

let surface: Surface = "taskpane";
let shownAt = 0;
let pointerSinceShow = false;
let dialog: Office.Dialog | null = null;

/** Wire the shortcut and ribbon actions to the focus probe. Called once when the pane loads. */
export function installFocusProbe(probe: HTMLInputElement, log: Log): void {
  // Ribbon commands must call event.completed(), or Word ignores later clicks; shortcuts pass no event.
  Office.actions.associate("OpenPalette", (event?: Office.AddinCommands.Event) => {
    void openPalette(probe, log).finally(() => event?.completed());
  });
  Office.actions.associate("OpenSettings", (event?: Office.AddinCommands.Event) => {
    log("OpenSettings action fired");
    event?.completed();
  });

  document.addEventListener("pointerdown", () => {
    pointerSinceShow = true;
  });

  probe.addEventListener("keydown", (event) => {
    log("probe keydown", {
      key: event.key,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      msSinceShow: Math.round(performance.now() - shownAt),
      clickedSinceShow: pointerSinceShow,
    });
    if (event.key === "Escape") {
      event.preventDefault();
      void closeAndReturnCaret(log);
    }
  });

  // Ctrl+, opens settings in the plan; check the page sees it and Word does not act on it.
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key === ",") {
      event.preventDefault();
      log("Ctrl+, reached the page (check that Word did nothing)");
    }
  });
  log("Focus probe installed: press the shortcut in the document, or the ribbon button");
}

async function selectionText(): Promise<string> {
  return Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.load("text");
    await context.sync();
    return selection.text;
  });
}

async function openPalette(probe: HTMLInputElement, log: Log): Promise<void> {
  log("OpenPalette fired", { surface });
  const before = await selectionText();
  shownAt = performance.now();
  pointerSinceShow = false;
  if (surface === "dialog") {
    openDialog(log);
    return;
  }
  await Office.addin.showAsTaskpane();
  probe.value = "";
  probe.focus();
  log("after showAsTaskpane + focus()", {
    activeElementIsProbe: document.activeElement === probe,
    documentHasFocus: document.hasFocus(),
    msToShow: Math.round(performance.now() - shownAt),
  });
  const after = await selectionText();
  log("Word selection unchanged by showing the pane", before === after);
  log("Now type without clicking: keystrokes must appear in the probe log with clickedSinceShow=false");
}

async function closeAndReturnCaret(log: Log): Promise<void> {
  await Office.addin.hide();
  await Word.run(async (context) => {
    context.document.getSelection().select();
    await context.sync();
  });
  log("hidden and range.select() called: type now and check the text lands in the document");
}

function openDialog(log: Log): void {
  const url = `${location.origin}/adapters/office/spikes/spike-dialog.html`;
  Office.context.ui.displayDialogAsync(url, { height: 35, width: 30, displayInIframe: false }, (result) => {
    if (result.status !== Office.AsyncResultStatus.Succeeded) {
      log("displayDialogAsync failed", result.error.message);
      return;
    }
    dialog = result.value;
    log("dialog opened", { msToOpen: Math.round(performance.now() - shownAt) });
    dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
      const message = "message" in arg ? arg.message : "(event)";
      log("dialog says", message);
      if (message === "close") {
        dialog?.close();
        dialog = null;
        void Word.run(async (context) => {
          context.document.getSelection().select();
          await context.sync();
        }).then(() => log("dialog closed and range.select() called: type to check the caret"));
      }
    });
  });
}

export const spike1: readonly Spike[] = [
  {
    id: "spike1-shortcuts",
    label: "Shortcut state",
    instructions: "Run with a UK keyboard layout too. Also press Ctrl+Alt+K in the document and note any typed character.",
    async run(log) {
      log("getShortcuts", await Office.actions.getShortcuts());
      log("areShortcutsInUse", await Office.actions.areShortcutsInUse(["Ctrl+Alt+K", "Ctrl+Shift+Alt+K"]));
    },
  },
  {
    id: "spike1-free-shortcuts",
    label: "Find free three-key shortcuts",
    instructions: "Lists every two-modifier + key combination that Word reports as not in use.",
    async run(log) {
      const keys = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"];
      for (const modifiers of ["Ctrl+Alt", "Ctrl+Shift", "Alt+Shift"]) {
        const results = await Office.actions.areShortcutsInUse(keys.map((key) => `${modifiers}+${key}`));
        const free = results.filter((r) => !r.inUse).map((r) => r.shortcut.slice(modifiers.length + 1));
        log(`${modifiers}: free keys (${free.length}/${keys.length})`, free.join(" "));
      }
    },
  },
  {
    id: "spike1-surface",
    label: "Toggle palette surface (task pane / dialog)",
    instructions: "Use the dialog only if the task pane does not take keyboard focus.",
    async run(log) {
      surface = surface === "taskpane" ? "dialog" : "taskpane";
      log("palette surface is now", surface);
    },
  },
  {
    id: "spike1-selection",
    label: "Read selection facts",
    instructions:
      "Click in the document first: body, comment, text box, header, footnote, endnote, table cell; then select a few words, a whole paragraph with its mark, two paragraphs, a table, a picture.",
    async run(log) {
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load("text,isEmpty");
        const body = selection.parentBody;
        body.load("type");
        const parentOfBody = body.parentBodyOrNullObject;
        parentOfBody.load("type");
        const paragraphs = selection.paragraphs;
        paragraphs.load("items/styleBuiltIn,items/outlineLevel,items/tableNestingLevel,items/text");
        const tables = selection.tables;
        tables.load("items");
        const pictures = selection.inlinePictures;
        pictures.load("items");
        const controls = selection.contentControls;
        controls.load("items");
        const shapes = Office.context.requirements.isSetSupported("WordApiDesktop", "1.2")
          ? selection.shapes
          : null;
        shapes?.load("items/type");
        await context.sync();
        const first = paragraphs.items[0];
        log("selection facts", {
          text: selection.text.slice(0, 60),
          isEmpty: selection.isEmpty,
          parentBodyType: body.type,
          parentOfBodyType: parentOfBody.isNullObject ? null : parentOfBody.type,
          paragraphCount: paragraphs.items.length,
          firstStyle: first?.styleBuiltIn,
          firstOutlineLevel: first?.outlineLevel,
          firstTableNesting: first?.tableNestingLevel,
          tableCount: tables.items.length,
          pictureCount: pictures.items.length,
          contentControlCount: controls.items.length,
          shapeCount: shapes ? shapes.items.length : "WordApiDesktop 1.2 unsupported",
        });
      });
    },
  },
  {
    id: "spike1-theme",
    label: "Theme and reduced motion",
    instructions: "Run with Windows animation effects on and off, and with the Office theme light and dark.",
    async run(log) {
      log("officeTheme", Office.context.officeTheme);
      log("prefers-reduced-motion: reduce", matchMedia("(prefers-reduced-motion: reduce)").matches);
      log("prefers-color-scheme: dark", matchMedia("(prefers-color-scheme: dark)").matches);
    },
  },
];
