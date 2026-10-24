using System.Diagnostics;

namespace RadCut.DesktopTests.Infrastructure;

/// <summary>
/// Condition waits with a time-out, the only way the harness waits (no fixed sleeps, research D8).
/// </summary>
public static class Wait
{
    /// <summary>Word start and sideload.</summary>
    public static readonly TimeSpan WordStart = TimeSpan.FromSeconds(60);

    /// <summary>A task pane condition.</summary>
    public static readonly TimeSpan Pane = TimeSpan.FromSeconds(10);

    /// <summary>Keyboard focus moving after a keystroke.</summary>
    public static readonly TimeSpan Focus = TimeSpan.FromSeconds(2);

    private static readonly object Done = new();
    private static readonly TimeSpan FirstPoll = TimeSpan.FromMilliseconds(20);
    private static readonly TimeSpan LongestPoll = TimeSpan.FromMilliseconds(500);

    /// <summary>Polls <paramref name="condition"/> until it holds or <paramref name="timeout"/> passes.</summary>
    /// <exception cref="TimeoutException">Names <paramref name="description"/> and the time waited.</exception>
    public static void Until(Func<bool> condition, TimeSpan timeout, string description) =>
        UntilAsync(() => Task.FromResult(condition()), timeout, description).GetAwaiter().GetResult();

    /// <inheritdoc cref="Until(Func{bool}, TimeSpan, string)"/>
    public static async Task UntilAsync(Func<Task<bool>> condition, TimeSpan timeout, string description)
    {
        _ = await UntilValueAsync(async () => await condition() ? Done : null, timeout, description);
    }

    /// <summary>
    /// Polls <paramref name="probe"/> until it returns a value (not null), and returns it. An exception
    /// from the probe counts as "not yet"; the last one is kept as the time-out's inner exception.
    /// </summary>
    public static async Task<T> UntilValueAsync<T>(Func<Task<T?>> probe, TimeSpan timeout, string description)
        where T : class
    {
        var clock = Stopwatch.StartNew();
        var delay = FirstPoll;
        Exception? last = null;
        while (true)
        {
            try
            {
                var value = await probe();
                if (value is not null) return value;
            }
            catch (Exception e)
            {
                last = e;
            }
            if (clock.Elapsed >= timeout)
            {
                throw new TimeoutException(
                    $"Timed out after {clock.Elapsed.TotalSeconds:0.0} s waiting for {description}.", last);
            }
            var remaining = timeout - clock.Elapsed;
            await Task.Delay(delay < remaining ? delay : remaining);
            delay = TimeSpan.FromTicks(Math.Min(delay.Ticks * 2, LongestPoll.Ticks));
        }
    }
}
