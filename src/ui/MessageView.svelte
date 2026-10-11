<script lang="ts">
  import { onMount } from "svelte";
  import type { MessageId } from "../core/messages";
  import MessageRegion from "./palette/MessageRegion.svelte";

  let { message, close }: { message: MessageId; close: () => void } = $props();

  let button: HTMLButtonElement;

  onMount(() => button.focus());
</script>

<!-- Shown instead of the palette when the cursor is somewhere a reference cannot go. -->
<div class="message-view radcut-pane">
  <MessageRegion {message} />
  <button
    bind:this={button}
    type="button"
    class="close"
    onclick={close}
    onkeydown={(event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    }}
  >
    Close
  </button>
</div>

<style>
  .message-view {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacingVerticalM);
  }

  .close {
    padding: var(--spacingVerticalXS) var(--spacingHorizontalM);
    border: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
    border-radius: var(--borderRadiusMedium);
    background: var(--colorNeutralBackground1);
    color: var(--colorNeutralForeground1);
    font: inherit;
    cursor: pointer;
  }

  .close:hover {
    background: var(--colorNeutralBackground1Hover);
  }
</style>
