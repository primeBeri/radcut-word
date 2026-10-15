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
