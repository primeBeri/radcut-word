/** Everything outside the document: pane, shortcut, theme (contracts/host-ports.md). */
export interface IHostShell {
  /** Register the handler for the "OpenPalette" action (shortcut and ribbon button). */
  onOpenPalette(handler: () => void): void;
  /** Register the handler for the "OpenSettings" ribbon action. */
  onOpenSettings(handler: () => void): void;

  /** Task pane, or dialog fallback per spike 1. */
  showPane(): Promise<void>;
  hidePane(): Promise<void>;

  /** Read on every show. */
  theme(): HostTheme;
  prefersReducedMotion(): boolean;

  readonly shortcut: HostShortcut;
}

export interface HostShortcut {
  /** null = unassigned or lost to a Word conflict. */
  current(): Promise<string | null>;
  /** False when signed out or KeyboardShortcuts 1.1 is unsupported. */
  canCustomise(): Promise<boolean>;
  isInUse(combo: string): Promise<boolean>;
  /** null = reset to the manifest default. */
  replace(combo: string | null): Promise<void>;
}

export interface HostTheme {
  readonly isDark: boolean;
  readonly background: string;
  readonly foreground: string;
}
