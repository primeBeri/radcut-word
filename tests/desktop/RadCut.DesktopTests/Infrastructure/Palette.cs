using FlaUI.Core.Input;
using FlaUI.Core.WindowsAPI;
using Microsoft.Playwright;

namespace RadCut.DesktopTests.Infrastructure;

/// <summary>What one insertion through the palette added to the document.</summary>
public sealed record Insertion(string Bookmark, IReadOnlyList<ReferenceField> Fields);

/// <summary>
/// The palette driven as a person drives it (layer 5): caret placed, Ctrl+Shift+Y, the query
/// typed, the highlighted row checked, Enter or Esc. Needs an interactive desktop.
/// </summary>
public sealed class Palette(PaneSession session) : IDisposable
{
    private readonly Keys keys = new(session.Word ?? throw new InvalidOperationException("No Word session."));

    private WordSession Word => session.Word!;
    private TaskPane Pane => session.Pane ?? throw new InvalidOperationException($"No task pane: {session.PaneFailure}");

    public void Dispose() => keys.Dispose();

    /// <summary>
    /// Ctrl+Shift+Y from the document; waits for the pane to take focus, on the search box (the
    /// palette) or on Close (a message shown instead of the palette).
    /// </summary>
    public Task OpenAsync() => OpenWithAsync(DefaultShortcut, VirtualKeyShort.CONTROL, VirtualKeyShort.SHIFT, VirtualKeyShort.KEY_Y);

    public const string DefaultShortcut = "Ctrl+Shift+Y";

    /// <summary>As <see cref="OpenAsync"/>, with the shortcut <paramref name="name"/> pressed as <paramref name="chord"/>.</summary>
    public async Task OpenWithAsync(string name, params VirtualKeyShort[] chord)
    {
        await WaitUntilHiddenAsync();
        keys.FocusDocument();
        pressedAt = await Pane.NowAsync();
        pressedName = name;
        keys.Chord(chord);
        try
        {
            await Wait.UntilAsync(
                async () => keys.FocusedClass() == Keys.TaskPaneHostClass &&
                    ((await Pane.FocusAsync()) == (true, TaskPane.SearchBoxName) || await Pane.Page.Locator(".message-view").CountAsync() == 1),
                Wait.Pane,
                $"the pane to take focus after {name}");
        }
        catch (TimeoutException e)
        {
            throw new TimeoutException($"{e.Message} {await AssignedShortcutAsync(name)}{await StateAsync()}", e);
        }
    }

    /// <summary>
    /// Office keeps the shortcut per account, so one changed in the owner's own Word is the harness's
    /// too, and the harness's Word refuses to change it back (research R4); say so when it differs.
    /// </summary>
    private async Task<string> AssignedShortcutAsync(string pressed)
    {
        try
        {
            string? assigned = await Pane.Page.EvaluateAsync<string?>("async () => (await Office.actions.getShortcuts()).OpenPalette ?? null");
            return string.Equals(assigned, pressed, StringComparison.OrdinalIgnoreCase)
                ? ""
                : $"The palette's shortcut in this Office account is {assigned ?? "unassigned"}, not {pressed}: reset it to default in RAD·CUT's settings in your own Word. ";
        }
        catch (PlaywrightException)
        {
            return "";
        }
    }

    /// <summary>
    /// Where things stand, for a failure message: Windows focus, the page's focus, and whether the
    /// add-in answered at all (after the pane was hidden its view is empty until an open mounts one).
    /// </summary>
    private async Task<string> StateAsync()
    {
        string page;
        try
        {
            page = await Pane.Page.EvaluateAsync<string>(
                @"() => `page focus ${document.hasFocus()}, active ""${document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName}"", ` +
                    `view ${document.querySelector(""input[aria-label='Search headings']"") ? 'palette' : document.querySelector('.message-view') ? 'message' : 'empty'}, ` +
                    `${document.visibilityState} ${innerWidth}x${innerHeight}`");
        }
        catch (Exception e)
        {
            page = $"page unreadable ({e.GetType().Name})";
        }
        string visibility;
        try
        {
            visibility = $"{pressedName} at {pressedAt}, visibility events [{string.Join(", ", await Pane.VisibilityEventsAsync())}], now {await Pane.NowAsync()}";
        }
        catch (Exception e)
        {
            visibility = $"visibility unreadable ({e.GetType().Name})";
        }
        return $"UI Automation: {keys.FocusedDescription()}; in front: {Keys.ForegroundDescription()}; {page}; {visibility}.";
    }

    /// <summary>When the last shortcut was pressed, on the page's clock, and which.</summary>
    private long pressedAt;

    private string pressedName = DefaultShortcut;

    /// <summary>Presses the keys together in Word, wherever its keyboard focus is (document or pane).</summary>
    public void Chord(params VirtualKeyShort[] chord) => keys.Chord(chord);

    /// <summary>Presses <paramref name="chord"/> in the document, and gives the page's time just before.</summary>
    public async Task<long> PressInDocumentAsync(params VirtualKeyShort[] chord)
    {
        await WaitUntilHiddenAsync();
        keys.FocusDocument();
        long at = await Pane.NowAsync();
        keys.Chord(chord);
        return at;
    }

    /// <summary>How many times the add-in has shown the pane since <paramref name="since"/> (page clock).</summary>
    public Task<int> ShowCallsSinceAsync(long since) => Pane.ShowCallsSinceAsync(since);

    /// <summary>
    /// The ribbon's Cross-reference button from the document; waits for the palette with its search
    /// box focused, in the page and in Windows, as after the shortcut (US4 scenario 1).
    /// </summary>
    public async Task OpenFromRibbonAsync()
    {
        await WaitUntilHiddenAsync();
        Ribbon.Invoke(Word, Ribbon.CrossReference);
        await Wait.UntilAsync(
            async () => keys.FocusedClass() == Keys.TaskPaneHostClass && (await Pane.FocusAsync()) == (true, TaskPane.SearchBoxName),
            Wait.Pane,
            "the palette's search box focused after the ribbon's Cross-reference button");
    }

    /// <summary>
    /// Waits until Office has told the page that the pane is hidden: the add-in clears itself on
    /// that event, which can come after the hide. A Ctrl+Shift+Y pressed before it starts an open
    /// that the late event then cancels, and the pane comes back empty with focus in it (VM,
    /// 2026-10-16). Notes in routes.md how long the wait took when the event was not already there.
    /// </summary>
    public async Task WaitUntilHiddenAsync()
    {
        var clock = System.Diagnostics.Stopwatch.StartNew();
        await Wait.UntilAsync(
            async () => (await Pane.VisibilityEventsAsync()).LastOrDefault()?.EndsWith(" Hidden", StringComparison.Ordinal) == true,
            Wait.Pane,
            "Office to report the pane hidden");
        if (clock.ElapsedMilliseconds > 100)
        {
            RouteReport.Note($"Office reported the pane hidden {clock.ElapsedMilliseconds} ms after the harness was ready for the next Ctrl+Shift+Y.");
        }
    }

    public async Task<bool> IsPaletteAsync() => await Pane.Page.Locator("input[aria-label='Search headings']").CountAsync() == 1;

    /// <summary>Types with real keystrokes into whatever has focus (the search box).</summary>
    public static void Type(string text) => Keyboard.Type(text);

    public static void Press(VirtualKeyShort key) => Keyboard.Press(key);

    /// <summary>Ctrl+Z in the document.</summary>
    public void Undo()
    {
        keys.FocusDocument();
        keys.Chord(VirtualKeyShort.CONTROL, VirtualKeyShort.KEY_Z);
    }

    /// <summary>Waits for the highlighted row to contain <paramref name="text"/>; its inner HTML (to look at highlights).</summary>
    public async Task<string> WaitForSelectedRowAsync(string text)
    {
        var selected = Pane.Page.Locator("[role=option][aria-selected=true]");
        try
        {
            await Wait.UntilAsync(
                async () => await selected.CountAsync() == 1 && (await selected.InnerTextAsync()).Contains(text, StringComparison.Ordinal),
                Wait.Pane,
                $"the highlighted row to be \"{text}\"");
        }
        catch (TimeoutException e)
        {
            string shown;
            try
            {
                shown = await Pane.Page.EvaluateAsync<string>(
                    @"() => `query ""${document.querySelector(""input[aria-label='Search headings']"")?.value ?? '(no palette)'}"", ` +
                        `selected ""${document.querySelector('[role=option][aria-selected=true]')?.innerText ?? ''}"", ` +
                        `status ""${[...document.querySelectorAll('[role=status]')].map((s) => s.innerText).join(' | ')}"", ` +
                        `message ""${document.querySelector('.message-view')?.innerText ?? ''}""`");
            }
            catch (Exception x)
            {
                shown = $"pane unreadable ({x.GetType().Name})";
            }
            dynamic selection = Word.Application.Selection;
            throw new TimeoutException(
                $"{e.Message} Pane: {shown}. Word's selection: story {(int)selection.StoryType}, start {(int)selection.Start}, " +
                $"\"{((string)selection.Paragraphs[1].Range.Text).Trim()}\".", e);
        }
        return await selected.InnerHTMLAsync();
    }

    /// <summary>The texts of the listed rows.</summary>
    public Task<IReadOnlyList<string>> RowsAsync() => Pane.Page.Locator("[role=option]").AllInnerTextsAsync();

    /// <summary>
    /// The accessible names ("4.3 Fire strategy, level 2") of the rows in the list's group
    /// <paramref name="name"/> ("Recent" or "All headings", FR-022); empty when the list has no such group.
    /// </summary>
    public async Task<IReadOnlyList<string>> GroupRowsAsync(string name)
    {
        var rows = Pane.Page.GetByRole(AriaRole.Group, new() { Name = name, Exact = true }).Locator("[role=option]");
        var names = new List<string>();
        foreach (var row in await rows.AllAsync()) names.Add(await row.GetAttributeAsync("aria-label") ?? "");
        return names;
    }

    /// <summary>Waits for the "Recent" group to list exactly <paramref name="expected"/>, in order.</summary>
    public async Task WaitForRecentAsync(params string[] expected)
    {
        IReadOnlyList<string> seen = [];
        await Wait.UntilAsync(
            async () => (seen = await GroupRowsAsync("Recent")).SequenceEqual(expected),
            Wait.Pane,
            $"the Recent group to be [{string.Join(", ", expected)}] (now: [{string.Join(", ", seen)}])");
    }

    /// <summary>The highlighted row's group ("" when the list has none) and accessible name.</summary>
    public async Task<(string Group, string Name)> SelectedInGroupAsync()
    {
        var found = await Pane.Page.EvaluateAsync<string[]>(
            @"() => {
                const row = document.querySelector('[role=option][aria-selected=true]');
                return [row?.closest('[role=group]')?.getAttribute('aria-label') ?? '', row?.getAttribute('aria-label') ?? ''];
            }");
        return (found[0], found[1]);
    }

    /// <summary>Whether the list is grouped (Recent, All headings) at all.</summary>
    public async Task<bool> HasGroupsAsync() => await Pane.Page.Locator("[role=listbox] [role=group]").CountAsync() > 0;

    /// <summary>The badge's location ("tableCell", "footnote", …) on the row for <paramref name="heading"/>, or null.</summary>
    public async Task<string?> BadgeOfAsync(string heading)
    {
        var badge = Pane.Page.Locator("[role=option]", new() { HasText = heading }).Locator(".badge");
        return await badge.CountAsync() == 0 ? null : await badge.First.GetAttributeAsync("data-location");
    }

    /// <summary>Waits for the pane's message (the live region, or the message shown instead of the palette).</summary>
    public async Task<string> WaitForMessageAsync(string expected)
    {
        var status = Pane.Page.Locator("[role=status]");
        var seen = "";
        await Wait.UntilAsync(
            async () => (seen = string.Join(" | ", await status.AllInnerTextsAsync())).Contains(expected, StringComparison.Ordinal),
            Wait.Pane,
            $"the message \"{expected}\" (now: \"{seen}\")");
        return seen;
    }

    /// <summary>Whether the confirmation warning under the selected row is showing.</summary>
    public async Task<bool> WarningShownAsync() => await Pane.Page.Locator("[data-testid=warning-popover]").CountAsync() == 1;

    /// <summary>
    /// Waits for keyboard focus to leave the pane for the document (after Enter, Esc or Close). With
    /// the cursor in a comment or a note, focus goes back to that pane, not to Word's main window.
    /// </summary>
    public async Task WaitForDocumentFocusAsync(string why)
    {
        await Wait.UntilAsync(() => Task.FromResult(FocusLeftPane()), Wait.Pane, $"focus back in the document ({why})");
        await WaitForAddinIdleAsync(why);
    }

    /// <summary>Waits for the add-in to finish (see <see cref="TaskPane.WaitForAddinIdleAsync"/>); notes a slow finish in routes.md.</summary>
    private async Task WaitForAddinIdleAsync(string after)
    {
        var took = await Pane.WaitForAddinIdleAsync();
        // The wait itself needs 100 ms of quiet; anything well beyond that was the add-in still at work.
        if (took > TimeSpan.FromMilliseconds(400)) RouteReport.Note($"The add-in was still busy {took.TotalMilliseconds:0} ms after {after}.");
    }

    private bool FocusLeftPane() => keys.FocusedClass() is { } focused && focused != Keys.TaskPaneHostClass;

    /// <summary>
    /// Inserts a reference to the heading <paramref name="heading"/> with the default format, the
    /// cursor <paramref name="offset"/> characters into the paragraph <paramref name="at"/>. Fails if
    /// the highlighted row is not that heading, or if Word does not get the reference.
    /// </summary>
    public async Task<Insertion> InsertAsync(string at, string heading, int offset = 0, string? query = null)
    {
        WordActions.PutCaretIn(Word.Document, at, offset);
        return await InsertHereAsync(heading, query);
    }

    /// <summary>As <see cref="InsertAsync"/>, with the caret or selection already placed; <paramref name="confirm"/> answers the warning with a second Enter.</summary>
    public async Task<Insertion> InsertHereAsync(string heading, string? query = null, bool confirm = false)
    {
        object document = Word.Document;
        var before = DocumentInspector.ReferenceFields(document);
        await OpenAsync();
        Type(query ?? heading);
        await WaitForSelectedRowAsync(heading);
        Press(VirtualKeyShort.ENTER);
        if (confirm)
        {
            await Wait.UntilAsync(WarningShownAsync, Wait.Pane, "the confirmation warning");
            Press(VirtualKeyShort.ENTER);
        }
        return await WaitForInsertionAsync(before, heading);
    }

    /// <summary>The highlighted row's preview line: the format's name and what Enter would insert.</summary>
    public async Task<(string Label, string Preview)> FormatAsync()
    {
        var strip = Pane.Page.Locator(PreviewLine);
        return (await strip.Locator(".label").InnerTextAsync(), await strip.Locator(".preview").InnerTextAsync());
    }

    /// <summary>The preview line's whole text, including why formats are missing (FR-016a).</summary>
    public Task<string> PreviewLineTextAsync() => Pane.Page.Locator(PreviewLine).InnerTextAsync();

    /// <summary>The preview line sits inside the selected option, so this also checks it is under the highlight.</summary>
    private const string PreviewLine = "[role=option][aria-selected=true] [data-testid=format-preview]";

    /// <summary>Waits for the preview line to show <paramref name="label"/>; its preview.</summary>
    public async Task<string> WaitForFormatAsync(string label)
    {
        var preview = "";
        await Wait.UntilAsync(
            async () =>
            {
                var shown = await FormatAsync();
                preview = shown.Preview;
                return shown.Label == label;
            },
            Wait.Pane,
            $"the format \"{label}\" under the highlighted row");
        return preview;
    }

    /// <summary>Tab, or Shift+Tab when <paramref name="back"/>, with real keystrokes; waits for <paramref name="label"/> and returns its preview.</summary>
    public Task<string> TabToAsync(string label, bool back = false)
    {
        if (back) keys.Chord(VirtualKeyShort.SHIFT, VirtualKeyShort.TAB);
        else keys.Press(VirtualKeyShort.TAB);
        return WaitForFormatAsync(label);
    }

    private const string SettingsView = "[role=region][aria-label=Settings]";

    /// <summary>Whether the settings view is showing.</summary>
    public async Task<bool> IsSettingsAsync() => await Pane.Page.Locator(SettingsView).CountAsync() == 1;

    /// <summary>The settings view's text, explanations included.</summary>
    public Task<string> SettingsTextAsync() => Pane.Page.Locator(SettingsView).InnerTextAsync();

    /// <summary>
    /// The description of the checkbox <paramref name="name"/> in section <paramref name="section"/>,
    /// as a screen reader gets it: the text its aria-describedby names, behind an info button (FR-021a).
    /// </summary>
    public async Task<string> CheckboxDescriptionAsync(string section, string name)
    {
        await ExpandSettingsSectionAsync(section);
        return await Pane.Page.Locator(SettingsView).GetByRole(AriaRole.Checkbox, new() { Name = name, Exact = true }).EvaluateAsync<string>(
            "element => element.getAttribute('aria-describedby').split(' ').map(id => document.getElementById(id)?.textContent ?? '').join(' ')");
    }

    /// <summary>Ctrl+, in the palette; waits for the settings view with keyboard focus on its first control (FR-021a).</summary>
    public async Task OpenSettingsFromPaletteAsync()
    {
        keys.Chord(VirtualKeyShort.CONTROL, VirtualKeyShort.OEM_COMMA);
        await WaitForSettingsAsync("after Ctrl+, in the palette", windowsFocus: true);
    }

    /// <summary>The ribbon's Settings button from the document; waits for the settings view with its first control focused in the page.</summary>
    public async Task OpenSettingsFromRibbonAsync()
    {
        await WaitUntilHiddenAsync();
        Ribbon.Invoke(Word, Ribbon.Settings);
        await WaitForSettingsAsync("after the ribbon's Settings button", windowsFocus: false);
    }

    private async Task WaitForSettingsAsync(string why, bool windowsFocus)
    {
        await Wait.UntilAsync(
            async () => (!windowsFocus || keys.FocusedClass() == Keys.TaskPaneHostClass) &&
                await Pane.Page.EvaluateAsync<bool>("() => document.activeElement?.id === 'radcut-section-formats-toggle'"),
            Wait.Pane,
            $"the settings view with focus on the Formats section {why}");
    }

    /// <summary>Opens the settings section <paramref name="name"/> (Formats, Shortcut or Headings) if it is collapsed (FR-021a).</summary>
    public async Task ExpandSettingsSectionAsync(string name)
    {
        var toggle = Pane.Page.Locator(SettingsView).GetByRole(AriaRole.Button, new() { Name = name, Exact = true });
        if (await toggle.GetAttributeAsync("aria-expanded") != "true") await toggle.ClickAsync();
    }

    /// <summary>Changes settings with the mouse (clicks through the page), saves, and waits for "Settings saved.".</summary>
    public async Task SaveSettingsAsync(
        bool? allowInHeadings = null,
        bool? showOutsideMainText = null,
        bool? rememberLastFormat = null,
        bool? showRecentHeadings = null)
    {
        var view = Pane.Page.Locator(SettingsView);
        if (rememberLastFormat is { } remember)
        {
            await ExpandSettingsSectionAsync("Cross Reference Formats");
            await view.GetByRole(AriaRole.Checkbox, new() { Name = "Remember last used format", Exact = true }).SetCheckedAsync(remember);
        }
        if (allowInHeadings is not null || showOutsideMainText is not null || showRecentHeadings is not null) await ExpandSettingsSectionAsync("Headings");
        if (allowInHeadings is { } allow)
        {
            await view.GetByRole(AriaRole.Checkbox, new() { Name = "Allow cross references in headings", Exact = true }).SetCheckedAsync(allow);
        }
        if (showOutsideMainText is { } show)
        {
            await view.GetByRole(AriaRole.Checkbox, new() { Name = "Show headings outside of the main text", Exact = true }).SetCheckedAsync(show);
        }
        if (showRecentHeadings is { } recent)
        {
            await view.GetByRole(AriaRole.Checkbox, new() { Name = "Show recently used headings", Exact = true }).SetCheckedAsync(recent);
        }
        await view.GetByRole(AriaRole.Button, new() { Name = "Save", Exact = true }).ClickAsync();
        await WaitForMessageAsync("Settings saved.");
    }

    private ILocator FormatList => Pane.Page.Locator(SettingsView).GetByRole(AriaRole.List, new() { Name = "Cross reference formats, in 'Tab' order", Exact = true });

    private ILocator FormatButton(string name) => FormatList.GetByRole(AriaRole.Button, new() { Name = name, Exact = true });

    /// <summary>The format list's names, in Tab order (FR-017).</summary>
    public async Task<IReadOnlyList<string>> FormatListAsync() =>
        (await FormatList.Locator(":scope > li > .name").AllInnerTextsAsync()).Select(name => name.Trim()).ToList();

    /// <summary>Clicks "Move <paramref name="name"/> up" until it is first in the format list.</summary>
    public async Task MoveFormatToTopAsync(string name)
    {
        await ExpandSettingsSectionAsync("Cross Reference Formats");
        var up = FormatButton($"Move {name} up");
        while (await up.IsEnabledAsync()) await up.ClickAsync();
    }

    /// <summary>Adds the built-in format <paramref name="name"/> from the Add format menu (FR-016).</summary>
    public async Task AddFormatAsync(string name)
    {
        await ExpandSettingsSectionAsync("Cross Reference Formats");
        var view = Pane.Page.Locator(SettingsView);
        await view.GetByRole(AriaRole.Button, new() { Name = "Add Default Format", Exact = true }).ClickAsync();
        await view.GetByRole(AriaRole.Menuitem).Filter(new() { Has = Pane.Page.GetByText(name, new() { Exact = true }) }).ClickAsync();
    }

    /// <summary>Clicks "Remove <paramref name="name"/>" in the format list; a template is deleted with it.</summary>
    public async Task RemoveFormatAsync(string name)
    {
        await ExpandSettingsSectionAsync("Cross Reference Formats");
        await FormatButton($"Remove {name}").ClickAsync();
    }

    /// <summary>A template's open editor, by the template's name (its fieldset's legend).</summary>
    private ILocator Template(string name) =>
        Pane.Page.Locator(SettingsView).GetByRole(AriaRole.Group, new() { Name = name, Exact = true });

    /// <summary>Clicks New template and types the new template's name and text into its fields (FR-018).</summary>
    public async Task AddTemplateAsync(string name, string text)
    {
        await ExpandSettingsSectionAsync("Cross Reference Formats");
        var view = Pane.Page.Locator(SettingsView);
        await view.GetByRole(AriaRole.Button, new() { Name = "Add Custom Format", Exact = true }).ClickAsync();
        var added = view.GetByRole(AriaRole.Group).Last;
        await added.GetByRole(AriaRole.Textbox, new() { Name = "Cross reference format name", Exact = true }).FillAsync(name);
        await added.GetByRole(AriaRole.Textbox, new() { Name = "Cross reference format text", Exact = true }).FillAsync(text);
    }

    /// <summary>Opens the editor of the template named <paramref name="name"/> (Edit) and replaces its text.</summary>
    public async Task EditTemplateTextAsync(string name, string text)
    {
        await ExpandSettingsSectionAsync("Cross Reference Formats");
        var edit = FormatButton($"Edit {name}");
        if (await edit.GetAttributeAsync("aria-expanded") != "true") await edit.ClickAsync();
        await Template(name).GetByRole(AriaRole.Textbox, new() { Name = "Cross reference format text", Exact = true }).FillAsync(text);
    }

    /// <summary>The live sample preview in the row of the template named <paramref name="name"/>.</summary>
    public Task<string> TemplatePreviewAsync(string name) =>
        FormatList.GetByRole(AriaRole.Listitem)
            .Filter(new() { Has = Pane.Page.GetByRole(AriaRole.Button, new() { Name = $"Remove {name}", Exact = true }) })
            .GetByTestId("template-preview").InnerTextAsync();

    /// <summary>Removes the template named <paramref name="name"/> from the format list, deleting it.</summary>
    public Task DeleteTemplateAsync(string name) => RemoveFormatAsync(name);

    /// <summary>Clicks Save, saving as it stands, and waits for "Settings saved.".</summary>
    public async Task SaveSettingsAsIsAsync()
    {
        await Pane.Page.Locator(SettingsView).GetByRole(AriaRole.Button, new() { Name = "Save", Exact = true }).ClickAsync();
        await WaitForMessageAsync("Settings saved.");
    }

    /// <summary>
    /// Clicks Save expecting it to be refused: waits for <paramref name="error"/> next to the template text of
    /// <paramref name="template"/>, announced, and for focus to be on that field.
    /// </summary>
    public async Task SaveSettingsRefusedAsync(string template, string error)
    {
        await Pane.Page.Locator(SettingsView).GetByRole(AriaRole.Button, new() { Name = "Save", Exact = true }).ClickAsync();
        var field = Template(template).GetByRole(AriaRole.Textbox, new() { Name = "Cross reference format text", Exact = true });
        await Wait.UntilAsync(
            async () => await Template(template).GetByRole(AriaRole.Alert).CountAsync() == 1 &&
                await Template(template).GetByRole(AriaRole.Alert).InnerTextAsync() == error &&
                await field.GetAttributeAsync("aria-invalid") == "true" &&
                await field.EvaluateAsync<bool>("element => element === document.activeElement"),
            Wait.Pane,
            $"\"{error}\" on the template \"{template}\", with focus on its text");
    }

    private ILocator ShortcutSection =>
        Pane.Page.Locator(SettingsView).GetByRole(AriaRole.Region, new() { Name = "Shortcut", Exact = true });

    /// <summary>The settings view's shortcut once read from Office, e.g. "Ctrl+Shift+Y" or "No shortcut assigned".</summary>
    public async Task<string> CurrentShortcutAsync()
    {
        await ExpandSettingsSectionAsync("Shortcut");
        var current = ShortcutSection.GetByTestId("current-shortcut");
        return await Wait.UntilValueAsync(
            async () => (await current.InnerTextAsync()).Trim() is var text && text != "…" ? text : null,
            Wait.Pane,
            "the settings view to read the shortcut");
    }

    /// <summary>Waits for the settings view to show <paramref name="expected"/> as the shortcut.</summary>
    public async Task WaitForShortcutAsync(string expected) =>
        await Wait.UntilAsync(
            async () => (await ShortcutSection.GetByTestId("current-shortcut").InnerTextAsync()).Trim() == expected,
            Wait.Pane,
            $"the settings view to show the shortcut {expected}");

    /// <summary>Clicks Record new shortcut; waits for it to be recording with keyboard focus, in the page and in Windows.</summary>
    public async Task StartRecordingShortcutAsync()
    {
        await ExpandSettingsSectionAsync("Shortcut");
        var button = ShortcutSection.Locator("button[aria-pressed]");
        await button.ClickAsync();
        await Wait.UntilAsync(
            async () => keys.FocusedClass() == Keys.TaskPaneHostClass &&
                await button.GetAttributeAsync("aria-pressed") == "true" &&
                await button.EvaluateAsync<bool>("element => element === document.activeElement"),
            Wait.Pane,
            "Record new shortcut to be recording, with keyboard focus");
    }

    /// <summary>Waits for <paramref name="error"/> in the shortcut section, still recording.</summary>
    public async Task WaitForShortcutRefusedAsync(string error)
    {
        var alert = ShortcutSection.GetByRole(AriaRole.Alert);
        await Wait.UntilAsync(
            async () => await alert.CountAsync() == 1 && await alert.InnerTextAsync() == error &&
                await ShortcutSection.Locator("button[aria-pressed]").GetAttributeAsync("aria-pressed") == "true",
            Wait.Pane,
            $"\"{error}\" in the shortcut section, still recording");
    }

    /// <summary>Clicks Reset to default in the shortcut section.</summary>
    public async Task ResetShortcutAsync()
    {
        await ExpandSettingsSectionAsync("Shortcut");
        await ShortcutSection.GetByRole(AriaRole.Button, new() { Name = "Reset to default", Exact = true }).ClickAsync();
    }

    /// <summary>
    /// After a combination was recorded: waits until the section shows <paramref name="expected"/>
    /// (false) or an alert instead (true: Word refused, or the combination was).
    /// </summary>
    public async Task<bool> ShortcutChangeRefusedAsync(string expected)
    {
        var current = ShortcutSection.GetByTestId("current-shortcut");
        var alert = ShortcutSection.GetByRole(AriaRole.Alert);
        return await Wait.UntilValueAsync<string>(
            async () => (await current.InnerTextAsync()).Trim() == expected ? "changed" : await alert.CountAsync() == 1 ? "refused" : null,
            Wait.Pane,
            $"the settings view to show {expected} or a refusal") == "refused";
    }

    /// <summary>
    /// Puts the palette's shortcut back to the manifest default straight through Office.js in the
    /// page, so a failed test does not leave the user's roaming shortcut changed. A Word that refuses
    /// changes (InvalidArgument, research R4) has changed nothing to put back.
    /// </summary>
    public Task RestoreDefaultShortcutAsync() =>
        Pane.Page.EvaluateAsync(
            @"async () => {
                try { await Office.actions.replaceShortcuts({ OpenPalette: null }); }
                catch (error) { if (error.code !== 'InvalidArgument') throw error; }
            }");

    /// <summary>Clicks Close in the settings view.</summary>
    public Task CloseSettingsAsync() =>
        Pane.Page.Locator(SettingsView).GetByRole(AriaRole.Button, new() { Name = "Close", Exact = true }).ClickAsync();

    /// <summary>Waits for the palette to have keyboard focus in its search box, holding <paramref name="query"/>.</summary>
    public async Task WaitForPaletteFocusAsync(string query, string why)
    {
        await Wait.UntilAsync(
            async () => keys.FocusedClass() == Keys.TaskPaneHostClass &&
                (await Pane.FocusAsync()) == (true, TaskPane.SearchBoxName) &&
                await Pane.Page.Locator($"input[aria-label='{TaskPane.SearchBoxName}']").InputValueAsync() == query,
            Wait.Pane,
            $"the palette's search box focused with \"{query}\" ({why})");
    }

    /// <summary>Waits for Word to get a new reference and for the caret to return; what it added.</summary>
    public async Task<Insertion> WaitForInsertionAsync(IReadOnlyList<ReferenceField> before, string heading)
    {
        object document = Word.Document;
        List<ReferenceField> after = [];
        await Wait.UntilAsync(
            () => Task.FromResult((after = DocumentInspector.ReferenceFields(document)).Count > before.Count && FocusLeftPane()),
            Wait.Pane,
            $"Word to get the reference to \"{heading}\" and the caret to return to the document");
        await WaitForAddinIdleAsync("an insertion");
        // The bookmark the new fields refer to is the one with more references than before (a table
        // of contents also refers to the heading, through PAGEREF fields to its _Toc bookmark).
        var counts = before.GroupBy(f => f.Bookmark).ToDictionary(g => g.Key, g => g.Count());
        var target = after.GroupBy(f => f.Bookmark)
            .SingleOrDefault(g => g.Count() > counts.GetValueOrDefault(g.Key))?.Key
            ?? throw new InvalidOperationException($"No new reference to \"{heading}\" found.");
        return new Insertion(target, DocumentInspector.FieldsTo(document, target));
    }
}
