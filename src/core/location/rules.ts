import type {
  Declined,
  InsertionPoint,
  LocationFacts,
  LocationPolicy,
  SelectionExtent,
} from "./types";

/**
 * Decide whether a reference may go at the cursor (FR-001a, FR-001b). Both gateways read raw
 * facts and call this, so the rules exist once.
 */
export function classifyLocation(
  _facts: LocationFacts,
  _selection: SelectionExtent,
  _policy: LocationPolicy,
): InsertionPoint | Declined {
  throw new Error("classifyLocation is not implemented yet (T043).");
}
