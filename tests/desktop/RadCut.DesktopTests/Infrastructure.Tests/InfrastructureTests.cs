using System.Diagnostics;
using System.IO.Packaging;
using RadCut.DesktopTests.Infrastructure;

namespace RadCut.DesktopTests.Infrastructure.Tests;

/// <summary>The harness helpers that need no Word, no server and no keyboard.</summary>
[Trait("Category", "Harness")]
public class WaitTests
{
    [Fact]
    public async Task Returns_as_soon_as_the_condition_holds()
    {
        var calls = 0;
        await Wait.UntilAsync(() => Task.FromResult(++calls >= 3), TimeSpan.FromSeconds(5), "three calls");
        Assert.Equal(3, calls);
    }

    [Fact]
    public async Task Times_out_naming_what_it_waited_for_and_keeping_the_last_error()
    {
        var error = await Assert.ThrowsAsync<TimeoutException>(() =>
            Wait.UntilValueAsync<string>(() => throw new InvalidOperationException("not ready"), TimeSpan.FromMilliseconds(100), "the pane"));
        Assert.Contains("waiting for the pane", error.Message);
        Assert.Equal("not ready", error.InnerException?.Message);
    }

    [Fact]
    public async Task Returns_the_first_value_the_probe_gives()
    {
        var calls = 0;
        var value = await Wait.UntilValueAsync(() => Task.FromResult(++calls < 2 ? null : "ready"), TimeSpan.FromSeconds(5), "a value");
        Assert.Equal("ready", value);
    }
}

[Trait("Category", "Harness")]
public class PreflightTests
{
    [Fact]
    public void Refuses_with_the_exact_message_when_a_Word_process_exists()
    {
        // A stub lookup that reports this test process as "WINWORD": never a real Word.
        var error = Assert.Throws<HarnessRefusedException>(() =>
            Preflight.RefuseIfWordRunning(_ => [Process.GetCurrentProcess()]));
        Assert.Equal("Word is running. Save your work and close Word, then run again.", error.Message);
    }

    [Fact]
    public void Starts_when_no_Word_process_exists() =>
        Preflight.RefuseIfWordRunning(_ => []);

    [Fact]
    public void Asks_for_the_WINWORD_process_by_name()
    {
        string? asked = null;
        Preflight.RefuseIfWordRunning(name => { asked = name; return []; });
        Assert.Equal("WINWORD", asked);
    }

    [Fact]
    public void A_skip_keeps_its_reason_for_the_summary_once()
    {
        HarnessSkip.Remember(Preflight.NoDesktopMessage);
        Assert.Equal(Preflight.NoDesktopMessage, HarnessSkip.Take());
        Assert.Null(HarnessSkip.Take());
    }
}

[Trait("Category", "Harness")]
public sealed class ScratchFixtureTests : IDisposable
{
    private readonly string root = Path.Combine(Path.GetTempPath(), "radcut-harness-tests-" + Guid.NewGuid().ToString("N"));

    public void Dispose()
    {
        if (Directory.Exists(root)) Directory.Delete(root, recursive: true);
    }

    [Fact]
    public void Copies_the_fixture_into_a_per_run_per_test_folder_and_leaves_the_original_alone()
    {
        var original = Path.Combine(HarnessPaths.Fixtures, "tracked.docx");
        var before = File.ReadAllBytes(original);

        var scratch = ScratchFixture.Create("tracked", "Some test: case 1", root);

        Assert.Equal(Path.Combine(root, ScratchFixture.RunId, "Some_test__case_1", "tracked.docx"), scratch.Path);
        Assert.Equal(before, File.ReadAllBytes(scratch.Path));
        File.WriteAllText(scratch.Path, "changed");
        Assert.Equal(before, File.ReadAllBytes(original));
    }

    [Fact]
    public void Delete_removes_the_test_folder()
    {
        var scratch = ScratchFixture.Create("tracked", "t", root);
        scratch.Delete();
        Assert.False(Directory.Exists(Path.GetDirectoryName(scratch.Path)));
    }

    [Fact]
    public void Rejects_an_unknown_fixture() =>
        Assert.Throws<ArgumentException>(() => ScratchFixture.Create("nope", "t", root));

    [Fact]
    public void Cleaning_removes_earlier_runs_but_keeps_this_one()
    {
        Directory.CreateDirectory(Path.Combine(root, "20260101-000000-1", "old"));
        var mine = ScratchFixture.Create("tracked", "t", root);

        ScratchFixture.CleanOldRuns(root);

        Assert.False(Directory.Exists(Path.Combine(root, "20260101-000000-1")));
        Assert.True(File.Exists(mine.Path));
    }
}

[Trait("Category", "Harness")]
public class SummaryTests
{
    [Fact]
    public void Formats_counts_failures_skips_and_contract_timings()
    {
        var text = RunSummary.Format(
            [
                new("M0 reaches the pane", "M0", Outcome.Passed, null, null, TimeSpan.FromSeconds(20)),
                new("Contract 7c", "Contract", Outcome.Failed, "Expected: x\nto be y", @"C:\r\Contract 7c", TimeSpan.Zero),
                new("Shortcut focuses", "M0", Outcome.Skipped, "SKIPPED: no interactive desktop", null, TimeSpan.Zero),
            ],
            [new("IDocumentGateway: OfficeJsGateway", 194_500, [("7c", 9_400), ("1", 120)])]);

        Assert.Contains("| Contract | 0 | 1 | 0 |", text);
        Assert.Contains("| M0 | 1 | 0 | 1 |", text);
        Assert.Contains("- **Contract 7c**: Expected: x to be y", text);
        Assert.Contains(@"  Evidence: `C:\r\Contract 7c`", text);
        Assert.Contains("- Shortcut focuses: SKIPPED: no interactive desktop", text);
        Assert.Contains("- IDocumentGateway: OfficeJsGateway: 3 min 14.5 s in all; slowest: 9.4 s 7c; 120 ms 1", text);
    }

    [Fact]
    public void Formats_the_acceptance_table_from_scenario_tests_with_the_human_checks()
    {
        var text = RunSummary.FormatAcceptance(
            [
                new("RadCut.DesktopTests.Scenarios.Us1Scenarios.Scenario01_fuzzy", "Scenario", Outcome.Passed, null, null, TimeSpan.Zero),
                new("…Scenario02_esc", "Scenario", Outcome.Failed, "The document changed: x | y", "e", TimeSpan.Zero),
                new("…Scenario25_badges", "Scenario", Outcome.Passed, null, null, TimeSpan.Zero),
            ],
            scenarios: 26);

        Assert.Contains("| 1 | Pass | Automated |", text);
        Assert.Contains("| 2 | Fail | The document changed: x / y |", text);
        Assert.Contains("| 3 | Not run | No harness test in this run |", text);
        Assert.Contains("| 17 | Human | Co-authoring on SharePoint or OneDrive with two users |", text);
        Assert.Contains("| 25 | Pass | Automated. By hand: The badges' colours, by eye |", text);
        Assert.DoesNotContain("| 27 |", text);
    }

    [Theory]
    [InlineData(120, "120 ms")]
    [InlineData(9_400, "9.4 s")]
    [InlineData(194_500, "3 min 14.5 s")]
    public void Durations_read_as_in_the_contract_pane(double ms, string expected) =>
        Assert.Equal(expected, RunSummary.Duration(ms));
}

[Trait("Category", "Harness")]
public class EvidenceTests
{
    [Fact]
    public void Folder_names_are_safe_file_names()
    {
        Assert.Equal("Contract.IDocumentGateway_ OfficeJsGateway.7c", EvidenceFolder.SafeName("Contract.IDocumentGateway: OfficeJsGateway.7c"));
    }
}

[Trait("Category", "Harness")]
public class DevServerTests
{
    [Fact]
    public async Task Starts_answers_and_stops_leaving_the_port_free()
    {
        if (DevServer.IsPortInUse(DevServer.Port)) HarnessSkip.Because("Port 3000 is in use by another server.");
        await using (var server = await DevServer.StartAsync(DevServerMode.Normal))
        {
            using var http = new HttpClient();
            using var response = await http.GetAsync(new Uri(DevServer.Origin, "app/taskpane.html"), TestContext.Current.CancellationToken);
            Assert.True(response.IsSuccessStatusCode, $"taskpane.html: {(int)response.StatusCode}");
        }
        Assert.False(DevServer.IsPortInUse(DevServer.Port), "The dev server is still listening after it was stopped.");
    }
}

[Trait("Category", "Harness")]
public sealed class TaskpaneDocumentTests : IDisposable
{
    private readonly string root = Path.Combine(Path.GetTempPath(), "radcut-harness-tests-" + Guid.NewGuid().ToString("N"));

    public void Dispose()
    {
        if (Directory.Exists(root)) Directory.Delete(root, recursive: true);
    }

    [Fact]
    public void Reads_the_add_in_id_and_version_from_the_manifest()
    {
        var manifest = AddinManifest.Load();
        Assert.Equal("15ecd785-9690-4df5-88be-ffb376d11ee9", manifest.Id);
        Assert.Matches(@"^\d+\.\d+\.\d+\.\d+$", manifest.Version);
    }

    [Fact]
    public void Adds_a_task_pane_that_opens_the_add_in_from_its_store()
    {
        var scratch = ScratchFixture.Create("tracked", "t", root);
        TaskpaneDocument.AddAutoOpenTaskpane(scratch.Path, new AddinManifest("11111111-2222-3333-4444-555555555555", "1.2.3.4"),
            AddinStore.Catalogue(@"\\localhost\radcut-catalog"));

        using var package = Package.Open(scratch.Path, FileMode.Open, FileAccess.Read);
        var toTaskpanes = Assert.Single(package.GetRelationshipsByType(TaskpaneDocument.TaskpanesRelationship));
        var taskpanes = package.GetPart(PackUriHelper.ResolvePartUri(new Uri("/", UriKind.Relative), toTaskpanes.TargetUri));
        var toExtension = Assert.Single(taskpanes.GetRelationshipsByType(TaskpaneDocument.WebExtensionRelationship));
        using var taskpanesXml = new StreamReader(taskpanes.GetStream());
        Assert.Contains($"r:id=\"{toExtension.Id}\"", taskpanesXml.ReadToEnd());

        var extension = package.GetPart(PackUriHelper.ResolvePartUri(taskpanes.Uri, toExtension.TargetUri));
        using var extensionXml = new StreamReader(extension.GetStream());
        var xml = extensionXml.ReadToEnd();
        Assert.Contains("id=\"11111111-2222-3333-4444-555555555555\"", xml);
        Assert.Contains("version=\"1.2.3.4\"", xml);
        // As Word writes it when the add-in is inserted from a shared-folder catalogue.
        Assert.Contains("store=\"\\\\localhost\\radcut-catalog\"", xml);
        Assert.Contains("storeType=\"Filesystem\"", xml);
    }

    [Fact]
    public void Refuses_to_add_a_second_task_pane()
    {
        var scratch = ScratchFixture.Create("tracked", "t", root);
        var manifest = AddinManifest.Load();
        TaskpaneDocument.AddAutoOpenTaskpane(scratch.Path, manifest, AddinStore.Developer);
        Assert.Throws<InvalidOperationException>(() => TaskpaneDocument.AddAutoOpenTaskpane(scratch.Path, manifest, AddinStore.Developer));
    }

    [Fact]
    public void Removing_the_task_panes_leaves_no_add_in_part_and_the_document_intact()
    {
        var scratch = ScratchFixture.Create("tracked", "t", root);
        TaskpaneDocument.AddAutoOpenTaskpane(scratch.Path, AddinManifest.Load(), AddinStore.Catalogue(@"\\localhost\radcut-catalog"));
        TaskpaneDocument.RemoveTaskpanes(scratch.Path);

        using var package = Package.Open(scratch.Path, FileMode.Open, FileAccess.Read);
        Assert.Empty(package.GetRelationshipsByType(TaskpaneDocument.TaskpanesRelationship));
        Assert.DoesNotContain(package.GetParts(), p => p.Uri.OriginalString.Contains("webextension", StringComparison.OrdinalIgnoreCase));
        Assert.True(package.PartExists(new Uri("/word/document.xml", UriKind.Relative)));
    }
}

[Trait("Category", "Harness")]
public class DocumentInspectorTests
{
    [Theory]
    [InlineData(@" REF _Ref123 \w \h \* CHARFORMAT ", "_Ref123", new[] { @"\w", @"\h", @"\* CHARFORMAT" })]
    [InlineData(@" REF _Ref123 \r \h ", "_Ref123", new[] { @"\r", @"\h" })]
    [InlineData(@"PAGEREF _RCabc \h", "_RCabc", new[] { @"\h" })]
    public void Parses_a_field_code_into_its_bookmark_and_switches(string code, string bookmark, string[] switches)
    {
        var (parsedBookmark, parsedSwitches) = DocumentInspector.ParseCode(code);
        Assert.Equal(bookmark, parsedBookmark);
        Assert.Equal(switches, parsedSwitches);
    }
}
