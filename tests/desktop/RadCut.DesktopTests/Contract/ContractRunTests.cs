using System.Text.Json;
using System.Text.RegularExpressions;
using RadCut.DesktopTests.Infrastructure;

namespace RadCut.DesktopTests.Contract;

/// <summary>One contract case as the contract pane published it (data-model CaseResult).</summary>
public sealed record CaseResult(string Name, string Status, double DurationMs, string? Error);

/// <summary>
/// Runs every Office contract suite in Word through the dev contract pane (M1, spec US2), with the
/// desktop bridge exposed so no case needs a person, and keeps the results for <see cref="ContractRunTests"/>.
/// A case that needs another fixture is taken from a run on that fixture.
/// </summary>
public static partial class ContractRuns
{
    public const string GatewaySuite = "IDocumentGateway: OfficeJsGateway";
    public const string HostShellSuite = "IHostShell: OfficeHostShell";
    public const string SettingsStoreSuite = "ISettingsStore: OfficeSettingsStore";
    public static readonly TimeSpan SuiteTimeout = TimeSpan.FromMinutes(15);

    private static readonly Lazy<IReadOnlyDictionary<string, IReadOnlyList<CaseResult>>> Results =
        new(() => RunAllAsync().GetAwaiter().GetResult());

    public static IReadOnlyDictionary<string, IReadOnlyList<CaseResult>> All => Results.Value;

    [GeneratedRegex(@"^This case needs (?<fixture>[\w-]+)\.docx open in Word\.$")]
    private static partial Regex NeedsFixture();

    private static async Task<IReadOnlyDictionary<string, IReadOnlyList<CaseResult>>> RunAllAsync()
    {
        var gateway = await RunInWordAsync("spec-contract", GatewaySuite, HostShellSuite, SettingsStoreSuite);
        var merged = gateway[GatewaySuite].ToList();
        foreach (var fixture in merged.Select(c => NeedsFixture().Match(c.Error ?? "")).Where(m => m.Success)
                     .Select(m => m.Groups["fixture"].Value).Distinct().ToList())
        {
            var other = (await RunInWordAsync(fixture, GatewaySuite))[GatewaySuite].ToDictionary(c => c.Name);
            for (var i = 0; i < merged.Count; i++)
            {
                var match = NeedsFixture().Match(merged[i].Error ?? "");
                if (match.Success && match.Groups["fixture"].Value == fixture && other.TryGetValue(merged[i].Name, out var result))
                {
                    merged[i] = result;
                }
            }
        }
        return new Dictionary<string, IReadOnlyList<CaseResult>>
        {
            [GatewaySuite] = merged,
            [HostShellSuite] = gateway[HostShellSuite],
            [SettingsStoreSuite] = gateway[SettingsStoreSuite],
        };
    }

    /// <summary>Opens <paramref name="fixture"/> in Word with the dev-pane build and runs each suite in turn.</summary>
    private static async Task<Dictionary<string, IReadOnlyList<CaseResult>>> RunInWordAsync(string fixture, params string[] suites)
    {
        await using var session = await PaneSession.StartAsync(fixture, DevServerMode.DevPane, $"contract-{fixture}");
        var pane = session.Pane ?? throw new InvalidOperationException($"No route reached the task pane: {session.PaneFailure}");
        var bridge = new DesktopBridge(session.Word!);
        var evidence = new EvidenceFolder($"contract-run-{fixture}");
        var results = new Dictionary<string, IReadOnlyList<CaseResult>>();
        try
        {
            await pane.Page.ExposeFunctionAsync<string, Task<string>>("__radcutDesktop", bridge.HandleAsync);
            foreach (var suite in suites)
            {
                await pane.GoToAsync($"dev/contract-pane.html?suite={Uri.EscapeDataString(suite)}&autorun=1");
                await pane.Page.WaitForFunctionAsync(
                    "() => ['done', 'error'].includes(document.body.dataset.status)",
                    null,
                    new() { Timeout = (float)SuiteTimeout.TotalMilliseconds, PollingInterval = 500 });
                var json = await pane.Page.EvaluateAsync<string>("() => JSON.stringify(window.__radcutContractResults)");
                File.WriteAllText(Path.Combine(evidence.Path, $"{EvidenceFolder.SafeName(suite)}.json"), json);
                using var parsed = JsonDocument.Parse(json);
                if (parsed.RootElement.TryGetProperty("error", out var error))
                {
                    throw new InvalidOperationException($"The contract pane could not run {suite}: {error.GetString()}");
                }
                var cases = parsed.RootElement.GetProperty("cases").EnumerateArray()
                    .Select(c => new CaseResult(
                        c.GetProperty("name").GetString()!,
                        c.GetProperty("status").GetString()!,
                        c.GetProperty("durationMs").GetDouble(),
                        c.TryGetProperty("error", out var e) ? e.GetString() : null))
                    .ToList();
                results[suite] = cases;
                RunSummary.Record(new ContractTiming(
                    $"{suite} on {fixture}",
                    parsed.RootElement.GetProperty("totalMs").GetDouble(),
                    cases.OrderByDescending(c => c.DurationMs).Take(5).Select(c => (c.Name, c.DurationMs)).ToList()));
            }
            return results;
        }
        finally
        {
            await pane.SaveEvidenceAsync(evidence);
            lock (bridge.Log) evidence.WriteLines("desktop-bridge.log", bridge.Log);
        }
    }

    /// <summary>Theory rows: one per case of each suite, run at execution time (Word is needed).</summary>
    public static IEnumerable<TheoryDataRow<string, string>> Cases() =>
        All.SelectMany(suite => suite.Value.Select(c =>
            new TheoryDataRow<string, string>(suite.Key, c.Name) { TestDisplayName = $"Contract.{suite.Key}.{c.Name}" }));
}

/// <summary>
/// M1 (spec US2, FR-018 to FR-020): every in-Word contract case as its own result, no person needed.
/// Evidence of each run is in <c>test-results/contract-run-&lt;fixture&gt;/</c>.
/// </summary>
[Trait("Category", "Contract")]
public sealed class ContractRunTests : HarnessTest
{
    [Theory]
    [MemberData(nameof(ContractRuns.Cases), MemberType = typeof(ContractRuns), DisableDiscoveryEnumeration = true)]
    public void Case(string suite, string name)
    {
        var result = ContractRuns.All[suite].Single(c => c.Name == name);
        switch (result.Status)
        {
            case "pass":
                return;
            case "skip":
                HarnessSkip.Because("Registered as skipped in Word.");
                break;
            default:
                if (result.Error?.Contains(Preflight.NoDesktopMessage, StringComparison.Ordinal) == true) Preflight.SkipWithoutDesktop();
                Assert.Fail($"{result.Error} (evidence: test-results/contract-run-*/)");
                break;
        }
    }
}
