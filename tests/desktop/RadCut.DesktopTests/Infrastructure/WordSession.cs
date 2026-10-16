using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
using FlaUI.Core.AutomationElements;
using Microsoft.Win32;

namespace RadCut.DesktopTests.Infrastructure;

/// <summary>How the harness reaches the task pane's WebView2 over CDP (research D3).</summary>
public enum PaneRoute
{
    /// <summary>Office's direct WebView2 debugger for the add-in (registry, as <c>npm start</c>), port 9229.</summary>
    A,

    /// <summary>A debugging port passed to WebView2 through the WINWORD process's own environment.</summary>
    B,
}

/// <summary>
/// One Word process the harness started on a scratch document, with the document reached through
/// COM. The harness stops only this process (FR-003, FR-005).
/// </summary>
public sealed class WordSession : IAsyncDisposable
{
    public const int RouteAPort = 9229;

    /// <summary>The WebView2 data folder of the Word the harness starts (route B): never Office's shared one.</summary>
    public static string WebViewDataFolder => Path.Combine(HarnessPaths.DevRoot, "webview2");

    private readonly Process process;
    private dynamic? document;
    private dynamic? application;

    public string DocumentPath { get; }
    public PaneRoute Route { get; }
    public int ProcessId => process.Id;

    /// <summary><c>http://127.0.0.1:&lt;port&gt;</c> for the task pane's WebView2.</summary>
    public string CdpEndpoint { get; }

    /// <summary>The scratch document as a Word COM <c>Document</c>.</summary>
    public dynamic Document => document ?? throw new ObjectDisposedException(nameof(WordSession));

    public dynamic Application => application ?? throw new ObjectDisposedException(nameof(WordSession));

    private WordSession(Process process, string documentPath, PaneRoute route, int port)
    {
        this.process = process;
        DocumentPath = documentPath;
        Route = route;
        CdpEndpoint = $"http://127.0.0.1:{port}";
    }

    /// <summary>
    /// Starts WINWORD.EXE on <paramref name="documentPath"/> and waits until COM can reach the
    /// document. For route B the debugging port is set on this process's environment only.
    /// </summary>
    public static async Task<WordSession> StartAsync(string documentPath, PaneRoute route)
    {
        Preflight.RefuseIfWordRunning();
        var port = route == PaneRoute.A ? RouteAPort : FreeLoopbackPort();
        var info = new ProcessStartInfo(WordExecutable()) { UseShellExecute = false };
        info.ArgumentList.Add(documentPath);
        if (route == PaneRoute.B)
        {
            info.Environment["WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"] = $"--remote-debugging-port={port}";
            // Office's add-in WebView2 data folder is shared with Outlook. While Outlook has an add-in
            // browser running there, a browser with other arguments cannot start on it and Word shows
            // "The add-in could not be started" (2026-10-15), so this Word gets a folder of its own.
            info.Environment["WEBVIEW2_USER_DATA_FOLDER"] = WebViewDataFolder;
        }
        var process = Process.Start(info) ?? throw new InvalidOperationException("Could not start Word.");
        var session = new WordSession(process, documentPath, route, port);
        try
        {
            session.document = await Wait.UntilValueAsync(
                () =>
                {
                    if (process.HasExited) throw new InvalidOperationException($"Word exited with code {process.ExitCode}.");
                    return Task.FromResult(RunningDocument(documentPath));
                },
                Wait.WordStart,
                $"Word to open {Path.GetFileName(documentPath)} (Running Object Table)");
            session.application = session.document!.Application;
            return session;
        }
        catch
        {
            await Cleanup.QuietlyAsync(session.DisposeAsync);
            throw;
        }
    }

    /// <summary>Waits for the CDP endpoint to answer; null if it never does within <paramref name="timeout"/>.</summary>
    public async Task<string?> WaitForCdpAsync(TimeSpan timeout)
    {
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
        try
        {
            return await Wait.UntilValueAsync(
                async () =>
                {
                    using var response = await http.GetAsync($"{CdpEndpoint}/json/version");
                    return response.IsSuccessStatusCode ? await response.Content.ReadAsStringAsync() : null;
                },
                timeout,
                $"the WebView2 debugging endpoint {CdpEndpoint}");
        }
        catch (TimeoutException)
        {
            return null;
        }
    }

    /// <summary>
    /// Word's document window, from COM (<c>Window.Hwnd</c>): the process's "main window" can be a
    /// small helper window instead.
    /// </summary>
    public IntPtr MainWindow
    {
        get
        {
            try
            {
                return new IntPtr((int)Document.ActiveWindow.Hwnd);
            }
            catch (COMException)
            {
                process.Refresh();
                return process.MainWindowHandle;
            }
        }
    }

    public bool HasExited => process.HasExited;

    /// <summary>
    /// If Word shows Office's "ADD-IN ERROR" dialog, closes it (Cancel) and returns its text; else
    /// null. A modal dialog would otherwise block the run until someone clicks it.
    /// </summary>
    public string? DismissAddinError()
    {
        using var automation = new FlaUI.UIA3.UIA3Automation();
        var cf = automation.ConditionFactory;
        foreach (var window in automation.GetDesktop().FindAllChildren(cf.ByProcessId(process.Id)))
        {
            var texts = window.FindAllDescendants(cf.ByControlType(FlaUI.Core.Definitions.ControlType.Text))
                // Some of Office's own windows (pane tabs, tips) have text without a Name, and windows
                // come and go while Word starts: neither is an add-in error.
                .Select(t => { try { return t.Properties.Name.ValueOrDefault ?? ""; } catch (Exception e) when (e is COMException or FlaUI.Core.Exceptions.ElementNotAvailableException) { return ""; } })
                .ToList();
            if (!texts.Any(t => t.Contains("ADD-IN ERROR", StringComparison.OrdinalIgnoreCase))) continue;
            window.FindFirstDescendant(cf.ByControlType(FlaUI.Core.Definitions.ControlType.Button).And(cf.ByName("Cancel")))?.AsButton().Invoke();
            return string.Join(" ", texts.Where(t => t.Length > 0));
        }
        return null;
    }

    /// <summary>
    /// Asks Word to close or quit, again while it answers that it is busy (RPC_E_SERVERCALL_RETRYLATER,
    /// which dynamic COM can also report as a MissingMemberException: full run, 2026-10-16). If Word
    /// still refuses, teardown goes on to wait for the process and stop it, rather than throw and
    /// leave Word running for the next test.
    /// </summary>
    private static async Task AskWordAsync(Action call, string what)
    {
        try
        {
            await Wait.UntilAsync(
                () =>
                {
                    // Any other refusal (document already closed, Word gone) has nothing to retry.
                    try { call(); } catch (Exception e) when (!IsBusy(e)) { }
                    return Task.FromResult(true);
                },
                TimeSpan.FromSeconds(15),
                $"Word to accept {what}");
        }
        catch (TimeoutException e)
        {
            Console.Error.WriteLine($"[radcut:harness] {e.Message} Last answer: {e.InnerException?.Message}");
        }
    }

    private static bool IsBusy(Exception e) =>
        e is COMException { HResult: unchecked((int)0x8001010A) } || e.Message.Contains("0x8001010A", StringComparison.Ordinal);

    /// <summary>Each top-level window of this Word: class and title, to see a dialog that is in the way.</summary>
    private IEnumerable<string> TopLevelWindows()
    {
        using var automation = new FlaUI.UIA3.UIA3Automation();
        var cf = automation.ConditionFactory;
        return automation.GetDesktop().FindAllChildren(cf.ByProcessId(process.Id))
            .Select(w => $"{w.Properties.ClassName.ValueOrDefault} | {w.Properties.Name.ValueOrDefault}")
            .ToList();
    }

    /// <summary>
    /// Closes the document without saving and quits Word, then waits for the process to end. Only
    /// if it does not end in time is it stopped: it is the process this session started.
    /// </summary>
    public async ValueTask DisposeAsync()
    {
        try
        {
            if (document is not null)
            {
                var doc = document;
                await AskWordAsync(() => doc.Close(0), "Close");
                Marshal.FinalReleaseComObject(document);
                document = null;
            }
            if (application is not null)
            {
                var app = application;
                await AskWordAsync(() => app.Quit(0), "Quit");
                Marshal.FinalReleaseComObject(application);
                application = null;
            }
            if (!process.HasExited)
            {
                try
                {
                    await process.WaitForExitAsync().WaitAsync(Wait.WordStart);
                }
                catch (TimeoutException)
                {
                    // A passing test keeps no evidence, so say here what kept Word open.
                    var folder = new EvidenceFolder($"word-did-not-quit-{process.Id}");
                    try
                    {
                        folder.WriteLines("windows.txt", TopLevelWindows());
                        process.Refresh();
                        folder.SaveWindow(process.MainWindowHandle);
                    }
                    catch (Exception e)
                    {
                        Console.Error.WriteLine($"[radcut:harness] evidence of a Word that did not quit could not be saved: {e.GetType().Name}: {e.Message}");
                    }
                    Console.Error.WriteLine($"[radcut:harness] Word {process.Id} did not quit within {Wait.WordStart.TotalSeconds:0} s; stopped it. Evidence: {folder.Path}");
                    process.Kill(entireProcessTree: true);
                    // Kill returns before the process has gone; the next test refuses while it is still there.
                    await process.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(30));
                }
            }
        }
        finally
        {
            var id = process.Id;
            process.Dispose();
            // An ended process is still listed while handles to it are open; the next test's check
            // for a running Word then refuses (full run 14 on the VM, 2026-10-16, after a stopped Word).
            try
            {
                await Wait.UntilAsync(
                    () =>
                    {
                        var words = Process.GetProcessesByName("WINWORD");
                        var listed = words.Any(p => p.Id == id);
                        foreach (var word in words) word.Dispose();
                        return Task.FromResult(!listed);
                    },
                    TimeSpan.FromSeconds(30),
                    $"Word {id} to leave the process list");
            }
            catch (TimeoutException e)
            {
                Console.Error.WriteLine($"[radcut:harness] {e.Message}");
            }
        }
    }

    /// <summary>WINWORD.EXE from the App Paths registration Office writes.</summary>
    public static string WordExecutable()
    {
        const string key = @"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\Winword.exe";
        var path = (Registry.CurrentUser.OpenSubKey(key) ?? Registry.LocalMachine.OpenSubKey(key))?.GetValue(null) as string;
        if (path is null || !File.Exists(path)) throw new HarnessRefusedException("Word for Windows (WINWORD.EXE) is not installed.");
        return path;
    }

    private static int FreeLoopbackPort()
    {
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }

    /// <summary>
    /// The open document registered under <paramref name="path"/> in the Running Object Table, or
    /// null. Looking it up there never starts Word, and only the document we opened matches.
    /// </summary>
    private static object? RunningDocument(string path)
    {
        if (GetRunningObjectTable(0, out var table) != 0) return null;
        table.EnumRunning(out var monikers);
        CreateBindCtx(0, out var context);
        var found = new IMoniker[1];
        try
        {
            while (monikers.Next(1, found, IntPtr.Zero) == 0)
            {
                var moniker = found[0];
                try
                {
                    moniker.GetDisplayName(context, null, out var name);
                    if (string.Equals(name, path, StringComparison.OrdinalIgnoreCase) && table.GetObject(moniker, out var value) == 0)
                    {
                        return value;
                    }
                }
                finally
                {
                    Marshal.ReleaseComObject(moniker);
                }
            }
            return null;
        }
        finally
        {
            Marshal.ReleaseComObject(context);
            Marshal.ReleaseComObject(monikers);
            Marshal.ReleaseComObject(table);
        }
    }

    [DllImport("ole32.dll")]
    private static extern int GetRunningObjectTable(int reserved, out IRunningObjectTable table);

    [DllImport("ole32.dll")]
    private static extern int CreateBindCtx(int reserved, out IBindCtx context);
}
