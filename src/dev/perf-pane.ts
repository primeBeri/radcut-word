/**
 * Dev-only: wires `PerfRecorder` to the task pane page (feature 001 T096). The app's ports are
 * timed, the palette's readiness is watched in the page, long tasks come from a
 * `PerformanceObserver`, and the results are published as `window.__xrefPerf` for the desktop
 * harness. `main.ts` loads this only in the Vite dev server, never in the release build.
 */
import type { AppPorts } from "../app/create-app";
import { PerfRecorder, type PerfResults } from "./perf-recorder";

export interface PerfHandle {
  results(): PerfResults;
  clear(): void;
}

/** The palette is ready: the search box has focus and at least one row is listed. */
export function paletteReady(target: HTMLElement): boolean {
  const active = document.activeElement;
  return active?.getAttribute("aria-label") === "Search headings" && target.querySelector('[role="option"]') !== null;
}

/** `ports` timed by a new recorder that watches `target` for the palette. */
export function installPerfRecorder(ports: AppPorts, target: HTMLElement): AppPorts {
  const recorder = new PerfRecorder(() => performance.now());
  let checking = false;
  const check = () => {
    const open = recorder.waitingOpen();
    if (checking || open === null || !paletteReady(target)) return;
    checking = true;
    // Ready once painted: the frame after the DOM is complete, then the task after that frame.
    // A hidden page holds the frame back, so a later open may be in progress by then: `open` only.
    requestAnimationFrame(() =>
      setTimeout(() => {
        checking = false;
        if (paletteReady(target)) recorder.markReady(open);
      }, 0),
    );
  };
  new MutationObserver(check).observe(target, { childList: true, subtree: true });
  document.addEventListener("focusin", check);
  // Keystrokes on the page clock, so a long task after ready can be told from typing (T103).
  document.addEventListener("keydown", (event) => recorder.mark(`keydown ${event.key}`), true);

  if (!PerformanceObserver.supportedEntryTypes.includes("longtask")) recorder.longTasksUnavailable();
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // `PerformanceLongTaskTiming` is not in TypeScript's DOM library: this page, or another frame in its process.
        const blamed = (entry as { attribution?: readonly { name: string; containerType: string; containerSrc: string }[] }).attribution?.[0];
        const source = blamed ? `${blamed.name} ${blamed.containerType} ${blamed.containerSrc}`.trim() : undefined;
        recorder.longTask(entry.startTime, entry.duration, source);
      }
    }).observe({ type: "longtask", buffered: true });
  } catch (error) {
    recorder.longTasksUnavailable();
    console.error("[xref:perf-longtask]", error);
  }

  const handle: PerfHandle = { results: () => recorder.results(), clear: () => recorder.clear() };
  (window as { __xrefPerf?: PerfHandle }).__xrefPerf = handle;

  return {
    gateway: recorder.timed(ports.gateway, "gateway"),
    shell: recorder.timed(ports.shell, "shell"),
    ...(ports.settings ? { settings: recorder.timed(ports.settings, "settings") } : {}),
  };
}
