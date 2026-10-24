<script lang="ts">
  import { tick } from "svelte";
  import type { ReferenceFormat } from "../../core/formats/types";
  import { SETTINGS_TEXT } from "./labels";
  import { samplePreview } from "./sample";

  /**
   * "Add Default Format": a menu button listing the built-in formats not in the list (FR-016). Arrow keys,
   * Home and End move through it; Esc closes it and returns to the button without leaving settings.
   */
  let { formats, onadd }: { formats: readonly ReferenceFormat[]; onadd: (id: string) => void } = $props();

  let expanded = $state(false);
  let button = $state<HTMLButtonElement>();
  let menu = $state<HTMLElement>();

  const items = () => [...(menu?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];

  export function focus(): void {
    button?.focus();
  }

  async function openMenu(at: "first" | "last" = "first"): Promise<void> {
    expanded = true;
    await tick();
    const all = items();
    (at === "first" ? all[0] : all.at(-1))?.focus();
  }

  function closeMenu(refocus: boolean): void {
    expanded = false;
    if (refocus) button?.focus();
  }

  function onButtonKeydown(event: KeyboardEvent): void {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      void openMenu(event.key === "ArrowDown" ? "first" : "last");
    }
  }

  function onMenuKeydown(event: KeyboardEvent): void {
    const all = items();
    const at = all.indexOf(document.activeElement as HTMLElement);
    const move = (index: number) => {
      event.preventDefault();
      all[(index + all.length) % all.length]?.focus();
    };
    if (event.key === "ArrowDown") move(at + 1);
    else if (event.key === "ArrowUp") move(at - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(all.length - 1);
    else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
    } else if (event.key === "Tab") closeMenu(false);
  }

  function choose(id: string): void {
    closeMenu(false);
    onadd(id);
  }

  /** Clicking or tabbing away closes the menu. */
  function onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (expanded && !(next && event.currentTarget instanceof Node && event.currentTarget.contains(next))) expanded = false;
  }
</script>

{#if formats.length > 0}
  <div class="add-format" onfocusout={onFocusOut}>
    <button
      bind:this={button}
      id="xref-add-format"
      type="button"
      aria-haspopup="menu"
      aria-expanded={expanded}
      aria-controls="xref-add-format-menu"
      onclick={() => (expanded ? closeMenu(true) : void openMenu())}
      onkeydown={onButtonKeydown}
    >
      {SETTINGS_TEXT.addFormat}
      <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" focusable="false">
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    {#if expanded}
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <div bind:this={menu} id="xref-add-format-menu" class="menu" role="menu" aria-labelledby="xref-add-format" onkeydown={onMenuKeydown}>
        {#each formats as format (format.id)}
          <button type="button" role="menuitem" tabindex="-1" class="item" onclick={() => choose(format.id)}>
            <span>{format.label}</span>
            <span class="sample">{samplePreview(format.parts)}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .add-format {
    position: relative;
  }

  button {
    display: inline-flex;
    align-items: center;
    gap: var(--spacingHorizontalS);
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

  .menu {
    position: absolute;
    z-index: 5;
    top: calc(100% + 2px);
    left: 0;
    display: flex;
    flex-direction: column;
    min-width: 100%;
    padding: var(--spacingVerticalXS) 0;
    border: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
    border-radius: var(--borderRadiusMedium);
    background: var(--colorNeutralBackground1);
    box-shadow: var(--shadow8);
  }

  .item {
    justify-content: space-between;
    gap: var(--spacingHorizontalL);
    border: none;
    border-radius: 0;
    white-space: nowrap;
    text-align: start;
  }

  .item:focus {
    outline: none;
    background: var(--colorNeutralBackground1Selected);
  }

  .sample {
    color: var(--colorNeutralForeground3);
    font-size: var(--fontSizeBase200);
  }
</style>
