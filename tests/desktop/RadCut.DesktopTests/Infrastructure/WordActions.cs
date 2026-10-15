using System.Runtime.InteropServices;

namespace RadCut.DesktopTests.Infrastructure;

/// <summary>
/// What a person does in Word, done through Word COM (and a real Ctrl+click): find a paragraph by
/// its text in any story, F9, move a heading, follow a reference. Shared by the contract pane's
/// desktop bridge and the document checks.
/// </summary>
public static class WordActions
{
    private const int WdParagraph = 4;

    /// <summary>Every story range, including each linked header, footer, note and text box story.</summary>
    public static IEnumerable<dynamic> Stories(object doc)
    {
        dynamic document = doc;
        foreach (dynamic first in document.StoryRanges)
        {
            for (dynamic? story = first; story is not null; story = story.NextStoryRange)
            {
                yield return story;
            }
        }
    }

    /// <summary>
    /// The text <paramref name="text"/> where it is a whole paragraph's text (as the contract
    /// harness finds paragraphs), in the main text or in any story. A table of contents line such
    /// as "4.3 Fire strategy 2" is not a match for "Fire strategy".
    /// </summary>
    public static dynamic Find(dynamic document, string text, bool mainOnly = false)
    {
        // Plain object lists: LINQ over `dynamic` COM values fails at run time.
        var stories = new List<object>();
        if (mainOnly)
        {
            object content = document.Content;
            stories.Add(content);
        }
        else
        {
            foreach (object story in Stories((object)document)) stories.Add(story);
            // Comments are not in StoryRanges until one is shown; look there too.
            foreach (dynamic comment in document.Comments)
            {
                object range = comment.Range;
                stories.Add(range);
            }
        }
        foreach (dynamic story in stories)
        {
            dynamic range = story.Duplicate;
            range.Find.ClearFormatting();
            while ((bool)range.Find.Execute(text, true))
            {
                if (ParagraphText(range.Paragraphs.First) == text) return range;
                range.Collapse(0); // wdCollapseEnd: search on from here
            }
        }
        throw new InvalidOperationException($"No paragraph \"{text}\" in any story.");
    }

    /// <summary>A paragraph's text without its mark, cell mark or note reference mark.</summary>
    public static string ParagraphText(dynamic paragraph) =>
        ((string)paragraph.Range.Text).Trim(' ', '\t', '\r', '\n', '\a', '\u0002', '\u0005');

    /// <summary>Puts the cursor <paramref name="offset"/> characters into the paragraph whose text is <paramref name="text"/>.</summary>
    public static void PutCaretIn(dynamic document, string text, int offset = 0)
    {
        dynamic range = Find(document, text);
        int story = range.StoryType;
        // After working in a header or footer Word stays in that view, and selecting body text or a
        // text box then silently leaves the cursor where it was (scenario 12, 2026-10-15).
        if (story is WdMainTextStory or WdTextFrameStory)
        {
            dynamic window = document.ActiveWindow;
            if ((int)window.View.Type == WdPrintView) window.ActivePane.View.SeekView = WdSeekMainDocument;
            else while ((int)window.Panes.Count > 1) window.Panes[(int)window.Panes.Count].Close(); // the header or footer pane of the other views
        }
        int at = (int)range.Start + offset;
        range.SetRange(at, at);
        range.Select();
        dynamic selection = document.Application.Selection;
        if ((int)selection.StoryType != story || (int)selection.Start != at)
        {
            throw new InvalidOperationException(
                $"Could not put the cursor in \"{text}\": it is in story {(int)selection.StoryType} at {(int)selection.Start}, not story {story} at {at}.");
        }
    }

    private const int WdMainTextStory = 1;
    private const int WdTextFrameStory = 5;
    private const int WdSeekMainDocument = 0;
    private const int WdPrintView = 3;

    /// <summary>Select all, F9: updates every field in every story; the indexes of fields that failed, if any.</summary>
    public static List<int> UpdateFields(dynamic document)
    {
        var failed = new List<int>();
        foreach (dynamic story in Stories((object)document))
        {
            int result = story.Fields.Update();
            if (result != 0) failed.Add(result);
        }
        return failed;
    }

    /// <summary>
    /// Moves paragraphs as cut and paste does, so their bookmarks move with them, and returns the
    /// paragraph texts and list numbers around the place they went, for the log.
    /// </summary>
    public static List<string> MoveParagraphs(dynamic document, string text, string before, int paragraphs)
    {
        dynamic source = Find(document, text, mainOnly: true).Paragraphs.First.Range;
        if (paragraphs > 1) source.MoveEnd(WdParagraph, paragraphs - 1);
        dynamic target = Find(document, before, mainOnly: true).Paragraphs.First.Range;
        target.Collapse(1); // wdCollapseStart
        source.Cut();
        target.Paste();
        dynamic moved = Find(document, text, mainOnly: true).Paragraphs.First;
        var around = new List<string>();
        dynamic? paragraph = moved.Previous();
        for (var i = 0; i < 5 && paragraph is not null; i++, paragraph = paragraph.Next())
        {
            string number = paragraph.Range.ListFormat.ListString;
            around.Add($"{number} {ParagraphText(paragraph)}");
        }
        return around;
    }

    /// <summary>Follows the hyperlinked REF to <paramref name="bookmark"/> as Ctrl+click does; the paragraph the cursor lands in.</summary>
    public static string FollowReference(WordSession word, string bookmark)
    {
        dynamic document = word.Document;
        foreach (dynamic story in Stories((object)document))
        {
            foreach (dynamic field in story.Fields)
            {
                string code = field.Code.Text;
                if (!code.Contains(bookmark, StringComparison.Ordinal)) continue;
                // Field.DoClick() leaves the cursor where it was and a REF \h result has no
                // Hyperlinks (contract runs, 2026-10-15), so Ctrl+click the field on screen.
                if (!Preflight.HasInteractiveDesktop()) throw new InvalidOperationException(Preflight.NoDesktopMessage);
                CtrlClick(word, field.Result);
                dynamic selection = document.Application.Selection;
                return ParagraphText(selection.Paragraphs.First);
            }
        }
        throw new InvalidOperationException($"No field refers to {bookmark}.");
    }

    /// <summary>Ctrl+click one character into <paramref name="range"/>, as a person follows a link.</summary>
    private static void CtrlClick(WordSession word, dynamic range)
    {
        dynamic document = word.Document;
        using var keys = new Keys(word);
        keys.FocusDocument();
        dynamic window = document.ActiveWindow;
        // Word.Window.GetPoint fails here ("Command failed", contract runs 2026-10-15), so put the
        // cursor at the start of the reference and click just right of where Windows draws the caret
        // (Word keeps a system caret for accessibility tools): on the first character, which is the
        // whole result when it is one character ("0").
        window.ScrollIntoView(range, true);
        document.Range((int)range.Start, (int)range.Start).Select();
        System.Drawing.Point? point = null;
        Wait.Until(() => (point = CaretOnScreen()) is not null, Wait.Pane, "Word's caret on screen");
        string from = ParagraphText(range.Paragraphs.First);
        using (FlaUI.Core.Input.Keyboard.Pressing(FlaUI.Core.WindowsAPI.VirtualKeyShort.CONTROL))
        {
            FlaUI.Core.Input.Mouse.Click(point!.Value);
        }
        // The click itself puts the cursor in the reference; the jump then moves it to the bookmark.
        try
        {
            // A jump into a note or a header takes Word a moment longer.
            Wait.Until(() => ParagraphText(document.Application.Selection.Paragraphs.First) != from, Wait.Pane,
                "the cursor to leave the reference's paragraph after Ctrl+click");
        }
        catch (TimeoutException)
        {
            // Reported by the caller: it lands where it lands.
        }
    }

    /// <summary>The foreground thread's caret in screen coordinates, or null if none is shown.</summary>
    private static System.Drawing.Point? CaretOnScreen()
    {
        var info = new GuiThreadInfo { Size = Marshal.SizeOf<GuiThreadInfo>() };
        var thread = GetWindowThreadProcessId(GetForegroundWindow(), IntPtr.Zero);
        if (!GetGUIThreadInfo(thread, ref info) || info.Caret == IntPtr.Zero || info.CaretBottom <= info.CaretTop) return null;
        var point = new NativePoint { X = info.CaretLeft + 2, Y = (info.CaretTop + info.CaretBottom) / 2 };
        return ClientToScreen(info.Caret, ref point) ? new System.Drawing.Point(point.X, point.Y) : null;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct GuiThreadInfo
    {
        public int Size;
        public int Flags;
        public IntPtr Active, Focus, Capture, MenuOwner, MoveSize, Caret;
        public int CaretLeft, CaretTop, CaretRight, CaretBottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct NativePoint
    {
        public int X, Y;
    }

    [DllImport("user32.dll")]
    private static extern bool GetGUIThreadInfo(uint thread, ref GuiThreadInfo info);

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr window, IntPtr processId);

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    private static extern bool ClientToScreen(IntPtr window, ref NativePoint point);
}
