import type { HostShortcut, HostTheme, IHostShell } from "../../core/ports/host-shell";
import { readOfficeTheme } from "./theme";

const OPEN_PALETTE = "OpenPalette";
const OPEN_SETTINGS = "OpenSettings";

/**
 * Associate an action id with a handler. Ribbon commands pass an event that MUST be completed,
 * or Word treats the command as still running and ignores later clicks (research R3); the
 * shortcut passes none.
 */
function associate(action: string, handler: () => void): void {
  Office.actions.associate(action, (event?: Office.AddinCommands.Event) => {
    try {
      handler();
    } finally {
      event?.completed();
    }
  });
}

/** IHostShell on Office.js: shared-runtime actions, the task pane, theme and shortcut. */
export class OfficeHostShell implements IHostShell {
  onOpenPalette(handler: () => void): void {
    associate(OPEN_PALETTE, handler);
  }

  onOpenSettings(handler: () => void): void {
    associate(OPEN_SETTINGS, handler);
  }

  async showPane(): Promise<void> {
    await Office.addin.showAsTaskpane();
  }

  async hidePane(): Promise<void> {
    await Office.addin.hide();
  }

  onPaneHidden(handler: () => void): void {
    // Fires for Office.addin.hide() and for the user's × alike. Without it the next shortcut would
    // refocus a palette the user has closed, so a failed registration is at least logged.
    Office.addin
      .onVisibilityModeChanged((args) => {
        if (args.visibilityMode === Office.VisibilityMode.hidden) handler();
      })
      .catch((error: unknown) => console.error("[radcut:visibility-handler]", error));
  }

  theme(): HostTheme {
    return readOfficeTheme();
  }

  prefersReducedMotion(): boolean {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  readonly shortcut: HostShortcut = {
    async current() {
      if (!Office.context.requirements.isSetSupported("KeyboardShortcuts", "1.1")) return null;
      const shortcuts = await Office.actions.getShortcuts();
      return shortcuts[OPEN_PALETTE] ?? null;
    },
    async canCustomise() {
      if (!Office.context.requirements.isSetSupported("KeyboardShortcuts", "1.1")) return false;
      try {
        await Office.actions.getShortcuts();
        return true;
      } catch (error) {
        // Custom shortcuts need a signed-in Microsoft 365 account (research R4); Word reports
        // that as a failure, but so would anything else, so it is logged.
        console.error("[radcut:can-customise]", error);
        return false;
      }
    },
    async isInUse(combo) {
      const [result] = await Office.actions.areShortcutsInUse([combo]);
      return result?.inUse ?? false;
    },
    async replace(combo) {
      // Nothing resets the shortcut before the settings view (US4); fail loudly rather than do nothing.
      if (combo === null) throw new Error("Resetting the shortcut is not implemented yet (T085).");
      await Office.actions.replaceShortcuts({ [OPEN_PALETTE]: combo });
    },
  };
}
