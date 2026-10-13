import { mount, unmount } from "svelte";
import { filterHeadings } from "../core/headings/filter";
import { HeadingIndex } from "../core/headings/heading-index";
import type { Heading } from "../core/headings/types";
import type { Confirmation } from "../core/location/types";
import type { MessageId } from "../core/messages";
import type { IDocumentGateway } from "../core/ports/document-gateway";
import type { IHostShell } from "../core/ports/host-shell";
import type { ISettingsStore } from "../core/ports/settings-store";
import { DEFAULT_SETTINGS } from "../core/settings/defaults";
import { insertReference } from "../core/use-cases/insert-reference";
import { openPalette, type OpenPaletteOptions, type OpenPaletteState } from "../core/use-cases/open-palette";
import MessageView from "../ui/MessageView.svelte";
import Palette from "../ui/palette/Palette.svelte";
import type { PaletteFeedback, PaletteProps } from "../ui/palette/types";
import { applyTheme } from "../ui/theme/apply-theme";
import { reactivePaletteProps } from "./palette-props.svelte";

export interface AppPorts {
  readonly gateway: IDocumentGateway;
  readonly shell: IHostShell;
  /** Read by the settings view (US2); until then the app runs on the default settings. */
  readonly settings?: ISettingsStore;
}

export interface App {
  destroy(): void;
}

/** Local diagnostics only (Constitution V): nothing leaves the machine. */
function report(where: string, error: unknown): void {
  console.error(`[radcut:${where}]`, error);
}

/**
 * The composition root: wires the ports to the use cases and views. Used by main.ts with the
 * Office adapters and by the app-flow test with the fakes. Each open mounts a fresh view, so the
 * palette starts with an empty query and the default format; the shortcut pressed while the
 * palette is still on screen refocuses it instead, keeping its state.
 */
export function createApp(ports: AppPorts, target: HTMLElement): App {
  const { gateway, shell } = ports;
  const index = new HeadingIndex(() => gateway.readHeadings());
  const settings = DEFAULT_SETTINGS;
  const policy = { allowInHeadings: settings.allowReferencesInHeadings };
  const openOptions: OpenPaletteOptions = {
    policy,
    showHeadingsOutsideMainText: settings.showHeadingsOutsideMainText,
    defaultFormatId: settings.defaultFormatId,
  };
  let view: Record<string, unknown> | null = null;
  /** Set while the palette (not a message) is mounted, so a second shortcut press can reuse it. */
  let palette: { props: PaletteProps; focusSearch: () => void } | null = null;
  /** Bumped on every open and close, so a slow open that was overtaken does nothing. */
  let generation = 0;

  function clear(): void {
    if (view) void unmount(view);
    view = null;
    palette = null;
    target.replaceChildren();
  }

  /** Cancel whatever is in progress (any open still reading Word does nothing) and clear the pane. */
  function reset(): void {
    generation++;
    clear();
  }

  /** Esc or Close: hide first, then return the caret; that order gives Word keyboard focus (spike 1). */
  async function close(): Promise<void> {
    reset();
    await shell.hidePane().catch((error: unknown) => report("hide-pane", error));
    await gateway.returnFocus().catch((error: unknown) => report("return-focus", error));
  }

  function showMessage(message: MessageId): void {
    clear();
    view = mount(MessageView, { target, props: { message, close: () => void close() } });
  }

  function showPalette(state: Extract<OpenPaletteState, { kind: "open" }>, mine: number): void {
    const props = reactivePaletteProps({
      headings: state.headings,
      format: state.format,
      point: state.point,
      cancel: () => void close(),
      insert: async (heading: Heading, confirmed: Confirmation | null): Promise<PaletteFeedback> => {
        const outcome = await insertReference(
          { gateway, index, shell },
          { target: heading, parts: state.format.parts, policy, confirmed },
        );
        switch (outcome.kind) {
          case "inserted":
            // The use case has hidden the pane and put the caret after the reference.
            reset();
            return { kind: "closed" };
          case "needsConfirmation":
            return outcome;
          case "stale":
            // Only claim the list is fresh when it is.
            if (outcome.headings === null) return { kind: "message", message: "hostError" };
            props.headings = filterHeadings(outcome.headings, {
              showHeadingsOutsideMainText: settings.showHeadingsOutsideMainText,
              inHeadingOrder: props.point.inHeadingOrder,
              inHeadingFingerprint: props.point.inHeadingFingerprint,
            });
            return { kind: "message", message: "staleTarget" };
          case "message":
            return outcome;
        }
      },
    } satisfies PaletteProps);
    clear();
    const mounted = mount(Palette, { target, props });
    view = mounted;
    palette = { props, focusSearch: () => mounted.focusSearch() };
    // A failed background refresh keeps the cached list on screen.
    state.refreshed?.then(
      (fresh) => {
        if (mine === generation) props.headings = fresh;
      },
      (error: unknown) => report("refresh", error),
    );
  }

  /**
   * The shortcut pressed while the palette is on screen: refocus it and keep query, format and
   * selection; the cursor position and heading list update in place (contracts/palette-ui.md).
   */
  async function refocus(open: NonNullable<typeof palette>): Promise<void> {
    const mine = generation;
    await shell.showPane();
    open.focusSearch();
    const state = await openPalette({ gateway, index }, openOptions);
    // A now-disallowed cursor is reported at Enter, where it is checked again anyway.
    if (mine !== generation || state.kind !== "open") return;
    open.props.point = state.point;
    open.props.headings = state.headings;
    const fresh = await state.refreshed;
    if (fresh && mine === generation) open.props.headings = fresh;
  }

  /** Shortcut or ribbon. Any failure reading Word shows the host error rather than a blank pane. */
  async function open(): Promise<void> {
    if (palette) {
      // The palette stays as it is; Enter checks the document again anyway.
      return refocus(palette).catch((error: unknown) => report("refocus", error));
    }
    const mine = ++generation;
    try {
      await shell.showPane();
      applyTheme(shell.theme());
      const state = await openPalette({ gateway, index }, openOptions);
      if (mine !== generation) return;
      if (state.kind === "message") showMessage(state.message);
      else showPalette(state, mine);
    } catch (error) {
      report("open", error);
      if (mine === generation) showMessage("hostError");
    }
  }

  shell.onOpenPalette(() => void open());
  // Once the pane is hidden (by us or with its ×), the next shortcut starts afresh: empty query,
  // cursor checked again. Only a palette still on screen is refocused and kept. An open still
  // reading Word is cancelled too, so nothing mounts unseen.
  shell.onPaneHidden(reset);

  return { destroy: reset };
}
