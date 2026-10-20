/**
 * FuzzyMatcher over 500 headings (T097, Constitution IV): each 20-character query must rank the
 * whole list in under 5 ms on average. Run with `npm run bench`, outside `npm test`.
 */
import { beforeAll, describe, expect, test } from "vitest";
import type { Heading } from "../../src/core/headings/types";
import { rankHeadings } from "../../src/core/matching/fuzzy-matcher";
import { fakeFixtures } from "../fakes/fake-documents";
import { FakeGateway } from "../fakes/fake-gateway";

const BUDGET_MS = 5;

let guide500: readonly Heading[];

beforeAll(async () => {
  guide500 = (await new FakeGateway(fakeFixtures["guide-500"]()).readHeadings()).headings;
  expect(guide500).toHaveLength(500);
});

/** 20 characters each: one that matches many headings closely, one scattered, one matching none. */
const QUERIES: Record<string, string> = {
  "close match": "numbered section 42.",
  scattered: "nbrd sctn 4 2 nt 9 x",
  "no match": "qqqqqqqqqqqqqqqqqqqq",
};

describe("rankHeadings, 500 headings, 20-character query", () => {
  for (const [name, query] of Object.entries(QUERIES)) {
    test(`${name}: under ${BUDGET_MS} ms`, async ({ bench }) => {
      expect(query).toHaveLength(20);
      const result = await bench(name, () => void rankHeadings(query, guide500)).run();
      console.info(`${name}: mean ${result.latency.mean.toFixed(3)} ms`);
      expect(result.latency.mean).toBeLessThan(BUDGET_MS);
    });
  }

  // As typed: every prefix of the query, one ranking per keystroke.
  test(`each keystroke of a 20-character query: under ${BUDGET_MS} ms per ranking`, async ({ bench }) => {
    const query = QUERIES["close match"]!;
    const result = await bench("20 keystrokes", () => {
      for (let i = 1; i <= query.length; i++) rankHeadings(query.slice(0, i), guide500);
    }).run();
    console.info(`per keystroke: mean ${(result.latency.mean / query.length).toFixed(3)} ms`);
    expect(result.latency.mean / query.length).toBeLessThan(BUDGET_MS);
  });
});
