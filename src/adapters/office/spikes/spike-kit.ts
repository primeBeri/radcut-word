/**
 * Shared helpers for the dev-only feasibility spikes (research R3–R9). Spikes call Office.js
 * directly, which is why they live in the adapter layer; the release build excludes this folder.
 */

export type Log = (label: string, value?: unknown) => void;

export interface Spike {
  readonly id: string;
  readonly label: string;
  /** What to do by hand before or after running, shown next to the button. */
  readonly instructions?: string;
  run(log: Log): Promise<void>;
}

export const HEADING_STYLES: readonly string[] = [
  "Heading1",
  "Heading2",
  "Heading3",
  "Heading4",
  "Heading5",
  "Heading6",
  "Heading7",
  "Heading8",
  "Heading9",
];

export function isHeadingParagraph(p: Word.Paragraph): boolean {
  return HEADING_STYLES.includes(p.styleBuiltIn) || (p.outlineLevel >= 1 && p.outlineLevel <= 9);
}

/** Requirement sets the plan depends on, checked at runtime. */
export function requirementSupport(): Record<string, boolean> {
  const sets: [string, string][] = [
    ["WordApi", "1.3"],
    ["WordApi", "1.4"],
    ["WordApi", "1.5"],
    ["WordApi", "1.6"],
    ["WordApiDesktop", "1.2"],
    ["WordApiDesktop", "1.4"],
    ["SharedRuntime", "1.1"],
    ["KeyboardShortcuts", "1.1"],
    ["DialogApi", "1.2"],
  ];
  return Object.fromEntries(
    sets.map(([name, version]) => [`${name} ${version}`, Office.context.requirements.isSetSupported(name, version)]),
  );
}

/** A random hidden bookmark name in the planned scheme (`_RC` + 10 of [a-z0-9]). */
export function spikeBookmarkName(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let i = 0; i < 10; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `_RC${suffix}`;
}

/** First heading paragraph in the main body whose trimmed text equals `text`. */
export async function findHeading(context: Word.RequestContext, text: string): Promise<Word.Paragraph> {
  const paragraphs = context.document.body.paragraphs;
  paragraphs.load("items/text,items/styleBuiltIn,items/outlineLevel");
  await context.sync();
  const found = paragraphs.items.find((p) => p.text.trim() === text && isHeadingParagraph(p));
  if (!found) throw new Error(`No heading "${text}" in the main text. Open the right fixture.`);
  return found;
}

/** Times an async step in milliseconds. */
export async function timed<T>(step: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const start = performance.now();
  const value = await step();
  return { value, ms: Math.round(performance.now() - start) };
}
