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
        // Windows may refuse a foreground change from a background process; ask again until it holds.
        try
        {
            Wait.Until(() =>
            {
                if (GetForegroundWindow() != handle) window.SetForeground();
                return GetForegroundWindow() == handle;
            }, Wait.Pane, "Word's window to come to the front");
        }
        catch (TimeoutException e)
        {
            // The screen was locked during the test: a skip, as at the start of one (T045).
            if (!Preflight.HasInteractiveDesktop()) Preflight.SkipWithoutDesktop();
            throw new TimeoutException($"{e.Message} In front instead: {ForegroundDescription()}. Close it and leave the machine alone during the run.", e);
        }
        word.Document.ActiveWindow.SetFocus();
    }

    /// <summary>Presses the keys together, e.g. Ctrl+Shift+Y, after checking Word is in front.</summary>
    public void Chord(params VirtualKeyShort[] keys)
    {
        var handle = word.MainWindow;
        if (GetForegroundWindow() != handle) FocusDocument();
        if (GetForegroundWindow() != handle) throw new InvalidOperationException("Word is not in front; the keystroke was not sent.");
        SendChord(keys);
    }

    /// <summary>
    /// The keys down in order and up in reverse, each with its scan code as a keyboard sends it.
    /// FlaUI sends the virtual key alone, which the pane sees with an empty KeyboardEvent.code,
    /// unlike a real key (found in US4: the add-in reads digits and letters by code).
    /// </summary>
    private static void SendChord(VirtualKeyShort[] keys)
    {
        var inputs = keys.Select(k => KeyInput(k, up: false)).Concat(keys.Reverse().Select(k => KeyInput(k, up: true))).ToArray();
        if (SendInput((uint)inputs.Length, inputs, Marshal.SizeOf<Input>()) != inputs.Length)
            throw new InvalidOperationException($"SendInput was blocked (error {Marshal.GetLastWin32Error()}); the keystroke was not sent.");
    }

    private static Input KeyInput(VirtualKeyShort key, bool up)
    {
        const uint ExtendedKey = 0x1, KeyUp = 0x2, VkToScanCode = 0;
        bool extended = key is VirtualKeyShort.RCONTROL or VirtualKeyShort.RMENU or VirtualKeyShort.INSERT or VirtualKeyShort.DELETE
            or VirtualKeyShort.HOME or VirtualKeyShort.END or VirtualKeyShort.PRIOR or VirtualKeyShort.NEXT
            or VirtualKeyShort.LEFT or VirtualKeyShort.RIGHT or VirtualKeyShort.UP or VirtualKeyShort.DOWN
            or VirtualKeyShort.DIVIDE or VirtualKeyShort.NUMLOCK or VirtualKeyShort.LWIN or VirtualKeyShort.RWIN or VirtualKeyShort.APPS;
        return new Input
        {
            Type = 1,
            Keyboard = new KeyboardInput
            {
                VirtualKey = (ushort)key,
                ScanCode = (ushort)MapVirtualKeyW((uint)key, VkToScanCode),
                Flags = (extended ? ExtendedKey : 0) | (up ? KeyUp : 0),
            },
        };
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
    /// Null when UI Automation cannot say: on the test VM the query sometimes times out while focus
    /// moves into the WebView2, which FlaUI throws as a <see cref="TimeoutException"/> (UIA_E_TIMEOUT).
    /// </summary>
    public string? FocusedClass()
    {
        try
        {
            return automation.FocusedElement()?.ClassName;
        }
        catch (Exception e) when (e is COMException or TimeoutException)
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
        catch (Exception e) when (e is COMException or TimeoutException)
        {
            return "(unavailable)";
        }
    }

    public void Dispose() => automation.Dispose();

    /// <summary>The process and title of the window in front, to say what is in the way.</summary>
    public static string ForegroundDescription()
    {
        var foreground = GetForegroundWindow();
        GetWindowThreadProcessId(foreground, out var id);
        try
        {
            using var process = System.Diagnostics.Process.GetProcessById((int)id);
            return $"{process.ProcessName} \"{process.MainWindowTitle}\"";
        }
        catch (ArgumentException)
        {
            return "(unknown)";
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct KeyboardInput
    {
        public ushort VirtualKey;
        public ushort ScanCode;
        public uint Flags;
        public uint Time;
        public IntPtr ExtraInfo;
    }

    /// <summary>INPUT with the keyboard member; the union is as large as MOUSEINPUT, hence the size.</summary>
    [StructLayout(LayoutKind.Explicit, Size = 40)]
    private struct Input
    {
        [FieldOffset(0)] public uint Type;
        [FieldOffset(8)] public KeyboardInput Keyboard;
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint SendInput(uint count, Input[] inputs, int size);

    [DllImport("user32.dll")]
    private static extern uint MapVirtualKeyW(uint code, uint mapType);

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
}
