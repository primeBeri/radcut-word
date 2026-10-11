/**
 * A minimal in-browser describe/it/expect shim so the shared contract suites run inside Word's
 * WebView from the dev contract pane. Implements exactly tests/contract/test-api.ts.
 */
import type { ContractMatchers, ContractTestApi } from "../../tests/contract/test-api";

export interface CaseResult {
  readonly name: string;
  readonly status: "pass" | "fail" | "skip";
  readonly error?: string;
}

interface RegisteredCase {
  readonly name: string;
  readonly body: () => Promise<void> | void;
  readonly skip: boolean;
}

export class MiniTest {
  private readonly cases: RegisteredCase[] = [];
  private readonly prefix: string[] = [];

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
  async run(onResult: (result: CaseResult) => void): Promise<CaseResult[]> {
    const results: CaseResult[] = [];
    for (const c of this.cases) {
      let result: CaseResult;
      if (c.skip) result = { name: c.name, status: "skip" };
      else {
        try {
          await c.body();
          result = { name: c.name, status: "pass" };
        } catch (error) {
          result = {
            name: c.name,
            status: "fail",
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
      results.push(result);
      onResult(result);
    }
    return results;
  }

  private fullName(name: string): string {
    return [...this.prefix, name].join(" > ");
  }
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
          (Array.isArray(actual) && actual.some((item) => deepEqual(item, expected))),
        `${show(actual)} to contain ${show(expected)}`,
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
