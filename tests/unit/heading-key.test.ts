import { describe, expect, it } from "vitest";
import { headingFingerprint, headingKeyFor } from "../../src/core/headings/key";

describe("heading keys", () => {
  it("fingerprint combines level, location and text", () => {
    const a = headingFingerprint({ level: 2, location: "main", text: "Fire strategy" });
    expect(a).toBe(headingFingerprint({ level: 2, location: "main", text: "Fire strategy" }));
    expect(a).not.toBe(headingFingerprint({ level: 3, location: "main", text: "Fire strategy" }));
    expect(a).not.toBe(headingFingerprint({ level: 2, location: "footnote", text: "Fire strategy" }));
    expect(a).not.toBe(headingFingerprint({ level: 2, location: "main", text: "Fire strategies" }));
  });

  it("fingerprint cannot be forged by moving text between fields", () => {
    expect(headingFingerprint({ level: 1, location: "main", text: "1|x" })).not.toBe(
      headingFingerprint({ level: 1, location: "main", text: "1" }) + "|x",
    );
  });

  it("uses the bookmark as key when the heading has one", () => {
    const key = headingKeyFor({ level: 1, location: "main", text: "Scope", bookmark: "_Ref1", order: 4 });
    expect(key).toEqual({ kind: "bookmark", name: "_Ref1" });
  });

  it("uses a provisional key with order and fingerprint otherwise", () => {
    const heading = { level: 1, location: "main", text: "Scope", bookmark: null, order: 4 } as const;
    expect(headingKeyFor(heading)).toEqual({
      kind: "provisional",
      order: 4,
      fingerprint: headingFingerprint(heading),
    });
  });
});
