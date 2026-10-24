namespace RadCut.DesktopTests.Infrastructure;

/// <summary>A REF or PAGEREF field as Word holds it (data-model ReferenceFieldInfo).</summary>
public sealed record ReferenceField(int Story, string Type, string Bookmark, IReadOnlyList<string> Switches, string Result, int Bold, int Italic)
{
    /// <summary>Word's tri-state font values: -1 true, 0 false, 9999999 mixed.</summary>
    public const int True = -1;
}

/// <summary>A bookmark and where it sits relative to its paragraph's text.</summary>
public sealed record BookmarkFact(string Name, int Start, int End, string ParagraphText, string Extent);

/// <summary>
/// Reads a document through Word COM, independently of the add-in (spec FR-021): reference fields
/// with their switches, results and formatting, bookmarks (hidden ones included) with their extent,
/// error results and revisions.
/// </summary>
public static class DocumentInspector
{
    private const int WdFieldRef = 3;
    private const int WdFieldPageRef = 37;

    /// <summary>Every REF and PAGEREF field in every story, in story then document order.</summary>
    public static List<ReferenceField> ReferenceFields(object doc)
    {
        dynamic document = doc;
        var fields = new List<ReferenceField>();
        foreach (dynamic story in WordActions.Stories((object)document))
        {
            int storyType = story.StoryType;
            foreach (dynamic field in story.Fields)
            {
                int type = field.Type;
                if (type != WdFieldRef && type != WdFieldPageRef) continue;
                var (bookmark, switches) = ParseCode((string)field.Code.Text);
                dynamic result = field.Result;
                fields.Add(new ReferenceField(storyType, type == WdFieldRef ? "REF" : "PAGEREF", bookmark, switches,
                    ((string)result.Text).Trim(), (int)result.Font.Bold, (int)result.Font.Italic));
            }
        }
        return fields;
    }

    /// <summary>The fields that refer to <paramref name="bookmark"/>.</summary>
    public static List<ReferenceField> FieldsTo(object document, string bookmark) =>
        ReferenceFields(document).Where(f => f.Bookmark == bookmark).ToList();

    /// <summary>Field results Word shows as errors ("Error! Reference source not found.").</summary>
    public static List<string> ErrorResults(object doc)
    {
        dynamic document = doc;
        var errors = new List<string>();
        foreach (dynamic story in WordActions.Stories((object)document))
        {
            foreach (dynamic field in story.Fields)
            {
                string result = ((string)field.Result.Text).Trim();
                if (result.StartsWith("Error!", StringComparison.Ordinal)) errors.Add($"{((string)field.Code.Text).Trim()}: {result}");
            }
        }
        return errors;
    }

    /// <summary>Every bookmark, hidden ones (_Toc, _Ref, _RC…) included.</summary>
    public static List<BookmarkFact> Bookmarks(object doc)
    {
        dynamic document = doc;
        dynamic bookmarks = document.Bookmarks;
        bookmarks.ShowHidden = true;
        var facts = new List<BookmarkFact>();
        foreach (dynamic bookmark in bookmarks)
        {
            dynamic range = bookmark.Range;
            int start = range.Start, end = range.End;
            dynamic paragraph = range.Paragraphs.First.Range;
            int paragraphStart = paragraph.Start, paragraphEnd = paragraph.End;
            var extent = start == paragraphStart && end == paragraphEnd - 1 ? "text"
                : start == paragraphStart && end == paragraphEnd ? "paragraph"
                : "partial";
            facts.Add(new BookmarkFact((string)bookmark.Name, start, end, WordActions.ParagraphText(range.Paragraphs.First), extent));
        }
        return facts;
    }

    public static int RevisionCount(object document) => (int)((dynamic)document).Revisions.Count;

    /// <summary>
    /// " REF _Ref123 \w \h \* CHARFORMAT " gives ("_Ref123", ["\w", "\h", "\* CHARFORMAT"]): a
    /// format switch keeps its argument.
    /// </summary>
    public static (string Bookmark, List<string> Switches) ParseCode(string code)
    {
        var tokens = code.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var switches = new List<string>();
        for (var i = 2; i < tokens.Length; i++)
        {
            var token = tokens[i];
            if (token is "\\*" or "\\#" or "\\@" && i + 1 < tokens.Length) token = $"{token} {tokens[++i]}";
            switches.Add(token);
        }
        return (tokens.Length > 1 ? tokens[1] : "", switches);
    }
}
