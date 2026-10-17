<script lang="ts">
  import { parseTemplate } from "../../core/formats/template-parser";
  import type { TemplateDefinition } from "../../core/settings/types";
  import { SETTINGS_TEXT } from "./labels";
  import { samplePreview } from "./sample";

  /** One template's name and text, with a live sample preview and Delete (FR-018). Errors come from the last Save. */
  let {
    template,
    labelError = null,
    sourceError = null,
    onchange,
    ondelete,
  }: {
    template: TemplateDefinition;
    labelError?: string | null;
    sourceError?: string | null;
    onchange: (change: Partial<Pick<TemplateDefinition, "label" | "source">>) => void;
    ondelete: () => void;
  } = $props();

  const base = $derived(`radcut-template-${template.id.replace(/[^\w-]/g, "-")}`);
  const parsed = $derived(parseTemplate(template.source));
  const preview = $derived(parsed.ok ? samplePreview(parsed.parts) : null);
  const title = $derived(template.label.trim() || "New template");
  const describedBy = (...ids: (string | false)[]) => ids.filter(Boolean).join(" ") || undefined;
</script>

<fieldset class="template">
  <legend class="legend">{title}</legend>

  <label class="field-label" for="{base}-label">Template name</label>
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

  <label class="field-label" for="{base}-source">Template text</label>
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
  <p id="{base}-help" class="help">{SETTINGS_TEXT.templateHelp}</p>

  <div class="footer">
    <p class="preview" class:empty={preview === null} data-testid="template-preview" aria-live="polite">
      {preview ?? SETTINGS_TEXT.noPreview}
    </p>
    <button type="button" class="delete" aria-label="Delete template {title === 'New template' ? 'new template' : title}" onclick={ondelete}>
      Delete
    </button>
  </div>
</fieldset>

<style>
  .template {
    display: flex;
    flex-direction: column;
    gap: var(--spacingVerticalXXS);
    margin: 0;
    padding: var(--spacingVerticalS) var(--spacingHorizontalM);
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

  .error,
  .help,
  .preview {
    margin: 0;
    font-size: var(--fontSizeBase200);
    line-height: var(--lineHeightBase200);
  }

  .error {
    color: var(--colorPaletteRedForeground1);
  }

  .help {
    color: var(--colorNeutralForeground3);
  }

  .footer {
    display: flex;
    align-items: baseline;
    gap: var(--spacingHorizontalS);
    margin-top: var(--spacingVerticalXS);
  }

  .preview {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--colorBrandForeground1);
    font-weight: var(--fontWeightSemibold);
  }

  .preview.empty {
    color: var(--colorNeutralForeground3);
    font-weight: var(--fontWeightRegular);
  }

  .delete {
    flex: none;
    padding: var(--spacingVerticalXXS) var(--spacingHorizontalS);
    border: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
    border-radius: var(--borderRadiusMedium);
    background: var(--colorNeutralBackground1);
    color: var(--colorNeutralForeground1);
    font: inherit;
    cursor: pointer;
  }

  .delete:hover {
    background: var(--colorNeutralBackground1Hover);
  }
</style>
