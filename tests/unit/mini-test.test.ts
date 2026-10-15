import { describe, expect, it } from "vitest";
import { formatResultLine, formatSummary, MiniTest, timed, type ContractRunResults } from "../../src/dev/mini-test";

/** A clock that moves only when told, so durations are exact. */
function fakeClock() {
  let now = 1000;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

const START = new Date("2026-10-15T09:00:00.000Z");

function runner(clock = fakeClock()) {
  return { clock, mini: new MiniTest({ now: clock.now, date: () => START }) };
}

describe("MiniTest results", () => {
  it("gives each case its name, status and duration, and an error only on failure", async () => {
    const { clock, mini } = runner();
    mini.api.describe("Suite", () => {
      mini.api.it("passes", () => clock.advance(40));
      mini.api.it("fails", () => {
        clock.advance(15);
        throw new Error("boom");
      });
      mini.api.skip("skipped", () => clock.advance(999));
    });

    const run = await mini.run(() => {}, { suite: "S", fixture: "spec-contract.docx" });

    expect(run.cases).toEqual([
      { name: "Suite > passes", status: "pass", durationMs: 40 },
      { name: "Suite > fails", status: "fail", durationMs: 15, error: "boom" },
      { name: "Suite > skipped", status: "skip", durationMs: 0 },
    ]);
    expect(run.cases[0]).not.toHaveProperty("error");
  });

  it("returns the run with suite, fixture, start time and total", async () => {
    const { clock, mini } = runner();
    mini.api.it("a", () => clock.advance(10));
    mini.api.it("b", () => clock.advance(20));

    const run = await mini.run(() => {}, { suite: "S", fixture: null });

    expect(run).toMatchObject({ suite: "S", fixture: null, startedAt: "2026-10-15T09:00:00.000Z", totalMs: 30 });
    expect(run.cases.map((c) => c.name)).toEqual(["a", "b"]);
  });

  it("reports each result as it finishes", async () => {
    const { mini } = runner();
    mini.api.it("a", () => {});
    mini.api.it("b", () => {});
    const seen: string[] = [];

    await mini.run((result) => seen.push(result.name), { suite: "S", fixture: null });

    expect(seen).toEqual(["a", "b"]);
  });
});

describe("timed phases", () => {
  it("adds phase times to the running case only, summing repeats", async () => {
    const { clock, mini } = runner();
    mini.api.it("restores and reads", async () => {
      await timed("restore", async () => clock.advance(300));
      await timed("state", async () => clock.advance(20));
      await timed("state", async () => clock.advance(5));
    });
    mini.api.it("reads only", async () => {
      await timed("select", async () => clock.advance(7));
    });

    const run = await mini.run(() => {}, { suite: "S", fixture: null });

    expect(run.cases[0]!.timings).toEqual({ restore: 300, state: 25 });
    expect(run.cases[1]!.timings).toEqual({ select: 7 });
  });

  it("records the time of a phase that throws, and passes the error on", async () => {
    const { clock, mini } = runner();
    mini.api.it("fails in a phase", async () => {
      await timed("restore", async () => {
        clock.advance(12);
        throw new Error("restore failed");
      });
    });

    const run = await mini.run(() => {}, { suite: "S", fixture: null });

    expect(run.cases[0]).toMatchObject({ status: "fail", error: "restore failed", timings: { restore: 12 } });
  });

  it("does nothing outside a running case and returns the work's value", async () => {
    expect(await timed("restore", async () => 42)).toBe(42);
  });
});

describe("formatting", () => {
  const run: ContractRunResults = {
    suite: "S",
    fixture: null,
    startedAt: START.toISOString(),
    totalMs: 194_500,
    cases: [
      { name: "fast", status: "pass", durationMs: 120 },
      { name: "slow", status: "fail", durationMs: 9_400, error: "x", timings: { restore: 8_000, state: 900 } },
      { name: "skipped", status: "skip", durationMs: 0 },
      { name: "a", status: "pass", durationMs: 2_000 },
      { name: "b", status: "pass", durationMs: 3_000 },
      { name: "c", status: "pass", durationMs: 4_000 },
      { name: "d", status: "pass", durationMs: 1_000 },
    ],
  };

  it("shows each result line with its duration", () => {
    expect(formatResultLine(run.cases[0]!)).toBe("PASS 120 ms fast");
    expect(formatResultLine(run.cases[1]!)).toBe("FAIL 9.4 s slow (restore 8.0 s, state 900 ms)");
    expect(formatResultLine(run.cases[2]!)).toBe("SKIP skipped");
  });

  it("summarises counts, total and the five slowest cases", () => {
    expect(formatSummary(run)).toEqual([
      "5 passed, 1 failed, 1 skipped in 3 min 14.5 s",
      "Slowest: 9.4 s slow (restore 8.0 s, state 900 ms)",
      "4.0 s c",
      "3.0 s b",
      "2.0 s a",
      "1.0 s d",
    ]);
  });
});
