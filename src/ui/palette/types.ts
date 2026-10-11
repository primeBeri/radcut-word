import type { ReferenceFormat } from "../../core/formats/types";
import type { Heading } from "../../core/headings/types";
import type { InsertionPoint } from "../../core/location/types";
import type { MessageId } from "../../core/messages";

/** A warning that a second Enter confirms. */
export type Warning = Extract<MessageId, "selectionWarning" | "fieldWarning">;

/** What happened after the palette asked to insert. */
export type PaletteFeedback =
  /** Inserted; the app closes the palette. */
  | { readonly kind: "closed" }
  /** The selection is extended, or inside a field, and was not confirmed (FR-008a, FR-008b). */
  | { readonly kind: "needsConfirmation"; readonly message: Warning }
  /** Nothing inserted; show the message and stay open. */
  | { readonly kind: "message"; readonly message: MessageId };

export interface PaletteProps {
  /** The headings to offer, already filtered, in story order. May be replaced by a refresh. */
  headings: readonly Heading[];
  format: ReferenceFormat;
  point: InsertionPoint;
  /** Insert a reference to `heading`; `confirmed` is true only on the second Enter after the warning. */
  insert: (heading: Heading, confirmed: boolean) => Promise<PaletteFeedback>;
  /** Esc: close with no change. */
  cancel: () => void;
  /** Ctrl+, or the cog (FR-021a). */
  openSettings?: () => void;
  /** A message to show on open, e.g. after a refresh caused by a stale target. */
  message?: MessageId | null;
}
