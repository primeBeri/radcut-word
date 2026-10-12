/** A REF or PAGEREF field code split into its parts. */
export interface ParsedFieldCode {
  readonly bookmark: string | null;
  /** e.g. ["\w", "\h", "\* CHARFORMAT"]; "\*" is joined with its argument. */
  readonly switches: readonly string[];
}

/**
 * Parse " REF _RC… \w \h \* CHARFORMAT ". Word's field code text can carry control characters
 * (field marks such as \u0001, \u0013, \u0014), which are dropped first.
 */
export function parseFieldCode(code: string): ParsedFieldCode {
  // eslint-disable-next-line no-control-regex -- Word's field marks are control characters.
  const tokens = code.replace(/[\u0000-\u001f]/g, " ").trim().split(/\s+/);
  const switches: string[] = [];
  for (let i = 2; i < tokens.length; i++) {
    const token = tokens[i]!;
    switches.push(token === "\\*" && tokens[i + 1] ? `${token} ${tokens[++i]}` : token);
  }
  return { bookmark: tokens[1] ?? null, switches };
}
