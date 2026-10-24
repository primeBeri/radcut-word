using FlaUI.Core.WindowsAPI;
using RadCut.DesktopTests.Infrastructure;

namespace RadCut.DesktopTests.Scenarios;

/// <summary>
/// M3 (spec US4, FR-024): feature 001's US1 quickstart scenarios 1, 2, 5, 12, 13, 21, 22, 23, 25
/// and 27, plus 18, driven as a person drives the palette and checked in the pane and in the
/// document through Word itself.
/// </summary>
[Trait("Category", "Scenario")]
public sealed class Us1Scenarios : ScenarioTest
{
    private const string Body = "The fire strategy is described here.";
    private const string Headings = "References can't go in headings or titles.";
    private const string TableSelected = "References can't replace a table.";

    private const int WdMainTextStory = 1;
    private const int WdFootnotesStory = 2;
    private const int WdTextFrameStory = 5;
    private const int WdPrimaryHeaderStory = 7;
    private const int WdPrimaryFooterStory = 9;
    private const int WdAllowOnlyReading = 3;

    private static dynamic Selection(object document) => ((dynamic)document).Application.Selection;

    private static string MainText(object document) => (string)((dynamic)document).Content.Text;

    [Fact]
    public async Task Scenario01_fuzzy_query_ranks_the_heading_first_and_Enter_inserts_it_with_the_caret_after()
    {
        var (palette, document) = await OpenAsync("spec-300", "Scenario01");
        WordActions.PutCaretIn(document, Body);
        var before = DocumentInspector.ReferenceFields(document);

        await palette.OpenAsync();
        Palette.Type("fstrat");
        var row = await palette.WaitForSelectedRowAsync("Fire strategy");
        Assert.Contains("4.3", row);
        Assert.Contains("<mark", row); // the matched letters are highlighted
        Palette.Press(VirtualKeyShort.ENTER);
        var inserted = await palette.WaitForInsertionAsync(before, "Fire strategy");

        Assert.Equal(["4.3", "Fire strategy"], Results(inserted.Fields));
        Assert.Contains("§ 4.3 Fire strategy" + Body, MainText(document));
        // The add-in puts the caret back after hiding the pane, just after focus leaves it.
        string after = "", where = "";
        try
        {
            await Wait.UntilAsync(() =>
            {
                dynamic selection = Selection(document);
                dynamic paragraph = selection.Paragraphs.First.Range;
                after = ((dynamic)document).Range((int)selection.Start, (int)paragraph.End).Text ?? "";
                where = $"story {(int)selection.StoryType}, start {(int)selection.Start}, end {(int)selection.End}, " +
                    $"paragraph [{(int)paragraph.Start},{(int)paragraph.End}] \"{(string)paragraph.Text}\"";
                return Task.FromResult(after.StartsWith(Body, StringComparison.Ordinal));
            }, Wait.Pane, "the caret to sit just after the inserted reference");
        }
        catch (TimeoutException e)
        {
            throw new TimeoutException($"{e.Message} The cursor: {where}; from it on: \"{after}\".", e);
        }
    }

    [Fact]
    public async Task Scenario02_Esc_closes_the_palette_with_no_change_and_the_caret_where_it_was()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario02");
        WordActions.PutCaretIn(document, Body, offset: 5);
        var snapshot = DocumentSnapshot.Take(document);
        int caret = Selection(document).Start;

        await palette.OpenAsync();
        Palette.Type("fire");
        await palette.WaitForSelectedRowAsync("Fire strategy");
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForDocumentFocusAsync("after Esc");

        AssertUnchanged(snapshot, document, "after Esc");
        Assert.Equal(caret, (int)Selection(document).Start);
    }

    [Fact]
    public async Task Scenario05_one_Ctrl_Z_restores_the_document_after_each_kind_of_insertion_with_and_without_tracking()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario05");
        foreach (var tracking in new[] { false, true })
        {
            ((dynamic)document).TrackRevisions = tracking;
            foreach (var (kind, select, confirm) in new (string, Action, bool)[]
                     {
                         ("no selection", () => WordActions.PutCaretIn(document, Body), false),
                         ("a selected word", () => SelectFrom(document, Body, 0, 4), false),
                         ("two paragraphs, confirmed", () => SelectAcross(document, "First of two paragraphs.", 5), true),
                     })
            {
                select();
                var snapshot = DocumentSnapshot.Take(document);
                await palette.InsertHereAsync("Scope", confirm: confirm);
                palette.Undo();
                await Wait.UntilAsync(() => Task.FromResult(snapshot.FirstDifference(DocumentSnapshot.Take(document)) is null), Wait.Pane,
                    $"one Ctrl+Z to restore the document ({kind}, tracking {(tracking ? "on" : "off")})");
            }
        }
    }

    [Fact]
    public async Task Scenario12_declined_places_show_their_message_and_change_nothing_while_header_footer_and_text_box_insert()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario12");
        foreach (var (place, message) in new[]
                 {
                     ("Fire strategy", Headings),
                     ("Title of the document", Headings),
                     ("A comment.", "References can't go in comments."),
                 })
        {
            WordActions.PutCaretIn(document, place);
            await DeclinedAsync(palette, document, message, place);
        }

        foreach (var (place, story) in new[] { ("Header text.", WdPrimaryHeaderStory), ("Footer text.", WdPrimaryFooterStory), ("Text box body.", WdTextFrameStory) })
        {
            WordActions.PutCaretIn(document, place);
            var snapshot = DocumentSnapshot.Take(document);
            var inserted = await palette.InsertHereAsync("Scope");
            Assert.All(inserted.Fields.TakeLast(2), f => Assert.Equal((place, story), (place, f.Story)));
            Assert.Equal((place, story), (place, (int)Selection(document).StoryType));
            palette.Undo();
            await Wait.UntilAsync(() => Task.FromResult(snapshot.FirstDifference(DocumentSnapshot.Take(document)) is null), Wait.Pane,
                $"one Ctrl+Z to restore the document after inserting in \"{place}\"");
        }

        WordActions.PutCaretIn(document, Body);
        ((dynamic)document).Protect(WdAllowOnlyReading, false, "");
        await DeclinedAsync(palette, document, "This document is protected", "a protected document");
    }

    [Fact]
    public async Task Scenario13_insertion_works_in_a_caption_a_quote_a_table_cell_and_a_footnote()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario13");
        foreach (var (place, story) in new[]
                 {
                     ("Figure 1 Site plan", WdMainTextStory),
                     ("A quotation.", WdMainTextStory),
                     ("Cell text in the main table.", WdMainTextStory),
                     ("Footnote text.", WdFootnotesStory),
                 })
        {
            var before = DocumentInspector.ReferenceFields(document).Count;
            var inserted = await palette.InsertAsync(place, "Scope");
            Assert.Equal((place, before + 2), (place, DocumentInspector.ReferenceFields(document).Count));
            Assert.Equal((place, story), (place, inserted.Fields.Last().Story));
        }
    }

    [Fact]
    public async Task Scenario18_no_network_requests_leave_localhost_after_the_add_in_has_loaded()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario18");
        var requests = new List<string>();
        Session!.Pane!.Page.Request += (_, request) => requests.Add(request.Url);

        await palette.InsertAsync(Body, "Fire strategy");
        await palette.InsertAsync("Scope body.", "Concrete");

        Assert.All(requests, url => Assert.True(
            url.StartsWith(DevServer.Origin.AbsoluteUri, StringComparison.Ordinal) || url.StartsWith("data:", StringComparison.Ordinal) ||
            url.StartsWith("blob:", StringComparison.Ordinal), $"Request after load: {url}"));
    }

    [Fact]
    public async Task Scenario21_Enter_inserts_where_the_cursor_is_then_and_a_heading_shows_its_message_with_the_palette_kept()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario21");
        WordActions.PutCaretIn(document, Body);
        var before = DocumentInspector.ReferenceFields(document);
        await palette.OpenAsync();
        Palette.Type("Fire strategy");
        await palette.WaitForSelectedRowAsync("Fire strategy");
        WordActions.PutCaretIn(document, "Scope body.");   // the person clicks elsewhere in the document
        Palette.Press(VirtualKeyShort.ENTER);
        await palette.WaitForInsertionAsync(before, "Fire strategy");
        Assert.Contains("§ 4.3 Fire strategyScope body.", MainText(document));

        WordActions.PutCaretIn(document, "Definitions body.");
        await palette.OpenAsync();
        Palette.Type("Fire strategy");
        await palette.WaitForSelectedRowAsync("Fire strategy");
        WordActions.PutCaretIn(document, "Concrete");     // then into a heading
        var snapshot = DocumentSnapshot.Take(document);
        Palette.Press(VirtualKeyShort.ENTER);
        await palette.WaitForMessageAsync(Headings);
        Assert.True(await palette.IsPaletteAsync(), "The palette closed after the heading message.");
        AssertUnchanged(snapshot, document, "Enter with the cursor in a heading");
        Palette.Press(VirtualKeyShort.ESCAPE);
    }

    [Fact]
    public async Task Scenario22_a_tracked_deleted_heading_is_not_listed_and_after_reject_the_leftover_bookmark_is_reused()
    {
        var (palette, document) = await OpenAsync("tracked", "Scenario22");
        WordActions.PutCaretIn(document, "Body under the kept heading.");
        await palette.OpenAsync();
        Palette.Type("Deleted");
        await palette.WaitForMessageAsync("No headings match.");
        Assert.DoesNotContain(await palette.RowsAsync(), row => row.Contains("Deleted heading", StringComparison.Ordinal));
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForDocumentFocusAsync("after Esc");

        var first = await palette.InsertAsync("Body under the kept heading.", "Kept heading");
        ((dynamic)document).Revisions.RejectAll();
        Assert.Empty(DocumentInspector.FieldsTo(document, first.Bookmark));

        var second = await palette.InsertAsync("Body under the kept heading.", "Kept heading");
        Assert.Equal(first.Bookmark, second.Bookmark);
    }

    [Fact]
    public async Task Scenario23_words_are_replaced_a_multi_paragraph_selection_asks_first_and_a_table_is_refused()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario23");

        SelectFrom(document, Body, 0, 8); // "The fire"
        await palette.InsertHereAsync("Fire strategy");
        Assert.Contains("§ 4.3 Fire strategy strategy is described here.", MainText(document));

        SelectAcross(document, "First of two paragraphs.", 5);
        var snapshot = DocumentSnapshot.Take(document);
        int start = Selection(document).Start, end = Selection(document).End;
        var before = DocumentInspector.ReferenceFields(document);
        await palette.OpenAsync();
        Palette.Type("Scope");
        await palette.WaitForSelectedRowAsync("Scope");
        Palette.Press(VirtualKeyShort.ENTER);
        await Wait.UntilAsync(palette.WarningShownAsync, Wait.Pane, "the warning under the selected row");
        AssertUnchanged(snapshot, document, "the first Enter on a multi-paragraph selection");
        Palette.Press(VirtualKeyShort.ESCAPE);
        await Wait.UntilAsync(async () => !await palette.WarningShownAsync(), Wait.Pane, "Esc to dismiss the warning");
        Assert.True(await palette.IsPaletteAsync(), "Esc on the warning closed the palette.");
        Assert.Equal((start, end), ((int)Selection(document).Start, (int)Selection(document).End));
        Palette.Press(VirtualKeyShort.ENTER);
        await Wait.UntilAsync(palette.WarningShownAsync, Wait.Pane, "the warning again");
        Palette.Press(VirtualKeyShort.ENTER);
        await palette.WaitForInsertionAsync(before, "Scope");
        palette.Undo();
        await Wait.UntilAsync(() => Task.FromResult(snapshot.FirstDifference(DocumentSnapshot.Take(document)) is null), Wait.Pane,
            "one Ctrl+Z to restore the replaced paragraphs");

        // A table selected first is declined as the palette opens (owner's decision, 2026-10-17)...
        ((dynamic)document).Tables[1].Select();
        await DeclinedAsync(palette, document, TableSelected, "a table selection");

        // ...and one selected while the palette is open is declined at Enter, the palette kept.
        WordActions.PutCaretIn(document, "Definitions body.");   // the body paragraph was changed above
        await palette.OpenAsync();
        Palette.Type("Scope");
        await palette.WaitForSelectedRowAsync("Scope");
        ((dynamic)document).Tables[1].Select();   // the person selects the table, then comes back
        snapshot = DocumentSnapshot.Take(document);
        Palette.Press(VirtualKeyShort.ENTER);
        await palette.WaitForMessageAsync(TableSelected);
        Assert.True(await palette.IsPaletteAsync(), "The palette closed after the table message.");
        AssertUnchanged(snapshot, document, "Enter after selecting a table with the palette open");
        Palette.Press(VirtualKeyShort.ESCAPE);
    }

    [Fact]
    public async Task Scenario25_headings_in_other_stories_carry_their_badge_and_their_references_resolve_and_jump()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario25");
        var others = new[]
        {
            ("Heading in a table cell", "tableCell"),
            ("Heading in a text box", "textBox"),
            ("Heading in a footnote", "footnote"),
            ("Heading in an endnote", "endnote"),
            ("Heading in the header", "header"),
            ("Heading in the footer", "footer"),
        };
        WordActions.PutCaretIn(document, Body);
        await palette.OpenAsync();
        foreach (var (heading, badge) in others) Assert.Equal((heading, badge), (heading, await palette.BadgeOfAsync(heading)));
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForDocumentFocusAsync("after Esc");

        // One body paragraph each: an insertion changes its paragraph's text.
        var places = new[]
        {
            "Scope body.", "Definitions body.", "This specification sets out the requirements.",
            "A quotation.", "First of two paragraphs.", "Second of two paragraphs.",
        };
        var bookmarks = new List<(string Heading, string Bookmark)>();
        foreach (var ((heading, _), place) in others.Zip(places))
        {
            var paragraph = WordActions.Find(document, place).Paragraphs.First;   // its text changes with the insertion
            var inserted = await palette.InsertAsync(place, heading);
            bookmarks.Add((heading, inserted.Bookmark));
            // An unnumbered heading keeps the "§ " of the default format but not the number: "§ 0 …" (T145).
            Assert.Equal((heading, heading), (heading, inserted.Fields[^1].Result));
            string text = WordActions.ParagraphText(paragraph);
            Assert.DoesNotContain("§ 0", text);
            if (heading != "Heading in a footnote") continue;   // known to be unnumbered
            Assert.Single(inserted.Fields);
            Assert.StartsWith("§ " + heading, text);
        }
        Assert.Empty(WordActions.UpdateFields(document));
        Assert.Empty(DocumentInspector.ErrorResults(document));
        foreach (var (heading, bookmark) in bookmarks)
        {
            Assert.Equal((heading, heading), (heading, (string)WordActions.FollowReference(Session!.Word!, bookmark)));
        }
    }

    [Fact]
    public async Task Scenario27_inside_an_existing_reference_Enter_asks_first_then_replaces_the_field_and_one_Ctrl_Z_restores_it()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario27");
        const string paragraph = "References made by Word: see section 1.1 and heading Scope.";
        dynamic field = WordActions.Find(document, paragraph).Paragraphs.First.Range.Fields[1];
        int inside = (int)field.Result.Start + 1;
        string wordBookmark = DocumentInspector.ParseCode((string)field.Code.Text).Bookmark;
        ((dynamic)document).Range(inside, inside).Select();
        var snapshot = DocumentSnapshot.Take(document);
        var before = DocumentInspector.ReferenceFields(document);

        await palette.OpenAsync();
        Palette.Type("Concrete");
        await palette.WaitForSelectedRowAsync("Concrete");
        Palette.Press(VirtualKeyShort.ENTER);
        await Wait.UntilAsync(palette.WarningShownAsync, Wait.Pane, "the field warning");
        await palette.WaitForMessageAsync("The cursor is inside a field.");
        AssertUnchanged(snapshot, document, "the first Enter inside a field");
        Palette.Press(VirtualKeyShort.ESCAPE);
        await Wait.UntilAsync(async () => !await palette.WarningShownAsync(), Wait.Pane, "Esc to dismiss the warning");
        Palette.Press(VirtualKeyShort.ENTER);
        await Wait.UntilAsync(palette.WarningShownAsync, Wait.Pane, "the field warning again");
        Palette.Press(VirtualKeyShort.ENTER);
        var inserted = await palette.WaitForInsertionAsync(before, "Concrete");

        // Word's number reference is gone (its text reference stays); ours took its place.
        Assert.Single(DocumentInspector.FieldsTo(document, wordBookmark));
        Assert.Equal(["3.1", "Concrete"], Results(inserted.Fields));
        palette.Undo();
        await Wait.UntilAsync(() => Task.FromResult(snapshot.FirstDifference(DocumentSnapshot.Take(document)) is null), Wait.Pane,
            "one Ctrl+Z to restore Word's field");
    }

    private async Task DeclinedAsync(Palette palette, object document, string message, string place)
    {
        var snapshot = DocumentSnapshot.Take(document);
        await palette.OpenAsync();
        await palette.WaitForMessageAsync(message);
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForDocumentFocusAsync($"after the message for {place}");
        AssertUnchanged(snapshot, document, $"the palette in {place}");
    }

    /// <summary>Selects <paramref name="length"/> characters from <paramref name="offset"/> into the paragraph <paramref name="text"/>.</summary>
    private static void SelectFrom(object document, string text, int offset, int length)
    {
        dynamic range = WordActions.Find(document, text);
        int start = (int)range.Start + offset;
        range.SetRange(start, start + length);
        range.Select();
    }

    /// <summary>Selects from the start of the paragraph <paramref name="text"/> to <paramref name="into"/> characters into the next one.</summary>
    private static void SelectAcross(object document, string text, int into)
    {
        dynamic first = WordActions.Find(document, text).Paragraphs.First;
        int start = first.Range.Start;
        int end = (int)first.Next().Range.Start + into;
        ((dynamic)document).Range(start, end).Select();
    }
}
