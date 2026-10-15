namespace RadCut.DesktopTests.Infrastructure;

/// <summary>
/// A per-test copy of a fixture document in an ASCII-only scratch folder (FR-004). The fixture
/// itself is never opened, so it can never be saved over.
/// </summary>
public sealed class ScratchFixture
{
    public static readonly IReadOnlyList<string> Names =
        ["spec-contract", "spec-300", "guide-500", "tracked", "plain-headings"];

    /// <summary>One folder per harness run, so a later run can tell leftovers from its own files.</summary>
    public static string RunId { get; } = DateTime.Now.ToString("yyyyMMdd-HHmmss") + "-" + Environment.ProcessId;

    private static readonly Lazy<bool> OldRunsCleaned = new(CleanOldRuns);

    public string Fixture { get; }
    public string Path { get; }

    private ScratchFixture(string fixture, string path)
    {
        Fixture = fixture;
        Path = path;
    }

    public static string ScratchRoot => System.IO.Path.Combine(HarnessPaths.DevRoot, "scratch");

    /// <summary>Copies <paramref name="fixture"/>.docx into a fresh folder for <paramref name="testId"/>.</summary>
    public static ScratchFixture Create(string fixture, string testId, string? scratchRoot = null, string? fixturesDir = null)
    {
        if (!Names.Contains(fixture)) throw new ArgumentException($"Unknown fixture \"{fixture}\".", nameof(fixture));
        if (scratchRoot is null) _ = OldRunsCleaned.Value;
        var source = System.IO.Path.Combine(fixturesDir ?? HarnessPaths.Fixtures, fixture + ".docx");
        if (!File.Exists(source)) throw new FileNotFoundException($"Fixture not built: {source}", source);

        var folder = System.IO.Path.Combine(scratchRoot ?? ScratchRoot, RunId, Safe(testId));
        if (!HarnessPaths.IsAscii(folder))
        {
            throw new HarnessRefusedException(
                $"The scratch folder {folder} is not ASCII, which Word mishandles. Set LOCALAPPDATA to an ASCII path.");
        }
        Directory.CreateDirectory(folder);
        var path = System.IO.Path.Combine(folder, fixture + ".docx");
        File.Copy(source, path, overwrite: true);
        return new ScratchFixture(fixture, path);
    }

    /// <summary><c>RADCUT_KEEP_SCRATCH=1</c> keeps every scratch copy, to look at what a passing check left.</summary>
    public static bool Keep => Environment.GetEnvironmentVariable("RADCUT_KEEP_SCRATCH") == "1";

    /// <summary>
    /// Saves the open copy in place and copies it to a sibling folder named <paramref name="label"/>,
    /// to reopen after this Word has closed; the path of the copy.
    /// </summary>
    public string SaveCopy(WordSession word, string label)
    {
        word.Document.Save();
        var folder = System.IO.Path.Combine(System.IO.Path.GetDirectoryName(System.IO.Path.GetDirectoryName(Path)!)!,
            System.IO.Path.GetFileName(System.IO.Path.GetDirectoryName(Path)!) + "-" + label);
        Directory.CreateDirectory(folder);
        var copy = System.IO.Path.Combine(folder, Fixture + ".docx");
        File.Copy(Path, copy, overwrite: true);
        return copy;
    }

    /// <summary>Removes the copy and its folder after a passing test; a failing test hands it to <see cref="Evidence"/> first.</summary>
    public void Delete()
    {
        if (Keep) return;
        var folder = System.IO.Path.GetDirectoryName(Path)!;
        if (Directory.Exists(folder)) Directory.Delete(folder, recursive: true);
    }

    /// <summary>Deletes scratch folders left by earlier runs (never anything outside the scratch root).</summary>
    public static bool CleanOldRuns() => CleanOldRuns(ScratchRoot);

    public static bool CleanOldRuns(string scratchRoot)
    {
        if (!Directory.Exists(scratchRoot)) return true;
        foreach (var run in Directory.GetDirectories(scratchRoot))
        {
            if (System.IO.Path.GetFileName(run) == RunId) continue;
            try
            {
                Directory.Delete(run, recursive: true);
            }
            catch (IOException)
            {
                // A document still open in a Word we did not start: leave it alone.
            }
            catch (UnauthorizedAccessException)
            {
                // As above.
            }
        }
        return true;
    }

    /// <summary>Test names become folder names: keep letters, digits, '-', '_' and '.'.</summary>
    private static string Safe(string name)
    {
        var chars = name.Select(c => char.IsAsciiLetterOrDigit(c) || c is '-' or '_' or '.' ? c : '_').ToArray();
        var safe = new string(chars);
        return safe.Length <= 80 ? safe : safe[..80];
    }
}
