import type { ReferenceFormat } from "../../core/formats/types";
import type { Heading } from "../../core/headings/types";
import type { Confirmation, InsertionPoint } from "../../core/location/types";
import type { ConfirmationWarning, MessageId } from "../../core/messages";

/** What happened after the palette asked to insert. */
export type PaletteFeedback =
  /** Inserted; the app closes the palette. */
  | { readonly kind: "closed" }
  /** The selection is extended, or inside a field, and was not confirmed (FR-008a, FR-008b). */
  | { readonly kind: "needsConfirmation"; readonly confirm: Confirmation; readonly message: ConfirmationWarning }
  /** Nothing inserted; show the message and stay open. */
  | { readonly kind: "message"; readonly message: MessageId };

export interface PaletteProps {
  /** The headings to offer, already filtered, in story order. May be replaced by a refresh. */
  headings: readonly Heading[];
  format: ReferenceFormat;
  point: InsertionPoint;
  /** Insert a reference to `heading`; `confirmed` names the warning the second Enter confirmed, if any. */
  insert: (heading: Heading, confirmed: Confirmation | null) => Promise<PaletteFeedback>;
  /** Esc: close with no change. */
  cancel: () => void;
  /** Ctrl+, or the cog (FR-021a). */
  openSettings?: () => void;
}
