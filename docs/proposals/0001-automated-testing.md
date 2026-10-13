# Proposal 0001: Automated testing to remove the human bottleneck

| | |
| --- | --- |
| **Status** | Proposed, ready for handover to Claude Code on the Windows desktop |
| **Date** | 2026-10-13 |
| **Affects** | Constitution Principle II and quality gate 5 (minor amendment), Phase 0 spikes, every later feature's `tasks.md` |
| **Runs on** | Layers 1–2: anywhere, including CI and cloud sessions. Layers 3–6: Windows with Word desktop installed |

## TL;DR

Manual testing in Word is the slowest step in the loop, and it depends on one person's time. Most of it can be automated in **seven layers**, cheapest first. Each layer only tests what the layer below it cannot.

1. **Core unit tests** with Vitest and `FakeGateway`. These need no Word.
2. **Adapter unit tests** with `office-addin-mock`. These need no Word.
3. **The contract suite inside real desktop Word**, driven by Playwright attached to the task pane's WebView2 through the Chrome DevTools Protocol (CDP).
4. **Document verification** through Word's COM API: F9 results, bookmarks, and how fields resolve without the add-in.
5. **Keyboard and focus tests** through Windows UI Automation (FlaUI).
6. **Claude computer use**, for exploratory charters only, never as a merge gate.
7. **A human checklist** of about 10 minutes per release, for what cannot be automated.

Layers 3–5 share one C# test project, `RadCut.DesktopTests` (xUnit, Playwright for .NET, FlaUI, COM), which runs with a single command on the Windows machine.

The first milestone (M0) is a feasibility spike for the harness itself. Everything else depends on Playwright being able to attach to the WebView2 inside Word.

---

## 1. Problem

- RAD·CUT is an Office.js add-in for Word on Windows. Its riskiest behaviour belongs to the host: focus after a keyboard shortcut, REF field insertion, heading numbers from `listString`, and bookmarks under tracked changes. Unit tests alone cannot cover these.
- Today every check against real Word needs a person at the keyboard. Claude Code can write code and unit tests quickly, but then waits for manual verification, which caps throughput.
- The constitution already requires a contract suite to run "inside Word (Script Lab or a dev task pane)". It does not say how that run is triggered or how its results get back to Claude. Today the answer is "a human clicks it and reads it out".

## 2. Goals and non-goals

**Goals**

- G1. Claude Code on the Windows desktop can run *every* automatable check without a human. It does this with one command and gets a machine-readable result (exit code plus a JUnit/TRX report).
- G2. Each Phase 0 spike (§7) is an automated test, not a one-off manual experiment. It then becomes the first regression test.
- G3. Human testing shrinks to a short, written checklist of things that genuinely cannot be automated.
- G4. All of this stays within the constitution: test-first, deterministic tests, no network, and dev tooling excluded from release builds and bound to localhost.

**Non-goals**

- Running Word in the cloud or in GitHub-hosted CI. Hosted runners do not have licensed Office installed. A self-hosted Windows runner is a possible later step (§10), not part of this proposal.
- Mac and web automation. These belong to Phase 4. The layering below carries over, but the drivers do not.
- Using screenshots or computer vision as a pass/fail gate.

## 3. Test pyramid

| # | Layer | Proves | Tooling | Where | Typical runtime |
| --- | --- | --- | --- | --- | --- |
| 1 | Core unit | `HeadingIndex`, `FuzzyMatcher`, bookmark naming, `InsertReference`, format composition | Vitest, `FakeGateway` | Anywhere, including CI | Seconds |
| 2 | Adapter unit | `OfficeJsGateway` issues the expected Office.js calls, `load`/`sync` order and fallbacks | Vitest, [`office-addin-mock`](https://learn.microsoft.com/office/dev/add-ins/testing/unit-testing) | Anywhere, including CI | Seconds |
| 3 | Contract in Word | The fake and real Word agree. Real insertion works. Performance budgets are met in the real pane | In-pane contract runner, triggered and read by Playwright over CDP | Windows with Word | About 1 min |
| 4 | Document verification | Saved output is native and portable: F9 updates every part, the `\h` target bookmark exists and sits on the heading, no duplicate or invalid bookmarks | Word COM via C# (`dynamic` interop) | Windows with Word | About 1 min |
| 5 | Keyboard and focus | The shortcut opens the palette, focus lands in the search box, every flow works keyboard-only, Esc changes nothing, focus returns to the document | FlaUI (UI Automation) plus Playwright for in-pane state | Windows with Word, interactive desktop | 1–3 min |
| 6 | Exploratory | Anything odd or ugly the scripted tests did not anticipate | Claude computer use in the Claude desktop app, following written charters | Windows with Word | Ad hoc |
| 7 | Human | AltGr on physical UK and European layouts, SharePoint co-authoring, screen-reader feel, release sign-off | `docs/testing/manual-checklist.md` | You | About 10 min per release |

**Rule of thumb for `tasks.md`:** every test task names its layer, for example `[L1]` or `[L4]`. A behaviour is tested at the *lowest* layer that can observe it. Layers 3–5 exist to prove host behaviour, not to re-test core logic.

## 4. Architecture of the desktop harness (layers 3–5)

### 4.1 Why one C# project

The harness needs three Windows-side capabilities: driving Word through COM, sending real OS keystrokes through UI Automation, and driving the task pane through CDP. All three have mature .NET libraries ([Playwright for .NET](https://playwright.dev/dotnet/docs/webview2), [FlaUI](https://github.com/FlaUI/FlaUI) and COM interop). Keeping them in one xUnit project means one runner, one report and one place to manage Word's lifecycle. The project owner also reads C# fluently, which matters for reviewing the tests.

*Rejected alternative:* a Node-only harness (Playwright for Node plus a COM bridge such as `winax`, plus a native keystroke library). It keeps one language, but COM from Node is fragile and native input libraries have licensing and maintenance problems.

The add-in itself stays TypeScript. Only the harness is C#.

### 4.2 Components

```
tests/desktop/RadCut.DesktopTests/
  Infrastructure/
    WordSession.cs        // IDisposable. Starts WINWORD with the CDP env var, opens a fixture copy, closes without saving
    TaskPaneDriver.cs     // Playwright: ConnectOverCDPAsync, finds the RAD·CUT pane page, typed helpers
    KeyboardDriver.cs     // FlaUI: activates the Word window, sends chords, reads the focused element
    DocumentInspector.cs  // COM: fields, field codes, results after Fields.Update(), bookmarks, revisions
    Fixtures.cs           // copies tests/fixtures/docx/*.docx to a temp dir per test
  Contract/
    ContractSuiteTests.cs // triggers the in-pane contract runner and asserts on its JSON result
  Document/
    PortabilityTests.cs   // layer 4
  Keyboard/
    PaletteFlowTests.cs   // layer 5
  Spikes/
    Phase0Spikes.cs       // S1–S3 (see §7)
```

Design notes, all Clean Code and SRP:

- **`WordSession` owns the process lifecycle.** It refuses to start if `WINWORD.EXE` is already running, and fails with a clear message rather than killing it, so the owner's open documents are never at risk. It sets `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<free port>` on the **child process only**, never machine-wide, because that would affect Teams, Outlook and every other WebView2 app. It also sets a dedicated `WEBVIEW2_USER_DATA_FOLDER` under the temp directory.
- **Fixtures are never edited in place.** Each test works on a fresh temp copy, and the session closes Word with `SaveChanges = false` unless the test explicitly saves to its temp copy for layer 4.
- **No sleeps.** Every wait is a condition with a timeout, for example "pane page exists", "search box is focused" or "field count == n". This is what the constitution means by deterministic tests.
- **Failure artefacts.** On failure, save a Playwright trace, a screenshot of the Word window and the saved `.docx` to `test-results/` (gitignored), so Claude Code can diagnose without asking a human.

### 4.3 In-pane contract runner (layer 3)

The contract suite must run against `OfficeJsGateway` *inside* Word, but Vitest runs in Node. Proposed shape:

- Write the contract suite once as **runner-agnostic** functions, `defineGatewayContract(makeGateway, t)`, where `t` is a small interface with `test`, `expectEqual` and so on.
- **Node:** a thin Vitest adapter runs it against `FakeGateway` (layer 1, CI).
- **Word:** a dev-only build entry (`src/dev/contract-pane.ts`) runs the same functions against `OfficeJsGateway`. It writes the results as JSON into a `<pre id="contract-results">` element and sets `data-status="done"`.
- **Harness:** `ContractSuiteTests` uses Playwright to open the dev pane, click Run (or call `window.__radcutRunContract()`), wait for `data-status="done"`, parse the JSON and assert that every case passed. Each contract case is reported individually.
- **Constitution V:** the dev entry and any hooks on `window` are excluded from release builds by the bundler config. A layer 1 test asserts that the release bundle does not contain the string `__radcutRunContract`. The CDP port binds to `127.0.0.1` only.

The same pane measures the Principle IV budgets with `performance.now()`: palette open at 300 headings, filter latency, and long tasks via `PerformanceObserver` at 500 headings. It reports them in the same JSON, so budget regressions fail the run.

### 4.4 Document verification (layer 4)

`DocumentInspector` opens the saved temp `.docx` in a **COM-started Word instance with no add-in involved**. That proves portability directly. It asserts the following:

- Every REF field's code parses to a bookmark name that exists in `Document.Bookmarks`. That bookmark's range starts in a heading paragraph (built-in Heading 1–9 style, or outline level 1–9).
- After `Document.Fields.Update()`, the field results match expectations (`\w` gives the full-context number such as "4.3", plain REF gives the heading text, `\p` gives "above" or "below"). The test then renames or moves the heading, updates again, and checks the results follow it.
- Every reference field carries `\h`.
- Bookmark names start with `_`, are 40 characters or fewer, are unique, and are **reused**: inserting a second reference to the same heading adds no new bookmark.
- For tracked-changes fixtures: `TrackRevisions = true` before insertion, then check what `Document.Revisions` contains and that the bookmark survives accept-all and reject-all.

Checking that the hyperlink "jumps" is approximated by asserting the `\h` switch and the bookmark's location. Layer 6 or 7 confirms the actual click visually, once per release.

### 4.5 Keyboard and focus (layer 5)

- `KeyboardDriver` brings the Word document window to the foreground. This matters because the console running the tests otherwise keeps focus. It then sends the configured shortcut as a real OS key chord through FlaUI.
- Assertions combine two views:
  - **UI Automation:** the focused element is the palette's search box. This works because Chromium exposes the WebView2 accessibility tree to UIA, and it also checks the labelled controls that Principle IV requires.
  - **Playwright:** `document.hasFocus()` and `document.activeElement` agree.
- Flows to cover: open, type, ↑ ↓, Tab to cycle format, Enter inserts and focus returns to the document body, Esc cancels with no document change (body OOXML is equal before and after), and a reconfigured shortcut.
- Precondition: layer 5 needs an **unlocked, interactive desktop session**. It cannot run as a service or behind a lock screen. The harness detects this and skips layer 5 with an explicit "SKIPPED: no interactive desktop" message rather than failing.

## 5. Claude computer use (layer 6)

Use computer use for **exploration**, not regression. It is slow, costs tokens and is not deterministic, but it is good at noticing things no one wrote a test for.

- Charters live in `tests/exploratory/*.md`. Each has a goal, a time box, the fixture to use and what to report, for example: "Using `long-spec-300-headings.docx`, insert 10 references in mixed formats, restructure two sections, press F9, and report anything visually wrong or slow."
- Run it from the Claude desktop app with computer use enabled, on the same Windows machine, after layers 1–5 are green.
- Output: a short report plus screenshots in `test-results/exploratory/`. Every real finding becomes a layer 1–5 test before it is fixed (Principle II).

## 6. Human checklist (layer 7)

`docs/testing/manual-checklist.md` should contain only items that automation cannot reach:

1. The shortcut works on a physical UK keyboard and does not clash with AltGr. After that, reconfigure it and check again.
2. SharePoint or OneDrive co-authoring: two users, one inserts a reference, the other sees a working field after sync.
3. Ctrl+click the hyperlink in a document opened on a machine *without* the add-in.
4. A short screen-reader pass with Narrator on the palette.
5. The palette looks right in the Office light and dark themes.

Target: under 10 minutes, done once per release candidate rather than per change.

## 7. Phase 0 spikes as automated tests

| Spike | Automated as | Layers |
| --- | --- | --- |
| S1. Shortcut opens the task pane with focus in the search box | `Phase0Spikes.Shortcut_opens_pane_with_search_focused`. If it fails, the same test runs against the `displayDialogAsync` fallback | 5 (+3) |
| S2. A REF field to a hidden bookmark survives F9, and the hyperlink targets the heading | `Phase0Spikes.Ref_to_hidden_bookmark_survives_F9`. Covers both insertion paths: `insertField("Ref")` and the OOXML fallback | 3 + 4 |
| S3. Bookmark insertion under tracked changes | `Phase0Spikes.Bookmark_insert_with_track_changes_on` | 3 + 4 |
| S3b. SharePoint co-authoring | Stays manual (layer 7, item 2) | 7 |

Each spike test records which path worked (primary or fallback) in its output. That gives Principle VI ("verified assumptions") an evidence trail.

## 8. Test fixtures

`tests/fixtures/docx/` holds small `.docx` files **generated by a script** (`tests/fixtures/Generate-Fixtures.ps1`, which uses Word COM), so they can be rebuilt and reviewed. Both the script and its outputs are committed.

- `headings-basic.docx`: Heading 1–3, numbered multilevel list.
- `headings-unnumbered.docx`: headings without numbering.
- `headings-outline-levels.docx`: outline levels without built-in styles.
- `existing-bookmarks.docx`: headings that already carry user bookmarks and `_Ref…` bookmarks.
- `track-changes-on.docx`.
- `long-spec-300-headings.docx` and `long-spec-500-headings.docx`: for the performance budgets.
- `manual-bold-headings.docx`: negative case. These must be ignored.

No fixture contains real client or project content.

## 9. Milestones and acceptance criteria

Work strictly in this order. Every milestone is red-green: write the failing test first.

| ID | Milestone | Done when |
| --- | --- | --- |
| **M0** | **Harness feasibility spike** | From one command, the harness starts Word with `headings-basic.docx` and the sideloaded add-in, attaches Playwright to the task pane over CDP, reads one known DOM element, and shuts Word down cleanly. If the env-var route fails, try Microsoft's documented debug-attach route (port 9229, used by the [VS Code debug configuration](https://learn.microsoft.com/office/dev/add-ins/testing/debug-desktop-using-edge-chromium)). Record which route works in `tests/desktop/README.md`. **If neither works, stop and report:** layer 3 then falls back to COM-only checks plus layer 6. |
| M1 | Layers 1–2 wired | Vitest and `office-addin-mock` are configured. `npm test` runs them. A GitHub Actions workflow runs them on Ubuntu for every push. |
| M2 | Contract runner | `defineGatewayContract` runs against `FakeGateway` in Vitest and against `OfficeJsGateway` in the dev pane. `ContractSuiteTests` reports each case. The release bundle check passes. |
| M3 | Document verification | `PortabilityTests` covers every §4.4 assertion against fixture documents. |
| M4 | Keyboard and focus | `PaletteFlowTests` covers every §4.5 flow. It skips cleanly without an interactive desktop. |
| M5 | Phase 0 spikes | S1–S3 are automated as in §7, each with a recorded primary or fallback outcome. |
| M6 | Governance and docs | Constitution amended (§11). CLAUDE.md "Project state" lists the real commands. `manual-checklist.md` and two exploratory charters are written. |

M0 is a hard gate. M1 can proceed in parallel with M0, because it does not need Word.

## 10. Commands (target state)

```powershell
npm test                      # layers 1–2 (any OS)
npm run test:unit -- -t "FuzzyMatcher"   # a single Vitest test by name
npm run build:dev             # dev build including the contract pane
dotnet test tests/desktop     # layers 3–5 (Windows with Word; Word must be closed)
dotnet test tests/desktop --filter "Category=Spike"   # Phase 0 spikes only
```

A later step, not part of this proposal: register the Windows desktop as a **self-hosted GitHub Actions runner** with a `word` label, so that layers 3–5 run on pull requests. This needs an always-on, logged-in machine, and the runner must run interactively rather than as a service for layer 5.

## 11. Constitution impact

A **MINOR** amendment (1.0.0 → 1.1.0), made with `/speckit-constitution` once M0 has proved the approach:

- **Principle II:** name the test layers. Change "the Office.js contract run happens inside Word (Script Lab or a dev task pane)" to say that this run is triggered and read automatically by the desktop harness.
- **Quality gate 1:** "all unit and contract tests pass" covers layers 1–5 on the Windows machine before a release, and layers 1–2 on every push.
- **Quality gate 5:** the manual checklist is the short layer 7 list, not general manual testing.
- **Technology constraints:** add the C# desktop harness (xUnit, Playwright for .NET, FlaUI) as development-only tooling.

## 12. Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Office ignores or overrides `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` for add-in WebViews | Medium | M0 tests this first. Fallback: the documented debug-attach route on 9229. Last resort: COM checks plus computer use |
| Word is already running, so a new launch joins the existing process and ignores the env var | High | `WordSession` refuses to start and asks for Word to be closed. It never kills Word |
| The test console steals focus and breaks layer 5 | High | `KeyboardDriver` always activates the Word window and verifies it is in the foreground before sending keys |
| Locked screen, screensaver or RDP minimised | Medium | Layer 5 detects this and skips with a clear message. Run with the screen unlocked |
| UI tests become flaky | Medium | Condition waits only, no sleeps, one retry *at most* while diagnosing, traces on failure. A flaky test is a bug to fix, not to skip |
| An open CDP port is an attack surface | Low | Localhost only, random free port, dev runs only, and the env var is set on the child process only |
| `office-addin-mock` lags behind new Word APIs | Low | Layer 2 stays thin. Layer 3 is the source of truth for real behaviour |

## 13. Expected effect on human time

| | Today | After M5 |
| --- | --- | --- |
| Per change | Manual check in Word, about 10–30 min | None. Claude runs `npm test` and `dotnet test tests/desktop` |
| Per release | Ad hoc | Layer 7 checklist, about 10 min |
| Exploratory | Ad hoc | An optional computer-use charter, reviewed in about 5 min |

## 14. Handover: prompt for Claude Code on the Windows desktop

**Prerequisites on the machine:** Windows 11, Word (Microsoft 365, desktop, signed in), Node.js LTS, .NET 8 SDK or later, Git, PowerShell 7. Word must be **closed** before running the harness. Save any manual-testing documents first.

Paste this into Claude Code from the repository root:

> Read `docs/proposals/0001-automated-testing.md`, `.specify/memory/constitution.md` and `CLAUDE.md`. Then implement the proposal's milestones in order, starting with **M0 (harness feasibility spike)**. Work strictly test-first (red, green, refactor) and keep every test deterministic.
>
> Before starting, check the prerequisites in §14 and tell me anything missing. Never kill a running Word process. If Word is open, stop and ask me to close it. Never set the WebView2 env var machine-wide.
>
> After M0, report which CDP route worked, with evidence (test output). If neither route works, stop and report rather than improvising. If M0 passes, continue through M1–M5 and commit after each green milestone with a clear message. Use spec-kit (`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`) for the harness as feature `specs/001-test-harness/`, tagging each test task with its layer `[L1]`–`[L7]`. Do M6's constitution amendment with `/speckit-constitution` only after M5 is green.
>
> Do not copy anything from the gitignored PRD or `planning/` into committed files beyond what is fit for a public repository.

## 15. References

- Microsoft: [Unit testing in Office Add-ins (`office-addin-mock`)](https://learn.microsoft.com/office/dev/add-ins/testing/unit-testing)
- Microsoft: [Debug add-ins on Windows using VS Code and WebView2](https://learn.microsoft.com/office/dev/add-ins/testing/debug-desktop-using-edge-chromium)
- Microsoft: [Debug add-ins using Edge DevTools](https://learn.microsoft.com/office/dev/add-ins/testing/debug-add-ins-using-devtools-edge-chromium)
- Microsoft: [`office-addin-debugging`](https://www.npmjs.com/package/office-addin-debugging) and [`office-addin-dev-settings`](https://www.npmjs.com/package/office-addin-dev-settings) (sideloading)
- Playwright: [WebView2 (Node)](https://playwright.dev/docs/webview2) and [WebView2 (.NET)](https://playwright.dev/dotnet/docs/webview2)
- Meziantou: [Debugging a WebView2 component using Playwright in .NET](https://meziantou.net/debugging-a-webview2-using-playwright-in-dotnet.htm)
- FlaUI: [github.com/FlaUI/FlaUI](https://github.com/FlaUI/FlaUI)
- Word object model: [`Fields.Update`](https://learn.microsoft.com/office/vba/api/word.fields.update), [`Bookmarks`](https://learn.microsoft.com/office/vba/api/word.bookmarks), [`Revisions`](https://learn.microsoft.com/office/vba/api/word.revisions)
- Anthropic: [Computer use](https://docs.claude.com/en/docs/agents-and-tools/tool-use/computer-use-tool)
