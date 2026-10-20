import { describe, expect, it } from "vitest";
import { median, PerfRecorder } from "../../src/dev/perf-recorder";

function clock() {
  let time = 0;
  return { now: () => time, advance: (ms: number) => (time += ms) };
}

describe("PerfRecorder", () => {
  it("times an open from the shortcut handler to ready, with each port call", async () => {
    const c = clock();
    const recorder = new PerfRecorder(c.now);
    let opened: (() => void) | null = null;
    const shell = recorder.timed(
      {
        onOpenPalette: (handler: () => void) => {
          opened = handler;
        },
        showPane: async () => {
          c.advance(30);
        },
      },
      "shell",
    );
    const gateway = recorder.timed({ checkInsertionPoint: async () => c.advance(120) }, "gateway");

    shell.onOpenPalette(() => undefined);
    c.advance(100);
    opened!();
    c.advance(5);
    await shell.showPane();
    await gateway.checkInsertionPoint();
    c.advance(10);
    recorder.markReady(recorder.waitingOpen()!);

    const [open] = recorder.results().opens;
    expect(open?.ready).toBe(165);
    expect(open?.calls).toEqual([
      { name: "shell.showPane", start: 5, end: 35, failed: false },
      { name: "gateway.checkInsertionPoint", start: 35, end: 155, failed: false },
    ]);
  });

  it("does not time calls outside an open, and records a failed call", async () => {
    const c = clock();
    const recorder = new PerfRecorder(c.now);
    const gateway = recorder.timed({ readHeadings: () => Promise.reject(new Error("busy")) }, "gateway");

    await expect(gateway.readHeadings()).rejects.toThrow("busy");
    expect(recorder.results().opens).toEqual([]);

    recorder.beginOpen();
    await expect(gateway.readHeadings()).rejects.toThrow("busy");
    expect(recorder.results().opens[0]?.calls[0]?.failed).toBe(true);
  });

  it("summarises medians of ready and of calls made before ready, and the longest task", () => {
    const c = clock();
    const recorder = new PerfRecorder(c.now);
    const gateway = recorder.timed({ read: () => c.advance(10) }, "gateway");
    for (const ready of [300, 100, 200]) {
      recorder.beginOpen();
      gateway.read();
      c.advance(ready - 10);
      recorder.markReady(recorder.waitingOpen()!);
      recorder.longTask(c.now() - 5, ready / 2);
      c.advance(50);
      gateway.read(); // background, after ready
      c.advance(1000);
    }
    recorder.longTask(c.now() + 10, 400);

    const { summary, otherLongTasks } = recorder.results();
    expect(summary).toEqual({
      openCount: 3,
      readyMedian: 200,
      readyWorst: 300,
      callMedians: { "gateway.read": 10 },
      failedCalls: 0,
      longestTask: 400,
      longTasksObserved: true,
    });
    expect(otherLongTasks).toHaveLength(1);
    expect(recorder.waitingOpen()).toBeNull();
  });

  it("counts failed calls apart and leaves them out of the medians", async () => {
    const c = clock();
    const recorder = new PerfRecorder(c.now);
    let fail = false;
    const gateway = recorder.timed(
      {
        read: async () => {
          c.advance(fail ? 1 : 100);
          if (fail) throw new Error("busy");
        },
      },
      "gateway",
    );
    recorder.beginOpen();
    await gateway.read();
    fail = true;
    await expect(gateway.read()).rejects.toThrow("busy");

    const { summary } = recorder.results();
    expect(summary.callMedians).toEqual({ "gateway.read": 100 });
    expect(summary.failedCalls).toBe(1);
  });

  it("marks ready only the open the readiness check began for", () => {
    const c = clock();
    const recorder = new PerfRecorder(c.now);
    recorder.beginOpen();
    const first = recorder.waitingOpen();
    c.advance(100);
    recorder.beginOpen(); // the pane was hidden and opened again before the check finished
    c.advance(50);
    recorder.markReady(first!);
    expect(recorder.results().opens.map((o) => o.ready)).toEqual([null, null]);

    recorder.markReady(recorder.waitingOpen()!);
    expect(recorder.results().opens.map((o) => o.ready)).toEqual([null, 50]);
  });

  it("says when long tasks could not be observed, so none is not read as none over 50 ms", () => {
    const recorder = new PerfRecorder(() => 0);
    recorder.longTasksUnavailable();
    expect(recorder.results().summary).toMatchObject({ longestTask: null, longTasksObserved: false });
  });

  it("clears what was recorded, for a warm-up", () => {
    const recorder = new PerfRecorder(() => 0);
    recorder.beginOpen();
    expect(recorder.waitingOpen()).not.toBeNull();
    recorder.clear();
    expect(recorder.results().summary.openCount).toBe(0);
  });

  it("median of an even, odd and empty list", () => {
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([5])).toBe(5);
    expect(median([])).toBeNull();
  });
});
