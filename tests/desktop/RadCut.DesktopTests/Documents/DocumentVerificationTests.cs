using RadCut.DesktopTests.Infrastructure;

namespace RadCut.DesktopTests.Documents;

/// <summary>
/// M2 (spec US3, FR-021 to FR-023): feature 001's quickstart scenarios 3, 4, 6, 14, 19, 20 and 26.
/// Each inserts through the real palette on a scratch copy and reads the result back through Word
/// itself, independently of the add-in.
/// </summary>
[Trait("Category", "Document")]
public sealed class DocumentVerificationTests : ScenarioTest
{
    private const string Body = "The fire strategy is described here.";

    [Fact]
    public async Task Scenario03_after_moving_the_heading_F9_shows_the_new_number_and_Ctrl_click_jumps_to_it()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario03");
        var inserted = await palette.InsertAsync("Scope body.", "Fire strategy");
        Assert.Equal(["4.3", "Fire strategy"], Results(inserted.Fields));

        WordActions.MoveParagraphs(document, "Fire strategy", "Means of escape", 2);
        Assert.Empty(WordActions.UpdateFields(document));

        Assert.Equal(["4.1", "Fire strategy"], Results(DocumentInspector.FieldsTo(document, inserted.Bookmark)));
        Assert.Equal("Fire strategy", (string)WordActions.FollowReference(Session!.Word!, inserted.Bookmark));
    }

    [Fact]
    public async Task Scenario04_a_second_reference_to_the_same_heading_reuses_its_bookmark()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario04");
        var bookmarksBefore = DocumentInspector.Bookmarks(document).Count;

        var first = await palette.InsertAsync(Body, "Fire strategy");
        var second = await palette.InsertAsync("Scope body.", "Fire strategy");

        Assert.Equal(first.Bookmark, second.Bookmark);
        Assert.StartsWith("_RC", first.Bookmark, StringComparison.Ordinal);
        Assert.Equal(bookmarksBefore + 1, DocumentInspector.Bookmarks(document).Count);
        Assert.Equal(4, DocumentInspector.FieldsTo(document, first.Bookmark).Count);
    }

    [Fact]
    public async Task Scenario06_references_work_in_Word_without_the_add_in()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario06");
        var inserted = await palette.InsertAsync(Body, "Fire strategy");
        string saved = Session!.Scratch!.SaveCopy(Session!.Word!, "saved");
        await CloseAsync(); // also unregisters the add-in

        await using var plain = await WordSession.StartAsync(saved, PaneRoute.B);
        object reopened = plain.Document;
        Assert.Empty(WordActions.UpdateFields(reopened));
        Assert.Empty(DocumentInspector.ErrorResults(reopened));
        Assert.Equal(Results(inserted.Fields), Results(DocumentInspector.FieldsTo(reopened, inserted.Bookmark)));
    }

    [Fact]
    public async Task Scenario14_a_tracked_insertion_survives_accept_all_and_reject_all_breaks_nothing()
    {
        var (palette, document) = await OpenAsync("tracked", "Scenario14");
        var revisionsBefore = DocumentInspector.RevisionCount(document);
        var inserted = await palette.InsertAsync("Body under the kept heading.", "Kept heading");
        Assert.True(DocumentInspector.RevisionCount(document) > revisionsBefore, "The insertion is not tracked.");
        Assert.Equal(["1", "Kept heading"], Results(inserted.Fields));
        string accept = Session!.Scratch!.SaveCopy(Session!.Word!, "accept");
        string reject = Session!.Scratch!.SaveCopy(Session!.Word!, "reject");
        await CloseAsync();

        await using (var word = await WordSession.StartAsync(accept, PaneRoute.B))
        {
            word.Document.Revisions.AcceptAll();
            // tracked.docx keeps Track Changes on, and Word tracks a field update too: the old result
            // stays as a tracked deletion beside the new one ("Kept headingKept heading" in the
            // range's text). Checking the result after accepting is done with tracking off.
            word.Document.TrackRevisions = false;
            object accepted = word.Document;
            Assert.Empty(WordActions.UpdateFields(accepted));
            Assert.Empty(DocumentInspector.ErrorResults(accepted));
            Assert.Equal(["1", "Kept heading"], Results(DocumentInspector.FieldsTo(accepted, inserted.Bookmark)));
        }
        await using (var word = await WordSession.StartAsync(reject, PaneRoute.B))
        {
            word.Document.Revisions.RejectAll();
            object rejected = word.Document;
            Assert.Empty(WordActions.UpdateFields(rejected));
            Assert.Empty(DocumentInspector.ErrorResults(rejected));
            Assert.Empty(DocumentInspector.FieldsTo(rejected, inserted.Bookmark));
        }
    }

    [Fact]
    public async Task Scenario19_a_table_of_contents_bookmark_is_not_reused_and_the_reference_survives_a_TOC_update()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario19");
        Assert.Contains(DocumentInspector.Bookmarks(document), b => b.Name.StartsWith("_Toc", StringComparison.Ordinal) && b.ParagraphText == "Fire strategy");

        var inserted = await palette.InsertAsync(Body, "Fire strategy");
        Assert.StartsWith("_RC", inserted.Bookmark, StringComparison.Ordinal);

        ((dynamic)document).TablesOfContents[1].Update();
        Assert.Empty(WordActions.UpdateFields(document));
        Assert.Equal(["4.3", "Fire strategy"], Results(DocumentInspector.FieldsTo(document, inserted.Bookmark)));
        Assert.Contains(DocumentInspector.Bookmarks(document), b => b.Name == inserted.Bookmark && b.ParagraphText == "Fire strategy");
    }

    [Fact]
    public async Task Scenario20_a_reference_takes_the_formatting_around_it_not_the_heading_s_and_keeps_it_after_F9()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario20");
        // Mid-text: at the very start of a paragraph Word takes no surrounding formatting (FR-012a).
        var bold = await palette.InsertAsync("Bold body text.", "Heading with bold word", offset: 4);
        var italic = await palette.InsertAsync("Italic body text.", "Heading with bold word", offset: 4);

        // Both go to the same heading, so to one bookmark: the bold paragraph's two fields come first.
        Assert.Equal(bold.Bookmark, italic.Bookmark);
        void Check(string when)
        {
            var fields = DocumentInspector.FieldsTo(document, bold.Bookmark);
            Assert.Equal(4, fields.Count);
            Assert.All(fields.Take(2), f => Assert.Equal((when, "bold", ReferenceField.True, 0), (when, "bold", f.Bold, f.Italic)));
            Assert.All(fields.Skip(2), f => Assert.Equal((when, "italic", 0, ReferenceField.True), (when, "italic", f.Bold, f.Italic)));
        }

        Check("as inserted");
        Assert.Empty(WordActions.UpdateFields(document));
        Check("after F9");
    }

    [Fact]
    public async Task Scenario26_references_match_Word_s_own_cross_reference_dialog()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario26");
        // spec-contract carries two references made with Word's own dialog to "Scope" (A): number and text.
        var word = DocumentInspector.ReferenceFields(document).Where(f => f.Bookmark.StartsWith("_Ref", StringComparison.Ordinal)).ToList();
        Assert.Equal(2, word.Count);
        var wordBookmark = Assert.Single(DocumentInspector.Bookmarks(document), b => b.Name == word[0].Bookmark);

        var b = await palette.InsertAsync(Body, "Concrete");   // B: no usable bookmark yet
        var a = await palette.InsertAsync("Definitions body.", "Scope"); // A: Word's _Ref is reused

        Assert.StartsWith("_RC", b.Bookmark, StringComparison.Ordinal);
        Assert.Equal(wordBookmark.Name, a.Bookmark);
        var bBookmark = Assert.Single(DocumentInspector.Bookmarks(document), m => m.Name == b.Bookmark);
        Assert.Equal(wordBookmark.Extent, bBookmark.Extent);

        // Same field types; switches as Word's except by design: \w for Word's \r, and \* CHARFORMAT added (research R5).
        static string[] AsWords(IEnumerable<string> switches) =>
            switches.Where(s => s != "\\* CHARFORMAT" && s != "\\* MERGEFORMAT").Select(s => s == "\\r" ? "\\w" : s).Order().ToArray();
        var ours = DocumentInspector.FieldsTo(document, a.Bookmark).Where(f => f.Switches.Contains("\\* CHARFORMAT")).ToList();
        Assert.Equal(2, ours.Count);
        Assert.All(ours.Concat(word), f => Assert.Equal("REF", f.Type));
        Assert.Equal(word.Select(f => string.Join(' ', AsWords(f.Switches))).Order(), ours.Select(f => string.Join(' ', AsWords(f.Switches))).Order());

        // Word's own bookmark and fields are untouched (both insertions come after "Scope").
        Assert.Equal(wordBookmark, DocumentInspector.Bookmarks(document).Single(m => m.Name == wordBookmark.Name));
        Assert.Equal(
            word.Select(f => string.Join(' ', f.Switches)),
            DocumentInspector.FieldsTo(document, wordBookmark.Name).Where(f => !f.Switches.Contains("\\* CHARFORMAT")).Select(f => string.Join(' ', f.Switches)));
    }
}
