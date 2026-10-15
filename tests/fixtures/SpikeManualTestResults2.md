1. Find free three-key shortcuts: paste the three log lines.

Result:

[16:32:33.645] Requirement sets {
 "WordApi 1.3": true,
 "WordApi 1.4": true,
 "WordApi 1.5": true,
 "WordApi 1.6": true,
 "WordApiDesktop 1.2": true,
 "WordApiDesktop 1.4": true,
 "SharedRuntime 1.1": true,
 "KeyboardShortcuts 1.1": true,
 "DialogApi 1.2": true
}
[16:32:33.645] Focus probe installed: press the shortcut in the document, or the ribbon button
[16:32:47.901] ▶ spike1-free-shortcuts
[16:32:47.905] Ctrl+Alt: free keys (15/36) A B E J Q R T W X 0 4 6 7 8 9
[16:32:47.906] Ctrl+Shift: free keys (11/36) C Y 0 1 2 3 4 5 6 7 9
[16:32:47.907] Alt+Shift: free keys (11/36) B G H J Q S V W Y Z 0
[16:32:47.907] ✓ spike1-free-shortcuts

2. Insert all seven formats → "Heading with bold word" with \* CHARFORMAT: run it once with the caret in "Bold body text." and once in "Italic body text.". Check that every part, including the heading text, matches the surrounding formatting before and after Ctrl+A, F9.

Result: All parts match surrounding format

3. Rerun 1.7 with the caret inside the comment and inside the footnote.

Result:
[16:37:16.081] ▶ spike1-selection
[16:37:16.084] selection facts {
 "text": "",
 "isEmpty": true,
 "parentBodyType": "Unknown",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "Other",
 "firstOutlineLevel": 10,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[16:37:16.084] ✓ spike1-selection
[16:38:01.577] ▶ spike1-selection
[16:38:01.579] selection facts {
 "text": "",
 "isEmpty": true,
 "parentBodyType": "Footnote",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "FootnoteText",
 "firstOutlineLevel": 10,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[16:38:01.579] ✓ spike1-selection

4. Rerun 3.4 on a fresh spec-300.docx copy:
   a. Click Turn change tracking on.
   b. Click Insert with tracking on.
   c. Click Reject all.
   d. Click Compare bookmark ranges. Note whether the reference has gone and whether a _RC… bookmark is still on "Fire strategy".
   
Result: Reference has gone, _RC bookmark still on fire strategy

```log
 {
  "heading": "Fire strategy",
  "bookmark": "_Toc242545907",
  "relation": "Equal"
 },
 {
  "heading": "Fire strategy",
  "bookmark": "_RCtmlm6oh14g",
  "relation": "Equal"
 },
 {
  "heading": "Heading with bold word",
  "bookmark": "_Toc242545908",
  "relation": "Equal"
 },
 ```
   
5. Ribbon retest: run npm stop, close Word, run npm run start:dev-pane -- --document "$env:TEMP\radcut-spikes\spec-300.docx", then click the ribbon's Cross-reference button. It did nothing last time.

Result: Initial ribbon button click opens pane. But if you close it, the buttons do nothing, only ctrl+alt+k brings it back

