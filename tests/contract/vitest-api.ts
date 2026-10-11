import { describe, expect, it } from "vitest";
import type { ContractTestApi } from "./test-api";

/** ContractTestApi backed by Vitest, for the Node runners. */
export const vitestApi: ContractTestApi = {
  environment: "node",
  describe,
  it: (name, body) => it(name, body),
  skip: (name, body) => it.skip(name, body),
  expect: (actual) => expect(actual),
};
