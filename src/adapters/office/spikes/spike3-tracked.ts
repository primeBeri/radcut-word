/**
 * Spike 3 — tracked changes (research R9) on tests/fixtures/tracked.docx. Use copies of the
 * fixture: accept-all and reject-all change the document. Co-authoring is checked by hand
 * (docs/acceptance-checklist.md).
 */
import { spike2 } from "./spike2-ref";
import { isHeadingParagraph, type Spike } from "./spike-kit";

const insertNew = spike2.find((s) => s.id === "spike2-insert-new");

export const spike3: readonly Spike[] = [
  {
    id: "spike3-tracking-on",
    label: "Turn change tracking on",
    async run(log) {
      await Word.run(async (context) => {
        context.document.changeTrackingMode = Word.ChangeTrackingMode.trackAll;
        context.document.load("changeTrackingMode");
        await context.sync();
        log("changeTrackingMode", context.document.changeTrackingMode);
      });
    },
  },
  {
    id: "spike3-insert",
    label: "Insert with tracking on (spike 2 path)",
    instructions:
      "tracked.docx has no \"Fire strategy\" heading: open spec-300.docx with tracking on, or rename the target. Count Ctrl+Z presses.",
    async run(log) {
      if (!insertNew) throw new Error("Spike 2 insert path missing.");
      await insertNew.run(log);
    },
  },
  {
    id: "spike3-detect-deleted",
    label: "Detect headings that are tracked deletions",
    async run(log) {
      if (!Office.context.requirements.isSetSupported("WordApi", "1.6")) {
        log("WordApi 1.6 unsupported: fallback is to list such headings with a \"(deleted)\" suffix");
        return;
      }
      await Word.run(async (context) => {
        const paragraphs = context.document.body.paragraphs;
        paragraphs.load("items/text,items/styleBuiltIn,items/outlineLevel");
        await context.sync();
        const headings = paragraphs.items.filter(isHeadingParagraph);
        const changes = headings.map((p) => p.getTrackedChanges());
        changes.forEach((c) => c.load("items/type,items/text"));
        await context.sync();
        log(
          "tracked changes per heading",
          headings.map((p, i) => ({
            heading: p.text,
            changes: changes[i]?.items.map((c) => ({ type: c.type, text: c.text })),
          })),
        );
      });
    },
  },
  {
    id: "spike3-accept-all",
    label: "Accept all tracked changes (use a copy)",
    instructions: "Then F9: does the reference still update?",
    async run(log) {
      await Word.run(async (context) => {
        context.document.body.getTrackedChanges().acceptAll();
        await context.sync();
        log("accepted all");
      });
    },
  },
  {
    id: "spike3-reject-all",
    label: "Reject all tracked changes (use another copy)",
    instructions: "Then run spike 2 \"Compare bookmark ranges\": does the created bookmark survive?",
    async run(log) {
      await Word.run(async (context) => {
        context.document.body.getTrackedChanges().rejectAll();
        await context.sync();
        log("rejected all");
      });
    },
  },
];
