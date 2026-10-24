using XRef.DesktopTests.Infrastructure;

namespace XRef.DesktopTests.Infrastructure.Tests;

/// <summary>Checks of the harness's own helpers; they need no Word and run in any session.</summary>
[Trait("Category", "Harness")]
public class HarnessPathsTests
{
    [Fact]
    public void Finds_the_repository_root_and_its_fixtures()
    {
        Assert.True(File.Exists(Path.Combine(HarnessPaths.RepoRoot, "manifest.xml")));
        Assert.True(File.Exists(Path.Combine(HarnessPaths.Fixtures, "spec-300.docx")));
    }

    [Fact]
    public void The_dev_folder_is_ascii_so_Word_accepts_it()
    {
        Assert.True(HarnessPaths.IsAscii(HarnessPaths.DevRoot), HarnessPaths.DevRoot);
        Assert.False(HarnessPaths.IsAscii(HarnessPaths.RepoRoot), "the repository folder contains '·'");
    }
}
