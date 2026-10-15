<script lang="ts">
  import { isWarning, messageText, type MessageId } from "../../core/messages";

  /** `visuallyHidden`: still spoken, but shown elsewhere (the warning popover under the selected row). */
  let { message, visuallyHidden = false }: { message: MessageId | null; visuallyHidden?: boolean } = $props();
</script>

<!-- Always rendered, so screen readers announce changes to it (one polite live region). -->
<div
  class="message"
  class:warning={isWarning(message)}
  class:visually-hidden={visuallyHidden}
  role="status"
  aria-live="polite"
>
  {message === null ? "" : messageText(message)}
</div>

<style>
  /* Empty but still rendered (not display: none), so the live region stays in the accessibility tree. */
  .message:empty {
    padding: 0;
    background: none;
  }

  .message {
    padding: var(--spacingVerticalS) var(--spacingHorizontalM);
    border-radius: var(--borderRadiusMedium);
    background: var(--colorNeutralBackground3);
    color: var(--colorNeutralForeground1);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .warning {
    background: var(--colorStatusWarningBackground1);
    color: var(--colorStatusWarningForeground3);
    border: var(--strokeWidthThin) solid var(--colorStatusWarningBorder1);
  }
</style>
