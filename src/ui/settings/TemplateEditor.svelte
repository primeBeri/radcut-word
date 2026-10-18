<script lang="ts">
  import type { TemplateDefinition } from "../../core/settings/types";
  import InfoTip from "./InfoTip.svelte";
  import { SETTINGS_TEXT } from "./labels";

  /**
   * One template's name and text (FR-018), shown under its row in the format list; the row shows
   * the live preview and Remove. Errors come from the last Save.
   */
  let {
    template,
    labelError = null,
    sourceError = null,
    onchange,
  }: {
    template: TemplateDefinition;
    labelError?: string | null;
    sourceError?: string | null;
    onchange: (change: Partial<Pick<TemplateDefinition, "label" | "source">>) => void;
  } = $props();

  const base = $derived(`radcut-template-${template.id.replace(/[^\w-]/g, "-")}`);
  const title = $derived(template.label.trim() || SETTINGS_TEXT.unnamedTemplate);
  const describedBy = (...ids: (string | false)[]) => ids.filter(Boolean).join(" ") || undefined;

  /** Focus the name input, as after Add Custom Format. */
  export function focus(): void {
    document.getElementById(`${base}-label`)?.focus();
  }
</script>

<fieldset class="template">
  <legend class="legend">{title}</legend>

  <label class="field-label" for="{base}-label">Cross reference format name</label>
  <input
    id="{base}-label"
    class="input"
    type="text"
    value={template.label}
    aria-invalid={labelError ? "true" : undefined}
    aria-describedby={describedBy(!!labelError && `${base}-label-error`)}
    oninput={(event) => onchange({ label: event.currentTarget.value })}
  />
  {#if labelError}
    <p id="{base}-label-error" class="error" role="alert">{labelError}</p>
  {/if}

  <span class="field-label with-info">
    <label for="{base}-source">Cross reference format text</label>
    <InfoTip id="{base}-help" label="cross reference format text" text={SETTINGS_TEXT.templateHelp} />
  </span>
  <input
    id="{base}-source"
    class="input"
    type="text"
    spellcheck="false"
    value={template.source}
    aria-invalid={sourceError ? "true" : undefined}
    aria-describedby={describedBy(!!sourceError && `${base}-source-error`, `${base}-help`)}
    oninput={(event) => onchange({ source: event.currentTarget.value })}
  />
  {#if sourceError}
    <p id="{base}-source-error" class="error" role="alert">{sourceError}</p>
  {/if}
</fieldset>

<style>
  .template {
    display: flex;
    flex-direction: column;
    gap: var(--spacingVerticalXXS);
    margin: 0;
    padding: var(--spacingVerticalXS) var(--spacingHorizontalM) var(--spacingVerticalS);
    border: var(--strokeWidthThin) solid var(--colorNeutralStroke2);
    border-radius: var(--borderRadiusMedium);
    min-width: 0;
  }

  .legend {
    padding: 0 var(--spacingHorizontalXS);
    font-weight: var(--fontWeightSemibold);
  }

  .field-label {
    margin-top: var(--spacingVerticalXS);
    color: var(--colorNeutralForeground2);
    font-size: var(--fontSizeBase200);
    line-height: var(--lineHeightBase200);
  }

  .with-info {
    display: flex;
    align-items: center;
    gap: var(--spacingHorizontalXXS);
  }

  .input {
    min-width: 0;
    padding: var(--spacingVerticalXXS) var(--spacingHorizontalS);
    border: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
    border-bottom-color: var(--colorNeutralStrokeAccessible);
    border-radius: var(--borderRadiusMedium);
    background: var(--colorNeutralBackground1);
    color: var(--colorNeutralForeground1);
    font: inherit;
  }

  .input:focus {
    outline: none;
    border-bottom: var(--strokeWidthThick) solid var(--colorCompoundBrandStroke);
  }

  .input[aria-invalid="true"] {
    border-color: var(--colorPaletteRedBorder2);
  }

  .error {
    margin: 0;
    color: var(--colorPaletteRedForeground1);
    font-size: var(--fontSizeBase200);
    line-height: var(--lineHeightBase200);
  }
</style>
