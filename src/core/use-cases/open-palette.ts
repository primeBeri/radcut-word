import { BUILT_IN_FORMATS, DEFAULT_FORMAT_ID, formatById } from "../formats/built-ins";
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

/** From user settings; defaults until the settings view is wired (US2). */
export interface OpenPaletteOptions {
  readonly policy: LocationPolicy;
  readonly showHeadingsOutsideMainText: boolean;
  readonly defaultFormatId: string;
}

export type OpenPaletteState =
  | { readonly kind: "message"; readonly message: MessageId }
  | {
      readonly kind: "open";
      readonly point: InsertionPoint;
      /** Filtered, in story order; from the cache when there is one. */
      readonly headings: readonly Heading[];
      readonly format: ReferenceFormat;
      readonly selectedIndex: 0;
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
    });

  const cached = deps.index.cached();
  const snapshot = cached ?? (await deps.index.get());
  const headings = filter(snapshot.headings);
  if (headings.length === 0 && cached === null) return { kind: "message", message: "noHeadings" };

  const format = formatById(options.defaultFormatId) ?? formatById(DEFAULT_FORMAT_ID) ?? BUILT_IN_FORMATS[0]!;
  return {
    kind: "open",
    point,
    headings,
    format,
    selectedIndex: 0,
    refreshed: cached === null ? null : deps.index.refresh().then((fresh) => filter(fresh.headings)),
  };
}
