using System.Management;
using System.Text;
using RadCut.DesktopTests.Infrastructure;

namespace RadCut.DesktopTests.Feasibility;

/// <summary>
/// Not a check: records how Word started WebView2 for the task pane, to choose a pane route
/// (research D3). Run on its own: --filter-trait "Category=Diagnose".
/// </summary>
[Trait("Category", "Diagnose")]
public sealed class DiagnoseTests
{
    [Theory]
    [InlineData(PaneRoute.B)]
    public async Task Record_the_task_pane_WebView2_processes(PaneRoute route)
    {
        Preflight.RefuseIfWordRunning();
        await using var server = await DevServer.StartAsync(DevServerMode.Normal);
        using var sideload = Sideload.Register(directDebugger: route == PaneRoute.A);
        var scratch = ScratchFixture.Create("spec-contract", $"diagnose-{route}");
        TaskpaneDocument.AddAutoOpenTaskpane(scratch.Path, AddinManifest.Load());
        var report = new StringBuilder($"# Route {route}, {DateTime.Now:yyyy-MM-dd HH:mm}\n\n");
        await using (var word = await WordSession.StartAsync(scratch.Path, route))
        {
            // Give the pane time to open; this is a diagnostic, so a fixed wait for WebView2 processes is a condition with a time-out.
            try
            {
                await Wait.UntilAsync(() => Task.FromResult(WebViewsOf(word.ProcessId).Count > 0), TimeSpan.FromSeconds(30), "a WebView2 process under Word");
            }
            catch (TimeoutException)
            {
                report.AppendLine("No WebView2 process started under Word within 30 s (the pane did not open).");
            }
            report.AppendLine($"Word pid {word.ProcessId}, CDP endpoint tried: {word.CdpEndpoint}\n");
            foreach (var (pid, commandLine) in WebViewsOf(word.ProcessId))
            {
                report.AppendLine($"- {pid}: `{commandLine}`");
            }
            var folder = new EvidenceFolder($"diagnose-{route}");
            if (word.MainWindow != IntPtr.Zero) folder.SaveWindow(word.MainWindow);
            var version = await word.WaitForCdpAsync(PaneSession.CdpWait);
            report.AppendLine($"\nCDP answered: {version is not null}");
            if (version is not null)
            {
                using var http = new HttpClient();
                // Targets appear as the pane loads: list them once one from the dev server shows up, or after the wait.
                var targets = "";
                try
                {
                    await Wait.UntilAsync(
                        async () => (targets = await http.GetStringAsync($"{word.CdpEndpoint}/json/list")).Contains("localhost:3000"),
                        TimeSpan.FromSeconds(60),
                        "a target from the dev server");
                }
                catch (TimeoutException)
                {
                    report.AppendLine("No target from localhost:3000 within 60 s.");
                }
                report.AppendLine($"\n## /json/version\n\n```\n{version}\n```\n\n## /json/list\n\n```\n{targets}\n```");

                var playwright = await Microsoft.Playwright.Playwright.CreateAsync();
                var browser = await playwright.Chromium.ConnectOverCDPAsync(word.CdpEndpoint);
                report.AppendLine($"\n## Playwright\n\n{browser.Contexts.Count} context(s)");
                foreach (var context in browser.Contexts)
                {
                    report.AppendLine($"- context with {context.Pages.Count} page(s)");
                    foreach (var page in context.Pages) report.AppendLine($"  - {page.Url}");
                }
                await browser.CloseAsync();
                playwright.Dispose();
            }
            File.WriteAllText(Path.Combine(folder.Path, "diagnose.md"), report.ToString());
        }
        scratch.Delete();
    }

    /// <summary>msedgewebview2.exe processes descended from <paramref name="root"/>, with their command lines.</summary>
    private static List<(int Pid, string CommandLine)> WebViewsOf(int root)
    {
        using var searcher = new ManagementObjectSearcher("SELECT ProcessId, ParentProcessId, Name, CommandLine FROM Win32_Process");
        var all = searcher.Get().Cast<ManagementObject>()
            .Select(p => (Pid: Convert.ToInt32(p["ProcessId"]), Parent: Convert.ToInt32(p["ParentProcessId"]), Name: (string)p["Name"], Cmd: (string?)p["CommandLine"] ?? ""))
            .ToList();
        var descendants = new HashSet<int> { root };
        bool grew;
        do
        {
            grew = false;
            foreach (var p in all.Where(p => descendants.Contains(p.Parent) && descendants.Add(p.Pid))) grew = true;
        } while (grew);
        return all.Where(p => p.Pid != root && descendants.Contains(p.Pid) && p.Name.Equals("msedgewebview2.exe", StringComparison.OrdinalIgnoreCase))
            .Select(p => (p.Pid, p.Cmd)).ToList();
    }
}

/// <summary>Not a check: where focus goes when the real shortcut is pressed (M0 (e)).</summary>
[Trait("Category", "Diagnose")]
public sealed class DiagnoseShortcutTests
{
    [Fact]
    public async Task Record_focus_around_the_shortcut()
    {
        await using var session = await PaneSession.StartAsync("spec-contract", DevServerMode.Normal, "diagnose-shortcut");
        var report = new StringBuilder($"# Shortcut focus, {DateTime.Now:yyyy-MM-dd HH:mm}\n\n");
        var pane = session.Pane ?? throw new InvalidOperationException(session.PaneFailure);
        using var keys = new Keys(session.Word!);

        async Task Record(string step)
        {
            var visibility = await pane.Page.EvaluateAsync<string>("() => document.visibilityState");
            var (hasFocus, name) = await pane.FocusAsync();
            dynamic selection = session.Word!.Application.Selection;
            report.AppendLine($"- {step}: pane {visibility}, page focus {hasFocus}, page active \"{name}\", UIA focus {keys.FocusedDescription()}, " +
                $"selection story {(int)selection.StoryType}, start {(int)selection.Start}, text \"{((string)selection.Paragraphs[1].Range.Text).Trim()}\"");
        }

        await Record("after the ribbon button opened the pane");
        DocumentState.PutCaretAt(session.Word!.Document, "The fire strategy is described here.");
        await Record("after COM put the caret in body text");
        keys.FocusDocument();
        await Record("after FocusDocument");
        keys.Shortcut();
        await Task.Delay(3000, TestContext.Current.CancellationToken);
        await Record("3 s after Ctrl+Shift+Y with the palette open");

        await pane.Page.Keyboard.PressAsync("Escape");
        await Task.Delay(3000, TestContext.Current.CancellationToken);
        await Record("3 s after Esc in the palette (CDP key)");
        keys.FocusDocument();
        keys.Shortcut();
        await Task.Delay(3000, TestContext.Current.CancellationToken);
        await Record("3 s after Ctrl+Shift+Y with the palette hidden");

        var folder = new EvidenceFolder("diagnose-shortcut");
        folder.SaveWindow(session.Word.MainWindow);
        File.WriteAllText(Path.Combine(folder.Path, "diagnose.md"), report.ToString());
    }
}
