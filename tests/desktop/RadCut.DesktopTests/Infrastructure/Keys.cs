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

    /// <summary>The accessible name of the element with keyboard focus (UI Automation), if any.</summary>
    public string? FocusedName()
    {
        try
        {
            var name = automation.FocusedElement()?.Name;
            return string.IsNullOrEmpty(name) ? null : name;
        }
        catch (COMException)
        {
            return null;
        }
    }

    public void Dispose() => automation.Dispose();

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();
}
