namespace XRef.DesktopTests.Infrastructure;

/// <summary>Where the harness finds the repository and keeps its files.</summary>
public static class HarnessPaths
{
    /// <summary>The repository root: the nearest folder above the test binaries holding package.json and manifest.xml.</summary>
    public static string RepoRoot { get; } = FindRepoRoot();

    public static string Fixtures => Path.Combine(RepoRoot, "tests", "fixtures");

    /// <summary>Evidence and summaries; gitignored.</summary>
    public static string TestResults => Path.Combine(RepoRoot, "tests", "desktop", "test-results");

    /// <summary>
    /// ASCII-only working folder shared with scripts/office-debug.mjs: Word ignores manifests and
    /// struggles with documents under a path with non-ASCII characters, wherever the repository was cloned.
    /// </summary>
    public static string DevRoot { get; } =
        Path.Combine(Environment.GetEnvironmentVariable("LOCALAPPDATA") ?? Path.GetTempPath(), "xref-dev");

    public static bool IsAscii(string path) => path.All(c => c is >= ' ' and <= '~');

    private static string FindRepoRoot()
    {
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir is not null; dir = dir.Parent)
        {
            if (File.Exists(Path.Combine(dir.FullName, "package.json")) &&
                File.Exists(Path.Combine(dir.FullName, "manifest.xml")))
            {
                return dir.FullName;
            }
        }
        throw new InvalidOperationException($"No repository root above {AppContext.BaseDirectory}.");
    }
}
