import { mount, unmount } from "svelte";
import type { ReferenceFormat } from "../core/formats/types";
import { filterHeadings } from "../core/headings/filter";
import { HeadingIndex } from "../core/headings/heading-index";
import type { Heading } from "../core/headings/types";
import type { Confirmation } from "../core/location/types";
import type { MessageId } from "../core/messages";
import type { IDocumentGateway } from "../core/ports/document-gateway";
import type { IHostShell } from "../core/ports/host-shell";
import type { ISettingsStore } from "../core/ports/settings-store";
import { RecentHeadings } from "../core/recents/recent-headings";
import { DEFAULT_SETTINGS } from "../core/settings/defaults";
import type { KeyCombo } from "../core/settings/shortcut-rules";
import { formatsFor } from "../core/settings/format-list";
import type { UserSettings } from "../core/settings/types";
import { loadUserSettings, type LoadedSettings } from "../core/settings/user-settings";
import { changeShortcut, readShortcut } from "../core/use-cases/change-shortcut";
import { insertReference } from "../core/use-cases/insert-reference";
import { openPalette, type OpenPaletteOptions, type OpenPaletteState } from "../core/use-cases/open-palette";
import { rememberFormat, startFormatId } from "../core/use-cases/remember-format";
import { saveSettings, type SaveSettingsResult } from "../core/use-cases/save-settings";
import MessageView from "../ui/MessageView.svelte";
import Palette from "../ui/palette/Palette.svelte";
import type { PaletteFeedback, PaletteProps } from "../ui/palette/types";
import Settings from "../ui/settings/Settings.svelte";
import { applyTheme } from "../ui/theme/apply-theme";
import { reactivePaletteProps } from "./palette-props.svelte";

export interface AppPorts {
  readonly gateway: IDocumentGateway;
  readonly shell: IHostShell;
  /** Without one the app runs on the default settings and cannot save them. */
  readonly settings?: ISettingsStore;
}

export interface App {
  destroy(): void;
}

/** Local diagnostics only (Constitution V): nothing leaves the machine. */
function report(where: string, error: unknown): void {
  console.error(`[radcut:${where}]`, error);
}

function optionsFor(settings: UserSettings): OpenPaletteOptions {
  return {
    policy: { allowInHeadings: settings.allowReferencesInHeadings },
    showHeadingsOutsideMainText: settings.showHeadingsOutsideMainText,
    startFormatId: startFormatId(settings),
    formats: formatsFor(settings),
  };
}

/**
 * How long after the palette is on screen the background heading refresh starts. Word runs the
 * read on the thread that gives the pane keyboard focus, so starting it at once delayed the
 * palette being ready (T098, docs/performance.md).
 */
export const REFRESH_DELAY_MS = 1000;

export interface AppOptions {
  /** Calls `go` when the background refresh may start: by default `REFRESH_DELAY_MS` later. The app-flow tests choose when. */
  readonly delayRefresh?: (go: () => void) => void;
}

/** Where the settings view was opened from, so leaving it goes back there (FR-021b). */
type SettingsOrigin = { readonly from: "document" } | { readonly from: "palette"; readonly query: string };

/**
 * The composition root: wires the ports to the use cases and views. Used by main.ts with the
 * Office adapters and by the app-flow test with the fakes. Each open mounts a fresh view, so the
 * palette starts with an empty query and its opening format; the shortcut pressed while the
 * palette is still on screen refocuses it instead, keeping its state. Settings are read from the
 * store on every open, so a change made in one document applies in the others (FR-021).
 */
export function createApp(ports: AppPorts, target: HTMLElement, options: AppOptions = {}): App {
  const { gateway, shell } = ports;
  const delayRefresh = options.delayRefresh ?? ((go: () => void) => void setTimeout(go, REFRESH_DELAY_MS));
  const store = ports.settings ?? null;
  const index = new HeadingIndex(() => gateway.readHeadings());
  const allRecents = new RecentHeadings(store);
  /** None while "Show recently used headings" is off: nothing is read or recorded (FR-022a). */
  const recentsFor = (settings: UserSettings) => (settings.showRecentHeadings ? allRecents : null);
  let view: Record<string, unknown> | null = null;
  /** Set while the palette (not a message) is mounted, so a second shortcut press can reuse it. */
  let palette: { props: PaletteProps; focusSearch: () => void; settings: UserSettings } | null = null;
  /** Bumped on every open and close, so a slow open that was overtaken does nothing. */
  let generation = 0;

  /**
   * The background refresh's go-ahead for open `mine`: a delay after `start()`, and only if that
   * open is still the current one. Once the palette has closed (Esc, insertion, another open),
   * Word is left alone: a palette that stays open for the delay refreshes instead.
   */
  function refreshWhenSettled(mine: number): { readonly settled: () => Promise<boolean>; start(): void } {
    let start!: () => void;
    const settled = new Promise<boolean>((resolve) => {
      start = () => delayRefresh(() => resolve(mine === generation));
    });
    return { settled: () => settled, start };
  }

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

  /** The user's settings; the defaults if there is no store or it fails (logged locally). */
  async function loadSettings(): Promise<LoadedSettings> {
    if (!store) return { settings: DEFAULT_SETTINGS, notice: null };
    try {
      return loadUserSettings(await store.loadSettings());
    } catch (error) {
      report("load-settings", error);
      return { settings: DEFAULT_SETTINGS, notice: "settingsReset" };
    }
  }

  async function save(settings: UserSettings): Promise<SaveSettingsResult> {
    if (!store) return { ok: false, errors: [], failed: true };
    return saveSettings(store, settings);
  }

  function showMessage(message: MessageId): void {
    clear();
    view = mount(MessageView, { target, props: { message, close: () => void close() } });
  }

  function showPalette(
    state: Extract<OpenPaletteState, { kind: "open" }>,
    mine: number,
    settings: UserSettings,
    initialQuery: string,
  ): void {
    const policy = { allowInHeadings: settings.allowReferencesInHeadings };
    const props = reactivePaletteProps({
      headings: state.headings,
      format: state.format,
      formats: formatsFor(settings),
      point: state.point,
      recents: state.recents,
      initialQuery,
      cancel: () => void close(),
      openSettings: (query: string) => void showSettings({ from: "palette", query }),
      insert: async (heading: Heading, format: ReferenceFormat, confirmed: Confirmation | null): Promise<PaletteFeedback> => {
        const outcome = await insertReference(
          { gateway, index, shell, recents: recentsFor(settings) },
          { target: heading, parts: format.parts, policy, confirmed },
        );
        switch (outcome.kind) {
          case "inserted":
            // The use case has hidden the pane and put the caret after the reference. Once hidden, the
            // user may already be opening the palette again: only clear the pane if nothing has since.
            if (mine === generation) reset();
            if (store) rememberFormat(store, settings, format.id).catch((error: unknown) => report("remember-format", error));
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
    palette = { props, focusSearch: () => mounted.focusSearch(), settings };
    // A failed background refresh keeps the cached list on screen.
    state.refreshed.then(
      (fresh) => {
        if (fresh && mine === generation) props.headings = fresh;
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
    const later = refreshWhenSettled(mine);
    later.start();
    const state = await openPalette(
      { gateway, index, recents: recentsFor(open.settings), mayRefresh: later.settled },
      optionsFor(open.settings),
    );
    // A now-disallowed cursor is reported at Enter, where it is checked again anyway.
    if (mine !== generation || state.kind !== "open") return;
    open.props.point = state.point;
    open.props.recents = state.recents;
    open.props.headings = state.headings;
    const fresh = await state.refreshed;
    if (fresh && mine === generation) open.props.headings = fresh;
  }

  /**
   * Shortcut or ribbon, or back from settings with the query typed before (FR-021b). Any failure
   * reading Word shows the host error rather than a blank pane.
   */
  async function open(initialQuery = ""): Promise<void> {
    if (palette) {
      // The palette stays as it is; Enter checks the document again anyway.
      return refocus(palette).catch((error: unknown) => report("refocus", error));
    }
    const mine = ++generation;
    // The refresh waits until the palette is on screen (or this open has gone no further).
    const later = refreshWhenSettled(mine);
    try {
      await shell.showPane();
      applyTheme(shell.theme());
      const { settings } = await loadSettings();
      const state = await openPalette({ gateway, index, recents: recentsFor(settings), mayRefresh: later.settled }, optionsFor(settings));
      if (mine !== generation) return;
      if (state.kind === "message") showMessage(state.message);
      else showPalette(state, mine, settings, initialQuery);
    } catch (error) {
      report("open", error);
      if (mine === generation) showMessage("hostError");
    } finally {
      later.start();
    }
  }

  /** The settings view (FR-021a), from the ribbon or from the palette's cog or Ctrl+,. */
  async function showSettings(origin: SettingsOrigin): Promise<void> {
    const mine = ++generation;
    try {
      await shell.showPane();
      applyTheme(shell.theme());
      const loaded = await loadSettings();
      if (mine !== generation) return;
      clear();
      view = mount(Settings, {
        target,
        props: {
          settings: loaded.settings,
          notice: loaded.notice,
          save,
          shortcut: {
            read: () => readShortcut(shell.shortcut),
            change: (combo: KeyCombo | null) => changeShortcut(shell.shortcut, combo),
          },
          // Back to the palette with its query, or to the document (FR-021b).
          close: () => void (origin.from === "palette" ? open(origin.query) : close()),
        },
      });
    } catch (error) {
      report("settings", error);
      if (mine === generation) showMessage("hostError");
    }
  }

  shell.onOpenPalette(() => void open());
  shell.onOpenSettings(() => void showSettings({ from: "document" }));
  // Once the pane is hidden (by us or with its ×), the next shortcut starts afresh: empty query,
  // cursor checked again. Only a palette still on screen is refocused and kept. An open still
  // reading Word is cancelled too, so nothing mounts unseen.
  shell.onPaneHidden(reset);

  return { destroy: reset };
}
