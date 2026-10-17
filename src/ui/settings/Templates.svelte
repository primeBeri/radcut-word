<script lang="ts">
  import { tick } from "svelte";
  import type { TemplateProblem } from "../../core/settings/templates";
  import type { TemplateDefinition } from "../../core/settings/types";
  import { SETTINGS_TEXT } from "./labels";
  import TemplateEditor from "./TemplateEditor.svelte";

  /** The Templates section: the user's templates in order, then Add template (FR-018). */
  let {
    templates,
    problems,
    addError = null,
    onadd,
    onupdate,
    ondelete,
  }: {
    templates: readonly TemplateDefinition[];
    /** From the last Save; a field's problem goes once that field is edited. */
    problems: readonly TemplateProblem[];
    /** Why no template could be added (at most 20), or null. */
    addError?: string | null;
    onadd: () => void;
    onupdate: (id: string, change: Partial<Pick<TemplateDefinition, "label" | "source">>) => void;
    ondelete: (id: string) => void;
  } = $props();

  let section: HTMLElement;
  let addButton: HTMLButtonElement;

  const problemFor = (id: string, field: TemplateProblem["field"]) =>
    problems.find((p) => p.templateId === id && p.field === field)?.message ?? null;

  /** The name input of the template at `index`, or Add template when there is none. */
  export async function focusTemplate(index: number): Promise<void> {
    await tick();
    const fieldsets = section.querySelectorAll("fieldset");
    const name = fieldsets[Math.min(index, fieldsets.length - 1)]?.querySelector("input");
    (name ?? addButton).focus();
  }

  async function add(): Promise<void> {
    const before = templates.length;
    onadd();
    if (templates.length > before) await focusTemplate(templates.length - 1);
  }

  /** Focus moves to the next template's name, or the one before if it was last, or Add template. */
  async function remove(index: number, id: string): Promise<void> {
    ondelete(id);
    await focusTemplate(index);
  }
</script>

<section bind:this={section} class="section" aria-labelledby="radcut-templates-heading">
  <h2 id="radcut-templates-heading" class="heading">Templates</h2>
  <p class="intro">{SETTINGS_TEXT.templatesIntro}</p>
  {#if templates.length === 0}
    <p class="empty">{SETTINGS_TEXT.noTemplates}</p>
  {/if}
  {#each templates as template, index (template.id)}
    <TemplateEditor
      {template}
      labelError={problemFor(template.id, "templateLabel")}
      sourceError={problemFor(template.id, "templateSource")}
      onchange={(change) => onupdate(template.id, change)}
      ondelete={() => void remove(index, template.id)}
    />
  {/each}
  <div class="add">
    <button bind:this={addButton} type="button" aria-describedby={addError ? "radcut-add-template-error" : undefined} onclick={() => void add()}>
      Add template
    </button>
    {#if addError}
      <p id="radcut-add-template-error" class="error" role="alert">{addError}</p>
    {/if}
  </div>
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

  .intro,
  .empty,
  .error {
    margin: 0;
    font-size: var(--fontSizeBase200);
    line-height: var(--lineHeightBase200);
  }

  .intro,
  .empty {
    color: var(--colorNeutralForeground3);
  }

  .error {
    color: var(--colorPaletteRedForeground1);
  }

  .add {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
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
</style>
