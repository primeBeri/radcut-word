<script lang="ts">
  import { tick } from "svelte";

  /**
   * An "About <label>" button whose tooltip shows `text` on hover, focus or click (FR-021a). The
   * text stays in the DOM under `id`, so the control it explains can name it in
   * `aria-describedby` whether or not the tooltip is showing. Esc hides it without leaving settings.
   */
  let { id, label, text }: { id: string; label: string; text: string } = $props();

  let hovered = $state(false);
  let focused = $state(false);
  let pinned = $state(false);
  /** Esc hides the tooltip until the pointer or focus leaves and comes back. */
  let dismissed = $state(false);
  const open = $derived(!dismissed && (hovered || focused || pinned));

  let button: HTMLButtonElement;
  let tip: HTMLElement;
  /** Fixed position, so the narrow pane's edges and scrolling sections never clip it. */
  let place = $state({ left: 0, top: 0 });

  $effect(() => {
    if (!open) return;
    void tick().then(() => {
      const margin = 8;
      const anchor = button.getBoundingClientRect();
      const width = tip.offsetWidth;
      const left = Math.max(margin, Math.min(anchor.left - margin, window.innerWidth - width - margin));
      place = { left, top: anchor.bottom + 4 };
    });
  });

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== "Escape" || !open) return;
    event.preventDefault();
    event.stopPropagation();
    pinned = false;
    dismissed = true;
  }

  function leave(): void {
    if (!hovered && !focused) dismissed = false;
  }
</script>

<span class="info">
  <button
    bind:this={button}
    type="button"
    class="info-button"
    aria-label="About {label}"
    aria-expanded={open}
    aria-controls={id}
    onclick={() => {
      dismissed = false;
      pinned = !pinned;
    }}
    onkeydown={onKeydown}
    onmouseenter={() => (hovered = true)}
    onmouseleave={() => {
      hovered = false;
      leave();
    }}
    onfocus={() => (focused = true)}
    onblur={() => {
      focused = false;
      pinned = false;
      leave();
    }}
  >
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" />
      <circle cx="8" cy="5" r="0.9" fill="currentColor" />
      <path d="M8 7.2v4.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
    </svg>
  </button>
  <span bind:this={tip} {id} role="tooltip" class="tip" hidden={!open} style:left="{place.left}px" style:top="{place.top}px">{text}</span>
</span>

<style>
  .info {
    display: inline-flex;
    vertical-align: middle;
  }

  .info-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    border: none;
    border-radius: var(--borderRadiusCircular);
    background: transparent;
    color: var(--colorNeutralForeground3);
    cursor: pointer;
  }

  .info-button:hover,
  .info-button[aria-expanded="true"] {
    color: var(--colorBrandForeground1);
    background: var(--colorNeutralBackground1Hover);
  }

  .tip {
    position: fixed;
    z-index: 10;
    width: max-content;
    max-width: min(280px, calc(100vw - 16px));
    padding: var(--spacingVerticalS) var(--spacingHorizontalM);
    border: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
    border-radius: var(--borderRadiusMedium);
    background: var(--colorNeutralBackground1);
    color: var(--colorNeutralForeground1);
    box-shadow: var(--shadow8);
    font-size: var(--fontSizeBase200);
    font-weight: var(--fontWeightRegular);
    line-height: var(--lineHeightBase200);
    /* Keeps "\n" in the text as a line break; runs of spaces still collapse and lines still wrap. */
    white-space: pre-line;
  }

  .tip[hidden] {
    display: none;
  }
</style>
