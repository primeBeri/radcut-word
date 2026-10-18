using FlaUI.Core.WindowsAPI;
using RadCut.DesktopTests.Infrastructure;

namespace RadCut.DesktopTests.Scenarios;

/// <summary>
/// Feature 001's US3 quickstart scenario 9: a template made in the settings view, rejected when it
/// names an unknown placeholder, then cycled to, inserted and updated in Word, and edited and
/// deleted without touching what it inserted.
/// </summary>
[Trait("Category", "Scenario")]
public sealed class Us3Scenarios : ScenarioTest
{
    private const string Body = "The fire strategy is described here.";
    private const string House = "House style";
    private const string HouseText = "see §{number} {text}, {abovebelow}";
    private const string HousePreview = "see §4.3 Fire strategy, above";

    /// <summary>Each field's code and result, comparable by value (ReferenceField holds its switches as a list).</summary>
    private static List<string> Described(IEnumerable<ReferenceField> fields) =>
        fields.Select(f => $"{f.Story} {f.Type} {f.Bookmark} {string.Join(" ", f.Switches)} = {f.Result}").ToList();

    [Fact]
    public async Task Scenario09_a_template_joins_the_cycle_at_the_end_of_the_list_inserts_as_previewed_and_survives_F9_and_num_is_rejected()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario09");
        WordActions.PutCaretIn(document, Body);
        await palette.OpenSettingsFromRibbonAsync();
        await palette.AddTemplateAsync(House, HouseText);
        // The settings view's sample heading is "4.3 Fire strategy", above the cursor.
        Assert.Equal(HousePreview, await palette.TemplatePreviewAsync(House));
        await palette.AddTemplateAsync("Broken", "{num}");
        await palette.SaveSettingsRefusedAsync("Broken", "Unknown placeholder {num}. Use {number}, {text}, {page} or {abovebelow}.");
        await palette.DeleteTemplateAsync("Broken");
        await palette.SaveSettingsAsIsAsync();
        await palette.CloseSettingsAsync();
        await palette.WaitForDocumentFocusAsync("after Close in settings");

        // From the first format, § Number & Text, the template is four Tabs on: at the end of the list.
        var paragraph = WordActions.Find(document, Body).Paragraphs.First;
        int start = (int)paragraph.Range.Start;
        ((dynamic)document).Range(start, start).Select();
        string textBefore = WordActions.ParagraphText(paragraph);
        var before = DocumentInspector.ReferenceFields(document);
        await palette.OpenAsync();
        Palette.Type("Fire strategy");
        await palette.WaitForSelectedRowAsync("Fire strategy");
        foreach (var label in new[] { "Number Only", "Text Only", "Number & Text" }) await palette.TabToAsync(label);
        Assert.Equal(HousePreview, await palette.TabToAsync(House));
        // and Tab wraps round from it to the first format; Shift+Tab comes back.
        await palette.TabToAsync("§ Number & Text");
        await palette.TabToAsync(House, back: true);
        Palette.Press(VirtualKeyShort.ENTER);
        var insertion = await palette.WaitForInsertionAsync(before, "Fire strategy");
        Assert.Equal(["REF", "REF", "REF"], insertion.Fields.Select(f => f.Type));

        string inserted = WordActions.ParagraphText(paragraph);
        Assert.Equal(HousePreview + textBefore, inserted);
        Assert.Empty(WordActions.UpdateFields(document));
        Assert.Empty(DocumentInspector.ErrorResults(document));
        Assert.Equal(inserted, WordActions.ParagraphText(paragraph));

        // US3 scenario 4: editing, then deleting, the template leaves the reference it inserted alone.
        var fields = Described(DocumentInspector.ReferenceFields(document));
        await palette.OpenSettingsFromRibbonAsync();
        await palette.EditTemplateTextAsync(House, "{text}");
        await palette.SaveSettingsAsIsAsync();
        await palette.DeleteTemplateAsync(House);
        await palette.SaveSettingsAsIsAsync();
        await palette.CloseSettingsAsync();
        await palette.WaitForDocumentFocusAsync("after Close in settings");
        Assert.Equal(fields, Described(DocumentInspector.ReferenceFields(document)));
        Assert.Empty(WordActions.UpdateFields(document));
        Assert.Equal(inserted, WordActions.ParagraphText(paragraph));
    }
}
