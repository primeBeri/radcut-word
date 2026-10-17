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
    public async Task OpenAsync()
    {
        await WaitUntilHiddenAsync();
        keys.FocusDocument();
        pressedAt = await Pane.NowAsync();
        keys.Shortcut();
        try
        {
            await Wait.UntilAsync(
                async () => keys.FocusedClass() == Keys.TaskPaneHostClass &&
                    ((await Pane.FocusAsync()) == (true, TaskPane.SearchBoxName) || await Pane.Page.Locator(".message-view").CountAsync() == 1),
                Wait.Pane,
                "the pane to take focus after Ctrl+Shift+Y");
        }
        catch (TimeoutException e)
        {
            throw new TimeoutException($"{e.Message} {await StateAsync()}", e);
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
            visibility = $"Ctrl+Shift+Y at {pressedAt}, visibility events [{string.Join(", ", await Pane.VisibilityEventsAsync())}], now {await Pane.NowAsync()}";
        }
        catch (Exception e)
        {
            visibility = $"visibility unreadable ({e.GetType().Name})";
        }
        return $"UI Automation: {keys.FocusedDescription()}; in front: {Keys.ForegroundDescription()}; {page}; {visibility}.";
    }

    /// <summary>When the last Ctrl+Shift+Y was pressed, on the page's clock.</summary>
    private long pressedAt;

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
                await Pane.Page.EvaluateAsync<bool>(
                    "() => document.activeElement?.matches(\"input[type=radio][name='radcut-default-format']:checked\") === true"),
            Wait.Pane,
            $"the settings view with focus on the default format {why}");
    }

    /// <summary>Changes settings with the mouse (clicks through the page), saves, and waits for "Settings saved.".</summary>
    public async Task SaveSettingsAsync(string? defaultFormat = null, bool? allowInHeadings = null, bool? showOutsideMainText = null)
    {
        var view = Pane.Page.Locator(SettingsView);
        if (defaultFormat is not null) await view.GetByRole(AriaRole.Radio, new() { Name = defaultFormat, Exact = true }).CheckAsync();
        if (allowInHeadings is { } allow)
        {
            await view.GetByRole(AriaRole.Checkbox, new() { Name = "Allow references in headings", Exact = true }).SetCheckedAsync(allow);
        }
        if (showOutsideMainText is { } show)
        {
            await view.GetByRole(AriaRole.Checkbox, new() { Name = "Show headings outside the main text", Exact = true }).SetCheckedAsync(show);
        }
        await view.GetByRole(AriaRole.Button, new() { Name = "Save", Exact = true }).ClickAsync();
        await WaitForMessageAsync("Settings saved.");
    }

    /// <summary>A template in the settings view, by its name (its fieldset's legend).</summary>
    private ILocator Template(string name) =>
        Pane.Page.Locator(SettingsView).GetByRole(AriaRole.Group, new() { Name = name, Exact = true });

    /// <summary>Clicks Add template and types the new template's name and text into its fields (FR-018).</summary>
    public async Task AddTemplateAsync(string name, string text)
    {
        var view = Pane.Page.Locator(SettingsView);
        await view.GetByRole(AriaRole.Button, new() { Name = "Add template", Exact = true }).ClickAsync();
        var added = view.GetByRole(AriaRole.Group).Last;
        await added.GetByRole(AriaRole.Textbox, new() { Name = "Template name", Exact = true }).FillAsync(name);
        await added.GetByRole(AriaRole.Textbox, new() { Name = "Template text", Exact = true }).FillAsync(text);
    }

    /// <summary>Replaces the text of the template named <paramref name="name"/>.</summary>
    public Task EditTemplateTextAsync(string name, string text) =>
        Template(name).GetByRole(AriaRole.Textbox, new() { Name = "Template text", Exact = true }).FillAsync(text);

    /// <summary>The live sample preview of the template named <paramref name="name"/>.</summary>
    public Task<string> TemplatePreviewAsync(string name) => Template(name).GetByTestId("template-preview").InnerTextAsync();

    /// <summary>Clicks Delete on the template named <paramref name="name"/>.</summary>
    public Task DeleteTemplateAsync(string name) =>
        Template(name).GetByRole(AriaRole.Button, new() { Name = $"Delete template {name}", Exact = true }).ClickAsync();

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
        var field = Template(template).GetByRole(AriaRole.Textbox, new() { Name = "Template text", Exact = true });
        await Wait.UntilAsync(
            async () => await Template(template).GetByRole(AriaRole.Alert).CountAsync() == 1 &&
                await Template(template).GetByRole(AriaRole.Alert).InnerTextAsync() == error &&
                await field.GetAttributeAsync("aria-invalid") == "true" &&
                await field.EvaluateAsync<bool>("element => element === document.activeElement"),
            Wait.Pane,
            $"\"{error}\" on the template \"{template}\", with focus on its text");
    }

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
