/**
 * A minimal in-browser describe/it/expect shim so the shared contract suites run inside Word's
 * WebView from the dev contract pane. Implements exactly tests/contract/test-api.ts, and times
 * each case (and named phases within it) so slow cases are easy to find.
 */
import type { ContractMatchers, ContractTestApi } from "../../tests/contract/test-api";

export interface CaseResult {
  readonly name: string;
  readonly status: "pass" | "fail" | "skip";
  /** Wall time of the case body in ms; 0 for a skipped case. */
  readonly durationMs: number;
  readonly error?: string;
  /** Time spent in named phases of the case (see `timed`), in ms. */
  readonly timings?: Readonly<Record<string, number>>;
}

/** One run of a suite, as the pane shows it and publishes it for the desktop harness. */
export interface ContractRunResults {
  readonly suite: string;
  readonly fixture: string | null;
  /** ISO 8601. */
  readonly startedAt: string;
  readonly totalMs: number;
  readonly cases: readonly CaseResult[];
}

interface RegisteredCase {
  readonly name: string;
  readonly body: () => Promise<void> | void;
  readonly skip: boolean;
}

export interface MiniTestClock {
  /** Monotonic milliseconds. */
  readonly now: () => number;
  readonly date: () => Date;
}

const systemClock: MiniTestClock = { now: () => performance.now(), date: () => new Date() };

/** The phases of the case now running; one case runs at a time. */
let running: { name: string; phases: Record<string, number>; now: () => number } | null = null;

/** The name of the case now running, if any. */
export function runningCase(): string | null {
  return running?.name ?? null;
}

/**
 * Run `work` as a named phase of the running case, adding its time to that case's `timings`
 * (repeats add up). Outside a running case it just runs `work`.
 */
export async function timed<T>(phase: string, work: () => Promise<T>): Promise<T> {
  const current = running;
  if (!current) return work();
  const start = current.now();
  try {
    return await work();
  } finally {
    current.phases[phase] = (current.phases[phase] ?? 0) + (current.now() - start);
  }
}

export class MiniTest {
  private readonly cases: RegisteredCase[] = [];
  private readonly prefix: string[] = [];

  constructor(private readonly clock: MiniTestClock = systemClock) {}

  readonly api: ContractTestApi = {
    environment: "word",
    describe: (name, body) => {
      this.prefix.push(name);
      try {
        body();
      } finally {
        this.prefix.pop();
      }
    },
    it: (name, body) => {
      this.cases.push({ name: this.fullName(name), body, skip: false });
    },
    skip: (name, body) => {
      this.cases.push({ name: this.fullName(name), body, skip: true });
    },
    expect: (actual) => matchers(actual, false),
  };

  /** Run every registered case in order, one at a time. */
  async run(
    onResult: (result: CaseResult) => void,
    about: { suite: string; fixture: string | null },
  ): Promise<ContractRunResults> {
    const startedAt = this.clock.date().toISOString();
    const runStart = this.clock.now();
    const results: CaseResult[] = [];
    for (const c of this.cases) {
      const result = c.skip ? { name: c.name, status: "skip" as const, durationMs: 0 } : await this.runCase(c);
      results.push(result);
      onResult(result);
    }
    return { ...about, startedAt, totalMs: this.clock.now() - runStart, cases: results };
  }

  private async runCase(c: RegisteredCase): Promise<CaseResult> {
    const phases: Record<string, number> = {};
    running = { name: c.name, phases, now: this.clock.now };
    const start = this.clock.now();
    let error: string | undefined;
    try {
      await c.body();
    } catch (caught) {
      error = describeError(caught);
    } finally {
      running = null;
    }
    return {
      name: c.name,
      status: error === undefined ? "pass" : "fail",
      durationMs: this.clock.now() - start,
      ...(error === undefined ? {} : { error }),
      ...(Object.keys(phases).length > 0 ? { timings: phases } : {}),
    };
  }

  private fullName(name: string): string {
    return [...this.prefix, name].join(" > ");
  }
}

/** "120 ms", "9.4 s", "3 min 14.5 s". */
function duration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)} min ${((ms % 60_000) / 1000).toFixed(1)} s`;
}

function phases(result: CaseResult): string {
  const entries = Object.entries(result.timings ?? {});
  return entries.length === 0 ? "" : ` (${entries.map(([name, ms]) => `${name} ${duration(ms)}`).join(", ")})`;
}

/** One result line: "PASS 120 ms <name>", with phase times when recorded. */
export function formatResultLine(result: CaseResult): string {
  const status = result.status.toUpperCase();
  if (result.status === "skip") return `${status} ${result.name}`;
  return `${status} ${duration(result.durationMs)} ${result.name}${phases(result)}`;
}

/** Counts and total on the first line, then the five slowest cases, slowest first. */
export function formatSummary(run: ContractRunResults): string[] {
  const count = (status: CaseResult["status"]) => run.cases.filter((c) => c.status === status).length;
  const slowest = [...run.cases]
    .filter((c) => c.status !== "skip")
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 5)
    .map((c) => `${duration(c.durationMs)} ${c.name}${phases(c)}`);
  return [
    `${count("pass")} passed, ${count("fail")} failed, ${count("skip")} skipped in ${duration(run.totalMs)}`,
    ...slowest.map((line, i) => (i === 0 ? `Slowest: ${line}` : line)),
  ];
}

function show(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function matchers(actual: unknown, negated: boolean): ContractMatchers {
  const check = (pass: boolean, message: string): void => {
    if (pass === negated) throw new Error(negated ? `Expected not: ${message}` : `Expected: ${message}`);
  };
  const base: Omit<ContractMatchers, "not"> = {
    toBe: (expected) => check(Object.is(actual, expected), `${show(actual)} to be ${show(expected)}`),
    toEqual: (expected) =>
      check(deepEqual(actual, expected), `${show(actual)} to equal ${show(expected)}`),
    toBeNull: () => check(actual === null, `${show(actual)} to be null`),
    toBeTruthy: () => check(Boolean(actual), `${show(actual)} to be truthy`),
    toMatch: (expected) =>
      check(typeof actual === "string" && expected.test(actual), `${show(actual)} to match ${expected}`),
    toHaveLength: (expected) =>
      check(
        (actual as { length?: unknown } | null)?.length === expected,
        `${show(actual)} to have length ${expected}`,
      ),
    toBeGreaterThan: (expected) =>
      check(typeof actual === "number" && actual > expected, `${show(actual)} to be greater than ${expected}`),
    toContain: (expected) =>
      check(
        (typeof actual === "string" && typeof expected === "string" && actual.includes(expected)) ||
          (Array.isArray(actual) && actual.includes(expected)),
        `${show(actual)} to contain ${show(expected)}`,
      ),
    toContainEqual: (expected) =>
      check(
        Array.isArray(actual) && actual.some((item) => deepEqual(item, expected)),
        `${show(actual)} to contain an item equal to ${show(expected)}`,
      ),
  };
  return negated ? { ...base, not: base } : { ...base, not: matchers(actual, true) };
}

/** Structural equality like Vitest's toEqual, ignoring properties whose value is undefined. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => deepEqual(item, b[i]));
  }
  const record = (o: object) => o as Record<string, unknown>;
  const keys = (o: object) => Object.keys(o).filter((k) => record(o)[k] !== undefined);
  const ka = keys(a);
  return ka.length === keys(b).length && ka.every((k) => deepEqual(record(a)[k], record(b)[k]));
}

/** The message, plus where Word failed when it says only "GeneralException" (Office.js debug info). */
function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const location = (error as { debugInfo?: { errorLocation?: unknown } } | null)?.debugInfo?.errorLocation;
  return typeof location === "string" && location !== "" ? `${message} (at ${location})` : message;
}
