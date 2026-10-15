/** Dialog half of spike 1's fallback check: reports focus and keystrokes to the spike pane. */
const probe = document.querySelector<HTMLInputElement>("#probe");
if (!probe) throw new Error("Dialog probe markup is incomplete.");

const send = (message: unknown): void => {
  Office.context.ui.messageParent(typeof message === "string" ? message : JSON.stringify(message));
};

await Office.onReady();
probe.focus();
send({ focusedOnOpen: document.activeElement === probe, documentHasFocus: document.hasFocus() });

let clicked = false;
document.addEventListener("pointerdown", () => {
  clicked = true;
});
probe.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    send("close");
    return;
  }
  send({ key: event.key, clickedFirst: clicked });
});

export {};
