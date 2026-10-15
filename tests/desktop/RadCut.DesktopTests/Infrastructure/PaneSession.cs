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
        // The document must reference the add-in for Word to load a development add-in for it
        // (without it the RAD·CUT ribbon group never appears: M0, 2026-10-15).
        TaskpaneDocument.AddAutoOpenTaskpane(Scratch.Path, AddinManifest.Load());
        Word = await WordSession.StartAsync(Scratch.Path, route);

        // The task pane part loads the add-in but does not open its pane (M0 diagnostic,
        // 2026-10-15), so open it as a user would. The pane's WebView2, and with it the debugging
        // endpoint, starts only then (unless another pane, such as Copilot's, started it first).
        Ribbon.Invoke(Word, Ribbon.CrossReference);
        var version = await Word.WaitForCdpAsync(CdpWait);
        if (version is null)
        {
            var failure = $"no debugging endpoint at {Word.CdpEndpoint} within {CdpWait.TotalSeconds:0} s";
            RouteReport.Add(Mode, route, false, failure);
            return failure;
        }
        try
        {
            Pane = await TaskPane.ConnectAsync(Word.CdpEndpoint);
            RouteReport.Add(Mode, route, true, $"pane page {Pane.Page.Url} at {Word.CdpEndpoint}");
            return null;
        }
        catch (Exception e)
        {
            var failure = $"endpoint answered but no pane page: {e.Message}";
            RouteReport.Add(Mode, route, false, failure);
            return failure;
        }
    }

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
