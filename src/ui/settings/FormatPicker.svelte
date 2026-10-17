<script lang="ts">
  import type { ReferenceFormat } from "../../core/formats/types";
  import { samplePreview } from "./sample";

  /** `error`: shown under the list, linked to it and announced; null when there is none. */
  let {
    formats,
    value = $bindable(),
    error = null,
  }: { formats: readonly ReferenceFormat[]; value: string; error?: string | null } = $props();

  const NAME = "radcut-default-format";
  const ERROR_ID = "radcut-default-format-error";
  let group: HTMLElement;

  /** Focus the checked format, or the first if none is checked. */
  export function focus(): void {
    const radios = [...group.querySelectorAll<HTMLInputElement>("input[type=radio]")];
    (radios.find((r) => r.checked) ?? radios[0])?.focus();
  }
</script>

<section class="section">
  <h2 id="radcut-default-format-heading" class="heading">Default format</h2>
  <div
    bind:this={group}
    class="options"
    role="radiogroup"
    aria-labelledby="radcut-default-format-heading"
    aria-describedby={error ? ERROR_ID : undefined}
  >
    {#each formats as format (format.id)}
      {@const sampleId = `radcut-sample-${format.id.replace(/[^\w-]/g, "-")}`}
      <div class="option">
        <label class="choice">
          <input type="radio" name={NAME} value={format.id} bind:group={value} aria-describedby={sampleId} />
          <span>{format.label}</span>
        </label>
        <span id={sampleId} class="sample">{samplePreview(format.parts)}</span>
      </div>
    {/each}
  </div>
  {#if error}
    <p id={ERROR_ID} class="error" role="alert">{error}</p>
  {/if}
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

  .options {
    display: flex;
    flex-direction: column;
    gap: var(--spacingVerticalXS);
  }

  .option {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--spacingHorizontalS);
  }

  .choice {
    display: inline-flex;
    align-items: center;
    gap: var(--spacingHorizontalS);
    cursor: pointer;
  }

  .sample {
    color: var(--colorNeutralForeground3);
    font-size: var(--fontSizeBase200);
  }

  .error {
    margin: 0;
    color: var(--colorPaletteRedForeground1);
  }
</style>
