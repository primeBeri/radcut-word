using FlaUI.Core.Capturing;
using FlaUI.UIA3;

namespace RadCut.DesktopTests.Infrastructure;

/// <summary>
/// The folder a failed test leaves behind for diagnosis without a person (FR-007, research D9):
/// <c>tests/desktop/test-results/&lt;test name&gt;/</c> with the Word window, the scratch document,
/// the pane's console, the Playwright trace and the harness log.
/// </summary>
public sealed class EvidenceFolder
{
    public string Path { get; }

    public EvidenceFolder(string testName, string? root = null)
    {
        Path = System.IO.Path.Combine(root ?? HarnessPaths.TestResults, SafeName(testName));
        Directory.CreateDirectory(Path);
    }

    /// <summary>A picture of one window (its rectangle on screen, not the whole screen).</summary>
    public void SaveWindow(IntPtr windowHandle, string fileName = "word.png")
    {
        using var automation = new UIA3Automation();
        var window = automation.FromHandle(windowHandle);
        Capture.Rectangle(window.BoundingRectangle).ToFile(System.IO.Path.Combine(Path, fileName));
    }

    /// <summary>A copy of a file (the scratch document, a trace) under its own name or <paramref name="fileName"/>.</summary>
    public void SaveCopy(string source, string? fileName = null)
    {
        if (File.Exists(source)) File.Copy(source, System.IO.Path.Combine(Path, fileName ?? System.IO.Path.GetFileName(source)), overwrite: true);
    }

    public void WriteLines(string fileName, IEnumerable<string> lines) =>
        File.WriteAllLines(System.IO.Path.Combine(Path, fileName), lines);

    public static string SafeName(string name)
    {
        var invalid = System.IO.Path.GetInvalidFileNameChars();
        var safe = new string(name.Select(c => invalid.Contains(c) ? '_' : c).ToArray()).Trim();
        return safe.Length <= 120 ? safe : safe[..120];
    }
}
