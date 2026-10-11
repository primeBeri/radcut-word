import type { IDocumentGateway, InsertedReference } from "../../src/core/ports/document-gateway";
import type { ContractTestApi } from "./test-api";

/** Fixture documents both runs know (tests/fixtures/README.md). */
export type ContractFixture = "spec-300" | "guide-500" | "tracked" | "plain-headings";

export interface SelectionRequest {
  /** Selected characters from the start of the paragraph; 0 = caret. */
  length?: number;
  /** Paragraphs the selection touches. */
  paragraphs?: number;
  tables?: number;
  pictures?: number;
  shapes?: number;
  contentControls?: number;
}

export interface BookmarkInfo {
  name: string;
  /** Text of the paragraph the bookmark is in. */
  paragraphText: string;
  extent: "text" | "paragraph" | "partial";
}

export interface FieldInfo {
  type: "ref" | "pageRef" | "other";
  bookmark: string | null;
  switches: string[];
  result: string;
}

/**
 * What a contract case needs besides the gateway: steering Word's selection and reading the
 * document back. FakeGateway implements it in memory; the Word run against the open fixture.
 */
export interface GatewayContractHarness {
  readonly gateway: IDocumentGateway;
  select(paragraphText: string, selection?: SelectionRequest): Promise<void>;
  setProtected(on: boolean): Promise<void>;
  /** Make the next insertReference fail after its checks. */
  failNextWrite(): Promise<void>;
  setParagraphText(currentText: string, newText: string): Promise<void>;
  bookmarks(): Promise<BookmarkInfo[]>;
  fields(): Promise<FieldInfo[]>;
  /** Displayed text of an inserted reference (literals and field results). */
  insertionText(reference: InsertedReference): Promise<string>;
  /** Comparable snapshot of the whole document for "unchanged" assertions. */
  documentState(): Promise<unknown>;
}

export type GatewayContractSetup = (fixture: ContractFixture) => Promise<GatewayContractHarness>;

/**
 * The shared IDocumentGateway contract (contracts/document-gateway.md). Each numbered behaviour
 * there is at least one case here; Word-only cases use `api.environment`.
 */
export function defineDocumentGatewayContract(
  name: string,
  setup: GatewayContractSetup,
  api: ContractTestApi,
): void {
  api.describe(`IDocumentGateway contract: ${name}`, () => {
    void setup;
  });
}
