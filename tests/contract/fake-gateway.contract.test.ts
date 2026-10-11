import { defineDocumentGatewayContract } from "./document-gateway.contract";
import { fakeGatewayHarness } from "./fake-harness";
import { vitestApi } from "./vitest-api";

defineDocumentGatewayContract("FakeGateway", fakeGatewayHarness, vitestApi);
