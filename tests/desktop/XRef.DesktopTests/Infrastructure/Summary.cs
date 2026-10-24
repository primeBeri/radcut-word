using System.Collections.Concurrent;
using System.Text;

[assembly: AssemblyFixture(typeof(XRef.DesktopTests.Infrastructure.SummaryWriter))]

namespace XRef.DesktopTests.Infrastructure;

public enum Outcome { Passed, Failed, Skipped }

public sealed record TestOutcome(
    string Name, string Category, Outcome Outcome, string? Message, string? EvidenceFolder, TimeSpan Duration);

/// <summary>One in-Word contract suite run: its total and slowest cases (contract-pane results).</summary>
public sealed record ContractTiming(string Suite, double TotalMs, IReadOnlyList<(string Name, double Ms)> Slowest);

/// <summary>Outcomes gathered during the run, written to <c>summary.md</c> when the run ends.</summary>
public static class RunSummary
{
    private static readonly ConcurrentQueue<TestOutcome> Outcomes = new();
    private static readonly ConcurrentQueue<ContractTiming> Timings = new();
    private static readonly ConcurrentQueue<string> Notes = new();

    /// <summary>A measurement or finding for the summary's "Notes" (e.g. palette timings).</summary>
    public static void Note(string note) => Notes.Enqueue(note);

    public static IReadOnlyList<string> RecordedNotes => [.. Notes];

    public static void Record(TestOutcome outcome) => Outcomes.Enqueue(outcome);

    public static void Record(ContractTiming timing) => Timings.Enqueue(timing);

    public static IReadOnlyList<TestOutcome> RecordedOutcomes => [.. Outcomes];

    public static IReadOnlyList<ContractTiming> RecordedTimings => [.. Timings];

    /// <summary>The Markdown summary (contracts/harness-commands.md "Outputs").</summary>
    public static string Format(IReadOnlyList<TestOutcome> outcomes, IReadOnlyList<ContractTiming> timings, IReadOnlyList<string>? notes = null)
    {
        var text = new StringBuilder();
        text.AppendLine("# Desktop harness run").AppendLine();
        text.AppendLine("| Category | Passed | Failed | Skipped |").AppendLine("|---|---|---|---|");
        foreach (var group in outcomes.GroupBy(o => o.Category == "" ? "(none)" : o.Category).OrderBy(g => g.Key, StringComparer.Ordinal))
        {
            text.AppendLine($"| {group.Key} | {Count(group, Outcome.Passed)} | {Count(group, Outcome.Failed)} | {Count(group, Outcome.Skipped)} |");
        }

        var failed = outcomes.Where(o => o.Outcome == Outcome.Failed).ToList();
        if (failed.Count > 0)
        {
            text.AppendLine().AppendLine("## Failures").AppendLine();
            foreach (var o in failed)
            {
                text.AppendLine($"- **{o.Name}**: {OneLine(o.Message)}");
                if (o.EvidenceFolder is not null) text.AppendLine($"  Evidence: `{o.EvidenceFolder}`");
            }
        }

        var skipped = outcomes.Where(o => o.Outcome == Outcome.Skipped).ToList();
        if (skipped.Count > 0)
        {
            text.AppendLine().AppendLine("## Skipped").AppendLine();
            foreach (var o in skipped) text.AppendLine($"- {o.Name}: {OneLine(o.Message)}");
        }

        if (timings.Count > 0)
        {
            text.AppendLine().AppendLine("## Contract timings").AppendLine();
            foreach (var t in timings)
            {
                text.AppendLine($"- {t.Suite}: {Duration(t.TotalMs)} in all; slowest: " +
                    string.Join("; ", t.Slowest.Select(s => $"{Duration(s.Ms)} {s.Name}")));
            }
        }
        if (notes is { Count: > 0 })
        {
            text.AppendLine().AppendLine("## Notes").AppendLine();
            foreach (var note in notes) text.AppendLine($"- {note}");
        }
        return text.ToString();
    }

    /// <summary>
    /// Scenarios that stay with a person (Constitution 1.2.0, layer 7) or are only partly automated,
    /// with what is left; every other scenario is reported from its harness test, if one ran.
    /// </summary>
    public static readonly IReadOnlyDictionary<int, string> HumanChecks = new Dictionary<int, string>
    {
        [10] = "A physical UK keyboard: the shortcut works and no stray character is typed",
        [15] = "A visual pass over the light, dark and black themes",
        [17] = "Co-authoring on SharePoint or OneDrive with two users",
        [25] = "The badges' colours, by eye",
    };

    /// <summary>
    /// The acceptance table for <c>docs/acceptance-checklist.md</c> (<c>| # | Result | Notes |</c>), one row per
    /// quickstart scenario of feature 001, from tests named <c>ScenarioNN_…</c>.
    /// </summary>
    public static string FormatAcceptance(IReadOnlyList<TestOutcome> outcomes, int scenarios = 27)
    {
        var byNumber = new Dictionary<int, List<TestOutcome>>();
        foreach (var outcome in outcomes)
        {
            var match = System.Text.RegularExpressions.Regex.Match(outcome.Name, @"Scenario(\d{2})_");
            if (!match.Success) continue;
            var number = int.Parse(match.Groups[1].Value);
            (byNumber.TryGetValue(number, out var list) ? list : byNumber[number] = []).Add(outcome);
        }
        var text = new StringBuilder();
        text.AppendLine($"Desktop harness, {DateTime.Now:yyyy-MM-dd HH:mm}.").AppendLine();
        text.AppendLine("| # | Result | Notes |").AppendLine("|---|---|---|");
        for (var n = 1; n <= scenarios; n++)
        {
            HumanChecks.TryGetValue(n, out var human);
            string result, note;
            if (byNumber.TryGetValue(n, out var ran))
            {
                var failed = ran.FirstOrDefault(o => o.Outcome == Outcome.Failed);
                var skipped = ran.FirstOrDefault(o => o.Outcome == Outcome.Skipped);
                result = failed is not null ? "Fail" : skipped is not null ? "Skipped" : "Pass";
                note = failed is not null ? OneLine(failed.Message) : skipped is not null ? OneLine(skipped.Message) : "Automated";
                if (human is not null) note += $". By hand: {human}";
            }
            else
            {
                result = human is not null && n is 15 or 17 or 10 ? "Human" : "Not run";
                note = human ?? "No harness test in this run";
            }
            text.AppendLine($"| {n} | {result} | {note.Replace("|", "/")} |");
        }
        return text.ToString();
    }

    /// <summary>"120 ms", "9.4 s", "3 min 14.5 s", as the contract pane shows them.</summary>
    public static string Duration(double ms) => ms switch
    {
        < 1000 => $"{Math.Round(ms)} ms",
        < 60_000 => $"{ms / 1000:0.0} s",
        _ => $"{Math.Floor(ms / 60_000)} min {ms % 60_000 / 1000:0.0} s",
    };

    private static int Count(IEnumerable<TestOutcome> outcomes, Outcome outcome) => outcomes.Count(o => o.Outcome == outcome);

    private static string OneLine(string? message) =>
        string.IsNullOrWhiteSpace(message) ? "(no message)" : message.ReplaceLineEndings(" ").Trim();
}

/// <summary>
/// Clears the previous run's evidence and reports when the run starts, and writes <c>summary.md</c>
/// once, when it ends.
/// </summary>
public sealed class SummaryWriter : IAsyncDisposable
{
    public SummaryWriter()
    {
        var results = HarnessPaths.TestResults;
        if (!Directory.Exists(results)) return;
        foreach (var folder in Directory.GetDirectories(results)) Directory.Delete(folder, recursive: true);
        foreach (var file in Directory.GetFiles(results))
        {
            var name = Path.GetFileName(file);
            if (name is "summary.md" or "routes.md" || name.EndsWith(".trx", StringComparison.Ordinal) ||
                name.EndsWith(".junit.xml", StringComparison.Ordinal) || name.EndsWith(".log", StringComparison.Ordinal))
            {
                File.Delete(file);
            }
        }
    }

    public ValueTask DisposeAsync()
    {
        var outcomes = RunSummary.RecordedOutcomes;
        if (outcomes.Count > 0)
        {
            Directory.CreateDirectory(HarnessPaths.TestResults);
            File.WriteAllText(
                Path.Combine(HarnessPaths.TestResults, "summary.md"),
                RunSummary.Format(outcomes, RunSummary.RecordedTimings, RunSummary.RecordedNotes));
            if (outcomes.Any(o => o.Name.Contains("Scenario", StringComparison.Ordinal)))
            {
                File.WriteAllText(Path.Combine(HarnessPaths.TestResults, "acceptance-summary.md"), RunSummary.FormatAcceptance(outcomes));
            }
        }
        return ValueTask.CompletedTask;
    }
}
