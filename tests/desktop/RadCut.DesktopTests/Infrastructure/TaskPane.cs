using Microsoft.Playwright;

namespace RadCut.DesktopTests.Infrastructure;

/// <summary>
/// The add-in's task pane page, reached with Playwright over the WebView2 debugging endpoint.
/// Traces and console messages are kept for evidence.
/// </summary>
public sealed class TaskPane : IAsyncDisposable
{
    public const string SearchBoxName = "Search headings";

    private readonly IPlaywright playwright;
    private readonly IBrowser browser;
    private readonly IBrowserContext context;
    private readonly List<string> console = [];
    private bool tracing;

    public IPage Page { get; private set; }

    public IReadOnlyList<string> Console => console;

    private TaskPane(IPlaywright playwright, IBrowser browser, IBrowserContext context, IPage page)
    {
        this.playwright = playwright;
        this.browser = browser;
        this.context = context;
        Page = page;
        Watch(page);
    }

    /// <summary>Connects and waits for a page served by the dev server to appear.</summary>
    public static async Task<TaskPane> ConnectAsync(string cdpEndpoint, TimeSpan? timeout = null)
    {
        var playwright = await Playwright.CreateAsync();
        try
        {
            var browser = await playwright.Chromium.ConnectOverCDPAsync(cdpEndpoint);
            var context = browser.Contexts.FirstOrDefault() ?? throw new InvalidOperationException("The WebView2 has no browser context.");
            var page = await Wait.UntilValueAsync(
                () => Task.FromResult(context.Pages.FirstOrDefault(p => p.Url.StartsWith(DevServer.Origin.AbsoluteUri, StringComparison.Ordinal))),
                timeout ?? Wait.WordStart,
                $"a task pane page from {DevServer.Origin}");
            var pane = new TaskPane(playwright, browser, context, page);
            await context.Tracing.StartAsync(new() { Screenshots = true, Snapshots = true });
            pane.tracing = true;
            return pane;
        }
        catch
        {
            playwright.Dispose();
            throw;
        }
    }

    /// <summary>
    /// Waits until Office.js has initialised in the page: <c>Office.onReady()</c> resolved and the
    /// add-in APIs present. The page appears over CDP before that, and a call into Office.js too
    /// early fails ("Office is not defined", "OSF.DDA.RichApi.executeRichApiRequestAsync is not a
    /// function": full runs on the VM, 2026-10-16). Each probe gives up after 2 s, so a page that
    /// never initialises ends in a time-out; a probe that meets a navigation throws and is retried.
    /// </summary>
    public Task WaitForOfficeAsync(TimeSpan timeout) =>
        Wait.UntilAsync(
            () => Page.EvaluateAsync<bool>(
                @"() => typeof Office === 'undefined' ? false : Promise.race([
                    Office.onReady().then(() => !!(Office.addin && Office.actions)),
                    new Promise((resolve) => setTimeout(() => resolve(false), 2000)),
                ])"),
            timeout,
            "Office.js to be ready in the task pane");

    /// <summary>
    /// Records Office's visibility events for the pane in the page (<c>__radcutVisibility</c>, page
    /// time in ms), beside the add-in's own handler, so a test can see when the add-in hears that
    /// the pane was hidden.
    /// </summary>
    public Task WatchVisibilityAsync() =>
        Page.EvaluateAsync(
            @"async () => {
                if (globalThis.__radcutVisibility) return;
                globalThis.__radcutVisibility = [];
                await Office.addin.onVisibilityModeChanged((args) => {
                    globalThis.__radcutVisibility.push(`${Math.round(performance.now())} ${args.visibilityMode}`);
                });
            }");

    /// <summary>
    /// Counts the add-in's Office calls in flight (<c>__radcutBusy</c>): Word.run and showing or
    /// hiding the pane, wrapped in the page. The add-in's source is untouched; the wrappers exist
    /// only in the harness's page.
    /// </summary>
    public Task TrackOfficeCallsAsync() =>
        Page.EvaluateAsync(
            @"() => {
                if (globalThis.__radcutBusy !== undefined) return;
                globalThis.__radcutBusy = 0;
                const track = (owner, name) => {
                    const call = owner[name].bind(owner);
                    owner[name] = (...args) => {
                        globalThis.__radcutBusy++;
                        let pending;
                        try { pending = call(...args); } catch (error) { globalThis.__radcutBusy--; throw error; }
                        Promise.resolve(pending).finally(() => globalThis.__radcutBusy--).catch(() => {});
                        return pending;
                    };
                };
                track(Word, 'run');
                track(Office.addin, 'hide');
                track(Office.addin, 'showAsTaskpane');
            }");

    /// <summary>
    /// Waits until the add-in has no Office call in flight for 100 ms together: after an insertion
    /// or a close it still hides the pane and then returns the cursor, and that last step lands on
    /// whatever is selected by then (scenarios 05 and 23 on the VM, 2026-10-16).
    /// </summary>
    /// <returns>How long the wait took.</returns>
    public async Task<TimeSpan> WaitForAddinIdleAsync()
    {
        var clock = System.Diagnostics.Stopwatch.StartNew();
        await Wait.UntilAsync(
            () => Page.EvaluateAsync<bool>(
                @"() => new Promise((resolve) => {
                    let quiet = 0;
                    const timer = setInterval(() => {
                        quiet = (globalThis.__radcutBusy ?? 0) === 0 ? quiet + 1 : 0;
                        if (quiet >= 5) { clearInterval(timer); resolve(true); }
                    }, 20);
                    setTimeout(() => { clearInterval(timer); resolve(false); }, 2000);
                })"),
            Wait.Pane,
            "the add-in to finish its Office calls");
        return clock.Elapsed;
    }

    /// <summary>The recorded visibility events, oldest first, e.g. "41230 Hidden".</summary>
    public async Task<IReadOnlyList<string>> VisibilityEventsAsync() =>
        await Page.EvaluateAsync<string[]>("() => globalThis.__radcutVisibility ?? []");

    /// <summary>The page's clock (performance.now(), ms), to place an action among the visibility events.</summary>
    public async Task<long> NowAsync() => (long)await Page.EvaluateAsync<double>("() => performance.now()");

    /// <summary>Opens another page of the dev server in the pane, e.g. <c>dev/contract-pane.html?…</c>.</summary>
    public async Task GoToAsync(string relativeUrl)
    {
        await Page.GotoAsync(new Uri(DevServer.Origin, relativeUrl).AbsoluteUri);
    }

    /// <summary>The accessible name of the focused element and whether the page has focus.</summary>
    public async Task<(bool PageHasFocus, string? FocusedName)> FocusAsync()
    {
        var result = await Page.EvaluateAsync<string[]>(
            "() => [String(document.hasFocus()), document.activeElement?.getAttribute('aria-label') ?? '']");
        return (result[0] == "true", result[1] == "" ? null : result[1]);
    }

    /// <summary>Saves the trace and console to the evidence folder.</summary>
    public async Task SaveEvidenceAsync(EvidenceFolder folder)
    {
        folder.WriteLines("pane-console.log", console);
        if (tracing)
        {
            await context.Tracing.StopAsync(new() { Path = Path.Combine(folder.Path, "trace.zip") });
            tracing = false;
        }
    }

    public async ValueTask DisposeAsync()
    {
        try
        {
            if (tracing) await context.Tracing.StopAsync();
            // Closing a CDP connection detaches; it does not close Word's WebView2.
            await browser.CloseAsync();
        }
        finally
        {
            playwright.Dispose();
        }
    }

    private void Watch(IPage page) =>
        page.Console += (_, message) => console.Add($"{DateTime.Now:HH:mm:ss.fff} [{message.Type}] {message.Text}");
}
