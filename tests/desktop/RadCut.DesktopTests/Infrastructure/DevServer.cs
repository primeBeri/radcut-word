using System.Diagnostics;
using System.Net.NetworkInformation;

namespace RadCut.DesktopTests.Infrastructure;

/// <summary>Which Vite build the dev server serves.</summary>
public enum DevServerMode
{
    /// <summary>The add-in as shipped (<c>npm run dev-server</c>).</summary>
    Normal,

    /// <summary>The add-in plus the dev pages: contract pane, spikes (<c>vite --mode devpane</c>).</summary>
    DevPane,
}

/// <summary>
/// The Vite dev server on https://localhost:3000, started as a child process and stopped with its
/// own process tree only.
/// </summary>
public sealed class DevServer : IAsyncDisposable
{
    public const int Port = 3000;
    public const string PortInUseMessage = "Port 3000 is in use. Stop the other server (npm stop) and run again.";
    public static readonly Uri Origin = new($"https://localhost:{Port}/");

    private readonly Process process;
    private readonly StreamWriter log;

    public DevServerMode Mode { get; }

    private DevServer(DevServerMode mode, Process process, StreamWriter log)
    {
        Mode = mode;
        this.process = process;
        this.log = log;
    }

    public static async Task<DevServer> StartAsync(DevServerMode mode)
    {
        if (IsPortInUse(Port)) throw new HarnessRefusedException(PortInUseMessage);

        Directory.CreateDirectory(HarnessPaths.TestResults);
        var log = new StreamWriter(Path.Combine(HarnessPaths.TestResults, $"dev-server-{mode}.log"), append: false)
        {
            AutoFlush = true,
        };
        var command = mode == DevServerMode.Normal ? "npm run dev-server" : "npx vite --mode devpane";
        var info = new ProcessStartInfo("cmd.exe", $"/d /c {command}")
        {
            WorkingDirectory = HarnessPaths.RepoRoot,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        var process = Process.Start(info) ?? throw new InvalidOperationException($"Could not start: {command}");
        process.OutputDataReceived += (_, e) => { if (e.Data is not null) log.WriteLine(e.Data); };
        process.ErrorDataReceived += (_, e) => { if (e.Data is not null) log.WriteLine(e.Data); };
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();

        var server = new DevServer(mode, process, log);
        try
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
            await Wait.UntilAsync(
                async () =>
                {
                    if (process.HasExited) throw new InvalidOperationException($"{command} exited with code {process.ExitCode}; see dev-server-{mode}.log.");
                    using var response = await http.GetAsync(Origin);
                    return response.IsSuccessStatusCode;
                },
                Wait.WordStart,
                $"the dev server ({command}) to answer on {Origin}");
            return server;
        }
        catch
        {
            await server.DisposeAsync();
            throw;
        }
    }

    public static bool IsPortInUse(int port) =>
        IPGlobalProperties.GetIPGlobalProperties().GetActiveTcpListeners().Any(endpoint => endpoint.Port == port);

    public async ValueTask DisposeAsync()
    {
        try
        {
            if (!process.HasExited)
            {
                process.Kill(entireProcessTree: true);
                await process.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(10));
            }
        }
        finally
        {
            process.Dispose();
            await log.DisposeAsync();
        }
    }
}
