/** Returns a number in [0, 1), like Math.random. Injectable so tests are deterministic. */
export type RandomSource = () => number;

const PREFIX = "_XR";
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const RANDOM_LENGTH = 10;
/** 36^10 names make a collision run this long practically impossible with a real source. */
const MAX_ATTEMPTS = 100;

/** Word treats bookmark names case-insensitively, so every comparison of names does too. */
export function sameBookmarkName(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * A new hidden bookmark name `_XR` + 10 characters from [a-z0-9] (research R6, FR-012), unique
 * case-insensitively against `existing` (every bookmark in the document, hidden ones included).
 * The name never derives from heading text or position, so it stays stable under edits.
 */
export function generateBookmarkName(existing: Iterable<string>, random: RandomSource = Math.random): string {
  const taken = new Set([...existing].map((name) => name.toLowerCase()));
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let name = PREFIX;
    for (let i = 0; i < RANDOM_LENGTH; i++) {
      name += ALPHABET[Math.floor(random() * ALPHABET.length)];
    }
    if (!taken.has(name.toLowerCase())) return name;
  }
  throw new Error(`No unused bookmark name after ${MAX_ATTEMPTS} attempts.`);
}
