import { generateBookmarkName, type RandomSource } from "../bookmarks/naming";
import type { FormatPart } from "../formats/types";
import type { HeadingIndex } from "../headings/heading-index";
import { headingFingerprint } from "../headings/key";
import type { Heading } from "../headings/types";
import type { LocationPolicy } from "../location/types";
import type { MessageId } from "../messages";
import type { IDocumentGateway, InsertedReference } from "../ports/document-gateway";
import type { IHostShell } from "../ports/host-shell";

export interface InsertReferenceDeps {
  readonly gateway: IDocumentGateway;
  readonly index: HeadingIndex;
  /** The pane is hidden before the caret is returned; that order is what gives Word keyboard focus (spike 1). */
  readonly shell: Pick<IHostShell, "hidePane">;
  readonly random?: RandomSource;
}

export interface InsertReferenceInput {
  /** As listed in the palette. */
  readonly target: Heading;
  readonly parts: readonly FormatPart[];
  readonly policy: LocationPolicy;
  /** True only on the second Enter after the selection or field warning (FR-008a, FR-008b). */
  readonly confirmExtendedSelection: boolean;
}

export type InsertReferenceOutcome =
  | {
      readonly kind: "inserted";
      readonly reference: InsertedReference;
      readonly bookmark: string;
      readonly bookmarkCreated: boolean;
    }
  | { readonly kind: "needsConfirmation"; readonly message: "selectionWarning" | "fieldWarning" }
  | { readonly kind: "message"; readonly message: MessageId };

/**
 * Insert a reference to `target` at Word's current selection (FR-008–FR-014). The gateway does
 * the one-transaction write; this decides the new bookmark name and turns every outcome into
 * something the palette can show. The add-in only ever names the target and one new bookmark,
 * so it cannot touch bookmarks it did not choose or create (FR-011a).
 */
export async function insertReference(
  deps: InsertReferenceDeps,
  input: InsertReferenceInput,
): Promise<InsertReferenceOutcome> {
  const existing = await deps.gateway.listBookmarkNames();
  const result = await deps.gateway.insertReference({
    target: input.target.key,
    expectedFingerprint: headingFingerprint(input.target),
    parts: input.parts,
    newBookmarkName: generateBookmarkName(existing, deps.random),
    policy: input.policy,
    confirmExtendedSelection: input.confirmExtendedSelection,
  });

  if (result.ok) {
    await deps.shell.hidePane();
    await deps.gateway.returnFocus(result.reference);
    return {
      kind: "inserted",
      reference: result.reference,
      bookmark: result.bookmark,
      bookmarkCreated: result.bookmarkCreated,
    };
  }
  switch (result.reason) {
    case "needsConfirmation":
      return { kind: "needsConfirmation", message: result.confirm === "field" ? "fieldWarning" : "selectionWarning" };
    case "declined":
      return { kind: "message", message: result.declined.reason };
    case "staleTarget":
      await deps.index.refresh();
      return { kind: "message", message: "staleTarget" };
    case "hostError":
      return { kind: "message", message: result.partialWrite ? "hostErrorPartial" : "hostError" };
  }
}
