<script lang="ts">
  import InfoTip from "./InfoTip.svelte";
  import { SETTINGS_TEXT } from "./labels";

  /** The Headings section's checkboxes, each explained by an info button (FR-001b, FR-003a, FR-022a, FR-021a). */
  let {
    allowInHeadings = $bindable(),
    showOutsideMainText = $bindable(),
    showRecent = $bindable(),
  }: { allowInHeadings: boolean; showOutsideMainText: boolean; showRecent: boolean } = $props();
</script>

<div class="option">
  <input id="xref-allow-in-headings" type="checkbox" bind:checked={allowInHeadings} aria-describedby="xref-allow-in-headings-text" />
  <label for="xref-allow-in-headings">Allow cross references in headings</label>
  <InfoTip id="xref-allow-in-headings-text" label="allowing references in headings" text={SETTINGS_TEXT.allowReferencesInHeadings} />
</div>
<div class="option">
  <input id="xref-show-outside" type="checkbox" bind:checked={showOutsideMainText} aria-describedby="xref-show-outside-text" />
  <label for="xref-show-outside">Show headings outside of the main text</label>
  <InfoTip id="xref-show-outside-text" label="headings outside the main text" text={SETTINGS_TEXT.showHeadingsOutsideMainText} />
</div>
<div class="option">
  <input id="xref-show-recent" type="checkbox" bind:checked={showRecent} aria-describedby="xref-show-recent-text" />
  <label for="xref-show-recent">Show recently used headings</label>
  <InfoTip id="xref-show-recent-text" label="recently used headings" text={SETTINGS_TEXT.showRecentHeadings} />
</div>

<style>
  .option {
    display: flex;
    align-items: center;
    gap: var(--spacingHorizontalS);
  }
</style>
