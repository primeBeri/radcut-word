using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.Json.Nodes;
using FlaUI.Core.AutomationElements;
using FlaUI.Core.Definitions;
using FlaUI.UIA3;

namespace RadCut.DesktopTests.Infrastructure;

/// <summary>
/// The desktop side of <c>src/dev/desktop-bridge.ts</c>: exposed to the contract pane as
/// <c>__radcutDesktop</c>, it sets up through Word COM and UI Automation the states Office.js
/// cannot (a caret in a comment, protection, a selection in the plain-text control, real
/// keystrokes, Undo, F9, following a hyperlink), so those contract cases run as written.
/// Replies are <c>{ ok: true, value }</c> or <c>{ ok: false, error }</c>.
/// </summary>
public sealed class DesktopBridge(WordSession word)
{
    private const int WdAllowOnlyReading = 3;
    private const int WdNoProtection = -1;
    private const int WdParagraph = 4;
    private const int WdContentControlText = 1;

    /// <summary>Every request handled, for the run's evidence.</summary>
    public List<string> Log { get; } = [];

    public Task<string> HandleAsync(string json)
    {
        lock (Log) Log.Add($"{DateTime.Now:HH:mm:ss.fff} {json}");
        try
        {
            var request = JsonNode.Parse(json)!.AsObject();
            var value = Handle(request["action"]!.GetValue<string>(), request);
            if (value is not null) lock (Log) Log.Add($"  -> {JsonSerializer.Serialize(value)}");
            return Task.FromResult(JsonSerializer.Serialize(new { ok = true, value }));
        }
        catch (Exception e)
        {
            var message = e is COMException com ? $"{com.Message} (0x{com.HResult:X8})" : e.Message;
            lock (Log) Log.Add($"  -> error: {message}");
            return Task.FromResult(JsonSerializer.Serialize(new { ok = false, error = message }));
        }
    }

    private object? Handle(string action, JsonObject request)
    {
        var document = word.Document;
        switch (action)
        {
            case "select":
            {
                var text = request["text"]!.GetValue<string>();
                var start = (int?)request["caretOffset"] ?? 0;
                var length = (int?)request["length"] ?? 0;
                dynamic found = Find(document, text, mainOnly: false);
                int at = found.Start + start;
                found.SetRange(at, at + length);
                found.Select();
                return null;
            }
            case "renewPlainTextControl":
            {
                // The contract harness's restore leaves the plain-text control half there; replace
                // it with a fresh one over the same text. Over a paragraph's whole text Word refuses
                // an inline control, so add it with a spare character after the text, then remove
                // that character, as tests/fixtures/make-fixtures.ps1 does.
                dynamic found = Find(document, request["text"]!.GetValue<string>(), mainOnly: true);
                dynamic old = found.ParentContentControl;
                if (old is not null && (int)old.Type != WdContentControlText) return null; // a rich-text control stays
                if (old is not null) old.Delete(false); // keep the text
                found = Find(document, request["text"]!.GetValue<string>(), mainOnly: true);
                int start = found.Start, end = found.End;
                document.Range(end, end).InsertAfter("#");
                try
                {
                    document.ContentControls.Add(WdContentControlText, document.Range(start, end));
                }
                finally
                {
                    // The control's markers shift positions, so find the spare character again.
                    dynamic spare = document.Range(start, start).Paragraphs.First.Range;
                    spare.Find.ClearFormatting();
                    if ((bool)spare.Find.Execute("#", true)) spare.Delete();
                }
                return null;
            }
            case "protect":
                document.Protect(WdAllowOnlyReading, false, "");
                return null;
            case "unprotect":
                if ((int)document.ProtectionType != WdNoProtection) document.Unprotect("");
                return null;
            case "pressShortcut":
            {
                if (!Preflight.HasInteractiveDesktop()) throw new InvalidOperationException(Preflight.NoDesktopMessage);
                using var keys = new Keys(word);
                keys.FocusDocument();
                keys.Shortcut();
                return null;
            }
            case "clickCrossReference":
                Ribbon.Invoke(word, Ribbon.CrossReference);
                return null;
            case "closePane":
                ClosePane();
                return null;
            case "undo":
                document.Undo(1);
                return null;
            case "updateFields":
            {
                var failed = new List<int>();
                foreach (var story in Stories(document))
                {
                    int result = story.Fields.Update();
                    if (result != 0) failed.Add(result);
                }
                return failed.Count == 0 ? null : new { failedFieldIndexes = failed };
            }
            case "moveParagraphBefore":
                return MoveParagraphs(document, request["text"]!.GetValue<string>(), request["before"]!.GetValue<string>(), (int)request["paragraphs"]!);
            case "followReference":
                return FollowReference(document, request["bookmark"]!.GetValue<string>());
            default:
                throw new ArgumentException($"Unknown desktop action \"{action}\".");
        }
    }

    /// <summary>Every story range, including each linked header, footer, note and text box story.</summary>
    private static IEnumerable<dynamic> Stories(dynamic document)
    {
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
    private static dynamic Find(dynamic document, string text, bool mainOnly)
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
            foreach (object story in Stories(document)) stories.Add(story);
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
    private static string ParagraphText(dynamic paragraph) =>
        ((string)paragraph.Range.Text).Trim(' ', '\t', '\r', '\n', '\a', '\u0002', '\u0005');

    /// <summary>
    /// Moves paragraphs as cut and paste does, so their bookmarks move with them, and returns the
    /// paragraph texts and list numbers around the place they went, for the log.
    /// </summary>
    private static object MoveParagraphs(dynamic document, string text, string before, int paragraphs)
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
        return new { around };
    }

    /// <summary>Follows the hyperlinked REF to <paramref name="bookmark"/> as Ctrl+click does; the paragraph the cursor lands in.</summary>
    private string FollowReference(dynamic document, string bookmark)
    {
        foreach (var story in Stories(document))
        {
            foreach (dynamic field in story.Fields)
            {
                string code = field.Code.Text;
                if (!code.Contains(bookmark, StringComparison.Ordinal)) continue;
                // Field.DoClick() leaves the cursor where it was and a REF \h result has no
                // Hyperlinks (contract runs, 2026-10-15), so Ctrl+click the field on screen.
                if (!Preflight.HasInteractiveDesktop()) throw new InvalidOperationException(Preflight.NoDesktopMessage);
                CtrlClick(document, field.Result);
                dynamic selection = document.Application.Selection;
                return ParagraphText(selection.Paragraphs.First);
            }
        }
        throw new InvalidOperationException($"No field refers to {bookmark}.");
    }

    /// <summary>Ctrl+click in the middle of the first character of <paramref name="range"/>, as a person follows a link.</summary>
    private void CtrlClick(dynamic document, dynamic range)
    {
        using var keys = new Keys(word);
        keys.FocusDocument();
        dynamic window = document.ActiveWindow;
        // Word.Window.GetPoint fails here ("Command failed", contract runs 2026-10-15), so put the
        // cursor one character into the reference and click where Windows draws the caret (Word
        // keeps a system caret for accessibility tools).
        window.ScrollIntoView(range, true);
        document.Range((int)range.Start + 1, (int)range.Start + 1).Select();
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
            Wait.Until(() => ParagraphText(document.Application.Selection.Paragraphs.First) != from, Wait.Focus,
                "the cursor to leave the reference's paragraph after Ctrl+click");
        }
        catch (TimeoutException)
        {
            // Reported by the case: it lands where it lands.
        }
    }

    /// <summary>The middle of the foreground thread's caret in screen coordinates, or null if none is shown.</summary>
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

    /// <summary>Closes RAD·CUT's task pane with its own Close button, as the user's × does.</summary>
    private void ClosePane()
    {
        using var automation = new UIA3Automation();
        var window = automation.FromHandle(word.MainWindow);
        var cf = automation.ConditionFactory;
        // Each task pane has a "Close pane" button (UI Automation, 2026-10-15); RAD·CUT's is the one
        // with the pane titled "RAD·CUT" among its ancestors (the Navigation pane has another).
        foreach (var close in window.FindAllDescendants(cf.ByControlType(ControlType.Button).And(cf.ByName("Close pane"))))
        {
            for (var ancestor = close.Parent; ancestor is not null; ancestor = ancestor.Parent)
            {
                string name;
                try { name = ancestor.Name ?? ""; } catch (Exception) { name = ""; }
                if (!name.Contains(Ribbon.GroupName, StringComparison.Ordinal)) continue;
                close.AsButton().Invoke();
                return;
            }
        }
        // Not found: list what UI Automation shows, to find the pane's own Close button.
        static string Safe(Func<string?> read) { try { return read() ?? ""; } catch (Exception) { return "?"; } }
        var seen = window.FindAllDescendants(cf.ByControlType(ControlType.Button))
            .Select(b => $"\"{Safe(() => b.Name)}\" in \"{Safe(() => b.Parent?.Name)}\" ({Safe(() => b.Parent?.ClassName)})")
            .Where(s => s.Contains("Close", StringComparison.OrdinalIgnoreCase) || s.Contains(Ribbon.GroupName, StringComparison.Ordinal))
            .ToList();
        throw new InvalidOperationException($"No Close button on the RAD·CUT task pane. Buttons seen: {string.Join("; ", seen)}");
    }
}
