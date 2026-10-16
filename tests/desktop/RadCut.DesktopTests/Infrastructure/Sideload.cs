using System.Diagnostics;
using Microsoft.Win32;

namespace RadCut.DesktopTests.Infrastructure;

/// <summary>Where a document's add-in reference says Word should find the add-in (webextension.xml).</summary>
public sealed record AddinStore(string Store, string StoreType)
{
    /// <summary>Registered for development (HKCU\…\WEF\Developer), as <c>npm start</c> does.</summary>
    public static AddinStore Developer { get; } = new("developer", "Registry");

    /// <summary>A trusted shared-folder catalogue, as Word writes it when the add-in is inserted from one.</summary>
    public static AddinStore Catalogue(string share) => new(share, "Filesystem");
}

/// <summary>
/// Makes the add-in available to the harness's Word. Route B (the default) loads it from a trusted
/// shared-folder catalogue: since Word 2609 (the update of 24–25 Sept 2026) an add-in registered
/// for development loses its custom keyboard shortcuts on most starts (getShortcuts() returns {},
/// Ctrl+Shift+Y does nothing; office-js#6973, 2026-10-15). Route A keeps the development
/// registration, which Office's direct debugger needs. Either way the manifest is an ASCII-path
/// copy, the rule <c>scripts/office-debug.mjs</c> follows: Word silently ignores a manifest under
/// the repository's "·" folder.
/// </summary>
public sealed class Sideload : IDisposable
{
    /// <summary>The catalogue folder and its share; a one-time setup (tests/desktop/README.md).</summary>
    public const string CatalogueFolder = @"C:\radcut-catalog";
    public const string CatalogueShare = @"\\localhost\radcut-catalog";

    public static string CatalogueMessage =>
        $"The add-in catalogue is not set up. Once, in an elevated PowerShell: New-Item -ItemType Directory -Force {CatalogueFolder}; " +
        $"New-SmbShare -Name radcut-catalog -Path {CatalogueFolder} -ReadAccess $env:USERNAME. Then in Word: File > Options > Trust Center > " +
        $"Trust Center Settings > Trusted Add-in Catalogs, add {CatalogueShare} with \"Show in Menu\" ticked (see tests/desktop/README.md).";

    public string ManifestPath { get; }
    public bool DirectDebugger { get; }
    public AddinStore Store { get; }

    private Sideload(string manifestPath, bool directDebugger, AddinStore store)
    {
        ManifestPath = manifestPath;
        DirectDebugger = directDebugger;
        Store = store;
    }

    /// <param name="directDebugger">
    /// Route A (research D3): register for development and turn on Office's direct WebView2
    /// debugger for the add-in, as <c>office-addin-debugging start</c> does.
    /// </param>
    public static Sideload Register(bool directDebugger)
    {
        if (!directDebugger) return FromCatalogue();

        Directory.CreateDirectory(HarnessPaths.DevRoot);
        var manifest = Path.Combine(HarnessPaths.DevRoot, "manifest.xml");
        if (!HarnessPaths.IsAscii(manifest))
        {
            throw new HarnessRefusedException($"{manifest} contains non-ASCII characters, which Word ignores. Set LOCALAPPDATA to an ASCII path.");
        }
        File.Copy(Path.Combine(HarnessPaths.RepoRoot, "manifest.xml"), manifest, overwrite: true);
        DevSettings("register", manifest);
        DevSettings("debugging", manifest, "--enable", "--debug-method", "direct");
        return new Sideload(manifest, directDebugger, AddinStore.Developer);
    }

    /// <summary>
    /// Copies the current manifest into the catalogue folder and checks Word will read it from the
    /// trusted share. Nothing to undo afterwards: the catalogue stays set up for the next run.
    /// </summary>
    private static Sideload FromCatalogue()
    {
        if (!Directory.Exists(CatalogueFolder) || !IsTrustedCatalogue(CatalogueShare)) throw new HarnessRefusedException(CatalogueMessage);
        var source = Path.Combine(HarnessPaths.RepoRoot, "manifest.xml");
        File.Copy(source, Path.Combine(CatalogueFolder, "manifest.xml"), overwrite: true);
        var shared = Path.Combine(CatalogueShare, "manifest.xml");
        // The share must be this folder, or Word would load a different manifest.
        if (!File.Exists(shared) || !File.ReadAllBytes(shared).AsSpan().SequenceEqual(File.ReadAllBytes(source)))
        {
            throw new HarnessRefusedException(CatalogueMessage);
        }
        return new Sideload(shared, directDebugger: false, AddinStore.Catalogue(CatalogueShare));
    }

    /// <summary>True if Word trusts <paramref name="share"/> as an add-in catalogue for this user.</summary>
    public static bool IsTrustedCatalogue(string share)
    {
        using var catalogues = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Office\16.0\WEF\TrustedCatalogs");
        if (catalogues is null) return false;
        foreach (var name in catalogues.GetSubKeyNames())
        {
            using var catalogue = catalogues.OpenSubKey(name);
            if (string.Equals((catalogue?.GetValue("Url") as string)?.TrimEnd('\\'), share, StringComparison.OrdinalIgnoreCase)) return true;
        }
        return false;
    }

    public void Dispose()
    {
        if (Store != AddinStore.Developer) return;
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
