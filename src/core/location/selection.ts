import type { SelectionClass, SelectionFacts } from "./types";

/**
 * Classify the selection from raw counts (FR-001a, FR-008a, FR-008b). A table anywhere in it wins
 * (it is declined), then being inside a field, then being inside a plain-text content control
 * (declined: Word allows no fields there). A whole content control counts as an object however
 * Word reports it. A whole paragraph including its mark counts as one paragraph in Word
 * (spike 1), so it is inline.
 */
export function classifySelection(facts: SelectionFacts): SelectionClass {
  if (facts.tableCount > 0) return "table";
  if (facts.insideField) return "field";
  const control = facts.containingControl;
  if (control?.kind === "plainText" && !control.whole) return "plainTextControl";
  const wholeControl = control?.whole === true && facts.contentControlCount === 0 ? 1 : 0;
  const objects = facts.pictureCount + facts.shapeCount + facts.contentControlCount + wholeControl;
  if (facts.paragraphCount > 1 || objects > 0) return "extended";
  return facts.isEmpty ? "none" : "inline";
}
