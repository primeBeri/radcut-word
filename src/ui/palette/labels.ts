import type { Heading, HeadingLocation } from "../../core/headings/types";

/** Badge text for headings outside the main text (contracts/palette-ui.md, FR-003a). */
export const LOCATION_BADGE: Record<Exclude<HeadingLocation, "main">, string> = {
  tableCell: "Table",
  textBox: "Text box",
  footnote: "Footnote",
  endnote: "Endnote",
  header: "Header",
  footer: "Footer",
};

export const UNTITLED = "(untitled heading)";

export function displayText(heading: Heading): string {
  return heading.text === "" ? UNTITLED : heading.text;
}

/** "4.3 Fire strategy" */
export function fullTitle(heading: Heading): string {
  return heading.number ? `${heading.number} ${displayText(heading)}` : displayText(heading);
}

/** "4.3 Fire strategy, level 2" or "Summary, level 1, in text box". */
export function accessibleName(heading: Heading): string {
  const where = heading.location === "main" ? "" : `, in ${LOCATION_BADGE[heading.location].toLowerCase()}`;
  return `${fullTitle(heading)}, level ${heading.level}${where}`;
}
