using System.Diagnostics;
using System.Security.Cryptography;
using RadCut.DesktopTests.Infrastructure;

namespace RadCut.DesktopTests.Feasibility;

/// <summary>One Word session on the normal build, shared by the M0 checks that only look.</summary>
public sealed class NormalBuildSession : IAsyncLifetime
{
    public PaneSession Session { get; private set; } = null!;
    public Exception? StartFailure { get; private set; }

    public async ValueTask InitializeAsync()
    {
        try
        {
            Session = await PaneSession.StartAsync("spec-contract", DevServerMode.Normal, "M0");
        }
        catch (Exception e)
        {
            // Reported by each test, so a refusal (Word running) reads as such in every result.
            StartFailure = e;
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (Session is not null) await Session.DisposeAsync();
    }

    public PaneSession Require()
    {
        if (StartFailure is not null) throw new InvalidOperationException($"The session did not start: {StartFailure.Message}", StartFailure);
        return Session;
    }
}

/// <summary>
/// M0, go/no-go (spec US1, FR-011, FR-012): can the harness reach Word, the document and the add-in's
/// task pane, and drive the real shortcut?
/// </summary>
[Trait("Category", "M0")]
public sealed class M0Tests : HarnessTest, IClassFixture<NormalBuildSession>
{
    private readonly NormalBuildSession fixture;

    public M0Tests(NormalBuildSession fixture)
    {
        this.fixture = fixture;
        OnFailure(folder => fixture.Session?.SaveEvidenceAsync(folder) ?? Task.CompletedTask);
    }

    [Fact]
    public void Word_opens_the_scratch_copy_and_COM_reads_it()
    {
        var session = fixture.Require();
        var word = session.Word!;
        Assert.Equal(session.Scratch!.Path, (string)word.Document.FullName, ignoreCase: true);
        Assert.Contains("Fire strategy", (string)word.Document.Content.Text);
    }

    [Fact]
    public async Task Playwright_reads_the_task_pane()
    {
        var session = fixture.Require();
        Assert.True(session.Pane is not null, $"No route reached the task pane: {session.PaneFailure}. Stop and report (FR-012).");
        Assert.Equal("XRef", await session.Pane.Page.TitleAsync());
    }

    [Fact]
    public async Task The_shortcut_focuses_the_palette_search_box()
    {
        if (!Preflight.HasInteractiveDesktop()) Preflight.SkipWithoutDesktop();
        var session = fixture.Require();
        Assert.True(session.Pane is not null, $"No route reached the task pane: {session.PaneFailure}.");
        WordActions.PutCaretIn(session.Word!.Document, "The fire strategy is described here.");

        using var keys = new Keys(session.Word);
        keys.FocusDocument();
        Assert.Equal(Keys.DocumentClass, keys.FocusedClass());
        keys.Shortcut();

        // Windows focus leaves the document for the pane's host, and inside the page the search box
        // is the active element (UI Automation does not reach inside the WebView2).
        await Wait.UntilAsync(
            async () => keys.FocusedClass() == Keys.TaskPaneHostClass && (await session.Pane.FocusAsync()) == (true, TaskPane.SearchBoxName),
            Wait.Pane,
            $"focus in the pane on \"{TaskPane.SearchBoxName}\" (UI Automation: {keys.FocusedDescription()})");
    }
}

/// <summary>M0 checks that need their own Word: the dev-pane build, and a clean teardown.</summary>
[Trait("Category", "M0")]
public sealed class M0LifecycleTests : HarnessTest
{
    private PaneSession? session;

    public M0LifecycleTests()
    {
        OnFailure(folder => session?.SaveEvidenceAsync(folder) ?? Task.CompletedTask);
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        if (session is not null) await session.DisposeAsync();
    }

    [Fact]
    public async Task Teardown_leaves_no_Word_and_the_fixture_unchanged()
    {
        var fixturePath = Path.Combine(HarnessPaths.Fixtures, "spec-contract.docx");
        var before = SHA256.HashData(File.ReadAllBytes(fixturePath));

        session = await PaneSession.StartAsync("spec-contract", DevServerMode.Normal, "M0-teardown");
        var processId = session.Word!.ProcessId;
        session.Word.Document.Content.InsertAfter(" changed by the harness");
        await session.DisposeAsync();
        session = null;

        Assert.False(Process.GetProcesses().Any(p => p.Id == processId && p.ProcessName.Equals("WINWORD", StringComparison.OrdinalIgnoreCase)),
            "The Word the harness started is still running.");
        Assert.Empty(Process.GetProcessesByName("WINWORD"));
        Assert.Equal(before, SHA256.HashData(File.ReadAllBytes(fixturePath)));
    }

    [Fact]
    public async Task The_dev_pane_build_reaches_the_contract_pane()
    {
        session = await PaneSession.StartAsync("spec-contract", DevServerMode.DevPane, "M0-devpane");
        Assert.True(session.Pane is not null, $"No route reached the task pane: {session.PaneFailure}.");

        await session.Pane.GoToAsync("dev/contract-pane.html");
        var suites = await session.Pane.Page.Locator("#suite option").AllTextContentsAsync();
        Assert.Contains(suites, s => s.StartsWith("IDocumentGateway: OfficeJsGateway", StringComparison.Ordinal));

        // Research D6: does the dev-pane build still answer Ctrl+Shift+Y? Recorded, not asserted.
        if (Preflight.HasInteractiveDesktop())
        {
            WordActions.PutCaretIn(session.Word!.Document, "The fire strategy is described here.");
            using var keys = new Keys(session.Word);
            keys.FocusDocument();
            keys.Shortcut();
            string? focused = null;
            try
            {
                await Wait.UntilAsync(() => Task.FromResult((focused = keys.FocusedClass()) == Keys.TaskPaneHostClass), Wait.Pane, "focus in the pane");
                RouteReport.Note("D6: the dev-pane build answers Ctrl+Shift+Y (search box focused).");
            }
            catch (TimeoutException)
            {
                RouteReport.Note($"D6: the dev-pane build does not answer Ctrl+Shift+Y (focus: \"{focused}\"); run layer 5 on the normal build.");
            }
        }
    }
}
