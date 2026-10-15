import type { FormatPart } from "./types";

export type FieldPartKind = Exclude<FormatPart["kind"], "literal">;

export interface FieldSpec {
  readonly type: "ref" | "pageRef";
  /** In field-code order, e.g. ["\\w", "\\h", "\\* CHARFORMAT"]. */
  readonly switches: readonly string[];
}

/**
 * Every field is hyperlinked (`\h`) and takes the formatting of the text it is inserted into
 * (`\* CHARFORMAT`, research R5 / FR-012a: without it a text REF shows the heading's formatting).
 */
const SPECS: Record<FieldPartKind, FieldSpec> = {
  number: { type: "ref", switches: ["\\w", "\\h", "\\* CHARFORMAT"] },
  text: { type: "ref", switches: ["\\h", "\\* CHARFORMAT"] },
  page: { type: "pageRef", switches: ["\\h", "\\* CHARFORMAT"] },
  aboveBelow: { type: "ref", switches: ["\\p", "\\h", "\\* CHARFORMAT"] },
};

/** The field one format part becomes (research R5). Shared by both gateways. */
export function fieldFor(kind: FieldPartKind): FieldSpec {
  const spec = SPECS[kind];
  return { type: spec.type, switches: [...spec.switches] };
}
