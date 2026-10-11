import type { SelectionClass, SelectionFacts } from "./types";

/**
 * Classify the selection from raw counts (FR-008a, FR-008b). A table anywhere in it wins (it is
 * declined), then being inside a field. A whole paragraph including its mark counts as one
 * paragraph in Word (spike 1), so it is inline.
 */
export function classifySelection(facts: SelectionFacts): SelectionClass {
  if (facts.tableCount > 0) return "table";
  if (facts.insideField) return "field";
  const objects = facts.pictureCount + facts.shapeCount + facts.contentControlCount;
  if (facts.paragraphCount > 1 || objects > 0) return "extended";
  return facts.isEmpty ? "none" : "inline";
}
