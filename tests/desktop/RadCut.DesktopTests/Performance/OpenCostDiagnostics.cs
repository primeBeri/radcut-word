using RadCut.DesktopTests.Infrastructure;

namespace RadCut.DesktopTests.Performance;

/// <summary>
/// Not a check: times, on spec-300, the Office.js reads behind the cursor check in variants, and
/// reading before, after or while showing the pane, to see where the palette's open time goes
/// (feature 001 T098). Explicit, so run on request only:
/// --filter-method "*Open_cost*" --explicit only. Results go to summary.md.
/// </summary>
[Trait("Category", "Diagnose")]
public sealed class OpenCostDiagnostics : ScenarioTest
{
    [Fact(Explicit = true)]
    public async Task Open_cost_of_the_cursor_reads_on_spec_300()
    {
        var (_, document) = await OpenAsync("spec-300", "Diagnose-open-cost");
        WordActions.PutCaretIn(document, "The fire strategy is described here.");
        var json = await Session!.Pane!.Page.EvaluateAsync<string>(Script);
        RunSummary.Note($"Open cost (spec-300, median of 7, ms): {json}");
    }

    [Fact(Explicit = true)]
    public async Task Open_cost_of_reading_around_showing_the_pane_on_spec_300()
    {
        var (_, document) = await OpenAsync("spec-300", "Diagnose-open-order");
        WordActions.PutCaretIn(document, "The fire strategy is described here.");
        var json = await Session!.Pane!.Page.EvaluateAsync<string>(OrderScript);
        RunSummary.Note($"Open order (spec-300, median of 7, ms): {json}");
    }

    /// <summary>The cursor read as the gateway does it (two syncs), against showing the pane before, after or alongside.</summary>
    private const string OrderScript = """
        async () => {
          const STYLE = "items/styleBuiltIn,items/outlineLevel,items/tableNestingLevel";
          const read = () => Word.run(async (c) => {
            const s = c.document.getSelection(); s.load("isEmpty");
            c.document.load("protectionType");
            const b = s.parentBody.load("type"); b.parentBodyOrNullObject.load("type");
            const ps = s.paragraphs.load(STYLE); s.tables.load("items"); s.inlinePictures.load("items");
            s.contentControls.load("items"); s.shapes.load("items"); s.parentContentControlOrNullObject.load("type");
            await c.sync();
            const first = ps.items[0];
            first.load("text"); first.fields.load("items");
            c.document.body.getRange("Start").expandTo(first.getRange("Whole")).paragraphs.load(STYLE);
            c.document.body.getTrackedChanges().load("items/type");
            await c.sync();
          });
          const show = () => Office.addin.showAsTaskpane();
          const hide = () => Office.addin.hide();
          const pause = () => new Promise((r) => setTimeout(r, 400));
          const variants = {
            readOnly: async () => { const t = performance.now(); await read(); return performance.now() - t; },
            showOnly: async () => { const t = performance.now(); await show(); return performance.now() - t; },
            showThenRead: async () => { const t = performance.now(); await show(); await read(); return performance.now() - t; },
            readAfterShow: async () => { await show(); const t = performance.now(); await read(); return performance.now() - t; },
            readThenShow: async () => { const t = performance.now(); await read(); await show(); return performance.now() - t; },
            readAlongsideShow: async () => { const t = performance.now(); await Promise.all([show(), read()]); return performance.now() - t; },
          };
          const out = {};
          for (const [name, run] of Object.entries(variants)) {
            const times = [];
            for (let i = 0; i < 7; i++) {
              await hide(); await pause();
              times.push(await run());
            }
            times.sort((a, b) => a - b);
            out[name] = Math.round(times[3]);
          }
          await hide();
          return JSON.stringify(out);
        }
        """;

    private const string Script = """
        async () => {
          const STYLE = "items/styleBuiltIn,items/outlineLevel,items/tableNestingLevel";
          const variants = {
            emptySync: (c) => c.sync(),
            selectionFirstSync: async (c) => {
              const s = c.document.getSelection(); s.load("isEmpty");
              c.document.load("protectionType");
              const b = s.parentBody.load("type"); b.parentBodyOrNullObject.load("type");
              s.paragraphs.load(STYLE); s.tables.load("items"); s.inlinePictures.load("items");
              s.contentControls.load("items"); s.shapes.load("items"); s.parentContentControlOrNullObject.load("type");
              await c.sync();
            },
            beforeStyleFields: async (c) => {
              const first = c.document.getSelection().paragraphs.getFirst();
              c.document.body.getRange("Start").expandTo(first.getRange("Whole")).paragraphs.load(STYLE);
              await c.sync();
            },
            beforeOutlineOnly: async (c) => {
              const first = c.document.getSelection().paragraphs.getFirst();
              c.document.body.getRange("Start").expandTo(first.getRange("Whole")).paragraphs.load("items/outlineLevel");
              await c.sync();
            },
            beforeStyleOnly: async (c) => {
              const first = c.document.getSelection().paragraphs.getFirst();
              c.document.body.getRange("Start").expandTo(first.getRange("Whole")).paragraphs.load("items/styleBuiltIn");
              await c.sync();
            },
            beforeCountOnly: async (c) => {
              const first = c.document.getSelection().paragraphs.getFirst();
              c.document.body.getRange("Start").expandTo(first.getRange("Whole")).paragraphs.load("items");
              await c.sync();
            },
            trackedChanges: async (c) => {
              c.document.body.getTrackedChanges().load("items/type");
              await c.sync();
            },
            allBodyStyleFields: async (c) => {
              c.document.body.paragraphs.load(STYLE);
              await c.sync();
            },
          };
          const out = {};
          for (const [name, run] of Object.entries(variants)) {
            const times = [];
            for (let i = 0; i < 7; i++) {
              const t = performance.now();
              await Word.run(run);
              times.push(performance.now() - t);
            }
            times.sort((a, b) => a - b);
            out[name] = Math.round(times[3]);
          }
          return JSON.stringify(out);
        }
        """;
}
