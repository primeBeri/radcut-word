<script lang="ts">
  import type { RankedHeading } from "../../core/matching/fuzzy-matcher";
  import { segments } from "./highlight";
  import type { RowPreview } from "./types";
  import { accessibleName, displayText, fullTitle, LOCATION_BADGE } from "./labels";

  interface Props {
    id: string;
    ranked: RankedHeading;
    selected: boolean;
    preview?: RowPreview | null;
    onchoose: () => void;
  }

  let { id, ranked, selected, preview = null, onchoose }: Props = $props();

  /** One indent step per level below 1, capped at level 6 (contracts/palette-ui.md). */
  const MAX_INDENT_LEVEL = 6;

  const heading = $derived(ranked.heading);
  const numberParts = $derived(heading.number ? segments(heading.number, ranked.match.numberRanges) : []);
  const textParts = $derived(
    heading.text === "" ? [{ text: displayText(heading), matched: false }] : segments(heading.text, ranked.match.textRanges),
  );
  const badge = $derived(heading.location === "main" ? null : LOCATION_BADGE[heading.location]);
</script>

<!-- Mouse use is secondary; the combobox keeps keyboard focus, so rows are not focusable. -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<li
  {id}
  class="row"
  class:selected
  role="option"
  aria-selected={selected}
  aria-label={accessibleName(heading)}
  aria-describedby={preview ? `${id}-preview` : undefined}
  title={fullTitle(heading)}
  style:--indent-steps={String(Math.min(heading.level, MAX_INDENT_LEVEL) - 1)}
  onmousedown={(event) => event.preventDefault()}
  onclick={onchoose}
>
  {#if numberParts.length > 0}
    <span class="number">
      {#each numberParts as part, i (i)}{#if part.matched}<mark>{part.text}</mark>{:else}{part.text}{/if}{/each}
    </span>
  {/if}
  <span class="text" class:untitled={heading.text === ""}>
    {#each textParts as part, i (i)}{#if part.matched}<mark>{part.text}</mark>{:else}{part.text}{/if}{/each}
  </span>
  {#if badge}<span class="badge" data-location={heading.location}>{badge}</span>{/if}
  {#if preview}
    <!-- Right under the highlight, where the eye already is; the rows above and below keep their places. -->
    <span class="preview-line" id="{id}-preview" data-testid="format-preview">
      <!-- Hooks the line to the heading above it: this is what that heading will insert. -->
      <svg class="hook" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
        <path d="M2.5 1.5v4.5a2 2 0 0 0 2 2h6M8 5.5 10.5 8 8 10.5" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="preview">{preview.text}</span>
      <span class="format"><span class="label">{preview.label}</span> <kbd aria-hidden="true">Tab</kbd></span>
      {#if preview.note}<span class="note">{preview.note}</span>{/if}
    </span>
  {/if}
</li>

<style>
  /* Columns: number, text, badge. The preview line spans text and badge, so it starts under the text. */
  .row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: baseline;
    padding: var(--spacingVerticalXS) var(--spacingHorizontalS);
    padding-inline-start: calc(var(--spacingHorizontalS) + var(--spacingHorizontalL) * var(--indent-steps));
    border-radius: var(--borderRadiusMedium);
    color: var(--colorNeutralForeground1);
    cursor: default;
    white-space: nowrap;
  }

  .row:hover {
    background: var(--colorSubtleBackgroundHover);
  }

  .row.selected {
    background: var(--colorSubtleBackgroundSelected);
    box-shadow: inset var(--strokeWidthThick) 0 0 var(--colorCompoundBrandStroke);
  }

  .number {
    grid-column: 1;
    margin-inline-end: var(--spacingHorizontalS);
    color: var(--colorNeutralForeground2);
    font-variant-numeric: tabular-nums;
  }

  .text {
    grid-column: 2;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .untitled {
    color: var(--colorNeutralForeground3);
    font-style: italic;
  }

  /* Not colour alone (FR-005a): bold and underlined as well. */
  mark {
    background: transparent;
    color: var(--colorBrandForeground1);
    font-weight: var(--fontWeightSemibold);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .preview-line {
    display: flex;
    flex-wrap: wrap;
    grid-column: 2 / -1;
    align-items: baseline;
    column-gap: var(--spacingHorizontalS);
    padding-block: var(--spacingVerticalXXS) var(--spacingVerticalXXS);
  }

  .hook {
    flex: none;
    align-self: center;
    color: var(--colorNeutralForeground3);
  }

  .preview {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: var(--colorBrandForeground1);
    font-weight: var(--fontWeightSemibold);
    text-overflow: ellipsis;
  }

  .format {
    flex: none;
    color: var(--colorNeutralForeground2);
    font-size: var(--fontSizeBase200);
    line-height: var(--lineHeightBase200);
  }

  kbd {
    padding: 0 var(--spacingHorizontalXXS);
    border: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
    border-radius: var(--borderRadiusSmall);
    font: inherit;
    font-size: var(--fontSizeBase100);
  }

  .note {
    flex-basis: 100%;
    color: var(--colorNeutralForeground3);
    font-size: var(--fontSizeBase200);
    line-height: var(--lineHeightBase200);
    white-space: normal;
  }

  /* One Fluent palette tint per location, to tell them apart at a glance; the text still names it. */
  .badge {
    --badge-bg: var(--colorNeutralBackground3);
    --badge-fg: var(--colorNeutralForeground2);
    --badge-border: var(--colorNeutralStroke1);
    grid-column: 3;
    margin-inline-start: var(--spacingHorizontalS);
    padding: 0 var(--spacingHorizontalXS);
    border: var(--strokeWidthThin) solid var(--badge-border);
    border-radius: var(--borderRadiusSmall);
    background: var(--badge-bg);
    color: var(--badge-fg);
    font-size: var(--fontSizeBase100);
    line-height: var(--lineHeightBase100);
  }

  .badge[data-location="tableCell"] {
    --badge-bg: var(--colorPaletteTealBackground2);
    --badge-fg: var(--colorPaletteTealForeground2);
    --badge-border: var(--colorPaletteTealBorderActive);
  }

  .badge[data-location="textBox"] {
    --badge-bg: var(--colorPaletteLavenderBackground2);
    --badge-fg: var(--colorPaletteLavenderForeground2);
    --badge-border: var(--colorPaletteLavenderBorderActive);
  }

  .badge[data-location="footnote"] {
    --badge-bg: var(--colorPaletteMarigoldBackground2);
    --badge-fg: var(--colorPaletteMarigoldForeground2);
    --badge-border: var(--colorPaletteMarigoldBorderActive);
  }

  .badge[data-location="endnote"] {
    --badge-bg: var(--colorPalettePumpkinBackground2);
    --badge-fg: var(--colorPalettePumpkinForeground2);
    --badge-border: var(--colorPalettePumpkinBorderActive);
  }

  .badge[data-location="header"] {
    --badge-bg: var(--colorPaletteCornflowerBackground2);
    --badge-fg: var(--colorPaletteCornflowerForeground2);
    --badge-border: var(--colorPaletteCornflowerBorderActive);
  }

  .badge[data-location="footer"] {
    --badge-bg: var(--colorPaletteSeafoamBackground2);
    --badge-fg: var(--colorPaletteSeafoamForeground2);
    --badge-border: var(--colorPaletteSeafoamBorderActive);
  }
</style>
