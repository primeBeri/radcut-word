using System.Runtime.InteropServices;
using FlaUI.Core.AutomationElements;
using FlaUI.Core.Input;
using FlaUI.Core.WindowsAPI;
using FlaUI.UIA3;

namespace RadCut.DesktopTests.Infrastructure;

/// <summary>
/// Real keystrokes to Word through UI Automation (FlaUI). Word is brought to the front and checked
/// before every chord; if it cannot be, the chord is not sent (it would land elsewhere).
/// </summary>
public sealed class Keys : IDisposable
{
    private readonly UIA3Automation automation = new();
    private readonly WordSession word;

    public Keys(WordSession word)
    {
        this.word = word;
    }

    /// <summary>Word's document window in front, with keyboard focus in the document.</summary>
    public void FocusDocument()
    {
        var handle = word.MainWindow;
        if (handle == IntPtr.Zero) throw new InvalidOperationException("Word has no main window.");
        var window = automation.FromHandle(handle).AsWindow();
        window.SetForeground();
        Wait.Until(() => GetForegroundWindow() == handle, Wait.Focus, "Word's window to come to the front");
        word.Document.ActiveWindow.SetFocus();
    }

    /// <summary>Presses the keys together, e.g. Ctrl+Shift+Y, after checking Word is in front.</summary>
    public void Chord(params VirtualKeyShort[] keys)
    {
        var handle = word.MainWindow;
        if (GetForegroundWindow() != handle) FocusDocument();
        if (GetForegroundWindow() != handle) throw new InvalidOperationException("Word is not in front; the keystroke was not sent.");
        Keyboard.TypeSimultaneously(keys);
    }

    public void Press(VirtualKeyShort key) => Chord(key);

    /// <summary>The default shortcut, Ctrl+Shift+Y.</summary>
    public void Shortcut() => Chord(VirtualKeyShort.CONTROL, VirtualKeyShort.SHIFT, VirtualKeyShort.KEY_Y);

    /// <summary>Office's host window for a task pane's WebView2 (UI Automation class name).</summary>
    public const string TaskPaneHostClass = "WebView2Holder";

    /// <summary>Word's document window (UI Automation class name).</summary>
    public const string DocumentClass = "_WwG";

    /// <summary>
    /// The UI Automation class of the focused element. Focus inside a task pane is reported on
    /// Office's <see cref="TaskPaneHostClass"/>, not on the element inside the WebView2 (M0
    /// diagnostic, 2026-10-15), so which element has focus inside is read from the page instead.
    /// </summary>
    public string? FocusedClass()
    {
        try
        {
            return automation.FocusedElement()?.ClassName;
        }
        catch (COMException)
        {
            return null;
        }
    }

    /// <summary>The focused element's name, class, framework and control type, for diagnosis.</summary>
    public string FocusedDescription()
    {
        try
        {
            var e = automation.FocusedElement();
            if (e is null) return "(none)";
            string Get(Func<string> read) { try { return read(); } catch (Exception) { return "?"; } }
            return $"name \"{Get(() => e.Name)}\", class \"{Get(() => e.ClassName)}\", framework \"{Get(() => e.FrameworkAutomationElement.FrameworkId.ValueOrDefault ?? "")}\", type {Get(() => e.ControlType.ToString())}, aria \"{Get(() => e.FrameworkAutomationElement.AriaProperties.ValueOrDefault ?? "")}\"";
        }
        catch (COMException)
        {
            return "(unavailable)";
        }
    }

    public void Dispose() => automation.Dispose();

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();
}
