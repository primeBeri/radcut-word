import type { FormatPart } from "../../core/formats/types";

/** What each part shows for the sample heading "4.3 Fire strategy" on page 12, above the cursor. */
const SAMPLE: Record<Exclude<FormatPart["kind"], "literal">, string> = {
  number: "4.3",
  text: "Fire strategy",
  page: "12",
  aboveBelow: "above",
};

/** A format's sample preview in the default-format list, e.g. "§ 4.3 Fire strategy". */
export function samplePreview(parts: readonly FormatPart[]): string {
  return parts.map((part) => (part.kind === "literal" ? part.text : SAMPLE[part.kind])).join("");
}
