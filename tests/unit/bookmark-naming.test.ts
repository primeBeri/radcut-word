import { describe, expect, it } from "vitest";
import { generateBookmarkName } from "../../src/core/bookmarks/naming";

/** Deterministic random source cycling through the given values in [0, 1). */
function sequence(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length] as number;
}

describe("bookmark naming", () => {
  it("generates names matching ^_RC[a-z0-9]{10}$ (13 characters, within Word's 40)", () => {
    for (let i = 0; i < 200; i++) {
      const name = generateBookmarkName([]);
      expect(name).toMatch(/^_RC[a-z0-9]{10}$/);
      expect(name.length).toBeLessThanOrEqual(40);
    }
  });

  it("is unique case-insensitively against every bookmark in the document including hidden ones", () => {
    // 0 maps to "a" for every character, so the first candidate is _RCaaaaaaaaaa.
    const first = generateBookmarkName([], sequence(0));
    expect(first).toBe("_RCaaaaaaaaaa");
    const name = generateBookmarkName(["_rcAAAAAAAAAA", "_Toc1", "Alpha"], sequence(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.99));
    expect(name.toLowerCase()).not.toBe("_rcaaaaaaaaaa");
    expect(name).toMatch(/^_RC[a-z0-9]{10}$/);
  });

  it("regenerates on collision", () => {
    const taken = ["_RCaaaaaaaaaa"];
    // First ten draws collide; the next ten give "9999999999".
    const random = sequence(...Array<number>(10).fill(0), ...Array<number>(10).fill(0.999));
    expect(generateBookmarkName(taken, random)).toBe("_RC9999999999");
  });

  it("gives up rather than looping forever when the random source never escapes collisions", () => {
    expect(() => generateBookmarkName(["_RCaaaaaaaaaa"], sequence(0))).toThrow();
  });

  it("never derives the name from heading text or position", () => {
    // The generator takes only existing names and a random source; same inputs, same output.
    const a = generateBookmarkName([], sequence(0.5));
    const b = generateBookmarkName([], sequence(0.5));
    expect(a).toBe(b);
    expect(generateBookmarkName.length).toBeLessThanOrEqual(2);
  });
});
