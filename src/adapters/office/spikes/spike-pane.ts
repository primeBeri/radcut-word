/** Dev-only spike harness: one button per named spike script, results printed to a log. */
import { installFocusProbe, spike1 } from "./spike1-focus";
import { spike2 } from "./spike2-ref";
import { spike3 } from "./spike3-tracked";
import { requirementSupport, type Log, type Spike } from "./spike-kit";

const logElement = document.querySelector<HTMLDivElement>("#log");
const spikesElement = document.querySelector<HTMLDivElement>("#spikes");
const probe = document.querySelector<HTMLInputElement>("#probe");
if (!logElement || !spikesElement || !probe) throw new Error("Spike pane markup is incomplete.");

const log: Log = (label, value) => {
  const time = new Date().toISOString().slice(11, 23);
  const text = value === undefined ? "" : ` ${typeof value === "string" ? value : JSON.stringify(value, null, 1)}`;
  logElement.textContent += `[${time}] ${label}${text}\n`;
};

const groups: [string, readonly Spike[]][] = [
  ["Spike 1: shortcut and focus (R3, R4, R8, R11)", spike1],
  ["Spike 2: REF survives F9 (R5, R6, R7)", spike2],
  ["Spike 3: tracked changes (R9)", spike3],
];

for (const [title, spikes] of groups) {
  const section = document.createElement("section");
  const heading = document.createElement("h2");
  heading.textContent = title;
  section.append(heading);
  for (const spike of spikes) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = spike.label;
    button.addEventListener("click", async () => {
      log(`▶ ${spike.id}`);
      try {
        await spike.run(log);
        log(`✓ ${spike.id}`);
      } catch (error) {
        log(`✗ ${spike.id}`, error instanceof Error ? `${error.name}: ${error.message}` : String(error));
      }
    });
    section.append(button);
    if (spike.instructions) {
      const note = document.createElement("p");
      note.className = "instructions";
      note.textContent = spike.instructions;
      section.append(note);
    }
  }
  spikesElement.append(section);
}

document.querySelector("#copy")?.addEventListener("click", () => {
  void navigator.clipboard.writeText(logElement.textContent ?? "");
});
document.querySelector("#clear")?.addEventListener("click", () => {
  logElement.textContent = "";
});

await Office.onReady();
log("Requirement sets", requirementSupport());
installFocusProbe(probe, log);
