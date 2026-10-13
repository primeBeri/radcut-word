import { describe, expect, it } from "vitest";
import { atProvisionalKey, headingFingerprint, headingIdentity, headingKeyFor, makeHeading } from "../../src/core/headings/key";
import type { HeadingKey } from "../../src/core/headings/types";

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

describe("headingIdentity", () => {
  const base = { level: 2, location: "main", text: "Scope", number: "1.1", order: 4 } as const;

  it("survives a refresh that moves the heading, and ignores bookmark case", () => {
    expect(headingIdentity(makeHeading({ ...base, bookmark: null }))).toBe(
      headingIdentity(makeHeading({ ...base, order: 9, bookmark: null })),
    );
    expect(headingIdentity(makeHeading({ ...base, bookmark: "_Ref1" }))).toBe(
      headingIdentity(makeHeading({ ...base, text: "Renamed", bookmark: "_REF1" })),
    );
  });

  it("tells headings with different text, level or location apart", () => {
    const scope = headingIdentity(makeHeading({ ...base, bookmark: null }));
    expect(headingIdentity(makeHeading({ ...base, text: "Scopes", bookmark: null }))).not.toBe(scope);
    expect(headingIdentity(makeHeading({ ...base, level: 3, bookmark: null }))).not.toBe(scope);
    expect(headingIdentity(makeHeading({ ...base, location: "footnote", bookmark: null }))).not.toBe(scope);
  });
});

describe("makeHeading", () => {
  it("derives the key from the heading's own fields", () => {
    const base = { level: 2, location: "main", text: "Scope", number: "1.1", order: 4 } as const;
    expect(makeHeading({ ...base, bookmark: "_Ref1" }).key).toEqual({ kind: "bookmark", name: "_Ref1" });
    expect(makeHeading({ ...base, bookmark: null })).toEqual({
      ...base,
      bookmark: null,
      key: { kind: "provisional", order: 4, fingerprint: headingFingerprint(base) },
    });
  });
});

describe("atProvisionalKey", () => {
  const base = { level: 2, location: "main", number: null, bookmark: null } as const;
  const list = [makeHeading({ ...base, text: "Scope", order: 0 }), makeHeading({ ...base, text: "Fire", order: 1 })];

  it("finds the heading at the key's order while its fingerprint still matches", () => {
    expect(atProvisionalKey(list, list[1]!.key as Extract<HeadingKey, { kind: "provisional" }>)).toBe(list[1]);
  });

  it("finds nothing once the heading at that order has changed, or past the end", () => {
    const stale = { kind: "provisional", order: 1, fingerprint: headingFingerprint({ ...base, text: "Fire!" }) } as const;
    expect(atProvisionalKey(list, stale)).toBeNull();
    expect(atProvisionalKey(list, { ...stale, order: 5 })).toBeNull();
  });
});
