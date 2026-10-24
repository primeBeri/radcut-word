using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using Microsoft.Win32;

namespace XRef.DesktopTests.Infrastructure;

/// <summary>
/// Checks made before the harness starts anything (contracts/harness-commands.md, research D7, D12).
/// </summary>
public static class Preflight
{
    public const string WordRunningMessage = "Word is running. Save your work and close Word, then run again.";
    public const string CertificateMessage = "The localhost certificate is not trusted. Run npm run certs.";
    public const string NoDesktopMessage = "SKIPPED: no interactive desktop";
    public const string RecoveryMessage =
        "Word will offer to recover a harness scratch document, left by a Word that was stopped, and is busy at start until that is " +
        "dealt with (COM calls fail with 0x8001010A). Open Word once, close the scratch document in the Document Recovery pane " +
        "without saving, close Word, then run again.";

    /// <summary>
    /// Throws if any Word process exists. The harness never closes, kills, reuses or attaches to a
    /// Word it did not start: the owner may have unsaved work open (FR-003).
    /// </summary>
    /// <param name="processesNamed">Looks up processes by name; tests pass a stub, never a real Word.</param>
    public static void RefuseIfWordRunning(Func<string, Process[]>? processesNamed = null)
    {
        var running = (processesNamed ?? Process.GetProcessesByName)("WINWORD");
        try
        {
            if (running.Length > 0) throw new HarnessRefusedException(WordRunningMessage);
        }
        finally
        {
            foreach (var process in running) process.Dispose();
        }
    }

    /// <summary>
    /// Throws if Word holds a document recovery entry for a harness scratch document (2026-10-18):
    /// every Word would then open it as "AutoRecovered" and refuse COM calls. Only reads the entries;
    /// recovering or discarding is the owner's choice in Word.
    /// </summary>
    /// <param name="recoveryEntries">The entries' text; tests pass a stub, never the real registry.</param>
    public static void RefuseIfScratchAwaitsRecovery(Func<IEnumerable<string>>? recoveryEntries = null)
    {
        var scratch = Path.Combine(HarnessPaths.DevRoot, "scratch");
        if ((recoveryEntries ?? DocumentRecoveryEntries)().Any(entry => entry.Contains(scratch, StringComparison.OrdinalIgnoreCase)))
        {
            throw new HarnessRefusedException(RecoveryMessage);
        }
    }

    /// <summary>The values under Word's Resiliency\DocumentRecovery key, decoded (they hold UTF-16 paths).</summary>
    private static IEnumerable<string> DocumentRecoveryEntries()
    {
        using var root = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Office\16.0\Word\Resiliency\DocumentRecovery");
        if (root is null) yield break;
        foreach (var name in root.GetSubKeyNames())
        {
            using var entry = root.OpenSubKey(name);
            if (entry is null) continue;
            foreach (var value in entry.GetValueNames().Select(name => entry.GetValue(name)))
            {
                yield return value is byte[] bytes ? Encoding.Unicode.GetString(bytes) : value?.ToString() ?? "";
            }
        }
    }

    /// <summary>Throws unless the office-addin-dev-certs localhost certificate is in the user's trusted roots.</summary>
    public static void RequireTrustedCertificate()
    {
        var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        var path = Path.Combine(home, ".office-addin-dev-certs", "ca.crt");
        if (!File.Exists(path)) throw new HarnessRefusedException(CertificateMessage);
        using var ca = X509CertificateLoader.LoadCertificateFromFile(path);
        using var store = new X509Store(StoreName.Root, StoreLocation.CurrentUser);
        store.Open(OpenFlags.ReadOnly);
        var found = store.Certificates.Find(X509FindType.FindByThumbprint, ca.Thumbprint, validOnly: false);
        try
        {
            if (found.Count == 0) throw new HarnessRefusedException(CertificateMessage);
        }
        finally
        {
            foreach (var certificate in found) certificate.Dispose();
        }
    }

    /// <summary>
    /// True when keystrokes can reach Word: the session is interactive and not locked, and the input
    /// desktop is the normal one (not a secure desktop). The lock is asked separately because after
    /// Win+L Windows 11 shows the lock screen on the normal desktop for a minute or two before it
    /// switches desktops (T045, 2026-10-16: three tests passed the desktop check behind LockApp).
    /// </summary>
    public static bool HasInteractiveDesktop()
    {
        if (!Environment.UserInteractive || SessionLocked()) return false;
        var desktop = OpenInputDesktop(0, false, DesktopReadObjects);
        if (desktop == IntPtr.Zero) return false;
        try
        {
            var buffer = new char[256];
            return GetUserObjectInformationW(desktop, UoiName, buffer, buffer.Length * sizeof(char), out var needed) &&
                new string(buffer, 0, Math.Max(0, needed / sizeof(char) - 1)) == "Default";
        }
        finally
        {
            CloseDesktop(desktop);
        }
    }

    /// <summary>Skips the running test because keystrokes cannot reach Word; the reason goes to summary.md.</summary>
    public static void SkipWithoutDesktop() => HarnessSkip.Because(NoDesktopMessage);

    /// <summary>
    /// True when this session is locked (WTSSessionInfoEx). WTSINFOEXW: Level at 0, then the level-1
    /// data, 8-byte aligned, with SessionId at 8 and SessionFlags at 16; flags 0 is locked, 1 unlocked.
    /// </summary>
    private static bool SessionLocked()
    {
        if (!WTSQuerySessionInformationW(IntPtr.Zero, CurrentSession, WtsSessionInfoEx, out var buffer, out _)) return false;
        try
        {
            return Marshal.ReadInt32(buffer, 0) == 1 && Marshal.ReadInt32(buffer, 16) == WtsSessionStateLock;
        }
        finally
        {
            WTSFreeMemory(buffer);
        }
    }

    private const int CurrentSession = -1;
    private const int WtsSessionInfoEx = 25;
    private const int WtsSessionStateLock = 0;

    [DllImport("wtsapi32.dll", SetLastError = true)]
    private static extern bool WTSQuerySessionInformationW(IntPtr server, int sessionId, int infoClass, out IntPtr buffer, out int bytes);

    [DllImport("wtsapi32.dll")]
    private static extern void WTSFreeMemory(IntPtr memory);

    private const uint DesktopReadObjects = 0x0001;
    private const int UoiName = 2;

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint desiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool CloseDesktop(IntPtr desktop);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool GetUserObjectInformationW(
        IntPtr handle, int index, [Out] char[] info, int length, out int lengthNeeded);
}

/// <summary>The harness declined to run, for a reason the owner can fix (the message says how).</summary>
public sealed class HarnessRefusedException(string message) : Exception(message);
