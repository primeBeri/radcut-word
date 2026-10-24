namespace XRef.DesktopTests.Infrastructure;

/// <summary>
/// Base class for harness tests: keeps a log, collects evidence when the test fails, and records
/// the outcome for <c>summary.md</c>. Sessions (Word, pane, dev server) register what they can
/// contribute to the evidence with <see cref="OnFailure"/>.
/// </summary>
public abstract class HarnessTest : IAsyncLifetime
{
    private readonly List<Func<EvidenceFolder, Task>> evidenceSources = [];
    private readonly List<string> log = [];
    private readonly DateTime started = DateTime.Now;

    protected void Log(string message) => log.Add($"{DateTime.Now:HH:mm:ss.fff} {message}");

    /// <summary>Adds something to save if the test fails; called in registration order.</summary>
    protected void OnFailure(Func<EvidenceFolder, Task> save) => evidenceSources.Add(save);

    public virtual ValueTask InitializeAsync() => ValueTask.CompletedTask;

    public virtual async ValueTask DisposeAsync()
    {
        var context = TestContext.Current;
        var name = context.Test?.TestDisplayName ?? GetType().Name;
        var result = context.TestState?.Result;
        string? evidence = null;
        if (result == TestResult.Failed)
        {
            var folder = new EvidenceFolder(name);
            evidence = folder.Path;
            foreach (var save in evidenceSources)
            {
                try
                {
                    await save(folder);
                }
                catch (Exception e)
                {
                    Log($"Evidence could not be saved: {e.GetType().Name}: {e.Message}");
                }
            }
            folder.WriteLines("harness.log", log);
        }

        var skipReason = HarnessSkip.Take();
        var categories = context.Test?.Traits.TryGetValue("Category", out var values) == true ? values : [];
        RunSummary.Record(new TestOutcome(
            name,
            categories.FirstOrDefault() ?? "",
            result switch
            {
                TestResult.Passed => Outcome.Passed,
                TestResult.Failed => Outcome.Failed,
                _ => Outcome.Skipped,
            },
            context.TestState?.ExceptionMessages?.FirstOrDefault() ?? context.Test?.TestCase.SkipReason ?? skipReason,
            evidence,
            DateTime.Now - started));
        GC.SuppressFinalize(this);
    }
}
