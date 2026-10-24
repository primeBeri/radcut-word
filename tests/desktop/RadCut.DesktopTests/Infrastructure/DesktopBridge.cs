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
                // With the same care for Word's views and panes as the tests' own cursor placing: after
                // a jump into the header a bare Select() into the text box is not what the add-in
                // then reads (contract 9c on the VM, 2026-10-16).
                // The story goes to desktop-bridge.log: which copy of a text was selected.
                return $"story {WordActions.SelectIn(document, request["text"]!.GetValue<string>(), (int?)request["caretOffset"] ?? 0, (int?)request["length"] ?? 0)}";
            }
            case "showTextBoxes":
            {
                return WordActions.ShowTextBoxes(document);
            }
            case "renewPlainTextControl":
            {
                // The contract harness's restore leaves the plain-text control half there; replace
                // it with a fresh one over the same text. Over a paragraph's whole text Word refuses
                // an inline control, so add it with a spare character after the text, then remove
                // that character, as tests/fixtures/make-fixtures.ps1 does.
                dynamic found = WordActions.Find(document, request["text"]!.GetValue<string>(), mainOnly: true);
                dynamic old = found.ParentContentControl;
                if (old is not null && (int)old.Type != WdContentControlText) return null; // a rich-text control stays
                if (old is not null) old.Delete(false); // keep the text
                found = WordActions.Find(document, request["text"]!.GetValue<string>(), mainOnly: true);
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
                var failed = WordActions.UpdateFields(document);
                return failed.Count == 0 ? null : new { failedFieldIndexes = failed };
            }
            case "moveParagraphBefore":
                return new { around = WordActions.MoveParagraphs(document, request["text"]!.GetValue<string>(), request["before"]!.GetValue<string>(), (int)request["paragraphs"]!) };
            case "followReference":
                return WordActions.FollowReference(word, request["bookmark"]!.GetValue<string>());
            default:
                throw new ArgumentException($"Unknown desktop action \"{action}\".");
        }
    }

    /// <summary>Closes XRef's task pane with its own Close button, as the user's × does.</summary>
    private void ClosePane()
    {
        using var automation = new UIA3Automation();
        var window = automation.FromHandle(word.MainWindow);
        var cf = automation.ConditionFactory;
        // Each task pane has a "Close pane" button (UI Automation, 2026-10-15); XRef's is the one
        // with the pane titled "XRef" among its ancestors (the Navigation pane has another).
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
        throw new InvalidOperationException($"No Close button on the XRef task pane. Buttons seen: {string.Join("; ", seen)}");
    }
}
