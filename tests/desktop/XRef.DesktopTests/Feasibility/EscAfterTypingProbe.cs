using FlaUI.Core.WindowsAPI;
using Microsoft.Win32;
using XRef.DesktopTests.Infrastructure;

namespace XRef.DesktopTests.Feasibility;

/// <summary>
/// Not a check: why scenarios 23 and 27 failed on the owner's desktop (T103). With Windows' "Show
/// text suggestions when typing on the physical keyboard" on, a text box shows Windows' suggestion
/// pop-up a moment after a word is typed, and the pop-up takes the next Esc: the page never sees
/// it, focus does not move, and a second Esc works. Nothing to do with the warning, the COM reads,
/// the background refresh or the pointer, each ruled out in turn. The palette's search box is
/// type="search", which gets no pop-up. Each round types "scope" and presses Esc 1.4 s after
/// opening, with the box as shipped or as a text box, and the setting as it is or off (restored
/// afterwards). Run on its own: --filter-method "*Esc_after_typing*" --explicit only.
/// </summary>
[Trait("Category", "Diagnose")]
public sealed class EscAfterTypingProbe : ScenarioTest
{
    private const string SettingsKey = @"Software\Microsoft\Input\Settings";
    private const string Suggestions = "EnableHwkbTextPrediction";

    [Fact(Explicit = true)]
    public async Task Esc_after_typing_a_word()
    {
        var (palette, _) = await OpenAsync("spec-contract", "EscProbe");
        var page = Session!.Pane!.Page;
        await page.EvaluateAsync("() => { window.__probeKeys = []; document.addEventListener('keydown', e => window.__probeKeys.push(e.key), true); }");

        using var settings = Registry.CurrentUser.CreateSubKey(SettingsKey);
        var setting = settings.GetValue(Suggestions);
        try
        {
            foreach (var (box, suggestionsOff) in new[] { ("search", false), ("text", false), ("search", false), ("text", false), ("text", true), ("text", true) })
            {
                if (suggestionsOff) settings.SetValue(Suggestions, 0, RegistryValueKind.DWord);
                else Restore(settings, setting);

                await palette.OpenAsync();
                var opened = System.Diagnostics.Stopwatch.StartNew();
                await page.EvaluateAsync($"() => {{ window.__probeKeys.length = 0; document.activeElement.type = '{box}'; }}");
                Palette.Type("scope");
                await palette.WaitForSelectedRowAsync("Scope");
                var rest = 1400 - (int)opened.ElapsedMilliseconds;
                if (rest > 0) await Task.Delay(rest, TestContext.Current.CancellationToken);
                Palette.Press(VirtualKeyShort.ESCAPE);
                var seen = true;
                try
                {
                    await Wait.UntilAsync(
                        async () => await page.EvaluateAsync<bool>("() => window.__probeKeys.includes('Escape')"),
                        TimeSpan.FromSeconds(2),
                        "the page to see Esc");
                }
                catch (TimeoutException)
                {
                    seen = false;
                }
                RunSummary.Note($"Esc probe, {box} box, text suggestions {(suggestionsOff ? "off" : $"as set ({setting ?? "unset"})")}: the page saw the Esc {seen}");
                if (await palette.IsPaletteAsync()) await page.EvaluateAsync("() => Office.addin.hide()");
                await palette.WaitUntilHiddenAsync();
            }
        }
        finally
        {
            Restore(settings, setting);
        }
    }

    private static void Restore(RegistryKey settings, object? setting)
    {
        if (setting is null) settings.DeleteValue(Suggestions, throwOnMissingValue: false);
        else settings.SetValue(Suggestions, setting, RegistryValueKind.DWord);
    }
}
