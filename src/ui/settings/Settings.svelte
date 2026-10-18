<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    addableBuiltIns,
    addBuiltIn,
    addTemplate,
    formatList,
    moveFormat,
    removeFormat,
    templateId,
    updateTemplate,
    type TemplateProblem,
  } from "../../core/settings/format-list";
  import type { TemplateDefinition, UserSettings } from "../../core/settings/types";
  import FormatList from "./FormatList.svelte";
  import HeadingOptions from "./HeadingOptions.svelte";
  import InfoTip from "./InfoTip.svelte";
  import { SETTINGS_TEXT } from "./labels";
  import SettingsSection from "./SettingsSection.svelte";
  import ShortcutCapture from "./ShortcutCapture.svelte";
  import type { SettingsProps } from "./types";

  let { settings, notice, save, close, shortcut, newId = () => crypto.randomUUID() }: SettingsProps = $props();

  const NOTICES = { settingsReset: SETTINGS_TEXT.settingsReset, templateDropped: SETTINGS_TEXT.templateDropped } as const;

  // The view edits a copy; `kept` is what the store now holds, to tell unsaved changes.
  // svelte-ignore state_referenced_locally
  let draft = $state<UserSettings>({ ...settings });
  // svelte-ignore state_referenced_locally
  let kept = $state<UserSettings>(settings);
  // The last used format is written by insertions, not edited here (data-model).
  const dirty = $derived(
    JSON.stringify(draft.formatOrder) !== JSON.stringify(kept.formatOrder) ||
      draft.rememberLastFormat !== kept.rememberLastFormat ||
      draft.allowReferencesInHeadings !== kept.allowReferencesInHeadings ||
      draft.showHeadingsOutsideMainText !== kept.showHeadingsOutsideMainText ||
      JSON.stringify(draft.templates) !== JSON.stringify(kept.templates),
  );
  const entries = $derived(formatList(draft));
  const addable = $derived(addableBuiltIns(draft));

  /** Which sections are open (FR-021a): Formats on opening. */
  let open = $state({ formats: true, shortcut: false, headings: false });

  // svelte-ignore state_referenced_locally
  let status = $state<string>(notice ? NOTICES[notice] : "");
  /** A failure that belongs to no one field. */
  let failure = $state<string | null>(null);
  let formatsError = $state<string | null>(null);
  let templateProblems = $state<TemplateProblem[]>([]);
  let addError = $state<string | null>(null);
  /** The in-pane "unsaved changes" prompt (never a browser confirm()). */
  let confirming = $state(false);
  let saving = false;
  let formatsSection: SettingsSection;
  let region: HTMLElement;
  let keepButton = $state<HTMLButtonElement>();
  /** Where focus goes back to when the prompt is dismissed. */
  let beforePrompt: HTMLElement | null = null;

  onMount(() => formatsSection.focus());

  function onAddTemplate(): void {
    const result = addTemplate(draft, templateId(newId()));
    addError = result.ok ? null : result.error;
    if (result.ok) draft = result.settings;
  }

  function onUpdate(id: string, change: Partial<Pick<TemplateDefinition, "label" | "source">>): void {
    draft = updateTemplate(draft, id, change);
    // An edited field's error goes; it is checked again on Save.
    const edited = new Set(Object.keys(change).map((key) => (key === "label" ? "templateLabel" : "templateSource")));
    templateProblems = templateProblems.filter((p) => p.templateId !== id || !edited.has(p.field));
  }

  function onRemove(id: string): void {
    draft = removeFormat(draft, id);
    templateProblems = templateProblems.filter((p) => p.templateId !== id);
    addError = null;
  }

  async function onSave(): Promise<void> {
    if (saving) return;
    saving = true;
    status = "";
    failure = null;
    formatsError = null;
    templateProblems = [];
    const result = await save($state.snapshot(draft));
    saving = false;
    if (result.ok) {
      // Saved with names trimmed (save-settings); show what was stored.
      draft = { ...draft, templates: draft.templates.map((t) => ({ ...t, label: t.label.trim() })) };
      kept = { ...draft };
      status = SETTINGS_TEXT.saved;
      return;
    }
    if (result.failed) {
      failure = SETTINGS_TEXT.saveFailed;
      return;
    }
    formatsError = result.errors.find((e) => e.field === "formats")?.message ?? null;
    templateProblems = result.errors.filter((e): e is TemplateProblem => e.field === "templateLabel" || e.field === "templateSource");
    failure = result.errors.find((e) => e.field === "templates")?.message ?? null;
    // Every field that can be wrong is in the Formats section: open it before moving focus there.
    if (formatsError || templateProblems.length > 0) open.formats = true;
    await tick();
    const invalid = region.querySelector<HTMLElement>("[aria-invalid=true]");
    if (invalid) invalid.focus();
    else if (formatsError) formatsSection.focus();
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
<div bind:this={region} class="settings radcut-pane" role="region" aria-label="Settings" onkeydown={onKeydown}>
  <h1 class="title">Settings</h1>
  <div class="body">
    <SettingsSection bind:this={formatsSection} id="radcut-section-formats" title="Cross Reference Formats" bind:expanded={open.formats}>
      {#snippet info()}
        <InfoTip id="radcut-formats-info" label="cross reference formats" text={SETTINGS_TEXT.formatsInfo} />
      {/snippet}
      <FormatList
        {entries}
        {addable}
        problems={templateProblems}
        error={formatsError}
        {addError}
        onmove={(id, to) => (draft = moveFormat(draft, id, to))}
        onremove={onRemove}
        onaddbuiltin={(id) => (draft = addBuiltIn(draft, id))}
        onaddtemplate={onAddTemplate}
        onupdate={onUpdate}
        onannounce={(text) => (status = text)}
      />
      <div class="option">
        <input id="radcut-remember-format" type="checkbox" bind:checked={draft.rememberLastFormat} aria-describedby="radcut-remember-format-text" />
        <label for="radcut-remember-format">{SETTINGS_TEXT.rememberLastFormat}</label>
        <InfoTip id="radcut-remember-format-text" label="remembering the last used format" text={SETTINGS_TEXT.rememberLastFormatInfo} />
      </div>
    </SettingsSection>
    <SettingsSection id="radcut-section-shortcut" title="Shortcut" bind:expanded={open.shortcut}>
      <ShortcutCapture {shortcut} onannounce={(text) => (status = text)} />
    </SettingsSection>
    <SettingsSection id="radcut-section-headings" title="Headings" bind:expanded={open.headings}>
      <HeadingOptions bind:allowInHeadings={draft.allowReferencesInHeadings} bind:showOutsideMainText={draft.showHeadingsOutsideMainText} />
    </SettingsSection>
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

  .option {
    display: flex;
    align-items: center;
    gap: var(--spacingHorizontalS);
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
