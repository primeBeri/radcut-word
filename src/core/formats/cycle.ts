import type { InsertionLocation } from "../location/types";
import { BUILT_IN_FORMATS, DEFAULT_FORMAT_ID } from "./built-ins";
import type { ReferenceFormat } from "./types";

/** Word shows the heading text for `\p` with the cursor here, not "above"/"below" (FR-016a, spike 4). */
const NO_ABOVE_BELOW: ReadonlySet<InsertionLocation> = new Set(["footnote", "endnote", "header", "footer", "textBox"]);

/** Whether formats with an above/below part are left out with the cursor here (FR-016a). */
export function hidesAboveBelow(location: InsertionLocation): boolean {
  return NO_ABOVE_BELOW.has(location);
}

/**
 * The Tab cycle at this cursor location (FR-015, FR-016a): `formats` in their order (built-ins,
 * then templates in creation order), less those with an above/below part where Word cannot show it.
 */
export function offeredFormats(formats: readonly ReferenceFormat[], location: InsertionLocation): readonly ReferenceFormat[] {
  if (!hidesAboveBelow(location)) return formats;
  return formats.filter((f) => !f.parts.some((p) => p.kind === "aboveBelow"));
}

/** Tab (+1) or Shift+Tab (-1) from `currentId`, wrapping at both ends; the first format if it is not in the cycle. */
export function stepFormat(cycle: readonly ReferenceFormat[], currentId: string, delta: 1 | -1): ReferenceFormat {
  const at = cycle.findIndex((f) => f.id === currentId);
  if (at < 0) return cycle[0]!;
  return cycle[(at + delta + cycle.length) % cycle.length]!;
}

/**
 * The format the palette opens on (FR-017, FR-016a): the default, or § number text if the default
 * names no format (a deleted template); if that is not offered here, the next offered one after it.
 */
export function openingFormat(
  formats: readonly ReferenceFormat[],
  location: InsertionLocation,
  defaultId: string,
): ReferenceFormat {
  const all = formats.length > 0 ? formats : BUILT_IN_FORMATS;
  const offered = new Set(offeredFormats(all, location));
  let start = all.findIndex((f) => f.id === defaultId);
  if (start < 0) start = Math.max(0, all.findIndex((f) => f.id === DEFAULT_FORMAT_ID));
  for (let step = 0; step < all.length; step++) {
    const format = all[(start + step) % all.length]!;
    if (offered.has(format)) return format;
  }
  // Only reachable if every format has an above/below part, which the built-ins never do.
  return all[start]!;
}
