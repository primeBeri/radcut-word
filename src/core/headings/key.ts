import type { Heading, HeadingKey } from "./types";

type FingerprintSource = Pick<Heading, "level" | "location" | "text">;

/** level + location + text, JSON-encoded so no field can bleed into another. */
export function headingFingerprint(heading: FingerprintSource): string {
  return JSON.stringify([heading.level, heading.location, heading.text]);
}

export function headingKeyFor(
  heading: FingerprintSource & Pick<Heading, "bookmark" | "order">,
): HeadingKey {
  return heading.bookmark !== null
    ? { kind: "bookmark", name: heading.bookmark }
    : { kind: "provisional", order: heading.order, fingerprint: headingFingerprint(heading) };
}
