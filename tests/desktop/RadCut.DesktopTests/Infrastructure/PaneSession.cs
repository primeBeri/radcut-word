namespace RadCut.DesktopTests.Infrastructure;

/// <summary>
/// Everything a pane-driven test needs: the dev server, the add-in registered, Word on a scratch
/// copy with the pane opened from RAD·CUT's ribbon button, COM to the document, and Playwright to
/// the pane. Uses pane route
/// B (research D3: route A sets no debugging port in this Office build) unless
/// <c>RADCUT_PANE_ROUTE</c> names another, and records each attempt in <c>test-results/routes.md</c>.
/// </summary>
public sealed class PaneSession : IAsyncDisposable
{
    /// <summary>Word opens the pane's WebView2 about 30 s after it starts (M0 diagnostic, 2026-10-15).</summary>
    public static readonly TimeSpan CdpWait = TimeSpan.FromSeconds(90);

    private DevServer? server;
    private Sideload? sideload;

    public WordSession? Word { get; private set; }
    public TaskPane? Pane { get; private set; }
    public ScratchFixture? Scratch { get; private set; }
    public DevServerMode Mode { get; }

    /// <summary>Why no route reached the pane, when <see cref="Pane"/> is null.</summary>
    public string? PaneFailure { get; private set; }

    private PaneSession(DevServerMode mode)
    {
        Mode = mode;
    }

    public static async Task<PaneSession> StartAsync(string fixture, DevServerMode mode, string testId)
    {
        Preflight.RefuseIfWordRunning();
        Preflight.RequireTrustedCertificate();
        var session = new PaneSession(mode);
        try
        {
            session.server = await DevServer.StartAsync(mode);
            var failures = new List<string>();
            foreach (var route in Routes())
            {
                var attempt = await session.TryRouteAsync(fixture, route, testId);
                if (attempt is null) return session;
                failures.Add($"route {route}: {attempt}");
            }
            session.PaneFailure = string.Join("; ", failures);
            return session;
        }
        catch
        {
            await Cleanup.QuietlyAsync(session.DisposeAsync);
            throw;
        }
    }

    /// <summary>Null on success, else why the route failed. On failure Word is left running only for the last route.</summary>
    private async Task<string?> TryRouteAsync(string fixture, PaneRoute route, string testId)
    {
        await CloseWordAsync();
        sideload = Sideload.Register(directDebugger: route == PaneRoute.A);
        Scratch = ScratchFixture.Create(fixture, $"{testId}-{route}");
        // The document must reference the add-in, where the sideload put it, for Word to load it
        // (without it the RAD·CUT ribbon group never appears: M0, 2026-10-15).
        TaskpaneDocument.AddAutoOpenTaskpane(Scratch.Path, AddinManifest.Load(), sideload.Store);
        Word = await WordSession.StartAsync(Scratch.Path, route);

        // The task pane part loads the add-in but does not open its pane (M0 diagnostic,
        // 2026-10-15), so open it as a user would. The pane's WebView2, and with it the debugging
        // endpoint, starts only then (unless another pane, such as Copilot's, started it first).
        Ribbon.Invoke(Word, Ribbon.CrossReference);
        string? version = null, addinError = null;
        var clock = System.Diagnostics.Stopwatch.StartNew();
        while (clock.Elapsed < CdpWait && version is null && addinError is null)
        {
            version = await Word.WaitForCdpAsync(TimeSpan.FromSeconds(2));
            if (version is null) addinError = Word.DismissAddinError();
        }
        if (addinError is not null)
        {
            var failure = $"Word could not start the add-in and showed: \"{addinError}\" (dismissed). If another Office app " +
                "shares the add-in browser, check that the harness's Word has its own WebView2 data folder (tests/desktop/README.md).";
            RouteReport.Add(Mode, route, false, failure);
            return failure;
        }
        if (version is null)
        {
            var failure = $"no debugging endpoint at {Word.CdpEndpoint} within {CdpWait.TotalSeconds:0} s";
            RouteReport.Add(Mode, route, false, failure);
            return failure;
        }
        try
        {
            Pane = await TaskPane.ConnectAsync(Word.CdpEndpoint);
        }
        catch (Exception e)
        {
            var failure = $"endpoint answered but no pane page: {e.Message}";
            RouteReport.Add(Mode, route, false, failure);
            return failure;
        }
        var clicks = 1;
        try
        {
            await Pane.WaitForOfficeAsync(Wait.WordStart);
            if (Mode == DevServerMode.Normal)
            {
                clicks = await WaitForRibbonOpenAsync(Pane, Word);
                await Pane.WatchVisibilityAsync();
                await Pane.TrackOfficeCallsAsync();
            }
        }
        catch (TimeoutException e)
        {
            var failure = $"pane page found but not ready: {e.Message}";
            RouteReport.Add(Mode, route, false, failure);
            return failure;
        }
        RouteReport.Add(Mode, route, true, $"pane page {Pane.Page.Url} at {Word.CdpEndpoint}" + (clicks > 1 ? $"; palette open after {clicks} ribbon clicks" : ""));
        return null;
    }

    /// <summary>
    /// Waits for the open the ribbon button started (palette, or a message instead) to finish, so
    /// a test does not hide the pane or press keys while it is still running. When the click
    /// started the add-in, Word often loads it without running the command: the add-in has
    /// associated OpenPalette but is never called, and the pane stays 120×11 (7 of 11 sessions on
    /// the VM, 2026-10-16; office-js#2744). Like a person, the harness then clicks again.
    /// </summary>
    /// <returns>How many clicks it took, the first included.</returns>
    private static async Task<int> WaitForRibbonOpenAsync(TaskPane pane, WordSession word)
    {
        var clock = System.Diagnostics.Stopwatch.StartNew();
        var clicks = 1;
        while (true)
        {
            try
            {
                await Wait.UntilAsync(
                    async () => await pane.Page.Locator($"input[aria-label='{TaskPane.SearchBoxName}'], .message-view").CountAsync() > 0,
                    RibbonRetry,
                    "the palette opened by the ribbon button");
                return clicks;
            }
            catch (TimeoutException) when (clock.Elapsed + RibbonRetry < Wait.WordStart)
            {
                Ribbon.Invoke(word, Ribbon.CrossReference);
                clicks++;
            }
        }
    }

    /// <summary>How long a ribbon click may take to show the palette before the harness clicks again (it takes about 1 s when the command arrives).</summary>
    private static readonly TimeSpan RibbonRetry = TimeSpan.FromSeconds(10);

    private static IEnumerable<PaneRoute> Routes() =>
        Environment.GetEnvironmentVariable("RADCUT_PANE_ROUTE") switch
        {
            "A" => [PaneRoute.A],
            "AB" => [PaneRoute.A, PaneRoute.B],
            _ => [PaneRoute.B],
        };

    /// <summary>Adds what this session can show to a failed test's evidence.</summary>
    public async Task SaveEvidenceAsync(EvidenceFolder folder)
    {
        if (Word is { HasExited: false } word && word.MainWindow != IntPtr.Zero) folder.SaveWindow(word.MainWindow);
        if (Pane is not null) await Pane.SaveEvidenceAsync(folder);
        if (Scratch is not null)
        {
            // Save the scratch copy in place, then copy the file: SaveAs2 would move the open
            // document into the evidence folder for the tests that follow.
            try
            {
                Word?.Document.Save();
                folder.SaveCopy(Scratch.Path, "scratch.docx");
            }
            catch (Exception)
            {
                folder.SaveCopy(Scratch.Path, "scratch-as-opened.docx");
            }
        }
    }

    private async Task CloseWordAsync()
    {
        if (Pane is not null) await Pane.DisposeAsync();
        Pane = null;
        if (Word is not null) await Word.DisposeAsync();
        Word = null;
        sideload?.Dispose();
        sideload = null;
        Scratch?.Delete();
        Scratch = null;
    }

    public async ValueTask DisposeAsync()
    {
        try
        {
            await CloseWordAsync();
        }
        finally
        {
            if (server is not null) await server.DisposeAsync();
            server = null;
        }
    }
}

/// <summary>Each pane-route attempt of the run, for <c>tests/desktop/README.md</c> "Routes that worked".</summary>
public static class RouteReport
{
    private static readonly object Gate = new();

    public static void Add(DevServerMode mode, PaneRoute route, bool worked, string detail) =>
        Append($"| {DateTime.Now:yyyy-MM-dd HH:mm} | {mode} | {route} | {(worked ? "worked" : "failed")} | {detail} |");

    /// <summary>A free-form finding (e.g. research D6) for the same file.</summary>
    public static void Note(string finding) => Append($"| {DateTime.Now:yyyy-MM-dd HH:mm} | | | note | {finding} |");

    private static void Append(string row)
    {
        lock (Gate)
        {
            Directory.CreateDirectory(HarnessPaths.TestResults);
            var path = Path.Combine(HarnessPaths.TestResults, "routes.md");
            if (!File.Exists(path)) File.WriteAllText(path, "| When | Build | Route | Result | Detail |\n|---|---|---|---|---|\n");
            File.AppendAllText(path, row.Replace("\r", " ").Replace("\n", " ") + "\n");
        }
    }
}
