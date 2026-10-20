/**
 * Dev-only performance runner (feature 001 T096): times each palette open from the shortcut's
 * handler to the palette being ready (search box focused, rows on screen, painted), with every
 * port call in between, and collects main-thread tasks over 50 ms (`longtask`). Loaded by
 * `main.ts` in the Vite dev server only; the desktop harness reads `window.__radcutPerf` after its
 * timing runs (tests/desktop/.../Performance/BudgetTests.cs). No Office or DOM use here: the
 * page-side wiring is `installPerfRecorder` in `perf-pane.ts`.
 */
import type { IHostShell } from "../core/ports/host-shell";

/** The shell methods whose handlers start an open; typed, so a renamed one fails to compile rather than going untimed. */
const OPEN_HANDLERS: readonly PropertyKey[] = ["onOpenPalette", "onOpenSettings"] satisfies readonly (keyof IHostShell)[];

export interface PerfCall {
  readonly name: string;
  /** Milliseconds from the open's start. */
  readonly start: number;
  readonly end: number;
  readonly failed: boolean;
}

export interface PerfTask {
  /** Milliseconds from the open's start, or from page load when outside an open. */
  readonly start: number;
  readonly duration: number;
  /** The frame the browser blames for it (`attribution`), when it says. */
  readonly source?: string;
}

export interface PerfOpen {
  /** Page time the open started, to line it up with `otherLongTasks` and `marks`. */
  readonly at: number;
  /** Milliseconds from the shortcut's handler to ready, or null if it never became ready. */
  readonly ready: number | null;
  readonly calls: readonly PerfCall[];
  readonly longTasks: readonly PerfTask[];
}

export interface PerfSummary {
  readonly openCount: number;
  readonly readyMedian: number | null;
  readonly readyWorst: number | null;
  /** Median duration of each port call that succeeded before ready, by name. */
  readonly callMedians: Readonly<Record<string, number>>;
  /** Port calls before ready that failed (left out of the medians, where a quick failure would look fast). */
  readonly failedCalls: number;
  /** Null if there were none, or if they could not be observed (see `longTasksObserved`). */
  readonly longestTask: number | null;
  readonly longTasksObserved: boolean;
}

/** Something that happened in the page (a keystroke), at page time. */
export interface PerfMark {
  readonly name: string;
  readonly at: number;
}

export interface PerfResults {
  readonly opens: readonly PerfOpen[];
  /** Long tasks outside any open (typing, background refresh), from page load. */
  readonly otherLongTasks: readonly PerfTask[];
  readonly marks: readonly PerfMark[];
  readonly summary: PerfSummary;
}

interface OpenInProgress {
  readonly id: number;
  readonly start: number;
  ready: number | null;
  readonly calls: PerfCall[];
  readonly longTasks: PerfTask[];
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export class PerfRecorder {
  private readonly opens: OpenInProgress[] = [];
  private readonly otherTasks: PerfTask[] = [];
  private readonly marks: PerfMark[] = [];
  private nextId = 0;
  private longTasksObserved = true;

  constructor(private readonly now: () => number) {}

  /** The shortcut's (or ribbon's) handler started an open; an earlier one still waiting is left never ready. */
  beginOpen(): void {
    this.opens.push({ id: this.nextId++, start: this.now(), ready: null, calls: [], longTasks: [] });
  }

  /** The palette is ready for open `id` (from `waitingOpen`); later calls are background work. A newer open ignores it. */
  markReady(id: number): void {
    const open = this.current();
    if (open && open.id === id && open.ready === null) open.ready = this.now() - open.start;
  }

  /** The open waiting to become ready, or null. */
  waitingOpen(): number | null {
    const open = this.current();
    return open !== null && open.ready === null ? open.id : null;
  }

  /** Note `name` at the current page time, for placing long tasks outside an open. */
  mark(name: string): void {
    this.marks.push({ name, at: this.now() });
  }

  /** The page cannot report long tasks, so `longestTask` means nothing. */
  longTasksUnavailable(): void {
    this.longTasksObserved = false;
  }

  /** A main-thread task over 50 ms that started at `start` (page time) and took `duration`. */
  longTask(start: number, duration: number, source?: string): void {
    const open = this.current();
    const blamed = source === undefined ? {} : { source };
    if (open && start >= open.start && (open.ready === null || start - open.start <= open.ready)) {
      open.longTasks.push({ start: start - open.start, duration, ...blamed });
    } else {
      this.otherTasks.push({ start, duration, ...blamed });
    }
  }

  /**
   * `target` with each method timed against the open in progress: a call made outside an open
   * runs untimed. `onOpenPalette` and `onOpenSettings` handlers start an open first.
   */
  timed<T extends object>(target: T, label: string): T {
    return new Proxy(target, {
      get: (object, property, receiver) => {
        const value: unknown = Reflect.get(object, property, receiver);
        if (typeof value !== "function") return value;
        const name = `${label}.${String(property)}`;
        const method = value as (...args: unknown[]) => unknown;
        if (OPEN_HANDLERS.includes(property)) {
          return (handler: () => void) =>
            method.call(object, () => {
              this.beginOpen();
              handler();
            });
        }
        return (...args: unknown[]) => this.call(name, () => method.apply(object, args));
      },
    });
  }

  results(): PerfResults {
    const opens: PerfOpen[] = this.opens.map((o) => ({ at: o.start, ready: o.ready, calls: [...o.calls], longTasks: [...o.longTasks] }));
    const ready = opens.map((o) => o.ready).filter((r): r is number => r !== null);
    const byName = new Map<string, number[]>();
    let failedCalls = 0;
    for (const open of opens) {
      for (const call of open.calls) {
        if (open.ready !== null && call.start > open.ready) continue;
        if (call.failed) failedCalls++;
        else byName.set(call.name, [...(byName.get(call.name) ?? []), call.end - call.start]);
      }
    }
    const tasks = [...opens.flatMap((o) => o.longTasks), ...this.otherTasks].map((t) => t.duration);
    return {
      opens,
      otherLongTasks: [...this.otherTasks],
      marks: [...this.marks],
      summary: {
        openCount: opens.length,
        readyMedian: median(ready),
        readyWorst: ready.length > 0 ? Math.max(...ready) : null,
        callMedians: Object.fromEntries([...byName].map(([name, times]) => [name, median(times)!])),
        failedCalls,
        longestTask: tasks.length > 0 ? Math.max(...tasks) : null,
        longTasksObserved: this.longTasksObserved,
      },
    };
  }

  /** Drop everything recorded so far, so a measurement can leave out its warm-up. */
  clear(): void {
    this.opens.length = 0;
    this.otherTasks.length = 0;
    this.marks.length = 0;
  }

  private current(): OpenInProgress | null {
    return this.opens.at(-1) ?? null;
  }

  private call(name: string, run: () => unknown): unknown {
    const open = this.current();
    if (!open) return run();
    const start = this.now() - open.start;
    const record = (failed: boolean) => open.calls.push({ name, start, end: this.now() - open.start, failed });
    let result: unknown;
    try {
      result = run();
    } catch (error) {
      record(true);
      throw error;
    }
    if (result instanceof Promise) {
      return result.then(
        (value: unknown) => {
          record(false);
          return value;
        },
        (error: unknown) => {
          record(true);
          throw error;
        },
      );
    }
    record(false);
    return result;
  }
}
