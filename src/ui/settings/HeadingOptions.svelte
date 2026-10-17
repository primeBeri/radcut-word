<script lang="ts">
  import { SETTINGS_TEXT } from "./labels";

  let { allowInHeadings = $bindable(), showOutsideMainText = $bindable() }: { allowInHeadings: boolean; showOutsideMainText: boolean } =
    $props();
</script>

<section class="section">
  <h2 class="heading">Headings</h2>
  <div class="option">
    <div class="choice">
      <input id="radcut-allow-in-headings" type="checkbox" bind:checked={allowInHeadings} aria-describedby="radcut-allow-in-headings-text" />
      <label for="radcut-allow-in-headings">Allow references in headings</label>
    </div>
    <p id="radcut-allow-in-headings-text" class="description">{SETTINGS_TEXT.allowReferencesInHeadings}</p>
  </div>
  <div class="option">
    <div class="choice">
      <input id="radcut-show-outside" type="checkbox" bind:checked={showOutsideMainText} aria-describedby="radcut-show-outside-text" />
      <label for="radcut-show-outside">Show headings outside the main text</label>
    </div>
    <p id="radcut-show-outside-text" class="description">{SETTINGS_TEXT.showHeadingsOutsideMainText}</p>
  </div>
</section>

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: var(--spacingVerticalS);
  }

  .heading {
    margin: 0;
    font-size: var(--fontSizeBase300);
    font-weight: var(--fontWeightSemibold);
    line-height: var(--lineHeightBase300);
  }

  .option {
    display: flex;
    flex-direction: column;
    gap: var(--spacingVerticalXXS);
  }

  .choice {
    display: flex;
    align-items: center;
    gap: var(--spacingHorizontalS);
  }

  .description {
    margin: 0;
    padding-inline-start: calc(var(--spacingHorizontalS) + 16px);
    color: var(--colorNeutralForeground3);
    font-size: var(--fontSizeBase200);
    line-height: var(--lineHeightBase200);
  }
</style>
