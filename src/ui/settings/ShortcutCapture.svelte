<script lang="ts">
  import { onMount } from "svelte";
  import { comboFromKeyPress, isModifierKey, SHORTCUT_TEXT, type KeyCombo } from "../../core/settings/shortcut-rules";
  import type { ChangeShortcutResult, ShortcutStatus } from "../../core/use-cases/change-shortcut";
  import { SETTINGS_TEXT } from "./labels";
  import type { ShortcutControl } from "./types";

  /**
   * The Shortcut section (FR-020): the palette's shortcut, "Record new shortcut" and "Reset to
   * default". Office stores the shortcut, not the settings store, so a change applies at once
   * rather than on Save; read-only with the explanation when Word cannot customise shortcuts.
   * Word runs its own shortcuts (Ctrl+B, Ctrl+Shift+Q, ...) before the pane sees the key, so the
   * pane gets only the modifiers; released without a key, that is reported as kept by Word.
   */
  let { shortcut, onannounce }: { shortcut: ShortcutControl; /** For the settings view's status line. */ onannounce: (text: string) => void } = $props();

  let status = $state<ShortcutStatus | null>(null);
  let recording = $state(false);
  let error = $state<string | null>(null);
  /** Signed out, or no KeyboardShortcuts 1.1. */
  const readOnly = $derived(status !== null && !status.customisable);
  /** A change in flight; keys pressed meanwhile are ignored. */
  let busy = false;
  /** Ctrl or Alt has been held and no other key has come yet. */
  let modifiersOnly = false;

  onMount(() => {
    void shortcut.read().then((read) => (status = read));
  });

  function startRecording(): void {
    if (recording) return;
    recording = true;
    error = null;
    modifiersOnly = false;
  }

  function stopRecording(): void {
    recording = false;
  }

  async function apply(combo: KeyCombo | null): Promise<void> {
    busy = true;
    const result: ChangeShortcutResult = await shortcut.change(combo);
    busy = false;
    if (!result.ok) {
      error = result.error;
      return;
    }
    error = null;
    recording = false;
    status = { current: result.current, customisable: true };
    onannounce(SETTINGS_TEXT.shortcutChanged(result.current ?? SHORTCUT_TEXT.noShortcut));
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!recording) return;
    const plain = !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey;
    modifiersOnly = isModifierKey(event.key) ? modifiersOnly || event.ctrlKey || event.altKey : false;
    // Tab moves on (and blur stops recording); Esc stops recording without leaving settings.
    if (event.key === "Tab" && !event.ctrlKey && !event.altKey) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape" && plain) {
      stopRecording();
      return;
    }
    const combo = comboFromKeyPress(event);
    if (combo && !busy) void apply(combo);
  }

  function onKeyup(event: KeyboardEvent): void {
    if (!recording || !isModifierKey(event.key)) return;
    if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return;
    if (modifiersOnly && !busy) error = SHORTCUT_TEXT.keptByWord;
    modifiersOnly = false;
  }
</script>

<section class="section" aria-labelledby="radcut-shortcut-heading">
  <h2 id="radcut-shortcut-heading" class="heading">Shortcut</h2>
  <p class="current" id="radcut-shortcut-current">
    {SETTINGS_TEXT.shortcutIntro}
    <span data-testid="current-shortcut">
      {#if status === null}
        …
      {:else if status.current === null}
        {SHORTCUT_TEXT.noShortcut}
      {:else}
        <kbd>{status.current}</kbd>
      {/if}
    </span>
  </p>
  {#if readOnly}
    <p class="hint">{SHORTCUT_TEXT.readOnly}</p>
  {:else if status}
    <div class="actions">
      <button
        type="button"
        class:recording
        aria-pressed={recording}
        aria-describedby="radcut-shortcut-current{recording ? ' radcut-shortcut-hint' : ''}{error ? ' radcut-shortcut-error' : ''}"
        onclick={startRecording}
        onkeydown={onKeydown}
        onkeyup={onKeyup}
        onblur={stopRecording}
      >
        {recording ? SETTINGS_TEXT.recordingShortcut : SETTINGS_TEXT.recordShortcut}
      </button>
      <button type="button" onclick={() => void apply(null)}>Reset to default</button>
    </div>
    {#if recording}
      <p id="radcut-shortcut-hint" class="hint">{SETTINGS_TEXT.recordingHint}</p>
    {/if}
    {#if error}
      <p id="radcut-shortcut-error" class="error" role="alert">{error}</p>
    {/if}
  {/if}
</section>

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: var(--spacingVerticalS);
  }

  .heading {
    margin: 0;
    font-size: var(--fontSizeBase300);
    font-weight: var(--fontWeightSemibold);
    line-height: var(--lineHeightBase300);
  }

  .current,
  .hint,
  .error {
    margin: 0;
  }

  .hint,
  .error {
    font-size: var(--fontSizeBase200);
    line-height: var(--lineHeightBase200);
  }

  .hint {
    color: var(--colorNeutralForeground3);
  }

  .error {
    color: var(--colorPaletteRedForeground1);
  }

  kbd {
    padding: 0 var(--spacingHorizontalXS);
    border: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
    border-radius: var(--borderRadiusSmall);
    background: var(--colorNeutralBackground3);
    font: inherit;
    font-weight: var(--fontWeightSemibold);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacingHorizontalS);
  }

  button {
    padding: var(--spacingVerticalXS) var(--spacingHorizontalM);
    border: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
    border-radius: var(--borderRadiusMedium);
    background: var(--colorNeutralBackground1);
    color: var(--colorNeutralForeground1);
    font: inherit;
    cursor: pointer;
  }

  button:hover {
    background: var(--colorNeutralBackground1Hover);
  }

  button.recording {
    border-color: var(--colorBrandStroke1);
    outline: var(--strokeWidthThick) solid var(--colorBrandStroke1);
    outline-offset: 1px;
  }
</style>
