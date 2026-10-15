using System.Diagnostics;
using FlaUI.Core.WindowsAPI;
using RadCut.DesktopTests.Infrastructure;

namespace RadCut.DesktopTests.Performance;

/// <summary>
/// M4 (spec US5, FR-026): the palette's speed as a person meets it, against feature 001's budgets
/// (Principle IV): ready under 500 ms on spec-300, under 50 ms per keystroke on guide-500. Medians
/// and worst cases go to summary.md.
/// </summary>
[Trait("Category", "Performance")]
public sealed class BudgetTests : ScenarioTest
{
    private const int Runs = 10;

    [Fact]
    public async Task Shortcut_to_palette_ready_is_under_500_ms_on_spec_300()
    {
        var (palette, document) = await OpenAsync("spec-300", "Budget-open");
        var pane = Session!.Pane!.Page;
        using var keys = new Keys(Session.Word!);
        var times = new List<double>();
        for (var run = 0; run <= Runs; run++)
        {
            WordActions.PutCaretIn(document, "The fire strategy is described here.");
            keys.FocusDocument();
            var clock = Stopwatch.StartNew();
            keys.Shortcut();
            // Tight polling: the default back-off would blur a budget measured in milliseconds.
            while (!(keys.FocusedClass() == Keys.TaskPaneHostClass &&
                     await pane.EvaluateAsync<bool>("() => document.activeElement?.getAttribute('aria-label') === 'Search headings' && document.querySelectorAll('[role=option]').length > 0")))
            {
                if (clock.Elapsed > Wait.Pane) throw new TimeoutException("The palette did not become ready.");
                await Task.Delay(5, TestContext.Current.CancellationToken);
            }
            var elapsed = clock.Elapsed.TotalMilliseconds;
            if (run > 0) times.Add(elapsed); // the first open warms the cache (research R12)
            Palette.Press(VirtualKeyShort.ESCAPE);
            await palette.WaitForDocumentFocusAsync("after Esc");
        }

        Report("Shortcut to palette ready, spec-300", times);
        Assert.True(Median(times) < 500, $"Median {Median(times):0} ms over {Runs} opens (budget 500 ms).");
    }

    [Fact]
    public async Task Each_keystroke_updates_the_list_in_under_50_ms_on_guide_500()
    {
        var (palette, document) = await OpenAsync("guide-500", "Budget-filter");
        WordActions.PutCaretIn(document, "Note body 1-1.");
        await palette.OpenAsync();
        await Session!.Pane!.Page.EvaluateAsync(@"() => {
            const input = document.querySelector('input[aria-label=""Search headings""]');
            const list = document.querySelector('[role=listbox]');
            window.__radcutKeyTimes = [];
            let pressed = null;
            input.addEventListener('keydown', () => { pressed = performance.now(); }, true);
            new MutationObserver(() => {
                if (pressed !== null) { window.__radcutKeyTimes.push(performance.now() - pressed); pressed = null; }
            }).observe(list, { childList: true, subtree: true, characterData: true });
        }");

        Palette.Type("numbered 4");
        var times = new List<double>();
        await Wait.UntilAsync(
            async () => (times = (await Session.Pane.Page.EvaluateAsync<double[]>("() => window.__radcutKeyTimes")).ToList()).Count >= 8,
            Wait.Pane,
            "the list to update after the keystrokes");

        Report("Keystroke to list updated, guide-500", times);
        Assert.True(Median(times) < 50, $"Median {Median(times):0} ms per keystroke (budget 50 ms).");
    }

    private static double Median(IReadOnlyList<double> times)
    {
        var sorted = times.Order().ToList();
        return sorted.Count % 2 == 1 ? sorted[sorted.Count / 2] : (sorted[sorted.Count / 2 - 1] + sorted[sorted.Count / 2]) / 2;
    }

    private static void Report(string what, IReadOnlyList<double> times) =>
        RunSummary.Note($"{what}: median {Median(times):0} ms, worst {times.Max():0} ms over {times.Count} ({string.Join(", ", times.Select(t => t.ToString("0")))})");
}
