/** Each non-literal part maps to exactly one field (research R5). */
export type FormatPart =
  | { readonly kind: "literal"; readonly text: string }
  | { readonly kind: "number" }
  | { readonly kind: "text" }
  | { readonly kind: "page" }
  | { readonly kind: "aboveBelow" };

export interface ReferenceFormat {
  /** Built-ins: text, number, numberText, sectionNumberText, page, aboveBelow, textAboveBelow. Templates: `tpl:<uuid>`. */
  readonly id: string;
  readonly label: string;
  /** Non-empty; at least one non-literal part. */
  readonly parts: readonly FormatPart[];
  readonly builtIn: boolean;
}

export type PreviewWarning = "noNumber" | "pageUnknown" | "positionUnknown";

export interface ReferencePreview {
  /** What the reference will display now, e.g. "§ 4.3 Fire strategy". */
  readonly text: string;
  readonly warnings: readonly PreviewWarning[];
}
