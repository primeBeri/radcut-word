using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
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
            await session.DisposeAsync();
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

    /// <summary>Word's main (document) window.</summary>
    public IntPtr MainWindow
    {
        get
        {
            process.Refresh();
            return process.MainWindowHandle;
        }
    }

    public bool HasExited => process.HasExited;

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
                try { document.Close(0); } catch (COMException) { }
                Marshal.FinalReleaseComObject(document);
                document = null;
            }
            if (application is not null)
            {
                try { application.Quit(0); } catch (COMException) { }
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
                    process.Kill(entireProcessTree: true);
                }
            }
        }
        finally
        {
            process.Dispose();
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
