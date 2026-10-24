namespace XRef.DesktopTests.Infrastructure;

/// <summary>
/// Skips the running test and remembers why: xUnit's dynamic skip leaves no reason in
/// <c>TestContext</c>, so <see cref="HarnessTest"/> reads it from here for summary.md. Tests run one
/// at a time (xunit.runner.json), so one slot is enough.
/// </summary>
public static class HarnessSkip
{
    private static string? reason;

    public static void Because(string why)
    {
        Remember(why);
        Assert.Skip(why);
    }

    /// <summary>Keeps the reason without skipping (a skip cannot be caught inside a test).</summary>
    public static void Remember(string why) => reason = why;

    /// <summary>The reason given since the last call, cleared.</summary>
    public static string? Take() => Interlocked.Exchange(ref reason, null);
}
