<script lang="ts">
  let { label, preview }: { label: string; preview: string } = $props();
</script>

<!-- Polite live region so format changes (Tab, US2) are announced. -->
<div class="strip" data-testid="format-strip" aria-live="polite">
  <span class="label">{label}</span>
  <span class="preview">{preview}</span>
</div>

<style>
  .strip {
    display: flex;
    gap: var(--spacingHorizontalS);
    align-items: baseline;
    padding: var(--spacingVerticalXS) var(--spacingHorizontalS);
    border-top: var(--strokeWidthThin) solid var(--colorNeutralStroke2);
    color: var(--colorNeutralForeground2);
    font-size: var(--fontSizeBase200);
    line-height: var(--lineHeightBase200);
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
</style>
