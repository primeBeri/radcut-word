using FlaUI.Core.Input;
using FlaUI.Core.WindowsAPI;

namespace RadCut.DesktopTests.Infrastructure;

/// <summary>What one insertion through the palette added to the document.</summary>
public sealed record Insertion(string Bookmark, IReadOnlyList<ReferenceField> Fields);

/// <summary>
/// The palette driven as a person drives it (layer 5): caret placed, Ctrl+Shift+Y, the query
/// typed, the highlighted row checked, Enter. Needs an interactive desktop.
/// </summary>
public sealed class Palette(PaneSession session)
{
    private WordSession Word => session.Word ?? throw new InvalidOperationException("No Word session.");
    private TaskPane Pane => session.Pane ?? throw new InvalidOperationException($"No task pane: {session.PaneFailure}");

    /// <summary>
    /// Inserts a reference to the heading <paramref name="heading"/> with the default format, the
    /// cursor <paramref name="offset"/> characters into the paragraph <paramref name="at"/>. Fails if
    /// the highlighted row is not that heading, or if Word does not get the reference.
    /// </summary>
    public async Task<Insertion> InsertAsync(string at, string heading, int offset = 0, string? query = null)
    {
        object document = Word.Document;
        var before = DocumentInspector.ReferenceFields(document);
        WordActions.PutCaretIn(document, at, offset);

        using var keys = new Keys(Word);
        keys.FocusDocument();
        keys.Shortcut();
        await Wait.UntilAsync(
            async () => keys.FocusedClass() == Keys.TaskPaneHostClass && (await Pane.FocusAsync()) == (true, TaskPane.SearchBoxName),
            Wait.Pane,
            "the palette's search box to take focus after Ctrl+Shift+Y");

        Keyboard.Type(query ?? heading);
        var selected = Pane.Page.Locator("[role=option][aria-selected=true]");
        await Wait.UntilAsync(
            async () => (await selected.CountAsync()) == 1 && (await selected.InnerTextAsync()).Contains(heading, StringComparison.Ordinal),
            Wait.Pane,
            $"the highlighted row to be \"{heading}\"");
        Keyboard.Press(VirtualKeyShort.ENTER);

        // Word gets the fields, the pane hides and the caret returns to the document.
        List<ReferenceField> after = [];
        await Wait.UntilAsync(
            () => Task.FromResult((after = DocumentInspector.ReferenceFields(document)).Count > before.Count && keys.FocusedClass() == Keys.DocumentClass),
            Wait.Pane,
            $"Word to get the reference to \"{heading}\" and the caret to return to the document");
        // The bookmark the new fields refer to is the one with more references than before (a table
        // of contents also refers to the heading, through PAGEREF fields to its _Toc bookmark).
        var counts = before.GroupBy(f => f.Bookmark).ToDictionary(g => g.Key, g => g.Count());
        var target = after.GroupBy(f => f.Bookmark)
            .SingleOrDefault(g => g.Count() > counts.GetValueOrDefault(g.Key))?.Key
            ?? throw new InvalidOperationException($"No new reference to \"{heading}\" found.");
        return new Insertion(target, DocumentInspector.FieldsTo(document, target));
    }
}
