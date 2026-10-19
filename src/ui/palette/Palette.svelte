<script lang="ts">
  import { onMount } from "svelte";
  import { hidesAboveBelow, offeredFormats, openingFormat, stepFormat } from "../../core/formats/cycle";
  import { previewReference } from "../../core/formats/preview";
  import { headingIdentity } from "../../core/headings/key";
  import { rankHeadings, type RankedHeading } from "../../core/matching/fuzzy-matcher";
  import { recentHeadings } from "../../core/recents/recent-headings";
  import { confirmationFor } from "../../core/location/rules";
  import type { Confirmation } from "../../core/location/types";
  import { messageText, warningFor, type ConfirmationWarning, type MessageId } from "../../core/messages";
  import { ABOVE_BELOW_HIDDEN } from "./labels";
  import MessageRegion from "./MessageRegion.svelte";
  import ResultRow from "./ResultRow.svelte";
  import type { PaletteProps, RowPreview } from "./types";

  let { headings, format, formats, point, recents = [], initialQuery = "", insert, cancel, openSettings }: PaletteProps = $props();

  const LIST_ID = "radcut-palette-list";
  const NO_MATCH = { score: 0, numberRanges: [], textRanges: [] } as const;
  const optionId = (index: number) => `radcut-option-${index}`;
  /** Rows per Page Up/Down when the list has no layout (e.g. before first paint). */
  const FALLBACK_PAGE = 10;

  let input: HTMLInputElement;
  let listbox: HTMLElement;
  // Read once: the palette owns the query from here on.
  // svelte-ignore state_referenced_locally
  let query = $state(initialQuery);
  /** Tab and Shift+Tab move this (FR-015); a fresh palette starts on `format`. */
  // svelte-ignore state_referenced_locally
  let formatId = $state(format.id);
  const all = $derived(formats ?? [format]);
  const cycle = $derived(offeredFormats(all, point.location));
  /** If the cursor has moved where this format cannot be shown, the next one that can (FR-016a). */
  const current = $derived(cycle.find((f) => f.id === formatId) ?? openingFormat(all, point.location, formatId));
  /** A listed heading and the group it is listed in; a recent heading is in both (FR-022). */
  type Row = RankedHeading & { readonly group: "recent" | "all" };
  const rowKey = (row: Row) => `${row.group}:${headingIdentity(row.heading)}`;
  /** Survives refreshes of `headings`; null = first row. */
  let selectedKey = $state<string | null>(null);
  /** Asked for after the first Enter; the second Enter confirms exactly this (FR-008a, FR-008b). */
  let pending = $state<Confirmation | null>(null);
  const warning = $derived<ConfirmationWarning | null>(pending === null ? null : warningFor(pending));
  let message = $state<MessageId | null>(null);
  /** Offset of the warning popover from the top of the list area, just under the selected row. */
  let popoverTop = $state(0);
  let busy = false;

  /** With an empty query only; typing ranks by match alone (US5 scenario 2). */
  const recentRows = $derived<Row[]>(
    query.trim() === ""
      ? recentHeadings(recents, headings).map((heading) => ({ heading, match: NO_MATCH, group: "recent" }))
      : [],
  );
  const rows = $derived<Row[]>([...recentRows, ...rankHeadings(query, headings).map((r): Row => ({ ...r, group: "all" }))]);
  const selectedIndex = $derived.by(() => {
    if (selectedKey === null) return 0;
    const found = rows.findIndex((r) => rowKey(r) === selectedKey);
    return found >= 0 ? found : 0;
  });
  const selected = $derived(rows[selectedIndex]?.heading ?? null);
  const preview = $derived<RowPreview | null>(
    selected === null
      ? null
      : {
          label: current.label,
          text: previewReference(current.parts, selected, point).text,
          note: hidesAboveBelow(point.location) ? ABOVE_BELOW_HIDDEN : null,
        },
  );
  /** Spoken after Tab or Shift+Tab; arrowing is covered by the selected row's description. */
  let announcement = $state("");
  const status = $derived<MessageId | null>(warning ?? message ?? (rows.length === 0 ? "noMatches" : null));

  onMount(() => {
    input.focus();
  });

  $effect(() => {
    document.getElementById(optionId(selectedIndex))?.scrollIntoView({ block: "nearest" });
  });

  $effect(() => {
    if (warning) placePopover();
  });

  /** Keep the warning next to what the second Enter will insert (contracts/palette-ui.md). */
  function placePopover(): void {
    const row = document.getElementById(optionId(selectedIndex));
    popoverTop = row ? row.offsetTop + row.offsetHeight - listbox.scrollTop : 0;
  }

  /** The shortcut pressed again while the palette is open: back to the search box, nothing reset. */
  export function focusSearch(): void {
    input.focus();
  }

  function select(index: number): void {
    const row = rows[Math.max(0, Math.min(rows.length - 1, index))];
    if (row) selectedKey = rowKey(row);
  }

  function pageSize(): number {
    // An unselected row: the selected one is taller, with its preview line.
    const row = listbox.querySelector<HTMLElement>("[role=option][aria-selected=false]") ?? listbox.querySelector<HTMLElement>("[role=option]");
    const rows = row && row.offsetHeight > 0 ? Math.floor(listbox.clientHeight / row.offsetHeight) : 0;
    return Math.max(1, rows || FALLBACK_PAGE);
  }

  function dismiss(): void {
    pending = null;
    message = null;
  }

  // Input handlers never await anything (FR-026): every keystroke is applied before returning.
  function onInput(): void {
    query = input.value;
    selectedKey = null;
    dismiss();
  }

  async function enter(): Promise<void> {
    if (busy || selected === null) return;
    const target = selected;
    const confirmation = confirmationFor(point.selection);
    if (pending === null && confirmation !== null) {
      message = null;
      pending = confirmation;
      return;
    }
    const confirmed = pending;
    pending = null;
    busy = true;
    try {
      const feedback = await insert(target, current, confirmed);
      if (feedback.kind === "needsConfirmation") pending = feedback.confirm;
      else if (feedback.kind === "message") message = feedback.message;
    } catch {
      message = "hostError";
    } finally {
      busy = false;
    }
  }

  function move(delta: number): void {
    dismiss();
    select(selectedIndex + delta);
  }

  function onKeydown(event: KeyboardEvent): void {
    // Only when there is a settings view to open; otherwise Ctrl+, is left alone.
    if (openSettings && event.ctrlKey && event.key === ",") {
      event.preventDefault();
      openSettings(query);
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        move(1);
        break;
      case "ArrowUp":
        move(-1);
        break;
      case "PageDown":
        move(pageSize());
        break;
      case "PageUp":
        move(-pageSize());
        break;
      case "Tab":
        // Tab never moves focus out of the palette (contracts/palette-ui.md).
        formatId = stepFormat(cycle, current.id, event.shiftKey ? -1 : 1).id;
        announcement = preview ? `${preview.label}: ${preview.text}` : current.label;
        break;
      case "Enter":
        void enter();
        break;
      case "Escape":
        if (pending) pending = null;
        else cancel();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  function choose(index: number): void {
    select(index);
    void enter();
  }
</script>

{#snippet result(row: Row, index: number)}
  <ResultRow
    id={optionId(index)}
    ranked={row}
    selected={index === selectedIndex}
    preview={index === selectedIndex ? preview : null}
    onchoose={() => choose(index)}
  />
{/snippet}

<div class="palette radcut-pane">
  <div class="search">
    <input
      bind:this={input}
      class="query"
      type="text"
      role="combobox"
      aria-label="Search headings"
      aria-expanded="true"
      aria-controls={LIST_ID}
      aria-activedescendant={rows.length > 0 ? optionId(selectedIndex) : undefined}
      aria-autocomplete="list"
      autocomplete="off"
      spellcheck="false"
      value={query}
      oninput={onInput}
      onkeydown={onKeydown}
    />
    {#if openSettings}
      <button
        type="button"
        class="cog"
        tabindex="-1"
        aria-label="Settings"
        aria-keyshortcuts="Control+Comma"
        onclick={() => openSettings(query)}
      >
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM7.5 10a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Zm4.6-7.7a1 1 0 0 0-.98-.8H8.88a1 1 0 0 0-.98.8l-.3 1.53a6.5 6.5 0 0 0-1.3.75l-1.48-.5a1 1 0 0 0-1.19.45L2.5 6.5a1 1 0 0 0 .2 1.26l1.18 1.03a6.6 6.6 0 0 0 0 1.5L2.7 11.3a1 1 0 0 0-.2 1.25l1.12 1.95a1 1 0 0 0 1.2.45l1.47-.5c.4.3.84.55 1.3.75l.3 1.53a1 1 0 0 0 .99.8h2.24a1 1 0 0 0 .98-.8l.3-1.53c.47-.2.9-.45 1.3-.75l1.48.5a1 1 0 0 0 1.19-.45l1.12-1.95a1 1 0 0 0-.2-1.25l-1.18-1.04a6.6 6.6 0 0 0 0-1.5l1.18-1.03a1 1 0 0 0 .2-1.26L16.38 4.53a1 1 0 0 0-1.2-.45l-1.47.5a6.5 6.5 0 0 0-1.3-.75l-.3-1.53Zm-3.27 1.9.3-1.7h1.74l.3 1.7a.5.5 0 0 0 .33.38c.56.2 1.07.5 1.52.87a.5.5 0 0 0 .48.09l1.64-.55.87 1.5-1.31 1.15a.5.5 0 0 0-.16.46 5.6 5.6 0 0 1 0 1.8.5.5 0 0 0 .16.46l1.3 1.15-.86 1.5-1.64-.55a.5.5 0 0 0-.48.09c-.45.37-.96.67-1.52.87a.5.5 0 0 0-.33.38l-.3 1.7H9.13l-.3-1.7a.5.5 0 0 0-.33-.38 5.5 5.5 0 0 1-1.52-.87.5.5 0 0 0-.48-.09l-1.64.55-.87-1.5 1.31-1.15a.5.5 0 0 0 .16-.46 5.6 5.6 0 0 1 0-1.8.5.5 0 0 0-.16-.46l-1.3-1.15.86-1.5 1.64.55a.5.5 0 0 0 .48-.09c.45-.37.96-.67 1.52-.87a.5.5 0 0 0 .33-.38Z"
          />
        </svg>
      </button>
    {/if}
  </div>

  <div class="list-area">
    <ul
      bind:this={listbox}
      id={LIST_ID}
      class="results"
      role="listbox"
      aria-label="Headings"
      onscroll={() => warning && placePopover()}
    >
      {#if recentRows.length > 0}
        <!-- Groups only with recents (contracts/palette-ui.md); option ids number the rows across both. -->
        <li role="presentation">
          <ul class="group" role="group" aria-label="Recent">
            <li class="group-label" role="presentation" aria-hidden="true">Recent</li>
            {#each recentRows as row, index (rowKey(row))}
              {@render result(row, index)}
            {/each}
          </ul>
        </li>
        <li role="presentation">
          <ul class="group" role="group" aria-label="All headings">
            <li class="group-label" role="presentation" aria-hidden="true">All headings</li>
            {#each rows.slice(recentRows.length) as row, i (rowKey(row) + "#" + row.heading.order)}
              {@render result(row, recentRows.length + i)}
            {/each}
          </ul>
        </li>
      {:else}
        {#each rows as row, index (rowKey(row) + "#" + row.heading.order)}
          {@render result(row, index)}
        {/each}
      {/if}
    </ul>
    {#if warning}
      <!-- Visual only: the live region below speaks the same text, once. -->
      <div class="popover" data-testid="warning-popover" aria-hidden="true" style:top="{popoverTop}px">
        {messageText(warning)}
      </div>
    {/if}
  </div>

  <MessageRegion message={status} visuallyHidden={warning !== null} />
  <div class="announcement" data-testid="format-announcement" aria-live="polite">{announcement}</div>
</div>

<style>
  .palette {
    display: flex;
    flex-direction: column;
    gap: var(--spacingVerticalS);
    height: 100%;
    min-height: 0;
  }

  .search {
    display: flex;
    align-items: center;
    gap: var(--spacingHorizontalS);
  }

  .query {
    flex: 1;
    min-width: 0;
    padding: var(--spacingVerticalSNudge) var(--spacingHorizontalM);
    border: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
    border-bottom-color: var(--colorNeutralStrokeAccessible);
    border-radius: var(--borderRadiusMedium);
    background: var(--colorNeutralBackground1);
    color: var(--colorNeutralForeground1);
    font: inherit;
  }

  .query:focus {
    outline: none;
    border-bottom: var(--strokeWidthThick) solid var(--colorCompoundBrandStroke);
  }

  .cog {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacingVerticalXS);
    border: none;
    border-radius: var(--borderRadiusMedium);
    background: transparent;
    color: var(--colorNeutralForeground2);
    cursor: pointer;
  }

  .cog:hover {
    background: var(--colorSubtleBackgroundHover);
    color: var(--colorNeutralForeground2Hover);
  }

  .list-area {
    position: relative;
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .popover {
    position: absolute;
    inset-inline: var(--spacingHorizontalS);
    z-index: 1;
    padding: var(--spacingVerticalS) var(--spacingHorizontalM);
    border: var(--strokeWidthThin) solid var(--colorStatusWarningBorder1);
    border-radius: var(--borderRadiusMedium);
    background: var(--colorStatusWarningBackground1);
    color: var(--colorStatusWarningForeground3);
    box-shadow: var(--shadow8);
  }

  .announcement {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .results {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
  }

  .group {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .group-label {
    padding: var(--spacingVerticalXS) var(--spacingHorizontalS);
    color: var(--colorNeutralForeground3);
    font-size: var(--fontSizeBase200);
    font-weight: var(--fontWeightSemibold);
    line-height: var(--lineHeightBase200);
  }
</style>
