import type { HostShortcut, HostTheme, IHostShell } from "../../src/core/ports/host-shell";

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
  readonly inUse = new Set<string>();

  private openPalette: (() => void) | null = null;
  private openSettings: (() => void) | null = null;

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
    this.visible = false;
  }

  theme(): HostTheme {
    return { ...this.currentTheme };
  }

  prefersReducedMotion(): boolean {
    return this.reducedMotion;
  }

  readonly shortcut: HostShortcut = {
    current: async () => this.assignedShortcut,
    canCustomise: async () => this.customisable,
    isInUse: async (combo) => this.inUse.has(combo.toLowerCase()),
    replace: async (combo) => {
      this.assignedShortcut = combo ?? DEFAULT_SHORTCUT;
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
