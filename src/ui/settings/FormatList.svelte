<script lang="ts">
  import { tick } from "svelte";
  import { SvelteSet } from "svelte/reactivity";
  import type { ReferenceFormat } from "../../core/formats/types";
  import type { FormatListEntry, TemplateProblem } from "../../core/settings/format-list";
  import type { TemplateDefinition } from "../../core/settings/types";
  import AddFormatMenu from "./AddFormatMenu.svelte";
  import { SETTINGS_TEXT } from "./labels";
  import { samplePreview } from "./sample";
  import TemplateEditor from "./TemplateEditor.svelte";

  /**
   * The format list (FR-015–FR-018, contracts/palette-ui.md): one row per format in Tab order, in
   * columns (name, sample preview, actions) so the previews line up. Rows move with their buttons
   * or by dragging the grip; template rows open their editor with Edit.
   */
  let {
    entries,
    addable,
    problems,
    error = null,
    addError = null,
    onmove,
    onremove,
    onaddbuiltin,
    onaddtemplate,
    onupdate,
    onannounce,
  }: {
    entries: readonly FormatListEntry[];
    /** Built-in formats not in the list, for Add Default Format. */
    addable: readonly ReferenceFormat[];
    /** From the last Save; a field's problem goes once that field is edited. */
    problems: readonly TemplateProblem[];
    /** The list's own error from the last Save, or null. */
    error?: string | null;
    /** Why no template could be added (at most 20), or null. */
    addError?: string | null;
    onmove: (id: string, to: number) => void;
    onremove: (id: string) => void;
    onaddbuiltin: (id: string) => void;
    onaddtemplate: () => void;
    onupdate: (id: string, change: Partial<Pick<TemplateDefinition, "label" | "source">>) => void;
    onannounce: (text: string) => void;
  } = $props();

  const ERROR_ID = "radcut-formats-error";
  let list: HTMLOListElement;
  let addMenu = $state<AddFormatMenu>();
  let newButton: HTMLButtonElement;
  /** Template rows with their editor open. */
  const editing = new SvelteSet<string>();
  let dragFrom = $state<number | null>(null);
  let dragOver = $state<number | null>(null);

  const nameOf = (entry: FormatListEntry) =>
    entry.template ? entry.template.label.trim() || SETTINGS_TEXT.unnamedTemplate : (entry.format?.label ?? entry.id);
  const problemFor = (id: string, field: TemplateProblem["field"]) =>
    problems.find((p) => p.templateId === id && p.field === field)?.message ?? null;
  /** A template with a problem from Save stays open, so the error is in view. */
  const isOpen = (id: string) => editing.has(id) || problems.some((p) => p.templateId === id);
  const rowButton = (index: number, action: string) =>
    list.children[index]?.querySelector<HTMLButtonElement>(`[data-action="${action}"]`) ?? null;

  /** Focus the first enabled of the buttons, else Add Custom Format. */
  function focusFirst(...buttons: (HTMLButtonElement | null)[]): void {
    (buttons.find((b) => b && !b.disabled) ?? newButton).focus();
  }

  async function move(index: number, to: number, pressed: "up" | "down" | null): Promise<void> {
    const entry = entries[index];
    if (!entry || to < 0 || to >= entries.length || to === index) return;
    onmove(entry.id, to);
    onannounce(SETTINGS_TEXT.formatMoved(nameOf(entry), to + 1, entries.length));
    await tick();
    if (pressed) focusFirst(rowButton(to, pressed), rowButton(to, pressed === "up" ? "down" : "up"));
  }

  async function remove(index: number): Promise<void> {
    const entry = entries[index];
    if (!entry || entries.length <= 1) return;
    editing.delete(entry.id);
    onremove(entry.id);
    onannounce(SETTINGS_TEXT.formatRemoved(nameOf(entry)));
    await tick();
    focusFirst(rowButton(Math.min(index, entries.length - 1), "remove"));
  }

  async function addBuiltIn(id: string): Promise<void> {
    const name = addable.find((f) => f.id === id)?.label ?? id;
    onaddbuiltin(id);
    onannounce(SETTINGS_TEXT.formatAdded(name));
    await tick();
    if (addable.length > 0) addMenu?.focus();
    else newButton.focus();
  }

  async function addTemplate(): Promise<void> {
    const before = entries.length;
    onaddtemplate();
    await tick();
    const added = entries.length > before ? entries.at(-1) : undefined;
    if (!added) return;
    editing.add(added.id);
    await tick();
    list.children[entries.length - 1]?.querySelector<HTMLInputElement>("input")?.focus();
  }

  function toggleEditor(id: string): void {
    if (editing.has(id)) editing.delete(id);
    else editing.add(id);
  }

  function onDragStart(event: DragEvent, index: number): void {
    dragFrom = index;
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", entries[index]?.id ?? "");
    const row = list.children[index];
    if (row instanceof HTMLElement) event.dataTransfer.setDragImage(row, 12, 12);
  }

  function onDragOver(event: DragEvent, index: number): void {
    if (dragFrom === null) return;
    event.preventDefault();
    dragOver = index;
  }

  function onDrop(event: DragEvent, index: number): void {
    event.preventDefault();
    if (dragFrom !== null) void move(dragFrom, index, null);
    dragFrom = dragOver = null;
  }
</script>

<div class="formats">
<ol bind:this={list} class="list" aria-label={SETTINGS_TEXT.formatList} aria-describedby={error ? ERROR_ID : undefined}>
  {#each entries as entry, index (entry.id)}
    {@const name = nameOf(entry)}
    {@const preview = entry.format ? samplePreview(entry.format.parts) : null}
    <li
      class="row"
      class:dragging={dragFrom === index}
      class:drop-target={dragOver === index && dragFrom !== index}
      ondragover={(event) => onDragOver(event, index)}
      ondrop={(event) => onDrop(event, index)}
    >
      <span
        class="grip"
        draggable="true"
        aria-hidden="true"
        title="Drag to reorder"
        ondragstart={(event) => onDragStart(event, index)}
        ondragend={() => (dragFrom = dragOver = null)}
      >
        <svg viewBox="0 0 8 14" width="8" height="14" focusable="false">
          {#each [2, 7, 12] as y (y)}<circle cx="2" cy={y} r="1.2" /><circle cx="6" cy={y} r="1.2" />{/each}
        </svg>
      </span>
      <!-- The badge is drawn from data-badge, so the name's own text stays just the name. -->
      <span class="name" data-badge={index === 0 ? SETTINGS_TEXT.firstFormatBadge : undefined}>{name}</span>
      {#if entry.template}
        <span class="sample" class:empty={preview === null} data-testid="template-preview" aria-live="polite">
          {preview ?? SETTINGS_TEXT.noPreview}
        </span>
      {:else}
        <span class="sample">{preview}</span>
      {/if}
      <span class="actions">
        {#if entry.template}
          <button
            type="button"
            class="icon"
            aria-label="Edit {name}"
            aria-expanded={isOpen(entry.id)}
            onclick={() => toggleEditor(entry.id)}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
              <path d="M10.5 2.5l3 3-8 8H2.5v-3z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
            </svg>
          </button>
        {/if}
        <button type="button" class="icon" data-action="up" aria-label="Move {name} up" disabled={index === 0} onclick={() => void move(index, index - 1, "up")}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
            <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          class="icon"
          data-action="down"
          aria-label="Move {name} down"
          disabled={index === entries.length - 1}
          onclick={() => void move(index, index + 1, "down")}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
            <path d="M8 3v10M3.5 8.5 8 13l4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button type="button" class="icon" data-action="remove" aria-label="Remove {name}" disabled={entries.length <= 1} onclick={() => void remove(index)}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
            <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          </svg>
        </button>
      </span>
      {#if entry.template && isOpen(entry.id)}
        <div class="editor">
          <TemplateEditor
            template={entry.template}
            labelError={problemFor(entry.id, "templateLabel")}
            sourceError={problemFor(entry.id, "templateSource")}
            onchange={(change) => onupdate(entry.id, change)}
          />
        </div>
      {/if}
    </li>
  {/each}
</ol>
</div>
{#if error}
  <p id={ERROR_ID} class="error" role="alert">{error}</p>
{/if}

<div class="add">
  <AddFormatMenu bind:this={addMenu} formats={addable} onadd={(id) => void addBuiltIn(id)} />
  <button
    bind:this={newButton}
    type="button"
    class="text-button"
    aria-describedby={addError ? "radcut-add-template-error" : undefined}
    onclick={() => void addTemplate()}
  >
    {SETTINGS_TEXT.newTemplate}
  </button>
</div>
{#if addError}
  <p id="radcut-add-template-error" class="error" role="alert">{addError}</p>
{/if}

<style>
  .formats {
    container-type: inline-size;
  }

  .list {
    display: grid;
    grid-template-columns: auto minmax(0, max-content) minmax(0, 1fr) auto;
    column-gap: var(--spacingHorizontalS);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .row {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    align-items: center;
    row-gap: var(--spacingVerticalXS);
    padding: var(--spacingVerticalXXS) 0;
    border-bottom: var(--strokeWidthThin) solid var(--colorNeutralStroke2);
  }

  .row.dragging {
    opacity: 0.5;
  }

  .row.drop-target {
    box-shadow: inset 0 2px 0 var(--colorBrandStroke1);
  }

  .grip {
    display: inline-flex;
    padding: var(--spacingVerticalXXS) var(--spacingHorizontalXXS);
    color: var(--colorNeutralForeground3);
    fill: currentColor;
    cursor: grab;
  }

  .name {
    overflow-wrap: anywhere;
  }

  /* Flex, so the smaller badge sits centred on the name's line rather than on its baseline. */
  .name[data-badge] {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    column-gap: var(--spacingHorizontalXS);
  }

  /* The first format is where the palette opens (FR-016a): a badge after its name. */
  .name[data-badge]::after {
    content: attr(data-badge);
    padding: 0 var(--spacingHorizontalXS);
    border: var(--strokeWidthThin) solid var(--colorBrandStroke2);
    border-radius: var(--borderRadiusCircular);
    background: var(--colorBrandBackground2);
    color: var(--colorBrandForeground2);
    font-size: var(--fontSizeBase100);
    font-weight: var(--fontWeightSemibold);
    line-height: var(--lineHeightBase100);
    white-space: nowrap;
  }

  .sample {
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--colorNeutralForeground3);
    font-size: var(--fontSizeBase200);
    line-height: var(--lineHeightBase200);
  }

  .sample.empty {
    font-style: italic;
  }

  .actions {
    display: inline-flex;
    gap: var(--spacingHorizontalXXS);
  }

  .editor {
    grid-column: 2 / -1;
    margin-bottom: var(--spacingVerticalXS);
  }

  /* A narrow pane: each preview goes under its name, still lined up, instead of a thin column. */
  @container (max-width: 360px) {
    .list {
      grid-template-columns: auto minmax(0, 1fr) auto;
    }

    .grip,
    .name,
    .actions {
      grid-row: 1;
    }

    .sample {
      grid-row: 2;
      grid-column: 2 / -1;
    }

    .editor {
      grid-row: 3;
    }
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: var(--borderRadiusMedium);
    background: transparent;
    color: var(--colorNeutralForeground2);
    cursor: pointer;
  }

  .icon:hover:not(:disabled) {
    background: var(--colorSubtleBackgroundHover);
    color: var(--colorNeutralForeground1);
  }

  .icon:disabled {
    color: var(--colorNeutralForegroundDisabled);
    cursor: default;
  }

  .icon[aria-expanded="true"] {
    color: var(--colorBrandForeground1);
  }

  .add {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacingHorizontalS);
  }

  .text-button {
    padding: var(--spacingVerticalXS) var(--spacingHorizontalM);
    border: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
    border-radius: var(--borderRadiusMedium);
    background: var(--colorNeutralBackground1);
    color: var(--colorNeutralForeground1);
    font: inherit;
    cursor: pointer;
  }

  .text-button:hover {
    background: var(--colorNeutralBackground1Hover);
  }

  .error {
    margin: 0;
    color: var(--colorPaletteRedForeground1);
    font-size: var(--fontSizeBase200);
    line-height: var(--lineHeightBase200);
  }
</style>
