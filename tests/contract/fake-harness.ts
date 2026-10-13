import type { InsertedReference } from "../../src/core/ports/document-gateway";
import { fakeFixtures } from "../fakes/fake-documents";
import { FakeGateway } from "../fakes/fake-gateway";
import type { ContractFixture, GatewayContractHarness, SelectionRequest } from "./document-gateway.contract";

/** Contract harness over a fresh FakeGateway for the named fixture. */
export async function fakeGatewayHarness(fixture: ContractFixture): Promise<GatewayContractHarness> {
  const gateway = new FakeGateway(fakeFixtures[fixture]());
  return {
    gateway,
    // The fake has no character positions, so a caret offset changes nothing there.
    select: async (text, { caretOffset: _, ...selection }: SelectionRequest = {}) => gateway.select(text, selection),
    setProtected: async (on) => gateway.setProtected(on),
    failNextWrite: async (options) => gateway.failNextWrite(options),
    setParagraphText: async (from, to) => gateway.setParagraphText(from, to),
    bookmarks: async () =>
      gateway.bookmarks().map((b) => ({
        name: b.name,
        paragraphText: gateway.bookmarkTarget(b.name) ?? "",
        extent: b.extent,
      })),
    fields: async () =>
      gateway.fields().map((f) => ({
        type: f.type,
        bookmark: f.bookmark,
        switches: f.switches,
        result: f.result,
        format: { bold: f.charFormat === "bold", italic: f.charFormat === "italic" },
      })),
    insertionText: async (reference: InsertedReference) => gateway.insertionText(reference.id),
    insertionParagraph: async (reference: InsertedReference) => gateway.insertionParagraph(reference.id),
    replacedText: async (reference: InsertedReference) => gateway.replacedText(reference.id),
    documentState: async () => gateway.documentState(),
  };
}
