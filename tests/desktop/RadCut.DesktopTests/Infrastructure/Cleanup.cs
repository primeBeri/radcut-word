namespace RadCut.DesktopTests.Infrastructure;

/// <summary>Cleanup after a failure must not replace the failure with its own error.</summary>
public static class Cleanup
{
    /// <summary>Runs <paramref name="dispose"/>; an error from it goes to stderr, not up the stack.</summary>
    public static async Task QuietlyAsync(Func<ValueTask> dispose)
    {
        try
        {
            await dispose();
        }
        catch (Exception e)
        {
            Console.Error.WriteLine($"[radcut:harness] cleanup after a failure also failed: {e.GetType().Name}: {e.Message}");
        }
    }
}
