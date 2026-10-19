# Contract: host ports (`IHostShell`, `ISettingsStore`)

Ports for everything outside the document: showing the pane, shortcuts, theme and storage.
Implemented by fakes in tests and by Office adapters in `src/adapters/office/`. Like the document
gateway, both ports have a shared contract suite (`tests/contract/host-ports.contract.ts`) run in
Node against the fakes and inside Word against the Office adapters via the dev contract pane
(Constitution II: no adapter code without a failing test first). Each numbered behaviour below is
at least one contract case.

## `IHostShell`

```ts
interface IHostShell {
  /** Register the handler for the "OpenPalette" action (shortcut and ribbon button). */
  onOpenPalette(handler: () => void): void;
  /** Register the handler for the "OpenSettings" ribbon action. */
  onOpenSettings(handler: () => void): void;

  showPane(): Promise<void>;      // task pane (spike 1: no dialog fallback needed)
  hidePane(): Promise<void>;
  onPaneHidden(handler: () => void): void; // hidden by hidePane or by the user's ×

  theme(): HostTheme;             // read on every show from officeTheme, never prefers-color-scheme
  prefersReducedMotion(): boolean;

  shortcut: {
    current(): Promise<string | null>;          // null = unassigned or lost to a Word conflict
    canCustomise(): Promise<boolean>;           // false when signed out
    isInUse(combo: string): Promise<boolean>;
    replace(combo: string | null): Promise<"replaced" | "refused">; // null = reset to manifest default
  };
}

interface HostTheme { isDark: boolean; background: string; foreground: string; }
```

Behaviour:

1. Both the shortcut and the ribbon "Cross-reference" button invoke the same `OpenPalette`
   handler (spec User Story 4, scenario 1).
2. `shortcut.replace` is only called after the core's shortcut validation passes and
   `isInUse` is false (FR-020).
3. `shortcut.current()` returning `null` is shown as "no shortcut assigned" in settings.
4. `canCustomise()` is false when the user is signed out or KeyboardShortcuts 1.1 is not
   supported; the shortcut field is then read-only with an explanation.
5. `theme()` returns `isDark`, `background` and `foreground`; `prefersReducedMotion()` returns a
   boolean.
6. `replace(combo)` followed by `current()` returns `combo`; `replace(null)` restores the
   manifest default. Refined 2026-10-17: a host that will not change the shortcut returns
   `"refused"` and leaves it as it was (Word 2609 refuses every change, research R4); the
   settings view then explains and is read-only. Contract cases K1–K6 (K3 and K6 Node only).
7. `onPaneHidden` handlers run whenever the pane is hidden, whether by `hidePane` or by the user
   closing it with ×; the app then drops the loaded palette, so the next shortcut opens afresh.

## `ISettingsStore`

```ts
interface ISettingsStore {
  loadSettings(): Promise<unknown>;   // raw: null = nothing stored yet; else unvalidated
  saveSettings(settings: UserSettings): Promise<void>;
  loadRecents(documentId: string): Promise<string[]>;
  saveRecents(documentId: string, bookmarks: string[]): Promise<void>;
}
```

Behaviour:

1. Values round-trip exactly; nothing is written to the document (FR-021).
2. No network access (FR-023).
3. The adapter returns the stored value unvalidated: parsed if it is JSON, else the stored text.
   Validation and migration are core logic (`loadUserSettings`): a corrupt or unknown-version
   value gives the defaults, and the settings view says so (contract cases S3, S4; the store's
   cases are S1–S5 in `tests/contract/host-ports.contract.ts`).
4. Recents for unsaved documents never reach the store; the core keeps them in memory.
5. `loadSettings()` returns `null` when nothing is stored; `loadRecents()` returns `[]` for an
   unknown document; recents for different documents are independent.
6. (Added 2026-10-18.) Recents of at most 50 documents are kept: saving recents for a 51st drops
   the document whose recents were saved longest ago. Contract cases R1–R4.
