<script lang="ts">
  import type { Snippet } from "svelte";

  /**
   * One collapsible section of the settings view (FR-021a): a heading holding a disclosure button.
   * Collapsed content stays mounted, so unsaved edits in it are kept. `info` renders beside the title.
   */
  let {
    id,
    title,
    expanded = $bindable(),
    info,
    children,
  }: { id: string; title: string; expanded: boolean; info?: Snippet; children: Snippet } = $props();

  let toggle: HTMLButtonElement;

  export function focus(): void {
    toggle.focus();
  }
</script>

<section class="section" aria-labelledby="{id}-toggle">
  <h2 class="heading">
    <button
      bind:this={toggle}
      id="{id}-toggle"
      type="button"
      class="toggle"
      aria-expanded={expanded}
      aria-controls="{id}-body"
      onclick={() => (expanded = !expanded)}
    >
      <svg class="chevron" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
        <path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      {title}
    </button>
    {@render info?.()}
  </h2>
  <div id="{id}-body" class="body" hidden={!expanded}>
    {@render children()}
  </div>
</section>

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: var(--spacingVerticalS);
    border-bottom: var(--strokeWidthThin) solid var(--colorNeutralStroke2);
    padding-bottom: var(--spacingVerticalS);
  }

  .heading {
    display: flex;
    align-items: center;
    gap: var(--spacingHorizontalXS);
    margin: 0;
    font-size: var(--fontSizeBase300);
    font-weight: var(--fontWeightSemibold);
    line-height: var(--lineHeightBase300);
  }

  .toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--spacingHorizontalS);
    padding: var(--spacingVerticalXXS) var(--spacingHorizontalXS);
    border: none;
    border-radius: var(--borderRadiusMedium);
    background: transparent;
    color: var(--colorNeutralForeground1);
    font: inherit;
    cursor: pointer;
  }

  .toggle:hover {
    background: var(--colorNeutralBackground1Hover);
  }

  .chevron {
    transition: transform var(--durationFaster) var(--curveEasyEase);
  }

  .toggle[aria-expanded="true"] .chevron {
    transform: rotate(90deg);
  }

  @media (prefers-reduced-motion: reduce) {
    .chevron {
      transition: none;
    }
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: var(--spacingVerticalS);
  }

  .body[hidden] {
    display: none;
  }
</style>
