using FlaUI.Core.WindowsAPI;
using RadCut.DesktopTests.Infrastructure;

namespace RadCut.DesktopTests.Scenarios;

/// <summary>
/// Feature 001's US2 quickstart scenarios 7, 8, 16 and 24, and the settings part of 25: the format
/// cycle and the settings view, driven as a person drives them and checked in the pane and in the
/// document through Word itself.
/// </summary>
[Trait("Category", "Scenario")]
public sealed class Us2Scenarios : ScenarioTest
{
    private const string Body = "The fire strategy is described here.";
    private const string Headings = "References can't go in headings or titles.";

    /// <summary>
    /// Every built-in format in the cycle once the three left out by default are added in settings
    /// (FR-016, FR-017), each with its preview for "4.3 Fire strategy" just above the cursor.
    /// </summary>
    private static readonly (string Label, string Preview)[] Cycle =
    [
        ("§ Number & Text", "§ 4.3 Fire strategy"),
        ("Number Only", "4.3"),
        ("Text Only", "Fire strategy"),
        ("Number & Text", "4.3 Fire strategy"),
        ("Page Number", "{page}"),
        ("Above/Below", "above"),
        ("Text + Above/Below", "Fire strategy above"),
    ];

    /// <summary>The built-ins not in the format list out of the box (FR-016).</summary>
    private static readonly string[] Added = ["Page Number", "Above/Below", "Text + Above/Below"];

    /// <summary>The palette opens on the first format in the list (FR-017).</summary>
    private const int Default = 0;

    private static readonly string[] OutsideMainText =
    [
        "Heading in a table cell", "Heading in a text box", "Heading in a footnote",
        "Heading in an endnote", "Heading in the header", "Heading in the footer",
    ];

    private static void CaretAtStart(object document, dynamic paragraph)
    {
        int start = (int)paragraph.Range.Start;
        ((dynamic)document).Range(start, start).Select();
    }

    [Fact]
    public async Task Scenario07_Tab_and_Shift_Tab_cycle_every_format_and_each_inserts_as_previewed_and_updates_on_F9()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario07");
        WordActions.PutCaretIn(document, Body);
        // Out of the box the list holds four formats; the other three built-ins are added at its end.
        await palette.OpenSettingsFromRibbonAsync();
        Assert.Equal(Cycle.Take(4).Select(f => f.Label), await palette.FormatListAsync());
        foreach (var label in Added) await palette.AddFormatAsync(label);
        Assert.Equal(Cycle.Select(f => f.Label), await palette.FormatListAsync());
        await palette.SaveSettingsAsync();
        await palette.CloseSettingsAsync();
        await palette.WaitForDocumentFocusAsync("after Close in settings");
        await palette.OpenAsync();
        Palette.Type("Fire strategy");
        await palette.WaitForSelectedRowAsync("Fire strategy");
        Assert.Equal(Cycle[Default], await palette.FormatAsync());

        // Tab once round the whole cycle, wrapping at the end, then Shift+Tab back round it.
        for (var step = 1; step <= Cycle.Length; step++)
        {
            var (label, preview) = Cycle[(Default + step) % Cycle.Length];
            Assert.Equal((label, preview), (label, await palette.TabToAsync(label)));
        }
        for (var step = 1; step <= Cycle.Length; step++)
        {
            var (label, preview) = Cycle[(Default - step + Cycle.Length) % Cycle.Length];
            Assert.Equal((label, preview), (label, await palette.TabToAsync(label, back: true)));
        }
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForDocumentFocusAsync("after Esc");

        // Each format inserted at the start of the same paragraph: what Word shows is the preview.
        var paragraph = WordActions.Find(document, Body).Paragraphs.First;
        for (var index = 0; index < Cycle.Length; index++)
        {
            var (label, _) = Cycle[index];
            CaretAtStart(document, paragraph);
            string textBefore = WordActions.ParagraphText(paragraph);
            var before = DocumentInspector.ReferenceFields(document);
            await palette.OpenAsync();
            Palette.Type("Fire strategy");
            await palette.WaitForSelectedRowAsync("Fire strategy");
            var preview = (await palette.FormatAsync()).Preview;
            for (var step = 1; step <= (index - Default + Cycle.Length) % Cycle.Length; step++)
            {
                preview = await palette.TabToAsync(Cycle[(Default + step) % Cycle.Length].Label);
            }
            Palette.Press(VirtualKeyShort.ENTER);
            await palette.WaitForInsertionAsync(before, "Fire strategy");
            string textAfter = WordActions.ParagraphText(paragraph);
            Assert.True(textAfter.EndsWith(textBefore, StringComparison.Ordinal), $"{label}: the paragraph now reads \"{textAfter}\".");
            var inserted = textAfter[..^textBefore.Length];
            if (label == "Page Number") Assert.Matches(@"^[1-9][0-9]*$", inserted);
            else Assert.Equal((label, preview), (label, inserted));
        }

        string inserts = WordActions.ParagraphText(paragraph);
        Assert.Empty(WordActions.UpdateFields(document));
        Assert.Empty(DocumentInspector.ErrorResults(document));
        Assert.Equal(inserts, WordActions.ParagraphText(paragraph));
    }

    [Fact]
    public async Task Scenario08_the_format_moved_to_the_top_of_the_list_is_where_the_palette_starts_even_after_restarting_Word()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario08");
        WordActions.PutCaretIn(document, Body);
        await palette.OpenSettingsFromRibbonAsync();
        await palette.MoveFormatToTopAsync("Number Only");
        Assert.Equal(["Number Only", "§ Number & Text", "Text Only", "Number & Text"], await palette.FormatListAsync());
        await palette.SaveSettingsAsync();
        await palette.CloseSettingsAsync();
        await palette.WaitForDocumentFocusAsync("after Close in settings");
        await palette.OpenAsync();
        Assert.Equal("Number Only", (await palette.FormatAsync()).Label);
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForDocumentFocusAsync("after Esc");

        palette.Dispose();
        await CloseAsync();
        (palette, document) = await OpenAsync("spec-contract", "Scenario08-restarted", keepSettings: true);
        WordActions.PutCaretIn(document, Body);
        await palette.OpenAsync();
        Assert.Equal("Number Only", (await palette.FormatAsync()).Label);

        // Inserting in another format does not change where the next palette starts (US2 scenario 5).
        Palette.Type("Scope");
        await palette.WaitForSelectedRowAsync("Scope");
        await palette.TabToAsync("§ Number & Text");
        var before = DocumentInspector.ReferenceFields(document);
        Palette.Press(VirtualKeyShort.ENTER);
        await palette.WaitForInsertionAsync(before, "Scope");
        await palette.OpenAsync();
        Assert.Equal("Number Only", (await palette.FormatAsync()).Label);
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForDocumentFocusAsync("after Esc");
    }

    [Fact]
    public async Task Scenario08b_with_Remember_the_last_used_format_on_the_palette_starts_on_the_format_last_inserted_until_it_is_removed()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario08b");
        WordActions.PutCaretIn(document, Body);
        await palette.OpenSettingsFromRibbonAsync();
        await palette.SaveSettingsAsync(rememberLastFormat: true);
        await palette.CloseSettingsAsync();
        await palette.WaitForDocumentFocusAsync("after Close in settings");

        await palette.OpenAsync();
        Assert.Equal("§ Number & Text", (await palette.FormatAsync()).Label);
        Palette.Type("Scope");
        await palette.WaitForSelectedRowAsync("Scope");
        await palette.TabToAsync("Number Only");
        var before = DocumentInspector.ReferenceFields(document);
        Palette.Press(VirtualKeyShort.ENTER);
        await palette.WaitForInsertionAsync(before, "Scope");
        await palette.OpenAsync();
        Assert.Equal("Number Only", (await palette.FormatAsync()).Label);
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForDocumentFocusAsync("after Esc");

        palette.Dispose();
        await CloseAsync();
        (palette, document) = await OpenAsync("spec-contract", "Scenario08b-restarted", keepSettings: true);
        WordActions.PutCaretIn(document, Body);
        await palette.OpenAsync();
        Assert.Equal("Number Only", (await palette.FormatAsync()).Label);
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForDocumentFocusAsync("after Esc");

        // Removed from the list, it is forgotten: the palette starts on the first format again.
        await palette.OpenSettingsFromRibbonAsync();
        await palette.RemoveFormatAsync("Number Only");
        await palette.SaveSettingsAsync();
        await palette.CloseSettingsAsync();
        await palette.WaitForDocumentFocusAsync("after Close in settings");
        await palette.OpenAsync();
        Assert.Equal("§ Number & Text", (await palette.FormatAsync()).Label);
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForDocumentFocusAsync("after Esc");
    }

    [Fact]
    public async Task Scenario16_Ctrl_comma_opens_settings_with_focus_on_the_first_control_and_Esc_returns_to_the_palette()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario16");
        WordActions.PutCaretIn(document, Body);
        await palette.OpenAsync();
        Palette.Type("fire");
        await palette.WaitForSelectedRowAsync("Fire strategy");
        await palette.OpenSettingsFromPaletteAsync();
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForPaletteFocusAsync("fire", "after Esc in settings");
        await palette.WaitForSelectedRowAsync("Fire strategy");
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForDocumentFocusAsync("after Esc in the palette");
    }

    [Fact]
    public async Task Scenario24_with_references_allowed_in_headings_a_heading_takes_a_reference_but_is_not_listed_and_off_again_declines()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario24");
        WordActions.PutCaretIn(document, Body);
        await palette.OpenSettingsFromRibbonAsync();
        Assert.StartsWith("Not recommended", await palette.CheckboxDescriptionAsync("Headings", "Allow cross references in headings"));
        await palette.SaveSettingsAsync(allowInHeadings: true);
        await palette.CloseSettingsAsync();
        await palette.WaitForDocumentFocusAsync("after Close in settings");

        var heading = WordActions.Find(document, "Fire strategy").Paragraphs.First;
        WordActions.PutCaretIn(document, "Fire strategy", "Fire strategy".Length);
        var before = DocumentInspector.ReferenceFields(document);
        await palette.OpenAsync();
        Assert.True(await palette.IsPaletteAsync(), "The palette did not open in the heading with the setting on.");
        Assert.DoesNotContain(await palette.RowsAsync(), row => row.Contains("Fire strategy", StringComparison.Ordinal));
        Palette.Type("Means of escape");
        await palette.WaitForSelectedRowAsync("Means of escape");
        Palette.Press(VirtualKeyShort.ENTER);
        await palette.WaitForInsertionAsync(before, "Means of escape");
        string text = WordActions.ParagraphText(heading);
        Assert.StartsWith("Fire strategy", text);
        Assert.EndsWith("Means of escape", text);

        await palette.OpenSettingsFromRibbonAsync();
        await palette.SaveSettingsAsync(allowInHeadings: false);
        await palette.CloseSettingsAsync();
        await palette.WaitForDocumentFocusAsync("after Close in settings");
        CaretAtStart(document, heading);
        await palette.OpenAsync();
        await palette.WaitForMessageAsync(Headings);
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForDocumentFocusAsync("after Esc");
    }

    [Fact]
    public async Task Scenario25_settings_part_with_headings_outside_the_main_text_turned_off_they_are_not_listed()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario25-settings");
        WordActions.PutCaretIn(document, Body);
        await palette.OpenAsync();
        var rows = await palette.RowsAsync();
        foreach (var heading in OutsideMainText) Assert.Contains(rows, row => row.Contains(heading, StringComparison.Ordinal));
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForDocumentFocusAsync("after Esc");

        await palette.OpenSettingsFromRibbonAsync();
        await palette.SaveSettingsAsync(showOutsideMainText: false);
        await palette.CloseSettingsAsync();
        await palette.WaitForDocumentFocusAsync("after Close in settings");
        await palette.OpenAsync();
        rows = await palette.RowsAsync();
        foreach (var heading in OutsideMainText) Assert.DoesNotContain(rows, row => row.Contains(heading, StringComparison.Ordinal));
        Assert.Contains(rows, row => row.Contains("Fire strategy", StringComparison.Ordinal));
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForDocumentFocusAsync("after Esc");
    }

    /// <summary>FR-016a in Word (US2 acceptance scenario 2): no quickstart row of its own, so not numbered.</summary>
    [Fact]
    public async Task FootnoteCycle_in_a_footnote_Tab_skips_the_above_below_formats_and_the_preview_line_says_why()
    {
        var (palette, document) = await OpenAsync("spec-contract", "FootnoteCycle");
        WordActions.PutCaretIn(document, "Footnote text.");
        // Every built-in in the list, so there are above/below formats to skip.
        await palette.OpenSettingsFromRibbonAsync();
        foreach (var label in Added) await palette.AddFormatAsync(label);
        await palette.SaveSettingsAsync();
        await palette.CloseSettingsAsync();
        await palette.WaitForDocumentFocusAsync("after Close in settings");
        await palette.OpenAsync();
        Palette.Type("Fire strategy");
        await palette.WaitForSelectedRowAsync("Fire strategy");
        Assert.Equal("§ Number & Text", (await palette.FormatAsync()).Label);
        Assert.Contains("No above/below formats here", await palette.PreviewLineTextAsync());
        // Page Number wraps straight round to § Number & Text: the two above/below formats after it are skipped.
        foreach (var label in new[] { "Number Only", "Text Only", "Number & Text", "Page Number", "§ Number & Text" }) await palette.TabToAsync(label);
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForDocumentFocusAsync("after Esc");
    }
}
