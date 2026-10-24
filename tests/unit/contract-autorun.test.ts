import { describe, expect, it } from "vitest";
import { autorun, chooseSuite, parseAutorun, type PaneStatus } from "../../src/dev/contract-autorun";
import { desktopBridge } from "../../src/dev/desktop-bridge";
import type { ContractRunResults } from "../../src/dev/mini-test";

const LABELS = ["IDocumentGateway: OfficeJsGateway", "IHostShell: OfficeHostShell"];

function results(suite: string): ContractRunResults {
  return {
    suite,
    fixture: null,
    startedAt: "2026-10-15T09:00:00.000Z",
    totalMs: 12,
    cases: [{ name: "a", status: "pass", durationMs: 12 }],
  };
}

function pane() {
  const statuses: PaneStatus[] = [];
  const published: { json: string; value: unknown }[] = [];
  return {
    statuses,
    published,
    out: {
      setStatus: (status: PaneStatus) => statuses.push(status),
      publish: (json: string, value: unknown) => published.push({ json, value }),
    },
  };
}

describe("parseAutorun", () => {
  it("reads the suite label and autorun flag from the query string", () => {
    expect(parseAutorun("?suite=IDocumentGateway%3A%20OfficeJsGateway&autorun=1")).toEqual({
      suite: "IDocumentGateway: OfficeJsGateway",
      autorun: true,
    });
  });

  it("treats a missing or other autorun value as false, and no suite as null", () => {
    expect(parseAutorun("?suite=x")).toEqual({ suite: "x", autorun: false });
    expect(parseAutorun("?suite=x&autorun=0")).toEqual({ suite: "x", autorun: false });
    expect(parseAutorun("")).toEqual({ suite: null, autorun: false });
  });
});

describe("chooseSuite", () => {
  it("runs a known suite with autorun, matching the label exactly", () => {
    expect(chooseSuite({ suite: LABELS[1]!, autorun: true }, LABELS)).toEqual({ kind: "run", index: 1 });
  });

  it("only preselects without autorun", () => {
    expect(chooseSuite({ suite: LABELS[0]!, autorun: false }, LABELS)).toEqual({ kind: "preselect", index: 0 });
  });

  it("does nothing without a suite", () => {
    expect(chooseSuite({ suite: null, autorun: true }, LABELS)).toEqual({ kind: "none" });
  });

  it("reports an unknown label with the known ones", () => {
    expect(chooseSuite({ suite: "IDocumentGateway: officejsgateway", autorun: true }, LABELS)).toEqual({
      kind: "unknown",
      error: { error: "Unknown suite: IDocumentGateway: officejsgateway", suites: LABELS },
    });
  });
});

describe("autorun", () => {
  it("runs the suite: running, then the results published once, then done", async () => {
    const p = pane();
    await autorun("?suite=IHostShell%3A%20OfficeHostShell&autorun=1", LABELS, async (i) => results(LABELS[i]!), p.out);

    expect(p.statuses).toEqual(["running", "done"]);
    expect(p.published).toHaveLength(1);
    expect(JSON.parse(p.published[0]!.json)).toEqual(results("IHostShell: OfficeHostShell"));
    expect(p.published[0]!.value).toEqual(results("IHostShell: OfficeHostShell"));
  });

  it("publishes the error and the known suites for an unknown label, running nothing", async () => {
    const p = pane();
    let ran = false;
    await autorun("?suite=Nope&autorun=1", LABELS, async () => ((ran = true), results("x")), p.out);

    expect(ran).toBe(false);
    expect(p.statuses).toEqual(["error"]);
    expect(JSON.parse(p.published[0]!.json)).toEqual({ error: "Unknown suite: Nope", suites: LABELS });
  });

  it("reports a run that throws as an error", async () => {
    const p = pane();
    await autorun("?suite=IHostShell%3A%20OfficeHostShell&autorun=1", LABELS, async () => {
      throw new Error("Word went away");
    }, p.out);

    expect(p.statuses).toEqual(["running", "error"]);
    expect(JSON.parse(p.published[0]!.json)).toEqual({ error: "Word went away", suites: LABELS });
  });

  it("returns the choice so the pane can preselect without running", async () => {
    const p = pane();
    expect(await autorun("?suite=IHostShell%3A%20OfficeHostShell", LABELS, async () => results("x"), p.out)).toEqual({
      kind: "preselect",
      index: 1,
    });
    expect(p.statuses).toEqual([]);
  });
});

describe("desktopBridge", () => {
  it("is null when the desktop harness has not exposed itself", () => {
    expect(desktopBridge({})).toBeNull();
  });

  it("sends the request as JSON and parses the reply", async () => {
    const sent: string[] = [];
    const bridge = desktopBridge({
      __xrefDesktop: async (request: string) => {
        sent.push(request);
        return JSON.stringify({ ok: true, value: { paragraphText: "Fire strategy" } });
      },
    });

    expect(await bridge!({ action: "followReference", bookmark: "_XR1" })).toEqual({ paragraphText: "Fire strategy" });
    expect(JSON.parse(sent[0]!)).toEqual({ action: "followReference", bookmark: "_XR1" });
  });

  it("throws the desktop's error message", async () => {
    const bridge = desktopBridge({
      __xrefDesktop: async () => JSON.stringify({ ok: false, error: "No comment \"x\"." }),
    });

    await expect(bridge!({ action: "select", text: "x" })).rejects.toThrow("Desktop harness: No comment \"x\".");
  });
});
