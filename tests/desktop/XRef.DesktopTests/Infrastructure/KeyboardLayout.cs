using System.Runtime.InteropServices;
using FlaUI.Core.WindowsAPI;

namespace XRef.DesktopTests.Infrastructure;

/// <summary>
/// A keyboard layout made Word's input language for one test, and Word's previous one restored
/// afterwards (WM_INPUTLANGCHANGEREQUEST to Word's window). Nothing is changed in the user's
/// language list or for the machine; a layout this loads that was not loaded before is unloaded.
/// </summary>
public sealed class KeyboardLayout : IDisposable
{
    /// <summary>The UK layout (KLID 00000809).</summary>
    public const string UnitedKingdom = "00000809";

    private readonly WordSession word;
    private readonly IntPtr previous;
    private readonly bool loadedHere;

    public IntPtr Handle { get; }

    private KeyboardLayout(WordSession word, string klid)
    {
        this.word = word;
        previous = LayoutOf(word);
        var before = LoadedLayouts();
        Handle = LoadKeyboardLayout(klid, 0);
        if (Handle == IntPtr.Zero) throw new InvalidOperationException($"Windows could not load keyboard layout {klid}.");
        loadedHere = !before.Contains(Handle);
        Request(Handle);
    }

    /// <summary>Makes <paramref name="klid"/> Word's input language and waits until Word's thread reports it.</summary>
    public static KeyboardLayout ActivateInWord(WordSession word, string klid) => new(word, klid);

    /// <summary>The virtual key and Shift that type <paramref name="character"/> on this layout, e.g. @ on UK is Shift+'.</summary>
    public (VirtualKeyShort Key, bool Shift) KeyFor(char character)
    {
        short scan = VkKeyScanEx(character, Handle);
        if (scan == -1) throw new InvalidOperationException($"No key types '{character}' on this layout.");
        return ((VirtualKeyShort)(scan & 0xFF), (scan & 0x100) != 0);
    }

    private void Request(IntPtr layout)
    {
        var window = word.MainWindow;
        PostMessage(window, WM_INPUTLANGCHANGEREQUEST, IntPtr.Zero, layout);
        Wait.Until(() => LayoutOf(word) == layout, Wait.Pane, $"Word's input language to become {layout:x}");
    }

    public void Dispose()
    {
        if (!word.HasExited && previous != IntPtr.Zero && LayoutOf(word) != previous) Request(previous);
        if (loadedHere) UnloadKeyboardLayout(Handle);
    }

    private static IntPtr LayoutOf(WordSession word) =>
        GetKeyboardLayout(GetWindowThreadProcessId(word.MainWindow, out _));

    private static HashSet<IntPtr> LoadedLayouts()
    {
        var layouts = new IntPtr[64];
        int count = GetKeyboardLayoutList(layouts.Length, layouts);
        return [.. layouts.Take(count)];
    }

    private const uint WM_INPUTLANGCHANGEREQUEST = 0x0050;

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr LoadKeyboardLayout(string pwszKLID, uint flags);

    [DllImport("user32.dll")]
    private static extern bool UnloadKeyboardLayout(IntPtr hkl);

    [DllImport("user32.dll")]
    private static extern int GetKeyboardLayoutList(int nBuff, [Out] IntPtr[] lpList);

    [DllImport("user32.dll")]
    private static extern IntPtr GetKeyboardLayout(uint idThread);

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    private static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern short VkKeyScanEx(char ch, IntPtr dwhkl);
}
