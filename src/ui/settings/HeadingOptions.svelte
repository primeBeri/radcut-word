<script lang="ts">
  import InfoTip from "./InfoTip.svelte";
  import { SETTINGS_TEXT } from "./labels";

  /** The Headings section's two checkboxes, each explained by an info button (FR-001b, FR-003a, FR-021a). */
  let { allowInHeadings = $bindable(), showOutsideMainText = $bindable() }: { allowInHeadings: boolean; showOutsideMainText: boolean } =
    $props();
</script>

<div class="option">
  <input id="radcut-allow-in-headings" type="checkbox" bind:checked={allowInHeadings} aria-describedby="radcut-allow-in-headings-text" />
  <label for="radcut-allow-in-headings">Allow cross references in headings</label>
  <InfoTip id="radcut-allow-in-headings-text" label="allowing references in headings" text={SETTINGS_TEXT.allowReferencesInHeadings} />
</div>
<div class="option">
  <input id="radcut-show-outside" type="checkbox" bind:checked={showOutsideMainText} aria-describedby="radcut-show-outside-text" />
  <label for="radcut-show-outside">Show headings outside of the main text</label>
  <InfoTip id="radcut-show-outside-text" label="headings outside the main text" text={SETTINGS_TEXT.showHeadingsOutsideMainText} />
</div>

<style>
  .option {
    display: flex;
    align-items: center;
    gap: var(--spacingHorizontalS);
  }
</style>
