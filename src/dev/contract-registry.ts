import type { ContractTestApi } from "../../tests/contract/test-api";

/**
 * Implementations the dev contract pane can run a suite against. Office adapters register
 * themselves from the adapter layer (src/adapters/office/dev-registration.ts), so nothing in
 * src/dev touches Office globals.
 */
export interface ContractRegistration {
  /** e.g. "IDocumentGateway: OfficeJsGateway". */
  readonly label: string;
  /** Fixture document to open in Word first, if any. */
  readonly fixture?: string;
  /** Registers the suite's cases with the given test API. */
  readonly define: (api: ContractTestApi) => void;
}

const registrations: ContractRegistration[] = [];

export function registerContract(registration: ContractRegistration): void {
  registrations.push(registration);
}

export function registeredContracts(): readonly ContractRegistration[] {
  return registrations;
}
