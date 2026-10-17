import { BUILT_IN_FORMATS } from "../formats/built-ins";
import { offeredFormats, openingFormat } from "../formats/cycle";
import type { ReferenceFormat } from "../formats/types";
import { filterHeadings } from "../headings/filter";
import type { HeadingIndex } from "../headings/heading-index";
import type { Heading } from "../headings/types";
import type { InsertionPoint, LocationPolicy } from "../location/types";
import type { MessageId } from "../messages";
import type { IDocumentGateway } from "../ports/document-gateway";

export interface OpenPaletteDeps {
  readonly gateway: IDocumentGateway;
  readonly index: HeadingIndex;
}

/** From user settings. */
export interface OpenPaletteOptions {
  readonly policy: LocationPolicy;
  readonly showHeadingsOutsideMainText: boolean;
  readonly defaultFormatId: string;
  /** Every format in cycle order: the built-ins, then templates (US3). Defaults to the built-ins. */
  readonly formats?: readonly ReferenceFormat[];
}

export type OpenPaletteState =
  | { readonly kind: "message"; readonly message: MessageId }
  | {
      readonly kind: "open";
      readonly point: InsertionPoint;
      /** Filtered, in story order; from the cache when there is one. */
      readonly headings: readonly Heading[];
      /** The format shown first: the default, unless it is not offered here (FR-016a). */
      readonly format: ReferenceFormat;
      /** The Tab cycle at this cursor location (FR-015, FR-016a). */
      readonly formats: readonly ReferenceFormat[];
      /** The fresh list when `headings` came from the cache, else null. */
      readonly refreshed: Promise<Heading[]> | null;
    };

/**
 * The palette's opening state (FR-002, FR-017): check the cursor first, so a disallowed place is
 * reported straight away, then list headings from the cached index and refresh it behind.
 */
export async function openPalette(deps: OpenPaletteDeps, options: OpenPaletteOptions): Promise<OpenPaletteState> {
  const point = await deps.gateway.checkInsertionPoint(options.policy);
  if (point.kind === "declined") return { kind: "message", message: point.reason };

  const filter = (headings: readonly Heading[]) =>
    filterHeadings(headings, {
      showHeadingsOutsideMainText: options.showHeadingsOutsideMainText,
      inHeadingOrder: point.inHeadingOrder,
      inHeadingFingerprint: point.inHeadingFingerprint,
    });

  const cached = deps.index.cached();
  const snapshot = cached ?? (await deps.index.get());
  const headings = filter(snapshot.headings);
  if (headings.length === 0 && cached === null) return { kind: "message", message: "noHeadings" };

  const all = options.formats ?? BUILT_IN_FORMATS;
  return {
    kind: "open",
    point,
    headings,
    format: openingFormat(all, point.location, options.defaultFormatId),
    formats: offeredFormats(all, point.location),
    refreshed: cached === null ? null : deps.index.refresh().then((fresh) => filter(fresh.headings)),
  };
}
