import type { HostShortcut, HostTheme, IHostShell } from "../../src/core/ports/host-shell";
import { changeShortcut, readShortcut } from "../../src/core/use-cases/change-shortcut";
import type { ShortcutControl } from "../../src/ui/settings/types";

export const DEFAULT_SHORTCUT = "Ctrl+Shift+Y";

/** In-memory IHostShell that records calls and lets tests set host state. */
export class FakeHostShell implements IHostShell {
  /** "show" / "hide" in call order. */
  readonly calls: ("show" | "hide")[] = [];
  visible = false;
  currentTheme: HostTheme = { isDark: false, background: "#ffffff", foreground: "#242424" };
  reducedMotion = false;
  assignedShortcut: string | null = DEFAULT_SHORTCUT;
  customisable = true;
  /** As the harness's Word 2609 does: every replace is refused. */
  refusesReplace = false;
  /** Lower case; free combinations Word still refuses, with no reason (research R4). */
  readonly refused = new Set<string>();
  readonly inUse = new Set<string>();

  private openPalette: (() => void) | null = null;
  private openSettings: (() => void) | null = null;
  private readonly paneHidden: (() => void)[] = [];

  onOpenPalette(handler: () => void): void {
    this.openPalette = handler;
  }

  onOpenSettings(handler: () => void): void {
    this.openSettings = handler;
  }

  async showPane(): Promise<void> {
    this.calls.push("show");
    this.visible = true;
  }

  async hidePane(): Promise<void> {
    this.calls.push("hide");
    this.hide();
  }

  onPaneHidden(handler: () => void): void {
    this.paneHidden.push(handler);
  }

  /** Simulate the user closing the pane with its × button. */
  closePaneByUser(): void {
    this.hide();
  }

  private hide(): void {
    const wasVisible = this.visible;
    this.visible = false;
    if (wasVisible) this.paneHidden.forEach((handler) => handler());
  }

  theme(): HostTheme {
    return { ...this.currentTheme };
  }

  prefersReducedMotion(): boolean {
    return this.reducedMotion;
  }

  readonly shortcut: HostShortcut = {
    manifestDefault: DEFAULT_SHORTCUT,
    current: async () => this.assignedShortcut,
    canCustomise: async () => this.customisable,
    isInUse: async (combo) => this.inUse.has(combo.toLowerCase()),
    replace: async (combo) => {
      if (this.refusesReplace || (combo !== null && this.refused.has(combo.toLowerCase()))) return "refused";
      this.assignedShortcut = combo ?? DEFAULT_SHORTCUT;
      return "replaced";
    },
  };

  /** Simulate the keyboard shortcut. */
  pressShortcut(): void {
    this.trigger(this.openPalette, "OpenPalette");
  }

  /** Simulate the ribbon "Cross-reference" button (same action as the shortcut). */
  clickCrossReferenceButton(): void {
    this.trigger(this.openPalette, "OpenPalette");
  }

  /** Simulate the ribbon "Settings" button. */
  clickSettingsButton(): void {
    this.trigger(this.openSettings, "OpenSettings");
  }

  private trigger(handler: (() => void) | null, action: string): void {
    if (!handler) throw new Error(`No handler registered for ${action}.`);
    handler();
  }
}

/** The settings view's shortcut control over a fake shell, as create-app wires it to the real one. */
export function shortcutControl(shell: FakeHostShell = new FakeHostShell()): ShortcutControl {
  return { read: () => readShortcut(shell.shortcut), change: (combo) => changeShortcut(shell.shortcut, combo) };
}
