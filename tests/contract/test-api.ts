/**
 * The small test API the shared contract suites use, so the same suite runs under Vitest in
 * Node and under the in-browser shim (src/dev/mini-test.ts) inside Word.
 */
export interface ContractMatchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeNull(): void;
  toBeTruthy(): void;
  toMatch(expected: RegExp): void;
  toHaveLength(expected: number): void;
  toBeGreaterThan(expected: number): void;
  /** Substring of a string, or an array item by identity. */
  toContain(expected: unknown): void;
  /** An array item structurally equal to `expected`. */
  toContainEqual(expected: unknown): void;
  readonly not: Omit<ContractMatchers, "not">;
}

export interface ContractTestApi {
  /** "word" runs Word-only cases; "node" registers them as skipped. */
  readonly environment: "node" | "word";
  describe(name: string, body: () => void): void;
  it(name: string, body: () => Promise<void> | void): void;
  /** Register a case that is not run in this environment. */
  skip(name: string, body: () => Promise<void> | void): void;
  expect(actual: unknown): ContractMatchers;
}
