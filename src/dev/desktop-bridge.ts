/**
 * Dev-only: the desktop harness (tests/desktop) exposes `__xrefDesktop` to the contract pane over
 * Playwright, so a contract case can ask Word COM or UI Automation for a state Office.js cannot
 * create (a caret in a comment, protection, real keystrokes, Undo, following a hyperlink). In a run
 * started by hand the bridge is absent and those cases keep their manual instructions.
 */

/** A request the desktop harness understands (tests/desktop/.../DesktopBridge.cs). */
export type DesktopRequest =
  | { action: "select"; text: string; caretOffset?: number | undefined; length?: number | undefined }
  | { action: "showTextBoxes" }
  | { action: "renewPlainTextControl"; text: string }
  | { action: "protect" }
  | { action: "unprotect" }
  | { action: "pressShortcut" }
  | { action: "clickCrossReference" }
  | { action: "closePane" }
  | { action: "undo" }
  | { action: "updateFields" }
  | { action: "moveParagraphBefore"; text: string; before: string; paragraphs: number }
  | { action: "followReference"; bookmark: string };

export type DesktopBridge = (request: DesktopRequest) => Promise<unknown>;

type Reply = { ok: true; value?: unknown } | { ok: false; error: string };

/** The bridge if the desktop harness exposed it on `scope` (normally `globalThis`), else null. */
export function desktopBridge(scope: object = globalThis): DesktopBridge | null {
  const exposed = (scope as { __xrefDesktop?: unknown }).__xrefDesktop;
  if (typeof exposed !== "function") return null;
  const call = exposed as (request: string) => Promise<string>;
  return async (request) => {
    const reply = JSON.parse(await call(JSON.stringify(request))) as Reply;
    if (!reply.ok) throw new Error(`Desktop harness: ${reply.error}`);
    return reply.value;
  };
}
