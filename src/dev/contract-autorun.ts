/**
 * Dev-only: lets the desktop harness start a contract suite and read its results by script
 * (specs/002-desktop-test-harness/contracts/contract-pane-automation.md). No Office or DOM use, so
 * the pane wires it to the page.
 */
import type { ContractRunResults } from "./mini-test";

export type PaneStatus = "idle" | "running" | "done" | "error";

export interface AutorunRequest {
  readonly suite: string | null;
  readonly autorun: boolean;
}

export type SuiteChoice =
  | { readonly kind: "none" }
  | { readonly kind: "preselect"; readonly index: number }
  | { readonly kind: "run"; readonly index: number }
  | { readonly kind: "unknown"; readonly error: { error: string; suites: string[] } };

/** Where the pane shows its status and publishes results (or an error) for the harness. */
export interface PanePublisher {
  setStatus(status: PaneStatus): void;
  publish(json: string, value: unknown): void;
}

/** `?suite=<label>&autorun=1`. */
export function parseAutorun(search: string): AutorunRequest {
  const params = new URLSearchParams(search);
  return { suite: params.get("suite"), autorun: params.get("autorun") === "1" };
}

/** The suite to run or preselect, matched by its exact label. */
export function chooseSuite(request: AutorunRequest, labels: readonly string[]): SuiteChoice {
  if (request.suite === null) return { kind: "none" };
  const index = labels.indexOf(request.suite);
  if (index < 0) return { kind: "unknown", error: { error: `Unknown suite: ${request.suite}`, suites: [...labels] } };
  return request.autorun ? { kind: "run", index } : { kind: "preselect", index };
}

/**
 * Runs the suite the URL names, if it asks to: status `running`, then the results published and
 * `done`; an unknown suite or a run that throws publishes `{ error, suites }` and `error`.
 */
export async function autorun(
  search: string,
  labels: readonly string[],
  run: (index: number) => Promise<ContractRunResults>,
  out: PanePublisher,
): Promise<SuiteChoice> {
  const choice = chooseSuite(parseAutorun(search), labels);
  const fail = (error: string) => {
    const value = { error, suites: [...labels] };
    out.publish(JSON.stringify(value), value);
    out.setStatus("error");
  };
  if (choice.kind === "unknown") {
    out.publish(JSON.stringify(choice.error), choice.error);
    out.setStatus("error");
  } else if (choice.kind === "run") {
    out.setStatus("running");
    try {
      const results = await run(choice.index);
      out.publish(JSON.stringify(results), results);
      out.setStatus("done");
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
  }
  return choice;
}
