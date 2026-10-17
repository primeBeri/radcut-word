namespace RadCut.DesktopTests.Infrastructure;

/// <summary>
/// Base for tests that drive the palette in Word: opens a fresh session on a scratch copy of a
/// fixture (normal build), keeps its evidence on failure, and closes it afterwards.
/// </summary>
public abstract class ScenarioTest : HarnessTest
{
    protected PaneSession? Session { get; private set; }

    protected ScenarioTest()
    {
        OnFailure(folder => Session?.SaveEvidenceAsync(folder) ?? Task.CompletedTask);
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await CloseAsync();
    }

    /// <summary>Word on a scratch copy of <paramref name="fixture"/> with the palette ready; skipped without an interactive desktop.</summary>
    protected async Task<(Palette Palette, object Document)> OpenAsync(string fixture, string name)
    {
        if (!Preflight.HasInteractiveDesktop()) Preflight.SkipWithoutDesktop();
        Session = await PaneSession.StartAsync(fixture, DevServerMode.Normal, name);
        if (Session.Pane is null) throw new InvalidOperationException($"No route reached the task pane: {Session.PaneFailure}");
        // The ribbon button opened the pane to start the session; hide it again, as a person
        // starts from the document.
        await Session.Pane.Page.EvaluateAsync("() => Office.addin.hide()");
        return (new Palette(Session), Session.Word!.Document);
    }

    /// <summary>Closes Word (without saving) and the dev server, and unregisters the add-in.</summary>
    protected async Task CloseAsync()
    {
        if (Session is not null) await Session.DisposeAsync();
        Session = null;
    }

    protected static string[] Results(IEnumerable<ReferenceField> fields) => fields.Select(f => f.Result).ToArray();

    /// <summary>Fails with the first difference when the document is not as it was.</summary>
    protected static void AssertUnchanged(DocumentSnapshot before, object document, string when)
    {
        var difference = before.FirstDifference(DocumentSnapshot.Take(document));
        Assert.True(difference is null, $"{when}: the document changed: {difference}");
    }
}
