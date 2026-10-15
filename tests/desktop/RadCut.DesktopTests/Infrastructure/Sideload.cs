using System.Diagnostics;

namespace RadCut.DesktopTests.Infrastructure;

/// <summary>
/// Registers the add-in for development (HKCU, like <c>npm start</c>) from an ASCII-path copy of
/// <c>manifest.xml</c>, the rule <c>scripts/office-debug.mjs</c> follows: Word silently ignores a
/// manifest under the repository's "·" folder. Unregistered again on dispose.
/// </summary>
public sealed class Sideload : IDisposable
{
    public string ManifestPath { get; }
    public bool DirectDebugger { get; }

    private Sideload(string manifestPath, bool directDebugger)
    {
        ManifestPath = manifestPath;
        DirectDebugger = directDebugger;
    }

    /// <param name="directDebugger">
    /// Route A (research D3): also turn on Office's direct WebView2 debugger for the add-in, as
    /// <c>office-addin-debugging start</c> does.
    /// </param>
    public static Sideload Register(bool directDebugger)
    {
        Directory.CreateDirectory(HarnessPaths.DevRoot);
        var manifest = Path.Combine(HarnessPaths.DevRoot, "manifest.xml");
        if (!HarnessPaths.IsAscii(manifest))
        {
            throw new HarnessRefusedException($"{manifest} contains non-ASCII characters, which Word ignores. Set LOCALAPPDATA to an ASCII path.");
        }
        File.Copy(Path.Combine(HarnessPaths.RepoRoot, "manifest.xml"), manifest, overwrite: true);
        DevSettings("register", manifest);
        DevSettings("debugging", manifest, directDebugger ? "--enable" : "--disable", "--debug-method", "direct");
        return new Sideload(manifest, directDebugger);
    }

    public void Dispose()
    {
        try
        {
            if (DirectDebugger) DevSettings("debugging", ManifestPath, "--disable");
        }
        finally
        {
            DevSettings("unregister", ManifestPath);
        }
    }

    private static void DevSettings(params string[] args)
    {
        var cli = Path.Combine(HarnessPaths.RepoRoot, "node_modules", "office-addin-dev-settings", "cli.js");
        var info = new ProcessStartInfo("node")
        {
            WorkingDirectory = HarnessPaths.RepoRoot,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
        };
        info.ArgumentList.Add(cli);
        foreach (var arg in args) info.ArgumentList.Add(arg);
        using var process = Process.Start(info) ?? throw new InvalidOperationException("Could not start node.");
        var output = process.StandardOutput.ReadToEndAsync();
        var error = process.StandardError.ReadToEndAsync();
        if (!process.WaitForExit(TimeSpan.FromSeconds(60)))
        {
            process.Kill(entireProcessTree: true);
            throw new TimeoutException($"office-addin-dev-settings {string.Join(' ', args)} did not finish.");
        }
        if (process.ExitCode != 0)
        {
            throw new InvalidOperationException(
                $"office-addin-dev-settings {string.Join(' ', args)} exited with {process.ExitCode}: {output.Result} {error.Result}");
        }
    }
}
