import type { FormatPart } from "../formats/types";
import type { HeadingKey, HeadingSnapshot } from "../headings/types";
import type { Confirmation, Declined, InsertionPoint, LocationPolicy } from "../location/types";

/**
 * The core's only view of a Word document (contracts/document-gateway.md). Implemented by
 * FakeGateway (tests) and OfficeJsGateway (adapter); both pass the shared contract suite.
 */
export interface IDocumentGateway {
  /** Every heading paragraph in document order, with usable bookmark if present. */
  readHeadings(): Promise<HeadingSnapshot>;

  /** Read Word's current selection as an insertion point, or say why it is not allowed. Read-only. */
  checkInsertionPoint(policy: LocationPolicy): Promise<InsertionPoint | Declined>;

  /** All bookmark names in the document, including hidden ones. */
  listBookmarkNames(): Promise<string[]>;

  /**
   * Insert a reference in ONE document transaction: re-read the selection and re-check location
   * and protection, decline a selection containing a table, stop with `needsConfirmation` for an
   * unconfirmed extended selection or field, ensure a bookmark on the target (reuse a usable
   * one, else create `newBookmarkName`), then write the format's parts (replacing a confirmed
   * field whole) and update the new fields. On any decline or `needsConfirmation` the document is
   * left unchanged. All writes go in one `sync` (one Undo step, FR-013); that batch is not
   * transactional, so a failure inside it is reported with `partialWrite: true` (FR-014).
   */
  insertReference(request: InsertReferenceRequest): Promise<InsertReferenceResult>;

  /** Put the caret back in the document: after the reference if given, else where it is now. */
  returnFocus(after?: InsertedReference): Promise<void>;

  /** Every REF/PAGEREF field and its target bookmark (backlinks-ready; not used by the MVP UI). */
  readReferences(): Promise<ReferenceRecord[]>;
}

export interface InsertReferenceRequest {
  /** Provisional keys are re-validated against the live document. */
  readonly target: HeadingKey;
  /** Fingerprint (level + location + text) when the palette listed the heading. */
  readonly expectedFingerprint: string;
  /** Already validated by the core. */
  readonly parts: readonly FormatPart[];
  /** Used only if no usable bookmark exists. */
  readonly newBookmarkName: string;
  readonly policy: LocationPolicy;
  /**
   * The warning the user confirmed, if any (FR-008a, FR-008b). It covers only what it named: a
   * confirmed selection warning does not let a field the cursor has since moved into be replaced.
   */
  readonly confirmed: Confirmation | null;
}

/**
 * Opaque handle for an inserted reference. `returnFocus` takes it as a hint that the caret goes
 * after the reference; OfficeJsGateway's insertReference already leaves the selection there.
 */
export interface InsertedReference {
  readonly id: string;
}

export type InsertReferenceResult =
  | {
      readonly ok: true;
      readonly reference: InsertedReference;
      readonly bookmark: string;
      readonly bookmarkCreated: boolean;
    }
  | { readonly ok: false; readonly reason: "staleTarget" }
  | { readonly ok: false; readonly reason: "needsConfirmation"; readonly confirm: Confirmation }
  | {
      readonly ok: false;
      readonly reason: "hostError";
      /** True when Word failed inside the write batch, so part of the reference may be in the document. */
      readonly partialWrite: boolean;
      readonly detail?: string;
    }
  /** Cursor now disallowed, self reference, or document protected. */
  | { readonly ok: false; readonly reason: "declined"; readonly declined: Declined };

export interface ReferenceRecord {
  readonly bookmark: string;
  readonly fieldType: "ref" | "pageRef";
  /** e.g. ["\w", "\h"] */
  readonly switches: readonly string[];
  readonly location: "main" | "footnote" | "endnote" | "other";
}
