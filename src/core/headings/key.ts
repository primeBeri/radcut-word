import type { Heading, HeadingKey } from "./types";

type FingerprintSource = Pick<Heading, "level" | "location" | "text">;

/** level + location + text, JSON-encoded so no field can bleed into another. */
export function headingFingerprint(heading: FingerprintSource): string {
  return JSON.stringify([heading.level, heading.location, heading.text]);
}

/**
 * Identity that survives a refresh, for keeping the palette's selection: the bookmark name
 * (case-insensitive, as Word compares them), else the fingerprint. Unlike a provisional key it
 * leaves out the order, which a refresh may change.
 */
export function headingIdentity(heading: Heading): string {
  return heading.bookmark !== null ? `b:${heading.bookmark.toLowerCase()}` : `f:${headingFingerprint(heading)}`;
}

/**
 * The heading a provisional key names in `headings` (one snapshot, in order): the one at its
 * order, if its fingerprint still matches; otherwise null (the heading has changed or gone).
 */
export function atProvisionalKey<T extends FingerprintSource>(
  headings: readonly T[],
  key: Extract<HeadingKey, { kind: "provisional" }>,
): T | null {
  const found = headings[key.order];
  return found !== undefined && headingFingerprint(found) === key.fingerprint ? found : null;
}

/** A heading with its key derived from its own fields; both gateways build headings this way. */
export function makeHeading(base: Omit<Heading, "key">): Heading {
  return { ...base, key: headingKeyFor(base) };
}

export function headingKeyFor(
  heading: FingerprintSource & Pick<Heading, "bookmark" | "order">,
): HeadingKey {
  return heading.bookmark !== null
    ? { kind: "bookmark", name: heading.bookmark }
    : { kind: "provisional", order: heading.order, fingerprint: headingFingerprint(heading) };
}
