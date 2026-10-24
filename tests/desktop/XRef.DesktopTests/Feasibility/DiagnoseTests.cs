using System.Management;
using System.Text;
using FlaUI.Core.WindowsAPI;
using XRef.DesktopTests.Infrastructure;

namespace XRef.DesktopTests.Feasibility;

/// <summary>
/// Not a check: records how Word started WebView2 for the task pane, to choose a pane route
/// (research D3). Run on its own: --filter-trait "Category=Diagnose".
/// </summary>
[Trait("Category", "Diagnose")]
public sealed class DiagnoseTests
{
    [Theory(Explicit = true)]
    [InlineData(PaneRoute.B)]
    public async Task Record_the_task_pane_WebView2_processes(PaneRoute route)
    {
        Preflight.RefuseIfWordRunning();
        await using var server = await DevServer.StartAsync(DevServerMode.Normal);
        using var sideload = Sideload.Register(directDebugger: route == PaneRoute.A);
        var scratch = ScratchFixture.Create("spec-contract", $"diagnose-{route}");
        TaskpaneDocument.AddAutoOpenTaskpane(scratch.Path, AddinManifest.Load(), sideload.Store);
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
    [Fact(Explicit = true)]
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

        // What Office has registered for the add-in, as the add-in itself would ask (research R4).
        await Wait.UntilAsync(() => pane.Page.EvaluateAsync<bool>("() => typeof Office !== 'undefined' && !!Office.actions"), Wait.Pane, "Office.js in the pane");
        const string readRegistration = @"async () => {
            const read = async (f) => { try { return JSON.stringify(await f()); } catch (e) { return 'error: ' + (e?.code ?? '') + ' ' + (e?.message ?? e); } };
            return [
              'KeyboardShortcuts 1.1: ' + Office.context.requirements.isSetSupported('KeyboardShortcuts', '1.1'),
              'getShortcuts: ' + await read(() => Office.actions.getShortcuts()),
              'areShortcutsInUse: ' + await read(() => Office.actions.areShortcutsInUse(['Ctrl+Shift+Y'])),
            ].map(l => '- ' + l).join('\n');
        }";
        report.AppendLine($"## Shortcut registration at {DateTime.Now:HH:mm:ss}\n\n" + await pane.Page.EvaluateAsync<string>(readRegistration) + "\n\n## Focus\n");

        await Record("after the ribbon button opened the pane");
        WordActions.PutCaretIn(session.Word!.Document, "The fire strategy is described here.");
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
        report.AppendLine($"\n## Shortcut registration at {DateTime.Now:HH:mm:ss}\n\n" + await pane.Page.EvaluateAsync<string>(readRegistration));

        var folder = new EvidenceFolder("diagnose-shortcut");
        folder.SaveWindow(session.Word.MainWindow);
        File.WriteAllText(Path.Combine(folder.Path, "diagnose.md"), report.ToString());
    }
}

/// <summary>Not a check: does Esc, pressed with a real keystroke in the palette, reach the page?</summary>
[Trait("Category", "Diagnose")]
public sealed class DiagnoseEscapeTests : ScenarioTest
{
    [Fact(Explicit = true)]
    public async Task Record_what_Esc_does_in_the_palette()
    {
        var (palette, document) = await OpenAsync("spec-contract", "diagnose-escape");
        var page = Session!.Pane!.Page;
        using var keys = new Keys(Session.Word!);
        var report = new StringBuilder($"# Esc in the palette, {DateTime.Now:yyyy-MM-dd HH:mm}\n\n");
        async Task Record(string step)
        {
            var state = await page.EvaluateAsync<string>(@"() => JSON.stringify({
                keys: window.__keys ?? null, visibility: document.visibilityState, focus: document.hasFocus(),
                active: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName,
                palette: !!document.querySelector('input[aria-label=""Search headings""]'),
                warning: !!document.querySelector('[data-testid=warning-popover]') })");
            report.AppendLine($"- {step}: {state}; UIA focus {keys.FocusedDescription()}");
        }

        WordActions.PutCaretIn(document, "The fire strategy is described here.");
        await palette.OpenAsync();
        await page.EvaluateAsync("() => { window.__keys = []; document.addEventListener('keydown', e => window.__keys.push(e.key), true); }");
        await Record("palette open");
        Palette.Press(FlaUI.Core.WindowsAPI.VirtualKeyShort.ESCAPE);
        await Task.Delay(1500, TestContext.Current.CancellationToken);
        await Record("1.5 s after Esc (FlaUI)");

        await palette.OpenAsync();
        await page.EvaluateAsync("() => { window.__keys = []; }");
        Palette.Type("x");
        await Task.Delay(500, TestContext.Current.CancellationToken);
        await Record("after typing x");
        await page.Keyboard.PressAsync("Escape");
        await Task.Delay(1500, TestContext.Current.CancellationToken);
        await Record("1.5 s after Esc (CDP, straight to the page)");

        // With the confirmation warning showing (scenario 23's state).
        dynamic first = WordActions.Find(document, "First of two paragraphs.").Paragraphs.First;
        ((dynamic)document).Range((int)first.Range.Start, (int)first.Next().Range.Start + 5).Select();
        await palette.OpenAsync();
        await page.EvaluateAsync("() => { window.__keys = []; }");
        Palette.Type("Scope");
        await palette.WaitForSelectedRowAsync("Scope");
        Palette.Press(FlaUI.Core.WindowsAPI.VirtualKeyShort.ENTER);
        await Task.Delay(1500, TestContext.Current.CancellationToken);
        await Record("1.5 s after Enter on a two-paragraph selection");
        Palette.Press(FlaUI.Core.WindowsAPI.VirtualKeyShort.ESCAPE);
        await Task.Delay(1500, TestContext.Current.CancellationToken);
        await Record("1.5 s after Esc with the warning showing");

        var folder = new EvidenceFolder("diagnose-escape");
        File.WriteAllText(Path.Combine(folder.Path, "diagnose.md"), report.ToString());
    }
}

/// <summary>
/// Not a check: where Word's cursor goes when the palette opens from a header after declined places
/// (scenario 12 on the VM, 2026-10-16: the open finds the cursor back on an earlier heading).
/// </summary>
[Trait("Category", "Diagnose")]
public sealed class DiagnoseHeaderCaretTests : ScenarioTest
{
    [Theory(Explicit = true)]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Record_the_cursor_when_opening_from_a_header(bool afterComment)
    {
        var (palette, document) = await OpenAsync("spec-contract", $"diagnose-header-{afterComment}");
        var page = Session!.Pane!.Page;
        var word = Session.Word!;
        using var keys = new Keys(word);
        var report = new StringBuilder($"# Cursor from a header (after a comment: {afterComment}), {DateTime.Now:yyyy-MM-dd HH:mm}\n\n");
        async Task Record(string step)
        {
            dynamic selection = word.Application.Selection;
            dynamic window = ((dynamic)document).ActiveWindow;
            string seek;
            try { seek = ((int)window.ActivePane.View.SeekView).ToString(); } catch (Exception e) { seek = $"({e.Message})"; }
            var view2 = await page.EvaluateAsync<string>(
                @"() => document.querySelector(""input[aria-label='Search headings']"") ? 'palette' : (document.querySelector('.message-view')?.innerText ?? 'empty').slice(0, 40)");
            report.AppendLine($"- {step}: story {(int)selection.StoryType}, start {(int)selection.Start}, \"{((string)selection.Paragraphs[1].Range.Text).Trim()}\", " +
                $"seek view {seek}, panes {(int)window.Panes.Count}, active pane {(int)window.ActivePane.Index}; UIA {keys.FocusedDescription()}; pane: {view2}");
        }

        var places = afterComment ? new[] { "Title of the document", "A comment." } : new[] { "Title of the document" };
        foreach (var place in places)
        {
            WordActions.PutCaretIn(document, place);
            await palette.OpenAsync();
            await Wait.UntilAsync(async () => await page.Locator(".message-view").CountAsync() == 1, Wait.Pane, "a message");
            Palette.Press(VirtualKeyShort.ESCAPE);
            await palette.WaitForDocumentFocusAsync($"after {place}");
            await Record($"after the message for \"{place}\" was closed");
        }
        WordActions.PutCaretIn(document, "Header text.");
        await Record("after PutCaretIn(\"Header text.\")");
        await palette.WaitUntilHiddenAsync();
        keys.FocusDocument();
        await Record("after FocusDocument");
        keys.Shortcut();
        foreach (var ms in new[] { 100, 300, 600, 1200, 2500 })
        {
            await Task.Delay(ms, TestContext.Current.CancellationToken);
            await Record($"after Ctrl+Shift+Y (+{ms} ms)");
        }

        var folder = new EvidenceFolder($"diagnose-header-{afterComment}");
        folder.SaveWindow(word.MainWindow);
        File.WriteAllText(Path.Combine(folder.Path, "diagnose.md"), report.ToString());
    }
}
