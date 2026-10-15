/**
 * Dev-only: in `npm run start:dev-pane` the manifest's task pane URL serves the launcher, which
 * is also the shared runtime. Both ribbon actions just show the pane so the spike and contract
 * panes can be reached. Lives in the adapter layer because it calls Office.js.
 */
await Office.onReady();
// A ribbon command must call event.completed(), or Word treats it as still running and ignores
// later clicks. Shortcuts pass no event.
const show = (event?: Office.AddinCommands.Event) => {
  void Office.addin.showAsTaskpane().finally(() => event?.completed());
};
Office.actions.associate("OpenPalette", show);
Office.actions.associate("OpenSettings", show);

export {};
