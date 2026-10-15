import { generateBookmarkName, type RandomSource } from "../bookmarks/naming";
import type { FormatPart } from "../formats/types";
import type { HeadingIndex } from "../headings/heading-index";
import { headingFingerprint } from "../headings/key";
import type { Heading } from "../headings/types";
import type { Confirmation, LocationPolicy } from "../location/types";
import { warningFor, type ConfirmationWarning, type MessageId } from "../messages";
import type { IDocumentGateway, InsertedReference, InsertReferenceResult } from "../ports/document-gateway";
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
  /** The warning confirmed by the second Enter, if any (FR-008a, FR-008b). */
  readonly confirmed: Confirmation | null;
}

export type InsertReferenceOutcome =
  | {
      readonly kind: "inserted";
      readonly reference: InsertedReference;
      readonly bookmark: string;
      readonly bookmarkCreated: boolean;
    }
  | { readonly kind: "needsConfirmation"; readonly confirm: Confirmation; readonly message: ConfirmationWarning }
  /** The heading changed since it was listed (FR-024): the refreshed headings, unfiltered, or null if they could not be read. */
  | { readonly kind: "stale"; readonly headings: readonly Heading[] | null }
  /** `detail`: Word's own words for a host error, for diagnostics (logged locally, never sent). */
  | { readonly kind: "message"; readonly message: MessageId; readonly detail?: string };

/** A host error, logged locally with Word's detail (Constitution V: nothing leaves the machine). */
function hostError(message: "hostError" | "hostErrorPartial", detail: string): InsertReferenceOutcome {
  console.error("[radcut:insert-host-error]", detail);
  return { kind: "message", message, detail };
}

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
  let result: InsertReferenceResult;
  try {
    const existing = await deps.gateway.listBookmarkNames();
    result = await deps.gateway.insertReference({
      target: input.target.key,
      expectedFingerprint: headingFingerprint(input.target),
      parts: input.parts,
      newBookmarkName: generateBookmarkName(existing, deps.random),
      policy: input.policy,
      confirmed: input.confirmed,
    });
  } catch (error) {
    // The gateway reports its own failures as results; a throw comes before its write batch.
    return hostError("hostError", error instanceof Error ? error.message : String(error));
  }

  if (result.ok) {
    // The reference is in the document: a focus failure must not turn that into a failure, or the
    // palette would stay open and a second Enter would insert it again.
    await deps.shell.hidePane().catch((error: unknown) => console.error("[radcut:hide-pane]", error));
    await deps.gateway.returnFocus(result.reference).catch((error: unknown) => console.error("[radcut:return-focus]", error));
    return {
      kind: "inserted",
      reference: result.reference,
      bookmark: result.bookmark,
      bookmarkCreated: result.bookmarkCreated,
    };
  }
  switch (result.reason) {
    case "needsConfirmation":
      return { kind: "needsConfirmation", confirm: result.confirm, message: warningFor(result.confirm) };
    case "declined":
      return { kind: "message", message: result.declined.reason };
    case "staleTarget": {
      // The palette shows these instead of reading the document again; null if the read failed.
      const fresh = await deps.index.refresh().catch(() => null);
      return { kind: "stale", headings: fresh?.headings ?? null };
    }
    case "hostError":
      return hostError(result.partialWrite ? "hostErrorPartial" : "hostError", result.detail ?? "No detail from Word.");
  }
}
