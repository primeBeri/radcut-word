using FlaUI.Core.WindowsAPI;
using XRef.DesktopTests.Infrastructure;

namespace XRef.DesktopTests.Scenarios;

/// <summary>
/// Feature 001's US4 quickstart scenario 10, on the UK layout. The shortcut is the signed-in user's
/// own Office setting, so the tests put it back to the default however they end.
/// </summary>
[Trait("Category", "Scenario")]
public sealed class Us4Scenarios : ScenarioTest
{
    private const string Body = "The fire strategy is described here.";
    private const string NewShortcut = "Ctrl+Alt+J";
    private static readonly VirtualKeyShort[] NewChord = [VirtualKeyShort.CONTROL, VirtualKeyShort.ALT, VirtualKeyShort.KEY_J];
    private static readonly VirtualKeyShort[] OldChord = [VirtualKeyShort.CONTROL, VirtualKeyShort.SHIFT, VirtualKeyShort.KEY_Y];
    private const string CtrlAtRefused = "Ctrl+@ is Word's key for typing accents, so it can't open the palette.";
    private const string WordRefused = "Word wouldn't accept Ctrl+Alt+J and gave no reason. Try another.";
    private const string KeptByWord = "Word kept that combination for one of its own commands. Try another.";

    /// <summary>
    /// US4 scenarios 1, 3 and 4, none of which needs Word to accept a new shortcut; and a combination
    /// Word keeps for itself (Ctrl+B), which never reaches the pane, is reported rather than ignored.
    /// </summary>
    [Fact]
    public async Task Scenario10_the_ribbon_opens_the_same_palette_Ctrl_At_is_refused_and_the_UK_layout_types_nothing()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario10");
        using var layout = KeyboardLayout.ActivateInWord(Session!.Word!, KeyboardLayout.UnitedKingdom);
        var paragraph = WordActions.Find(document, Body).Paragraphs.First;
        int start = (int)paragraph.Range.Start;

        // Scenario 1: the ribbon button gives the palette, focused, and Enter inserts as after the shortcut.
        ((dynamic)document).Range(start, start).Select();
        var before = DocumentInspector.ReferenceFields(document);
        await palette.OpenFromRibbonAsync();
        Palette.Type("Fire strategy");
        await palette.WaitForSelectedRowAsync("Fire strategy");
        Palette.Press(VirtualKeyShort.ENTER);
        var insertion = await palette.WaitForInsertionAsync(before, "Fire strategy");
        Assert.Equal(["REF", "REF"], insertion.Fields.Select(f => f.Type));
        string text = WordActions.ParagraphText(paragraph);
        Assert.StartsWith("§ 4.3 Fire strategy", text);

        // Scenario 4: the default shortcut on the UK layout opens the palette and types nothing.
        await palette.OpenAsync();
        Palette.Press(VirtualKeyShort.ESCAPE);
        await palette.WaitForDocumentFocusAsync("after Esc in the palette");
        Assert.Equal(text, WordActions.ParagraphText(paragraph));

        // Scenario 3: Ctrl+@ (Shift+' on UK) is refused, before Word is asked anything.
        await palette.OpenAsync();
        await palette.OpenSettingsFromPaletteAsync();
        Assert.Equal(Palette.DefaultShortcut, await palette.CurrentShortcutAsync());
        await palette.StartRecordingShortcutAsync();
        var (at, shift) = layout.KeyFor('@');
        palette.Chord(shift ? [VirtualKeyShort.CONTROL, VirtualKeyShort.SHIFT, at] : [VirtualKeyShort.CONTROL, at]);
        await palette.WaitForShortcutRefusedAsync(CtrlAtRefused);
        Assert.Equal(Palette.DefaultShortcut, await palette.CurrentShortcutAsync());

        // Ctrl+B is Word's Bold: Word runs it and the pane sees only Ctrl, so it says Word kept it.
        palette.Chord(VirtualKeyShort.CONTROL, VirtualKeyShort.KEY_B);
        await palette.WaitForShortcutRefusedAsync(KeptByWord);
        Assert.Equal(Palette.DefaultShortcut, await palette.CurrentShortcutAsync());
        Assert.Equal(text, WordActions.ParagraphText(paragraph));
    }

    /// <summary>
    /// US4 scenario 2: a recorded shortcut opens the palette and the old one no longer does. The
    /// harness's Word 2609 refuses every change (research R4); then this checks the refusal names the
    /// combination, recording goes on for another, and Ctrl+Shift+Y still works, and skips the rest.
    /// </summary>
    [Fact]
    public async Task Scenario10_a_recorded_shortcut_opens_the_palette_and_the_old_one_no_longer_does()
    {
        var (palette, document) = await OpenAsync("spec-contract", "Scenario10b");
        using var layout = KeyboardLayout.ActivateInWord(Session!.Word!, KeyboardLayout.UnitedKingdom);
        await palette.RestoreDefaultShortcutAsync();
        try
        {
            var paragraph = WordActions.Find(document, Body).Paragraphs.First;
            WordActions.PutCaretIn(document, Body);
            string text = WordActions.ParagraphText(paragraph);

            await palette.OpenAsync();
            await palette.OpenSettingsFromPaletteAsync();
            await palette.StartRecordingShortcutAsync();
            palette.Chord(NewChord);
            if (await palette.ShortcutChangeRefusedAsync(NewShortcut))
            {
                await palette.WaitForShortcutRefusedAsync(WordRefused);
                Assert.Equal(Palette.DefaultShortcut, await palette.CurrentShortcutAsync());
                Palette.Press(VirtualKeyShort.ESCAPE);
                await palette.CloseSettingsAsync();
                await palette.WaitForPaletteFocusAsync("", "back from settings");
                Palette.Press(VirtualKeyShort.ESCAPE);
                await palette.WaitForDocumentFocusAsync("after Esc in the palette");
                await palette.OpenAsync();
                Palette.Press(VirtualKeyShort.ESCAPE);
                await palette.WaitForDocumentFocusAsync("after Esc in the palette");
                Assert.Equal(text, WordActions.ParagraphText(paragraph));
                HarnessSkip.Because(
                    "Word refused to change the shortcut (Office.actions.replaceShortcuts: InvalidArgument, research R4); " +
                    "the refusal was shown, recording went on, and Ctrl+Shift+Y still opens the palette, but a new shortcut cannot be checked on this Word.");
            }
            await palette.CloseSettingsAsync();
            await palette.WaitForPaletteFocusAsync("", "back from settings");
            Palette.Press(VirtualKeyShort.ESCAPE);
            await palette.WaitForDocumentFocusAsync("after Esc in the palette");

            // The old shortcut does nothing (no pane, no character); the new one opens the palette.
            // Word handles keys in order, so had Ctrl+Shift+Y opened the pane it would have asked first.
            long since = await palette.PressInDocumentAsync(OldChord);
            await palette.OpenWithAsync(NewShortcut, NewChord);
            Assert.Equal(1, await palette.ShowCallsSinceAsync(since));
            Palette.Press(VirtualKeyShort.ESCAPE);
            await palette.WaitForDocumentFocusAsync("after Esc in the palette");
            Assert.Equal(text, WordActions.ParagraphText(paragraph));

            // Reset to default brings Ctrl+Shift+Y back.
            await palette.OpenWithAsync(NewShortcut, NewChord);
            await palette.OpenSettingsFromPaletteAsync();
            await palette.ResetShortcutAsync();
            await palette.WaitForShortcutAsync(Palette.DefaultShortcut);
            await palette.CloseSettingsAsync();
            await palette.WaitForPaletteFocusAsync("", "back from settings");
            Palette.Press(VirtualKeyShort.ESCAPE);
            await palette.WaitForDocumentFocusAsync("after Esc in the palette");
            await palette.OpenAsync();
            Palette.Press(VirtualKeyShort.ESCAPE);
            await palette.WaitForDocumentFocusAsync("after Esc in the palette");
            Assert.Equal(text, WordActions.ParagraphText(paragraph));
        }
        finally
        {
            await palette.RestoreDefaultShortcutAsync();
        }
    }
}
