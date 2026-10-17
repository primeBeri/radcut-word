<script lang="ts">
  import { onMount, tick } from "svelte";
  import type { UserSettings } from "../../core/settings/types";
  import FormatPicker from "./FormatPicker.svelte";
  import HeadingOptions from "./HeadingOptions.svelte";
  import { SETTINGS_TEXT } from "./labels";
  import type { SettingsProps } from "./types";

  let { settings, formats, notice, save, close }: SettingsProps = $props();

  // The view edits a copy; `kept` is what the store now holds, to tell unsaved changes.
  // svelte-ignore state_referenced_locally
  let draft = $state<UserSettings>({ ...settings });
  // svelte-ignore state_referenced_locally
  let kept = $state<UserSettings>(settings);
  const dirty = $derived(
    draft.defaultFormatId !== kept.defaultFormatId ||
      draft.allowReferencesInHeadings !== kept.allowReferencesInHeadings ||
      draft.showHeadingsOutsideMainText !== kept.showHeadingsOutsideMainText,
  );

  // svelte-ignore state_referenced_locally
  let status = $state<string>(notice === "settingsReset" ? SETTINGS_TEXT.settingsReset : "");
  /** A failure that belongs to no one field. */
  let failure = $state<string | null>(null);
  let formatError = $state<string | null>(null);
  /** The in-pane "unsaved changes" prompt (never a browser confirm()). */
  let confirming = $state(false);
  let saving = false;
  let picker: FormatPicker;
  let keepButton = $state<HTMLButtonElement>();
  /** Where focus goes back to when the prompt is dismissed. */
  let beforePrompt: HTMLElement | null = null;

  onMount(() => picker.focus());

  async function onSave(): Promise<void> {
    if (saving) return;
    saving = true;
    status = "";
    failure = null;
    formatError = null;
    const result = await save($state.snapshot(draft));
    saving = false;
    if (result.ok) {
      kept = { ...draft };
      status = SETTINGS_TEXT.saved;
      return;
    }
    if (result.failed) {
      failure = SETTINGS_TEXT.saveFailed;
      return;
    }
    formatError = result.errors.find((e) => e.field === "defaultFormatId")?.message ?? null;
    failure = result.errors.find((e) => e.field !== "defaultFormatId")?.message ?? null;
    await tick();
    if (formatError) picker.focus();
  }

  async function requestClose(): Promise<void> {
    if (!dirty) {
      close();
      return;
    }
    beforePrompt = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    confirming = true;
    await tick();
    keepButton?.focus();
  }

  async function keepEditing(): Promise<void> {
    confirming = false;
    await tick();
    beforePrompt?.focus();
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    event.preventDefault();
    if (confirming) void keepEditing();
    else void requestClose();
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="settings radcut-pane" role="region" aria-label="Settings" onkeydown={onKeydown}>
  <h1 class="title">Settings</h1>
  <div class="body">
    <FormatPicker bind:this={picker} {formats} bind:value={draft.defaultFormatId} error={formatError} />
    <HeadingOptions bind:allowInHeadings={draft.allowReferencesInHeadings} bind:showOutsideMainText={draft.showHeadingsOutsideMainText} />
  </div>

  <div class="status" role="status" aria-live="polite">{status}</div>
  {#if failure}
    <p class="failure" role="alert">{failure}</p>
  {/if}

  {#if confirming}
    <div class="prompt" role="alertdialog" aria-labelledby="radcut-unsaved-title" aria-describedby="radcut-unsaved-body">
      <p id="radcut-unsaved-title" class="prompt-title">{SETTINGS_TEXT.unsavedTitle}</p>
      <p id="radcut-unsaved-body">{SETTINGS_TEXT.unsavedBody}</p>
      <div class="actions">
        <button bind:this={keepButton} type="button" class="primary" onclick={() => void keepEditing()}>Keep editing</button>
        <button type="button" onclick={close}>Discard changes</button>
      </div>
    </div>
  {/if}

  <div class="actions">
    <button type="button" class="primary" onclick={() => void onSave()}>Save</button>
    <button type="button" onclick={() => void requestClose()}>Close</button>
  </div>
</div>

<style>
  .settings {
    display: flex;
    flex-direction: column;
    gap: var(--spacingVerticalM);
    height: 100%;
    min-height: 0;
  }

  .title {
    margin: 0;
    font-size: var(--fontSizeBase400);
    font-weight: var(--fontWeightSemibold);
    line-height: var(--lineHeightBase400);
  }

  .body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--spacingVerticalL);
    min-height: 0;
    overflow-y: auto;
  }

  .status:empty {
    display: contents;
  }

  .status,
  .failure {
    margin: 0;
    padding: var(--spacingVerticalS) var(--spacingHorizontalM);
    border-radius: var(--borderRadiusMedium);
    background: var(--colorNeutralBackground3);
  }

  .failure {
    background: var(--colorStatusDangerBackground1);
    color: var(--colorStatusDangerForeground1);
  }

  .prompt {
    display: flex;
    flex-direction: column;
    gap: var(--spacingVerticalS);
    padding: var(--spacingVerticalM) var(--spacingHorizontalM);
    border: var(--strokeWidthThin) solid var(--colorStatusWarningBorder1);
    border-radius: var(--borderRadiusMedium);
    background: var(--colorStatusWarningBackground1);
    color: var(--colorStatusWarningForeground3);
    box-shadow: var(--shadow8);
  }

  .prompt p {
    margin: 0;
  }

  .prompt-title {
    font-weight: var(--fontWeightSemibold);
  }

  .actions {
    display: flex;
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

  button.primary {
    border-color: transparent;
    background: var(--colorBrandBackground);
    color: var(--colorNeutralForegroundOnBrand);
  }

  button.primary:hover {
    background: var(--colorBrandBackgroundHover);
  }
</style>
