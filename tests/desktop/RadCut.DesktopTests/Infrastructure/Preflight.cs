using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Security.Cryptography.X509Certificates;

namespace RadCut.DesktopTests.Infrastructure;

/// <summary>
/// Checks made before the harness starts anything (contracts/harness-commands.md, research D7, D12).
/// </summary>
public static class Preflight
{
    public const string WordRunningMessage = "Word is running. Save your work and close Word, then run again.";
    public const string CertificateMessage = "The localhost certificate is not trusted. Run npm run certs.";
    public const string NoDesktopMessage = "SKIPPED: no interactive desktop";

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
    /// True when keystrokes can reach Word: the session is interactive and the input desktop is the
    /// normal one (not the lock screen or a secure desktop).
    /// </summary>
    public static bool HasInteractiveDesktop()
    {
        if (!Environment.UserInteractive) return false;
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
