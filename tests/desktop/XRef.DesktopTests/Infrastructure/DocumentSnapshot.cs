namespace XRef.DesktopTests.Infrastructure;

/// <summary>
/// A comparable picture of a whole document for "unchanged" and Undo checks (data-model
/// DocumentSnapshot): each story's text, every field's code and result, every bookmark's name and
/// place, and every revision. <see cref="FirstDifference"/> names what changed.
/// </summary>
public sealed record DocumentSnapshot(
    IReadOnlyList<string> Stories,
    IReadOnlyList<string> Fields,
    IReadOnlyList<string> Bookmarks,
    IReadOnlyList<string> Revisions)
{
    public static DocumentSnapshot Take(object doc)
    {
        dynamic document = doc;
        var stories = new List<string>();
        var fields = new List<string>();
        foreach (dynamic story in WordActions.Stories(doc))
        {
            int type = story.StoryType;
            stories.Add($"{type}: {(string)story.Text}");
            foreach (dynamic field in story.Fields)
            {
                fields.Add($"{type}: {((string)field.Code.Text).Trim()} => {((string)field.Result.Text).Trim()}");
            }
        }
        // Word moves its own _GoBack bookmark with every edit and Undo; it is not part of the document's content.
        var bookmarks = DocumentInspector.Bookmarks(doc).Where(b => b.Name != "_GoBack")
            .Select(b => $"{b.Name} [{b.Start},{b.End}] {b.ParagraphText}").ToList();
        var revisions = new List<string>();
        foreach (dynamic revision in document.Revisions)
        {
            revisions.Add($"{(int)revision.Type}: {(string)revision.Range.Text}");
        }
        return new DocumentSnapshot(stories, fields, bookmarks, revisions);
    }

    /// <summary>The first difference from <paramref name="other"/>, or null when they are the same.</summary>
    public string? FirstDifference(DocumentSnapshot other)
    {
        foreach (var (name, mine, theirs) in new[]
                 {
                     ("story text", Stories, other.Stories),
                     ("fields", Fields, other.Fields),
                     ("bookmarks", Bookmarks, other.Bookmarks),
                     ("revisions", Revisions, other.Revisions),
                 })
        {
            for (var i = 0; i < Math.Max(mine.Count, theirs.Count); i++)
            {
                var a = i < mine.Count ? mine[i] : "(none)";
                var b = i < theirs.Count ? theirs[i] : "(none)";
                if (a != b) return $"{name} #{i + 1}: was \"{Short(a)}\", now \"{Short(b)}\"";
            }
        }
        return null;
    }

    private static string Short(string text)
    {
        var flat = text.Replace("\r", "\\r").Replace("\a", "\\a");
        return flat.Length <= 160 ? flat : flat[..160] + "…";
    }
}
