/** Everything outside the document: pane, shortcut, theme (contracts/host-ports.md). */
export interface IHostShell {
  /** Register the handler for the "OpenPalette" action (shortcut and ribbon button). */
  onOpenPalette(handler: () => void): void;
  /** Register the handler for the "OpenSettings" ribbon action. */
  onOpenSettings(handler: () => void): void;

  /** Show the task pane (spike 1: it takes keyboard focus, so no dialog fallback is needed). */
  showPane(): Promise<void>;
  hidePane(): Promise<void>;
  /** Called whenever the pane is hidden, by `hidePane` or by the user closing it with ×. */
  onPaneHidden(handler: () => void): void;

  /** Read each time the palette opens, not when a palette on screen is refocused. */
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
  /** null = reset to the manifest default (OfficeHostShell: arrives with T085, US4). */
  replace(combo: string | null): Promise<void>;
}

export interface HostTheme {
  readonly isDark: boolean;
  readonly background: string;
  readonly foreground: string;
}
