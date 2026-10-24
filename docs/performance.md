# Performance

Budgets (Constitution IV, feature 001): palette ready under 500 ms after the shortcut on
`spec-300.docx`; under 50 ms from a keystroke to the list updated, and no main-thread task over
100 ms, on `guide-500.docx`; `FuzzyMatcher` under 5 ms per 20-character query over 500 headings.

## How it is measured

| What | Where | Command |
|---|---|---|
| Shortcut to palette ready, as a person meets it (real keystroke until the search box has Word's keyboard focus and rows are listed), median of 10 after a warm-up | `tests/desktop/XRef.DesktopTests/Performance/BudgetTests.cs` | `npm run test:desktop -- --filter-trait "Category=Performance"` |
| Keystroke to list updated on guide-500 (timed in the page) | same | same |
| In-page breakdown: shortcut handler to ready, each port call before ready, main-thread tasks over 50 ms | the performance runner, `src/dev/perf-recorder.ts` and `src/dev/perf-pane.ts`, loaded by `main.ts` in the Vite dev server only and read by `BudgetTests` as `window.__xrefPerf`; each run's timeline is saved as `tests/desktop/test-results/perf-*.json`, with each open's start (`at`) and each keystroke (`marks`) on the page clock and the frame the browser blames for each long task (`source`), so a long task outside an open can be placed | same |
| Where the cursor read's time goes, in variants | `tests/desktop/XRef.DesktopTests/Performance/OpenCostDiagnostics.cs` (explicit) | `npm run test:desktop -- --filter-method "*Open_cost*" --explicit only` |
| `FuzzyMatcher` | `tests/bench/fuzzy-matcher.bench.ts` (asserts the 5 ms budget) | `npm run bench` |

The harness's time includes what Office does before the add-in's handler runs (dispatching the
shortcut) and after the page is ready (moving Windows focus into the pane), which the add-in
cannot see. The runner's time is the add-in's own share.

## Measurements, 2026-10-20 (test VM, Word 2609, about half the speed of the owner's desktop)

### Before (T098 baseline)

| | spec-300 |
|---|---|
| Shortcut to ready (harness), median of 10 | 735 to 1,093 ms |
| Handler to ready (runner), median | 175 to 582 ms |
| `checkInsertionPoint`, median | 100 to 484 ms |
| Background `readHeadings` | started about 130 ms after the handler, before the palette was ready; 400 ms to 5.8 s |

### What was found

1. **The background heading refresh held up the palette.** `openPalette` started the full
   heading read (about 400 ms of Word's time on spec-300) as soon as it returned the cached
   list, before the palette was on screen. Word runs Office.js batches on its UI thread, the
   same one that moves keyboard focus into the pane, so focus arrived only after the read.
   When the read was slow (2.5 s on some opens) the palette took as long.
2. **Word answers nothing for 100 to 450 ms after `showAsTaskpane`.** An empty `context.sync()`
   at the start of the cursor read took about 430 ms in some runs and 10 ms in others; every
   real load in the batch took 1 to 6 ms. Reading before showing the pane makes the read fast
   (about 9 ms) but the whole open slower (median 1,266 ms), because Word then starts giving the
   pane focus later. Reading while the pane is being shown was tried too (below) and made no
   difference.
3. The cursor read itself is cheap: the selection's facts in 8 ms, the main-text paragraphs
   before the cursor (for heading positions) in about 60 ms, tracked changes in 27 ms. Merging
   its two syncs into one would save one round trip (10 to 30 ms) but needs the story before it
   can ask for the main-text range, so it was left.
4. `FuzzyMatcher` and the list update are far inside budget (below).

### Changes

- **The background refresh waits until the palette has been on screen for
  `REFRESH_DELAY_MS` (1 s)** (`openPalette`'s `mayRefresh`, `createApp`'s
  `delayRefresh`, `src/app/create-app.ts`). With 300 ms the read still overlapped Word's
  focus change on 3 opens in 10 on the VM; with 1 s it no longer did. The cached list is shown in
  the meantime, and Enter reads the document again anyway, so a list a second older than before
  cannot insert a wrong reference (FR-024).
- **The deferred refresh is skipped if the palette has closed by then** (Esc or an insertion
  within the second). Without that, a full run on the VM timed out: the read began after Esc and
  was still running 12.7 s later, and Word was busy behind the user's back. An insertion already
  gives the cache its new bookmark. The cost: the list is refreshed only by a palette that stays
  open for a second, so someone who always opens, types and inserts within the second keeps
  seeing the last read's list (and recents of deleted headings stay in the store, unlisted). A
  heading added since then is missing until they wait a second with the palette open, which
  someone looking for it does anyway; a renamed or removed one is caught at Enter. Refreshing
  while the pane is hidden would bring back the busy Word above, and refreshing at the next open
  the slow open, so this was accepted.
- Tried and not kept: reading the cursor while the pane is being shown (`Promise.all` of
  `showPane` and the reads). Medians with it (598, 613, 625, 688, 729 ms) and without it (449,
  646, 668 ms) were the same within the VM's noise, so the simpler order stayed: show, then read.

### After

Shortcut to ready (harness), spec-300, median of 10 per run:

| Open path | Runs of spec-300 alone | Full Performance run |
|---|---|---|
| Before (refresh at once) | 735 ms | 1,093 ms |
| Refresh after 300 ms | 449, 461 ms | 850 to 1,354 ms |
| Refresh after 1 s | 449, 646, 668 ms | 782 ms |
| Refresh after 1 s, skipped once closed (as shipped) | 447, 475 ms | 818, 836 ms |

Handler to ready (runner), spec-300, as shipped: medians 180 to 215 ms alone, 595 ms in full runs; `checkInsertionPoint`
about 100 to 230 ms, or about 500 ms in a run where Word is slow after `showAsTaskpane`
(finding 2), which was the case in every full run.

| guide-500 | |
|---|---|
| Keystroke to list updated, median of 9 | 16 to 25 ms (worst 31 to 54 ms) |
| Longest main-thread task | 97 to 118 ms: one task, the first mount of all 500 rows after the first read. **Over the 100 ms budget on the VM**; reported, not asserted, by `BudgetTests` |

| `npm run bench` (Node, VM) | mean |
|---|---|
| 20-character query, close match | 0.38 ms |
| scattered | 0.35 ms |
| no match | 0.23 ms |
| per keystroke while typing 20 characters | 1.2 ms |

Single opens of 3 to 8 s happen on the VM with nothing of the add-in's running (the runner shows
the page ready in about 200 ms and the harness waiting on Word's focus), and in some runs Word is
slow to answer for the whole run (the right-hand column). Neither changes with the add-in's
code, so the 500 ms budget is to be confirmed on the owner's desktop in the release run (T103).

### Left as is

- The first mount of 500 rows is one task of about 100 ms on the VM (97 to 118 ms, so the
  100 ms budget is not met there), and about half that expected on the desktop, which the release
  run (T103) confirms. If it is over budget there too, render the list in chunks. (The desktop
  run below found the first mount is 51 ms there, and that the task over 100 ms is a different
  one, not the add-in's; the VM's attribution to the first mount was not measured.)

## Measurements, 2026-10-20 (owner's desktop, Word 2609)

AMD Ryzen 7 9800X3D (8 cores, 16 threads), 62 GB RAM, Windows 11, Word for Microsoft 365
Version 2609 (build 16.0.20430.20146), the same Word version as the VM. Display 5120×1440 for the
first runs, then 1920×1080 (100 %) after a restart. Changing the resolution without signing out
left every pane at 120×11 pixels (two Performance runs failed on it); after a restart it behaved.

### spec-300: shortcut to ready

Harness median of 10 per run (worst in brackets):

| Run | 5120×1440 | 1920×1080 |
|---|---|---|
| spec-300 alone | 163 (619), 166 (283) ms | — |
| Performance category | 160 (286), 161 (278) ms | 150 (509), 153 (195) ms |
| Full harness run | — | 141 (162) ms |

In-page (runner), median per run: handler to ready 137 to 139 ms at 5120×1440, 122 to 130 ms at
1920×1080; `shell.showPane` 36 to 37 ms and 17 to 18 ms; `checkInsertionPoint` 72 to 79 ms in
every run, alone or not. No `readHeadings` before ready on spec-300. **The 500 ms budget is met
with a wide margin**: about a third of the VM's figure run alone, and a fifth of it in category
runs, where the VM's Word stayed busy after `showAsTaskpane` (finding 2). That busy Word did not
happen on the desktop: `checkInsertionPoint` was the same alone and in the full run. The single
opens of 509 and 619 ms are the kind of slow focus hand-over the VM showed, with the page ready in
its usual time.

### guide-500

| Run | Keystroke to list updated, median (worst) | Longest task |
|---|---|---|
| Performance, 5120×1440 | 12 (23), 17 (24) ms | 147, 156 ms |
| Performance, 1920×1080 | 22 (36), 13 (26) ms | 181 (after one of 70 ms), 158 ms |
| Keystroke test alone, with keystroke marks | 12 (26), 13 (24), 13 (27) ms | 143, 146, 146 ms |
| Full harness run | 14 (25) ms | 152 ms |

The keystroke budget (50 ms) is met. The longest task is over 100 ms in every run, but it is not
the add-in's:

1. **The first mount of 500 rows is 51 ms** on the desktop: the one long task inside the
   guide-500 open, about 300 ms after the shortcut, just after `readHeadings` returns.
2. **The task over 100 ms comes after ready, at the second keystroke.** With opens and keystrokes
   on the page clock, in the first of three runs: the palette is ready at 11,508 ms, `n` is typed
   at 11,547, `u` at 11,579, and the long task starts at 11,579 and lasts 143 ms. The other two
   runs are the same within a millisecond or two of their own `u` (146 ms each).
3. **The pane kept handling keystrokes during it.** In that run `m`, `b`, `e`, `r`, `e`, `d`,
   space and `4` arrived every 9 to 25 ms from 11,596 to 11,713, inside the task's span (to
   11,722), and each updated the list in 6 to 27 ms. The pane's own thread could not have been
   blocked for 143 ms.
4. **The browser blames `unknown`, not `self`** (`PerformanceLongTaskTiming.attribution`), so it
   does not attribute the time to the pane's page.
5. **The display size makes no difference** (5120×1440 against 1920×1080), and the background
   refresh is not involved: no `readHeadings` runs after ready in this test (the open was cold).

What the task is was not found. A likely explanation, not confirmed, is work outside the pane's
script that Chromium counts on the same thread (the WebView2 host, or input handled in a nested
loop while the typing goes on). Rendering the list in chunks, the fix planned for the first mount,
would not change it, so nothing was changed. The owner accepted it for this release (2026-10-20):
an occasional pause of about 100 to 150 ms is only just perceptible in day-to-day use and not
worth the effort now.

| `npm run bench` (Node, desktop) | mean |
|---|---|
| 20-character query, close match | 0.23 ms |
| scattered | 0.20 ms |
| no match | 0.19 ms |
| per keystroke while typing 20 characters | 0.76 ms |

### VM and desktop side by side

| Measure | Budget | VM | Desktop |
|---|---|---|---|
| spec-300 shortcut to ready, run alone | < 500 ms | 416, 447, 475 ms | 163, 166 ms |
| spec-300 shortcut to ready, Performance or full run | < 500 ms | 796, 818, 836 ms | 141 to 161 ms |
| spec-300 handler to ready (runner) | (add-in's share) | 180 ms alone; 586 to 595 ms in category runs | 122 to 139 ms |
| `checkInsertionPoint` before ready | — | 94 ms alone; 484 ms in category runs | 72 to 79 ms |
| guide-500 keystroke to list updated | < 50 ms | 16 to 26 ms | 12 to 22 ms |
| guide-500 longest task | ≤ 100 ms | 97 to 118 ms | 143 to 181 ms, not the pane's script (above); the first mount 51 ms |
| `npm run bench`, 20-character query (close / scattered / none) | < 5 ms | 0.38 / 0.35 / 0.23 ms | 0.23 / 0.20 / 0.19 ms |
