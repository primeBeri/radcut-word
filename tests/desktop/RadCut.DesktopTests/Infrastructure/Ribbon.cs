using FlaUI.Core.AutomationElements;
using FlaUI.Core.Definitions;
using FlaUI.UIA3;

namespace RadCut.DesktopTests.Infrastructure;

/// <summary>
/// RAD·CUT's own ribbon group on the Home tab, driven through UI Automation (Invoke), which needs
/// no keyboard and no foreground window. Word's References tab has its own "Cross-reference"
/// button, so the search starts from the RAD·CUT group.
/// </summary>
public static class Ribbon
{
    public const string GroupName = "RAD·CUT";
    public const string CrossReference = "Cross-reference";
    public const string Settings = "Settings";

    /// <summary>Invokes a button of the RAD·CUT group, e.g. <see cref="CrossReference"/> to open the pane.</summary>
    public static void Invoke(WordSession word, string buttonName)
    {
        using var automation = new UIA3Automation();
        var window = automation.FromHandle(word.MainWindow);
        var cf = automation.ConditionFactory;
        var group = Wait.UntilValueAsync(
                () => Task.FromResult(window.FindFirstDescendant(cf.ByName(GroupName).And(cf.ByControlType(ControlType.Group)
                    .Or(cf.ByControlType(ControlType.ToolBar))))),
                Wait.WordStart,
                $"the \"{GroupName}\" ribbon group")
            .GetAwaiter().GetResult();
        var button = group.FindFirstDescendant(cf.ByName(buttonName))
            ?? throw new InvalidOperationException($"No \"{buttonName}\" button in the {GroupName} ribbon group.");
        button.Patterns.Invoke.Pattern.Invoke();
    }
}
