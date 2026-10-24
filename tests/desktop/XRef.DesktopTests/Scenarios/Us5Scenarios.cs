using FlaUI.Core.WindowsAPI;
using XRef.DesktopTests.Infrastructure;

namespace XRef.DesktopTests.Scenarios;

/// <summary>
/// Feature 001's US5 quickstart scenarios 11 and 11b: the headings referenced last listed first
/// under "Recent" while the search box is empty (FR-022), and the setting that turns them off
/// (FR-022a).
/// </summary>
[Trait("Category", "Scenario")]
public sealed class Us5Scenarios : ScenarioTest
{
    // Each insertion goes into a paragraph of its own: the harness finds a paragraph by its whole
    // text, which an insertion changes. Reopening happens in a third, untouched one.
    private const string First = "Definitions body.";
    private const string Second = "Second of two paragraphs.";
    private const string Elsewhere = "First of two paragraphs.";
    private const string Scope = "1.1 Scope, level 2";
    private const string Fire = "4.3 Fire strategy, level 2";

    [Fact]
    public async Task Scenario11_after_two_insertions_an_empty_query_lists_both_under_Recent_most_recent_first()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario11");
        await palette.InsertAsync(First, "Scope");
        await palette.WaitForDocumentFocusAsync("after the first insertion");
        await palette.InsertAsync(Second, "Fire strategy");
        await palette.WaitForDocumentFocusAsync("after the second insertion");

        WordActions.PutCaretIn(document, Elsewhere);
        await palette.OpenAsync();
        await palette.WaitForRecentAsync(Fire, Scope);
        // The full list follows, complete: the recent headings are listed there too.
        var all = await palette.GroupRowsAsync("All headings");
        Assert.Contains(Scope, all);
        Assert.Contains(Fire, all);
        await palette.WaitForSelectedRowAsync("Fire strategy");
        Assert.Equal(("Recent", Fire), await palette.SelectedInGroupAsync());
        Palette.Press(VirtualKeyShort.DOWN);
        await palette.WaitForSelectedRowAsync("Scope");
        Assert.Equal(("Recent", Scope), await palette.SelectedInGroupAsync());
        // Down from the last recent heading moves on into All headings, as one list.
        Palette.Press(VirtualKeyShort.DOWN);
        await Wait.UntilAsync(
            async () => await palette.SelectedInGroupAsync() == ("All headings", all[0]),
            Wait.Pane,
            "the first row of All headings to be highlighted");

        // US5 scenario 2: typing ranks by match alone, without groups.
        Palette.Type("Scope");
        await palette.WaitForSelectedRowAsync("Scope");
        Assert.False(await palette.HasGroupsAsync());
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForDocumentFocusAsync("after Esc");
    }

    [Fact]
    public async Task Scenario11b_with_Show_recently_used_headings_off_there_is_no_Recent_group_and_nothing_is_recorded()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario11b");
        await palette.InsertAsync(First, "Scope");
        await palette.WaitForDocumentFocusAsync("after the first insertion");

        await palette.OpenSettingsFromRibbonAsync();
        await palette.SaveSettingsAsync(showRecentHeadings: false);
        await palette.CloseSettingsAsync();
        await palette.WaitForDocumentFocusAsync("after Close in settings");
        WordActions.PutCaretIn(document, Elsewhere);
        await palette.OpenAsync();
        await palette.WaitForSelectedRowAsync("");
        // Give the background refresh its time: the groups must stay away.
        await Task.Delay(TimeSpan.FromSeconds(1), TestContext.Current.CancellationToken);
        Assert.False(await palette.HasGroupsAsync());
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForDocumentFocusAsync("after Esc");
        await palette.InsertAsync(Second, "Fire strategy");
        await palette.WaitForDocumentFocusAsync("after the insertion with the setting off");

        await palette.OpenSettingsFromRibbonAsync();
        await palette.SaveSettingsAsync(showRecentHeadings: true);
        await palette.CloseSettingsAsync();
        await palette.WaitForDocumentFocusAsync("after Close in settings");
        WordActions.PutCaretIn(document, Elsewhere);
        await palette.OpenAsync();
        await palette.WaitForRecentAsync(Scope);
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForDocumentFocusAsync("after Esc");
    }
}
