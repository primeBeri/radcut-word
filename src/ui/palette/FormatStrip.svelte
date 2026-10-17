<script lang="ts">
  /** `note`: why some formats are missing here (FR-016a), or null. */
  let { label, preview, note = null }: { label: string; preview: string; note?: string | null } = $props();
</script>

<!-- Polite live region so format changes (Tab, Shift+Tab) are announced. -->
<div class="strip" data-testid="format-strip" aria-live="polite">
  <div class="current">
    <span class="label">{label}</span>
    <span class="preview">{preview}</span>
  </div>
  {#if note}
    <span class="note">{note}</span>
  {/if}
</div>

<style>
  .strip {
    display: flex;
    flex-direction: column;
    gap: var(--spacingVerticalXXS);
    padding: var(--spacingVerticalXS) var(--spacingHorizontalS);
    border-top: var(--strokeWidthThin) solid var(--colorNeutralStroke2);
    color: var(--colorNeutralForeground2);
    font-size: var(--fontSizeBase200);
    line-height: var(--lineHeightBase200);
  }

  .current {
    display: flex;
    gap: var(--spacingHorizontalS);
    align-items: baseline;
    min-width: 0;
  }

  .label {
    flex: none;
    font-weight: var(--fontWeightSemibold);
  }

  .preview {
    min-width: 0;
    overflow: hidden;
    color: var(--colorNeutralForeground1);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .note {
    color: var(--colorNeutralForeground3);
  }
</style>
