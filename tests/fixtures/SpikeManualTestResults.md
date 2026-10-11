# 1.1

On first use of Ctrl-alt-k warns about duplicate keyboard shortcut and prompts to select which.

```log
[09:51:16.933] ▶ spike1-shortcuts
[09:51:16.937] getShortcuts {
 "OpenPalette": "Ctrl+Alt+K"
}
[09:51:16.938] areShortcutsInUse [
 {
  "shortcut": "Ctrl+Alt+K",
  "inUse": true
 },
 {
  "shortcut": "Ctrl+Shift+Alt+K",
  "inUse": false
 }
]
[09:51:16.938] ✓ spike1-shortcuts
[09:51:28.953] OpenPalette fired {
 "surface": "taskpane"
}
[09:51:28.962] after showAsTaskpane + focus() {
 "activeElementIsProbe": true,
 "documentHasFocus": false,
 "msToShow": 7
}
[09:51:28.973] Word selection unchanged by showing the pane true
[09:51:28.973] Now type without clicking: keystrokes must appear in the probe log with clickedSinceShow=false
```

# 1.2

```log
[09:53:27.579] probe keydown {
 "key": "Escape",
 "ctrl": false,
 "alt": false,
 "shift": false,
 "msSinceShow": 10206,
 "clickedSinceShow": true
}
[09:53:27.624] hidden and range.select() called: type now and check the text lands in the document
[09:53:38.011] OpenPalette fired {
 "surface": "taskpane"
}
[09:53:38.033] after showAsTaskpane + focus() {
 "activeElementIsProbe": true,
 "documentHasFocus": false,
 "msToShow": 21
}
[09:53:38.049] Word selection unchanged by showing the pane true
[09:53:38.049] Now type without clicking: keystrokes must appear in the probe log with clickedSinceShow=false
[09:53:39.419] probe keydown {
 "key": "a",
 "ctrl": false,
 "alt": false,
 "shift": false,
 "msSinceShow": 1407,
 "clickedSinceShow": false
}
[09:53:39.627] probe keydown {
 "key": "b",
 "ctrl": false,
 "alt": false,
 "shift": false,
 "msSinceShow": 1615,
 "clickedSinceShow": false
}
[09:53:39.867] probe keydown {
 "key": "c",
 "ctrl": false,
 "alt": false,
 "shift": false,
 "msSinceShow": 1855,
 "clickedSinceShow": false
}
```

# 1.3

Yes land in original caret position

# 1.4

Ribbon button unresponsive. Ctrl-Alt-K opens up correctly

# 1.5

No reaction in word

[09:59:32.306] probe keydown {
 "key": "Control",
 "ctrl": true,
 "alt": false,
 "shift": false,
 "msSinceShow": 15488,
 "clickedSinceShow": true
}
[09:59:32.657] probe keydown {
 "key": ",",
 "ctrl": true,
 "alt": false,
 "shift": false,
 "msSinceShow": 15839,
 "clickedSinceShow": true
}
[09:59:32.657] Ctrl+, reached the page (check that Word did nothing)
[09:59:55.745] probe keydown {
 "key": "Control",
 "ctrl": true,
 "alt": false,
 "shift": false,
 "msSinceShow": 38927,
 "clickedSinceShow": true
}
[09:59:56.177] probe keydown {
 "key": ";",
 "ctrl": true,
 "alt": false,
 "shift": false,
 "msSinceShow": 39359,
 "clickedSinceShow": true
}

# 1.6

Keyboard was already english in previous test. AltGr seems to work fine:

```
[10:06:06.248] probe keydown {
 "key": "Escape",
 "ctrl": false,
 "alt": false,
 "shift": false,
 "msSinceShow": 7981,
 "clickedSinceShow": true
}
[10:06:06.299] hidden and range.select() called: type now and check the text lands in the document
[10:06:09.480] OpenPalette fired {
 "surface": "taskpane"
}
[10:06:09.502] after showAsTaskpane + focus() {
 "activeElementIsProbe": true,
 "documentHasFocus": false,
 "msToShow": 20
}
[10:06:09.517] Word selection unchanged by showing the pane true
[10:06:09.517] Now type without clicking: keystrokes must appear in the probe log with clickedSinceShow=false
[10:06:13.016] probe keydown {
 "key": "Escape",
 "ctrl": false,
 "alt": false,
 "shift": false,
 "msSinceShow": 3533,
 "clickedSinceShow": true
}
[10:06:13.058] hidden and range.select() called: type now and check the text lands in the document
[10:06:18.520] OpenPalette fired {
 "surface": "taskpane"
}
[10:06:18.542] after showAsTaskpane + focus() {
 "activeElementIsProbe": true,
 "documentHasFocus": false,
 "msToShow": 21
}
[10:06:18.561] Word selection unchanged by showing the pane true
[10:06:18.561] Now type without clicking: keystrokes must appear in the probe log with clickedSinceShow=false
```

# 1.7

Read Selection Facts:

```log
[10:08:52.191] ▶ spike1-selection
[10:08:52.194] selection facts {
 "text": "Topic 64.1 body.\r",
 "isEmpty": false,
 "parentBodyType": "MainDoc",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "Normal",
 "firstOutlineLevel": 10,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:08:52.194] ✓ spike1-selection
[10:09:15.520] ▶ spike1-selection
[10:09:15.523] selection facts {
 "text": "p",
 "isEmpty": false,
 "parentBodyType": "MainDoc",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "Heading2",
 "firstOutlineLevel": 2,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:09:15.523] ✓ spike1-selection
[10:09:32.808] ▶ spike1-selection
[10:09:32.810] selection facts {
 "text": "Chapter 63\r",
 "isEmpty": false,
 "parentBodyType": "MainDoc",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "Heading1",
 "firstOutlineLevel": 1,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:09:32.810] ✓ spike1-selection
[10:09:50.498] ▶ spike1-selection
[10:09:50.500] selection facts {
 "text": "\u0002 Heading in an endnote",
 "isEmpty": false,
 "parentBodyType": "Endnote",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "Heading1",
 "firstOutlineLevel": 1,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:09:50.500] ✓ spike1-selection
[10:09:54.690] ▶ spike1-selection
[10:09:54.692] selection facts {
 "text": "Endnote text.",
 "isEmpty": false,
 "parentBodyType": "Endnote",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "EndnoteText",
 "firstOutlineLevel": 10,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:09:54.692] ✓ spike1-selection
[10:10:00.379] ▶ spike1-selection
[10:10:00.381] selection facts {
 "text": "Title of the document\r",
 "isEmpty": false,
 "parentBodyType": "MainDoc",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "Title",
 "firstOutlineLevel": 10,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:10:00.381] ✓ spike1-selection
[10:10:05.013] ▶ spike1-selection
[10:10:05.015] selection facts {
 "text": "Subtitle of the document\r",
 "isEmpty": false,
 "parentBodyType": "MainDoc",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "Subtitle",
 "firstOutlineLevel": 10,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:10:05.015] ✓ spike1-selection
[10:10:11.605] OpenPalette fired {
 "surface": "taskpane"
}
[10:10:11.659] after showAsTaskpane + focus() {
 "activeElementIsProbe": true,
 "documentHasFocus": false,
 "msToShow": 5
}
[10:10:11.675] Word selection unchanged by showing the pane true
[10:10:11.675] Now type without clicking: keystrokes must appear in the probe log with clickedSinceShow=false
[10:10:14.798] ▶ spike1-selection
[10:10:14.800] selection facts {
 "text": "Topic 76.3\rTopic 76.3 body.\r",
 "isEmpty": false,
 "parentBodyType": "MainDoc",
 "parentOfBodyType": null,
 "paragraphCount": 2,
 "firstStyle": "Heading2",
 "firstOutlineLevel": 2,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:10:14.800] ✓ spike1-selection
[10:10:42.946] ▶ spike1-selection
[10:10:42.952] selection facts {
 "text": "Heading in the footer\r",
 "isEmpty": false,
 "parentBodyType": "Footer",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "Heading1",
 "firstOutlineLevel": 1,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:10:42.952] ✓ spike1-selection
[10:10:48.111] ▶ spike1-selection
[10:10:48.113] selection facts {
 "text": "Footer text.\r",
 "isEmpty": false,
 "parentBodyType": "Footer",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "Footer",
 "firstOutlineLevel": 10,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:10:48.113] ✓ spike1-selection
[10:10:53.523] ▶ spike1-selection
[10:10:53.528] selection facts {
 "text": "Heading in the header\r",
 "isEmpty": false,
 "parentBodyType": "Header",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "Heading1",
 "firstOutlineLevel": 1,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:10:53.528] ✓ spike1-selection
[10:10:56.777] ▶ spike1-selection
[10:10:56.779] selection facts {
 "text": "Header text.\r",
 "isEmpty": false,
 "parentBodyType": "Header",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "Header",
 "firstOutlineLevel": 10,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:10:56.779] ✓ spike1-selection
[10:11:12.828] ▶ spike1-selection
[10:11:12.831] selection facts {
 "text": "Heading in a text box\r",
 "isEmpty": false,
 "parentBodyType": "Shape",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "Heading1",
 "firstOutlineLevel": 1,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:11:12.831] ✓ spike1-selection
[10:11:22.710] ▶ spike1-selection
[10:11:22.714] selection facts {
 "text": "Bold body text.\r",
 "isEmpty": false,
 "parentBodyType": "MainDoc",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "Normal",
 "firstOutlineLevel": 10,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:11:22.714] ✓ spike1-selection
[10:11:27.883] ▶ spike1-selection
[10:11:27.885] selection facts {
 "text": "A quotation.\r",
 "isEmpty": false,
 "parentBodyType": "MainDoc",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "Quote",
 "firstOutlineLevel": 10,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:11:27.886] ✓ spike1-selection
[10:11:36.816] ▶ spike1-selection
[10:11:36.822] selection facts {
 "text": "73.1\tTopic 73.1\t37\r",
 "isEmpty": false,
 "parentBodyType": "MainDoc",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "Toc2",
 "firstOutlineLevel": 10,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:11:36.822] ✓ spike1-selection
[10:11:50.792] ▶ spike1-selection
[10:11:50.795] selection facts {
 "text": "Cell text in the main table.",
 "isEmpty": false,
 "parentBodyType": "TableCell",
 "parentOfBodyType": "MainDoc",
 "paragraphCount": 1,
 "firstStyle": "Normal",
 "firstOutlineLevel": 10,
 "firstTableNesting": 1,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:11:50.796] ✓ spike1-selection
[10:11:56.321] ▶ spike1-selection
[10:11:56.324] selection facts {
 "text": "Heading in a table cell",
 "isEmpty": false,
 "parentBodyType": "TableCell",
 "parentOfBodyType": "MainDoc",
 "paragraphCount": 1,
 "firstStyle": "Heading3",
 "firstOutlineLevel": 3,
 "firstTableNesting": 1,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:11:56.324] ✓ spike1-selection
```

# 1.8

```log
[10:14:19.845] ▶ spike1-selection
[10:14:19.848] selection facts {
 "text": "First of",
 "isEmpty": false,
 "parentBodyType": "MainDoc",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "Normal",
 "firstOutlineLevel": 10,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:14:19.849] ✓ spike1-selection
[10:14:25.493] ▶ spike1-selection
[10:14:25.495] selection facts {
 "text": "First of two paragraphs.\r",
 "isEmpty": false,
 "parentBodyType": "MainDoc",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "Normal",
 "firstOutlineLevel": 10,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:14:25.496] ✓ spike1-selection
[10:14:36.602] OpenPalette fired {
 "surface": "taskpane"
}
[10:14:36.677] after showAsTaskpane + focus() {
 "activeElementIsProbe": true,
 "documentHasFocus": false,
 "msToShow": 8
}
[10:14:36.729] Word selection unchanged by showing the pane true
[10:14:36.729] Now type without clicking: keystrokes must appear in the probe log with clickedSinceShow=false
[10:14:42.808] ▶ spike1-selection
[10:14:42.811] selection facts {
 "text": "First of two paragraphs.\rSecond of two paragraphs.\r",
 "isEmpty": false,
 "parentBodyType": "MainDoc",
 "parentOfBodyType": null,
 "paragraphCount": 2,
 "firstStyle": "Normal",
 "firstOutlineLevel": 10,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:14:42.811] ✓ spike1-selection
[10:14:49.785] ▶ spike1-selection
[10:14:49.788] selection facts {
 "text": "Cell text in the main table.\tHeading in a table cell\r\n",
 "isEmpty": false,
 "parentBodyType": "MainDoc",
 "parentOfBodyType": null,
 "paragraphCount": 2,
 "firstStyle": "Normal",
 "firstOutlineLevel": 10,
 "firstTableNesting": 1,
 "tableCount": 1,
 "pictureCount": 0,
 "contentControlCount": 0,
 "shapeCount": 0
}
[10:14:49.789] ✓ spike1-selection
[10:14:53.192] ▶ spike1-selection
[10:14:53.195] selection facts {
 "text": "",
 "isEmpty": false,
 "parentBodyType": "MainDoc",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "Normal",
 "firstOutlineLevel": 10,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 1,
 "contentControlCount": 0,
 "shapeCount": 1
}
[10:14:53.195] ✓ spike1-selection
[10:14:59.553] ▶ spike1-selection
[10:14:59.558] selection facts {
 "text": "Paragraph with an inline picture.\r",
 "isEmpty": false,
 "parentBodyType": "MainDoc",
 "parentOfBodyType": null,
 "paragraphCount": 1,
 "firstStyle": "Normal",
 "firstOutlineLevel": 10,
 "firstTableNesting": 0,
 "tableCount": 0,
 "pictureCount": 1,
 "contentControlCount": 0,
 "shapeCount": 1
}
[10:14:59.558] ✓ spike1-selection
```

# 1.9

```log
[10:19:42.495] ▶ spike1-theme
[10:19:42.496] officeTheme {
 "bodyBackgroundColor": "#e6e6e6",
 "bodyForegroundColor": "#444444",
 "controlBackgroundColor": "#fdfdfd",
 "controlForegroundColor": "#444444",
 "themeId": 0,
 "isDarkTheme": false,
 "fluentThemeData": {
  "VisualSurface": "Panes",
  "Theme": "Colorful",
  "Palettes": {
   "Base": {
    "StrokeOverSelectedHover": "#7a7a7a",
    "BkgCtlEmphasisFocus": "#185abd",
    "Bkg": "#fafafa",
    "Text": "#242424",
    "BkgAccentTint": "#d2e0f4",
    "BkgHover": "#f0f0f0",
    "TextEmphasisSelected": "#13458f",
    "TextSecondary": "#424242",
    "BkgPressed": "#d8d8d8",
    "StrokeCtlEmphasisHover": "#1651aa",
    "BkgSelectionHighlight": "#616161",
    "BkgCtl": "#ffffff",
    "BkgSelected": "#e5e5e5",
    "BkgCtlEmphasisDisabled": "#f0f0f0",
    "TextRest": "#242424",
    "TextCtlEmphasisPressed": "#ffffff",
    "GlyphAsButtonSubtleHover": "#3d3d3d",
    "TextHover": "#242424",
    "TextPressed": "#242424",
    "SliderToolTipLabel": "#242424",
    "StrokeCtlSelected": "#8a8a8a",
    "TextSelected": "#242424",
    "TextDisabled": "#999999",
    "TextCtlEmphasisDisabled": "#999999",
    "BkgCtlEmphasisPressed": "#0e336a",
    "TextSelectionHighlight": "#ffffff",
    "SliderSecondary": "#808080",
    "TextAccentTint": "#242424",
    "BkgCtlSelected": "#ebebeb",
    "TextCtlSelected": "#242424",
    "BkgStripe": "#00000000",
    "TextSecondaryRest": "#424242",
    "TextCtlSubtlePlaceholder": "#707070",
    "TextSecondaryHover": "#242424",
    "TextSecondaryPressed": "#242424",
    "TextSecondarySelected": "#242424",
    "StrokeCtlDisabled": "#e0e0e0",
    "TextErrorHover": "#9f282b",
    "TextEmphasis": "#1651aa",
    "TextEmphasis2": "#185abd",
    "TextEmphasisRest": "#1651aa",
    "TextCtlHover": "#242424",
    "TextEmphasisHover": "#13458f",
    "StrokeStripeOuter": "#8f8f8f",
    "TextEmphasisPressed": "#0e336a",
    "TextCtl": "#242424",
    "BkgHeader": "#fafafa",
    "StrokeSelectedHover": "#c7c7c7",
    "StrokeKeyboard": "#000000",
    "StrokeOverSelectedPressed": "#474747",
    "StrokeKeyboardInverse": "#ffffff",
    "StrokeCtlPressed": "#8a8a8a",
    "StrokeKeyboardSelected": "#000000",
    "StrokeToggleSwitchOffDisabled": "#e0e0e0",
    "BkgToggleSwitchOnHover": "#1651aa",
    "TextCtlPressed": "#242424",
    "StrokeOverRest": "#00000000",
    "StrokeStripe": "#e5e5e5",
    "TextErrorSelected": "#9f282b",
    "StrokeCtlHover": "#8a8a8a",
    "TextStripe": "#575757",
    "StrokeCtl": "#8a8a8a",
    "TextStripeDisabled": "#999999",
    "StrokeOverHover": "#c7c7c7",
    "StrokeOverPressed": "#b2b2b2",
    "TextHyperlinkParentHoveredPressed": "#1651aa",
    "BkgCtlEmphasis": "#185abd",
    "StrokeOverSelectedRest": "#616161",
    "BkgCtlHover": "#f5f5f5",
    "BkgCtlPressed": "#e0e0e0",
    "BkgCtlDisabled": "#f0f0f0",
    "TextCtlDisabled": "#999999",
    "StrokeCtlKeyboard": "#000000",
    "BkgCtlEmphasisHover": "#1651aa",
    "TextCtlEmphasis": "#ffffff",
    "TextCtlEmphasisHover": "#ffffff",
    "StrokeCtlEmphasis": "#185abd",
    "StrokeCtlEmphasisPressed": "#0e336a",
    "StrokeCtlEmphasisDisabled": "#e0e0e0",
    "StrokeCtlEmphasisKeyboard": "#ffffff",
    "BkgCtlSubtle": "#ffffff",
    "BkgCtlSubtleHover": "#f5f5f5",
    "BkgCtlSubtlePressed": "#e0e0e0",
    "BkgCtlSubtleDisabled": "#f0f0f0",
    "BkgCtlSubtleSelectionHighlight": "#616161",
    "BkgTextBox": "#ffffff",
    "BkgTextBoxHover": "#f5f5f5",
    "BkgTextBoxPressed": "#e0e0e0",
    "ThumbToggleSwitchOnDisabled": "#999999",
    "BkgTextBoxDisabled": "#f0f0f0",
    "BkgTextBoxSelectionHighlight": "#616161",
    "TextCtlSubtle": "#242424",
    "TextCtlSubtleHover": "#242424",
    "TextCtlSubtlePressed": "#242424",
    "TextCtlSubtleDisabled": "#999999",
    "TextCtlSubtleSelectionHighlight": "#ffffff",
    "TextTextBox": "#242424",
    "TextTextBoxHyperlink": "#185abd",
    "TextTextBoxPlaceholder": "#707070",
    "TextTextBoxHover": "#242424",
    "TextActiveHover": "#1651aa",
    "TextTextBoxPressed": "#242424",
    "TextTextBoxDisabled": "#999999",
    "TextTextBoxSelectionHighlight": "#ffffff",
    "SliderToolTipBkg": "#ffffff",
    "StrokeCtlSubtle": "#8a8a8a",
    "StrokeCtlSubtleHover": "#808080",
    "StrokeCtlSubtlePressed": "#6b6b6b",
    "StrokeCtlSubtleDisabled": "#d1d1d1",
    "StrokeCtlSubtleKeyboard": "#000000",
    "StrokeTextBox": "#8a8a8a",
    "StrokeTextBoxHover": "#808080",
    "StrokeTextBoxPressed": "#707070",
    "StrokeTextBoxDisabled": "#e0e0e0",
    "StrokeOverSubtleHover": "#00000000",
    "ThumbToggleSwitchOffDisabled": "#bdbdbd",
    "StrokeTextBoxKeyboard": "#000000",
    "TextHyperlink": "#1651aa",
    "TextHyperlinkHover": "#13458f",
    "TextHyperlinkParentHovered": "#0e336a",
    "TextHyperlinkPressed": "#0e336a",
    "TextHyperlinkParentHoveredHover": "#13458f",
    "TextHyperlinkParentSelected": "#0e336a",
    "TextHyperlinkParentSelectedHover": "#13458f",
    "TextHyperlinkParentSelectedPressed": "#1651aa",
    "TextActive": "#242424",
    "TextActivePressed": "#0e336a",
    "TextActiveSelected": "#13458f",
    "StrokeOnlyHover": "#1651aa",
    "GlyphAsButtonSubtlePressed": "#2e2e2e",
    "StrokeOnlyPressed": "#0e336a",
    "StrokeOnlySelected": "#185abd",
    "TextError": "#9f282b",
    "TextErrorPressed": "#9f282b",
    "ThumbToggleSwitchOff": "#616161",
    "ThumbToggleSwitchOffHover": "#575757",
    "ThumbToggleSwitchOffPressed": "#4d4d4d",
    "ThumbToggleSwitchOn": "#ffffff",
    "StrokeBadge": "#d13438",
    "ThumbToggleSwitchOnHover": "#ffffff",
    "ThumbToggleSwitchOnPressed": "#ffffff",
    "BkgToggleSwitchOff": "#ffffff",
    "BkgToggleSwitchOffHover": "#ffffff",
    "BkgToggleSwitchOffPressed": "#ffffff",
    "BkgToggleSwitchOffDisabled": "#f0f0f0",
    "BkgToggleSwitchOn": "#185abd",
    "BkgToggleSwitchOnPressed": "#0e336a",
    "BkgToggleSwitchOnDisabled": "#f0f0f0",
    "StrokeToggleSwitchOff": "#616161",
    "StrokeToggleSwitchOffHover": "#575757",
    "StrokeToggleSwitchOffPressed": "#4d4d4d",
    "StrokeToggleSwitchOn": "#185abd",
    "StrokeToggleSwitchOnHover": "#1651aa",
    "StrokeToggleSwitchOnPressed": "#0e336a",
    "StrokeToggleSwitchOnDisabled": "#e0e0e0",
    "SliderPrimary": "#616161",
    "SliderPrimaryHover": "#1651aa",
    "SliderPrimaryPressed": "#0e336a",
    "SliderKeyboard": "#000000",
    "SliderPrimaryDisabled": "#999999",
    "SliderBuffer": "#e0e0e0",
    "SliderToolTipBorder": "#e0e0e0",
    "BkgSubtle": "#f0f0f0",
    "GlyphAsButtonSubtle": "#6b6b6b",
    "AccentDark": "#616161",
    "AccentLight": "#d1d1d1",
    "AccentEmphasis": "#1651aa",
    "AccentOutline": "#000000",
    "BkgTextBoxSelected": "#ebebeb",
    "BkgTextBoxFocus": "#ffffff",
    "BkgTextBoxHoverDisabled": "#f0f0f0",
    "BkgTextBoxSelectedDisabled": "#f0f0f0",
    "BkgCtlSubtleFocus": "#ffffff",
    "TextTextBoxSelected": "#242424",
    "BkgCtlSubtleSelected": "#ebebeb",
    "TextCtlSubtleSelected": "#242424",
    "BkgCtlSubtleHoverDisabled": "#f0f0f0",
    "BkgCtlSubtleSelectedDisabled": "#f0f0f0",
    "TextHeader": "#242424",
    "BkgBadge": "#d13438",
    "TextBadge": "#ffffff"
   },
   "Card": {
    "StrokeOverSelectedHover": "#7a7a7a",
    "BkgCtlEmphasisFocus": "#185abd",
    "Bkg": "#ffffff",
    "Text": "#242424",
    "BkgAccentTint": "#d2e0f4",
    "BkgHover": "#f5f5f5",
    "TextEmphasisSelected": "#13458f",
    "TextSecondary": "#424242",
    "BkgPressed": "#e0e0e0",
    "StrokeCtlEmphasisHover": "#1651aa",
    "BkgSelectionHighlight": "#616161",
    "BkgCtl": "#ffffff",
    "BkgSelected": "#ebebeb",
    "BkgCtlEmphasisDisabled": "#f0f0f0",
    "TextRest": "#242424",
    "TextCtlEmphasisPressed": "#ffffff",
    "GlyphAsButtonSubtleHover": "#424242",
    "TextHover": "#242424",
    "TextPressed": "#242424",
    "SliderToolTipLabel": "#242424",
    "StrokeCtlSelected": "#8a8a8a",
    "TextSelected": "#242424",
    "TextDisabled": "#999999",
    "TextCtlEmphasisDisabled": "#999999",
    "BkgCtlEmphasisPressed": "#0e336a",
    "TextSelectionHighlight": "#ffffff",
    "SliderSecondary": "#808080",
    "TextAccentTint": "#242424",
    "BkgCtlSelected": "#ebebeb",
    "TextCtlSelected": "#242424",
    "BkgStripe": "#00000000",
    "TextSecondaryRest": "#424242",
    "TextCtlSubtlePlaceholder": "#707070",
    "TextSecondaryHover": "#242424",
    "TextSecondaryPressed": "#242424",
    "TextSecondarySelected": "#242424",
    "StrokeCtlDisabled": "#e0e0e0",
    "TextErrorHover": "#9f282b",
    "TextEmphasis": "#185abd",
    "TextEmphasis2": "#185abd",
    "TextEmphasisRest": "#185abd",
    "TextCtlHover": "#242424",
    "TextEmphasisHover": "#1651aa",
    "StrokeStripeOuter": "#949494",
    "TextEmphasisPressed": "#0e336a",
    "TextCtl": "#242424",
    "BkgHeader": "#fafafa",
    "StrokeSelectedHover": "#c7c7c7",
    "StrokeKeyboard": "#000000",
    "StrokeOverSelectedPressed": "#474747",
    "StrokeKeyboardInverse": "#ffffff",
    "StrokeCtlPressed": "#8a8a8a",
    "StrokeKeyboardSelected": "#000000",
    "StrokeToggleSwitchOffDisabled": "#e0e0e0",
    "BkgToggleSwitchOnHover": "#1651aa",
    "TextCtlPressed": "#242424",
    "StrokeOverRest": "#00000000",
    "StrokeStripe": "#ebebeb",
    "TextErrorSelected": "#9f282b",
    "StrokeCtlHover": "#8a8a8a",
    "TextStripe": "#5c5c5c",
    "StrokeCtl": "#8a8a8a",
    "TextStripeDisabled": "#999999",
    "StrokeOverHover": "#c7c7c7",
    "StrokeOverPressed": "#b2b2b2",
    "TextHyperlinkParentHoveredPressed": "#1651aa",
    "BkgCtlEmphasis": "#185abd",
    "StrokeOverSelectedRest": "#616161",
    "BkgCtlHover": "#f5f5f5",
    "BkgCtlPressed": "#e0e0e0",
    "BkgCtlDisabled": "#f0f0f0",
    "TextCtlDisabled": "#999999",
    "StrokeCtlKeyboard": "#000000",
    "BkgCtlEmphasisHover": "#1651aa",
    "TextCtlEmphasis": "#ffffff",
    "TextCtlEmphasisHover": "#ffffff",
    "StrokeCtlEmphasis": "#185abd",
    "StrokeCtlEmphasisPressed": "#0e336a",
    "StrokeCtlEmphasisDisabled": "#e0e0e0",
    "StrokeCtlEmphasisKeyboard": "#ffffff",
    "BkgCtlSubtle": "#ffffff",
    "BkgCtlSubtleHover": "#f5f5f5",
    "BkgCtlSubtlePressed": "#e0e0e0",
    "BkgCtlSubtleDisabled": "#f0f0f0",
    "BkgCtlSubtleSelectionHighlight": "#616161",
    "BkgTextBox": "#ffffff",
    "BkgTextBoxHover": "#f5f5f5",
    "BkgTextBoxPressed": "#e0e0e0",
    "ThumbToggleSwitchOnDisabled": "#999999",
    "BkgTextBoxDisabled": "#f0f0f0",
    "BkgTextBoxSelectionHighlight": "#616161",
    "TextCtlSubtle": "#242424",
    "TextCtlSubtleHover": "#242424",
    "TextCtlSubtlePressed": "#242424",
    "TextCtlSubtleDisabled": "#999999",
    "TextCtlSubtleSelectionHighlight": "#ffffff",
    "TextTextBox": "#242424",
    "TextTextBoxHyperlink": "#185abd",
    "TextTextBoxPlaceholder": "#707070",
    "TextTextBoxHover": "#242424",
    "TextActiveHover": "#1651aa",
    "TextTextBoxPressed": "#242424",
    "TextTextBoxDisabled": "#999999",
    "TextTextBoxSelectionHighlight": "#ffffff",
    "SliderToolTipBkg": "#ffffff",
    "StrokeCtlSubtle": "#8a8a8a",
    "StrokeCtlSubtleHover": "#808080",
    "StrokeCtlSubtlePressed": "#6b6b6b",
    "StrokeCtlSubtleDisabled": "#d1d1d1",
    "StrokeCtlSubtleKeyboard": "#000000",
    "StrokeTextBox": "#8a8a8a",
    "StrokeTextBoxHover": "#808080",
    "StrokeTextBoxPressed": "#707070",
    "StrokeTextBoxDisabled": "#e0e0e0",
    "StrokeOverSubtleHover": "#00000000",
    "ThumbToggleSwitchOffDisabled": "#bdbdbd",
    "StrokeTextBoxKeyboard": "#000000",
    "TextHyperlink": "#185abd",
    "TextHyperlinkHover": "#1651aa",
    "TextHyperlinkParentHovered": "#0e336a",
    "TextHyperlinkPressed": "#0e336a",
    "TextHyperlinkParentHoveredHover": "#13458f",
    "TextHyperlinkParentSelected": "#0e336a",
    "TextHyperlinkParentSelectedHover": "#13458f",
    "TextHyperlinkParentSelectedPressed": "#1651aa",
    "TextActive": "#242424",
    "TextActivePressed": "#0e336a",
    "TextActiveSelected": "#13458f",
    "StrokeOnlyHover": "#1651aa",
    "GlyphAsButtonSubtlePressed": "#333333",
    "StrokeOnlyPressed": "#0e336a",
    "StrokeOnlySelected": "#185abd",
    "TextError": "#9f282b",
    "TextErrorPressed": "#9f282b",
    "ThumbToggleSwitchOff": "#616161",
    "ThumbToggleSwitchOffHover": "#575757",
    "ThumbToggleSwitchOffPressed": "#4d4d4d",
    "ThumbToggleSwitchOn": "#ffffff",
    "StrokeBadge": "#d13438",
    "ThumbToggleSwitchOnHover": "#ffffff",
    "ThumbToggleSwitchOnPressed": "#ffffff",
    "BkgToggleSwitchOff": "#ffffff",
    "BkgToggleSwitchOffHover": "#ffffff",
    "BkgToggleSwitchOffPressed": "#ffffff",
    "BkgToggleSwitchOffDisabled": "#f0f0f0",
    "BkgToggleSwitchOn": "#185abd",
    "BkgToggleSwitchOnPressed": "#0e336a",
    "BkgToggleSwitchOnDisabled": "#f0f0f0",
    "StrokeToggleSwitchOff": "#616161",
    "StrokeToggleSwitchOffHover": "#575757",
    "StrokeToggleSwitchOffPressed": "#4d4d4d",
    "StrokeToggleSwitchOn": "#185abd",
    "StrokeToggleSwitchOnHover": "#1651aa",
    "StrokeToggleSwitchOnPressed": "#0e336a",
    "StrokeToggleSwitchOnDisabled": "#e0e0e0",
    "SliderPrimary": "#616161",
    "SliderPrimaryHover": "#1651aa",
    "SliderPrimaryPressed": "#0e336a",
    "SliderKeyboard": "#000000",
    "SliderPrimaryDisabled": "#999999",
    "SliderBuffer": "#e0e0e0",
    "SliderToolTipBorder": "#e0e0e0",
    "BkgSubtle": "#f5f5f5",
    "GlyphAsButtonSubtle": "#707070",
    "AccentDark": "#616161",
    "AccentLight": "#d1d1d1",
    "AccentEmphasis": "#185abd",
    "AccentOutline": "#000000",
    "BkgTextBoxSelected": "#ebebeb",
    "BkgTextBoxFocus": "#ffffff",
    "BkgTextBoxHoverDisabled": "#f0f0f0",
    "BkgTextBoxSelectedDisabled": "#f0f0f0",
    "BkgCtlSubtleFocus": "#ffffff",
    "TextTextBoxSelected": "#242424",
    "BkgCtlSubtleSelected": "#ebebeb",
    "TextCtlSubtleSelected": "#242424",
    "BkgCtlSubtleHoverDisabled": "#f0f0f0",
    "BkgCtlSubtleSelectedDisabled": "#f0f0f0",
    "TextHeader": "#242424",
    "BkgBadge": "#d13438",
    "TextBadge": "#ffffff"
   }
  },
  "Typography": {
   "families": {
    "monospace": "Segoe UI",
    "primary": "Segoe UI",
    "serif": "Segoe UI",
    "secondary": "Segoe UI",
    "cursive": "Segoe UI",
    "sansSerif": "Segoe UI"
   },
   "sizes": {
    "xSmall": 11,
    "xxxSmall": 11,
    "medium": 12,
    "xxxLarge": 21,
    "xxSmall": 11,
    "large": 13,
    "small": 11,
    "xLarge": 15,
    "xxLarge": 19
   },
   "weights": {
    "light": "300",
    "semiLight": "350",
    "medium": "400",
    "semiBold": "600",
    "bold": "700"
   }
  }
 }
}
[10:19:42.496] prefers-reduced-motion: reduce false
[10:19:42.496] prefers-color-scheme: dark false
[10:19:42.496] ✓ spike1-theme
[10:20:32.968] ▶ spike1-theme
[10:20:32.969] officeTheme {
 "bodyBackgroundColor": "#e6e6e6",
 "bodyForegroundColor": "#444444",
 "controlBackgroundColor": "#fdfdfd",
 "controlForegroundColor": "#444444",
 "themeId": 0,
 "isDarkTheme": false,
 "fluentThemeData": {
  "VisualSurface": "Panes",
  "Theme": "Colorful",
  "Palettes": {
   "Base": {
    "StrokeOverSelectedHover": "#7a7a7a",
    "BkgCtlEmphasisFocus": "#185abd",
    "Bkg": "#fafafa",
    "Text": "#242424",
    "BkgAccentTint": "#d2e0f4",
    "BkgHover": "#f0f0f0",
    "TextEmphasisSelected": "#13458f",
    "TextSecondary": "#424242",
    "BkgPressed": "#d8d8d8",
    "StrokeCtlEmphasisHover": "#1651aa",
    "BkgSelectionHighlight": "#616161",
    "BkgCtl": "#ffffff",
    "BkgSelected": "#e5e5e5",
    "BkgCtlEmphasisDisabled": "#f0f0f0",
    "TextRest": "#242424",
    "TextCtlEmphasisPressed": "#ffffff",
    "GlyphAsButtonSubtleHover": "#3d3d3d",
    "TextHover": "#242424",
    "TextPressed": "#242424",
    "SliderToolTipLabel": "#242424",
    "StrokeCtlSelected": "#8a8a8a",
    "TextSelected": "#242424",
    "TextDisabled": "#999999",
    "TextCtlEmphasisDisabled": "#999999",
    "BkgCtlEmphasisPressed": "#0e336a",
    "TextSelectionHighlight": "#ffffff",
    "SliderSecondary": "#808080",
    "TextAccentTint": "#242424",
    "BkgCtlSelected": "#ebebeb",
    "TextCtlSelected": "#242424",
    "BkgStripe": "#00000000",
    "TextSecondaryRest": "#424242",
    "TextCtlSubtlePlaceholder": "#707070",
    "TextSecondaryHover": "#242424",
    "TextSecondaryPressed": "#242424",
    "TextSecondarySelected": "#242424",
    "StrokeCtlDisabled": "#e0e0e0",
    "TextErrorHover": "#9f282b",
    "TextEmphasis": "#1651aa",
    "TextEmphasis2": "#185abd",
    "TextEmphasisRest": "#1651aa",
    "TextCtlHover": "#242424",
    "TextEmphasisHover": "#13458f",
    "StrokeStripeOuter": "#8f8f8f",
    "TextEmphasisPressed": "#0e336a",
    "TextCtl": "#242424",
    "BkgHeader": "#fafafa",
    "StrokeSelectedHover": "#c7c7c7",
    "StrokeKeyboard": "#000000",
    "StrokeOverSelectedPressed": "#474747",
    "StrokeKeyboardInverse": "#ffffff",
    "StrokeCtlPressed": "#8a8a8a",
    "StrokeKeyboardSelected": "#000000",
    "StrokeToggleSwitchOffDisabled": "#e0e0e0",
    "BkgToggleSwitchOnHover": "#1651aa",
    "TextCtlPressed": "#242424",
    "StrokeOverRest": "#00000000",
    "StrokeStripe": "#e5e5e5",
    "TextErrorSelected": "#9f282b",
    "StrokeCtlHover": "#8a8a8a",
    "TextStripe": "#575757",
    "StrokeCtl": "#8a8a8a",
    "TextStripeDisabled": "#999999",
    "StrokeOverHover": "#c7c7c7",
    "StrokeOverPressed": "#b2b2b2",
    "TextHyperlinkParentHoveredPressed": "#1651aa",
    "BkgCtlEmphasis": "#185abd",
    "StrokeOverSelectedRest": "#616161",
    "BkgCtlHover": "#f5f5f5",
    "BkgCtlPressed": "#e0e0e0",
    "BkgCtlDisabled": "#f0f0f0",
    "TextCtlDisabled": "#999999",
    "StrokeCtlKeyboard": "#000000",
    "BkgCtlEmphasisHover": "#1651aa",
    "TextCtlEmphasis": "#ffffff",
    "TextCtlEmphasisHover": "#ffffff",
    "StrokeCtlEmphasis": "#185abd",
    "StrokeCtlEmphasisPressed": "#0e336a",
    "StrokeCtlEmphasisDisabled": "#e0e0e0",
    "StrokeCtlEmphasisKeyboard": "#ffffff",
    "BkgCtlSubtle": "#ffffff",
    "BkgCtlSubtleHover": "#f5f5f5",
    "BkgCtlSubtlePressed": "#e0e0e0",
    "BkgCtlSubtleDisabled": "#f0f0f0",
    "BkgCtlSubtleSelectionHighlight": "#616161",
    "BkgTextBox": "#ffffff",
    "BkgTextBoxHover": "#f5f5f5",
    "BkgTextBoxPressed": "#e0e0e0",
    "ThumbToggleSwitchOnDisabled": "#999999",
    "BkgTextBoxDisabled": "#f0f0f0",
    "BkgTextBoxSelectionHighlight": "#616161",
    "TextCtlSubtle": "#242424",
    "TextCtlSubtleHover": "#242424",
    "TextCtlSubtlePressed": "#242424",
    "TextCtlSubtleDisabled": "#999999",
    "TextCtlSubtleSelectionHighlight": "#ffffff",
    "TextTextBox": "#242424",
    "TextTextBoxHyperlink": "#185abd",
    "TextTextBoxPlaceholder": "#707070",
    "TextTextBoxHover": "#242424",
    "TextActiveHover": "#1651aa",
    "TextTextBoxPressed": "#242424",
    "TextTextBoxDisabled": "#999999",
    "TextTextBoxSelectionHighlight": "#ffffff",
    "SliderToolTipBkg": "#ffffff",
    "StrokeCtlSubtle": "#8a8a8a",
    "StrokeCtlSubtleHover": "#808080",
    "StrokeCtlSubtlePressed": "#6b6b6b",
    "StrokeCtlSubtleDisabled": "#d1d1d1",
    "StrokeCtlSubtleKeyboard": "#000000",
    "StrokeTextBox": "#8a8a8a",
    "StrokeTextBoxHover": "#808080",
    "StrokeTextBoxPressed": "#707070",
    "StrokeTextBoxDisabled": "#e0e0e0",
    "StrokeOverSubtleHover": "#00000000",
    "ThumbToggleSwitchOffDisabled": "#bdbdbd",
    "StrokeTextBoxKeyboard": "#000000",
    "TextHyperlink": "#1651aa",
    "TextHyperlinkHover": "#13458f",
    "TextHyperlinkParentHovered": "#0e336a",
    "TextHyperlinkPressed": "#0e336a",
    "TextHyperlinkParentHoveredHover": "#13458f",
    "TextHyperlinkParentSelected": "#0e336a",
    "TextHyperlinkParentSelectedHover": "#13458f",
    "TextHyperlinkParentSelectedPressed": "#1651aa",
    "TextActive": "#242424",
    "TextActivePressed": "#0e336a",
    "TextActiveSelected": "#13458f",
    "StrokeOnlyHover": "#1651aa",
    "GlyphAsButtonSubtlePressed": "#2e2e2e",
    "StrokeOnlyPressed": "#0e336a",
    "StrokeOnlySelected": "#185abd",
    "TextError": "#9f282b",
    "TextErrorPressed": "#9f282b",
    "ThumbToggleSwitchOff": "#616161",
    "ThumbToggleSwitchOffHover": "#575757",
    "ThumbToggleSwitchOffPressed": "#4d4d4d",
    "ThumbToggleSwitchOn": "#ffffff",
    "StrokeBadge": "#d13438",
    "ThumbToggleSwitchOnHover": "#ffffff",
    "ThumbToggleSwitchOnPressed": "#ffffff",
    "BkgToggleSwitchOff": "#ffffff",
    "BkgToggleSwitchOffHover": "#ffffff",
    "BkgToggleSwitchOffPressed": "#ffffff",
    "BkgToggleSwitchOffDisabled": "#f0f0f0",
    "BkgToggleSwitchOn": "#185abd",
    "BkgToggleSwitchOnPressed": "#0e336a",
    "BkgToggleSwitchOnDisabled": "#f0f0f0",
    "StrokeToggleSwitchOff": "#616161",
    "StrokeToggleSwitchOffHover": "#575757",
    "StrokeToggleSwitchOffPressed": "#4d4d4d",
    "StrokeToggleSwitchOn": "#185abd",
    "StrokeToggleSwitchOnHover": "#1651aa",
    "StrokeToggleSwitchOnPressed": "#0e336a",
    "StrokeToggleSwitchOnDisabled": "#e0e0e0",
    "SliderPrimary": "#616161",
    "SliderPrimaryHover": "#1651aa",
    "SliderPrimaryPressed": "#0e336a",
    "SliderKeyboard": "#000000",
    "SliderPrimaryDisabled": "#999999",
    "SliderBuffer": "#e0e0e0",
    "SliderToolTipBorder": "#e0e0e0",
    "BkgSubtle": "#f0f0f0",
    "GlyphAsButtonSubtle": "#6b6b6b",
    "AccentDark": "#616161",
    "AccentLight": "#d1d1d1",
    "AccentEmphasis": "#1651aa",
    "AccentOutline": "#000000",
    "BkgTextBoxSelected": "#ebebeb",
    "BkgTextBoxFocus": "#ffffff",
    "BkgTextBoxHoverDisabled": "#f0f0f0",
    "BkgTextBoxSelectedDisabled": "#f0f0f0",
    "BkgCtlSubtleFocus": "#ffffff",
    "TextTextBoxSelected": "#242424",
    "BkgCtlSubtleSelected": "#ebebeb",
    "TextCtlSubtleSelected": "#242424",
    "BkgCtlSubtleHoverDisabled": "#f0f0f0",
    "BkgCtlSubtleSelectedDisabled": "#f0f0f0",
    "TextHeader": "#242424",
    "BkgBadge": "#d13438",
    "TextBadge": "#ffffff"
   },
   "Card": {
    "StrokeOverSelectedHover": "#7a7a7a",
    "BkgCtlEmphasisFocus": "#185abd",
    "Bkg": "#ffffff",
    "Text": "#242424",
    "BkgAccentTint": "#d2e0f4",
    "BkgHover": "#f5f5f5",
    "TextEmphasisSelected": "#13458f",
    "TextSecondary": "#424242",
    "BkgPressed": "#e0e0e0",
    "StrokeCtlEmphasisHover": "#1651aa",
    "BkgSelectionHighlight": "#616161",
    "BkgCtl": "#ffffff",
    "BkgSelected": "#ebebeb",
    "BkgCtlEmphasisDisabled": "#f0f0f0",
    "TextRest": "#242424",
    "TextCtlEmphasisPressed": "#ffffff",
    "GlyphAsButtonSubtleHover": "#424242",
    "TextHover": "#242424",
    "TextPressed": "#242424",
    "SliderToolTipLabel": "#242424",
    "StrokeCtlSelected": "#8a8a8a",
    "TextSelected": "#242424",
    "TextDisabled": "#999999",
    "TextCtlEmphasisDisabled": "#999999",
    "BkgCtlEmphasisPressed": "#0e336a",
    "TextSelectionHighlight": "#ffffff",
    "SliderSecondary": "#808080",
    "TextAccentTint": "#242424",
    "BkgCtlSelected": "#ebebeb",
    "TextCtlSelected": "#242424",
    "BkgStripe": "#00000000",
    "TextSecondaryRest": "#424242",
    "TextCtlSubtlePlaceholder": "#707070",
    "TextSecondaryHover": "#242424",
    "TextSecondaryPressed": "#242424",
    "TextSecondarySelected": "#242424",
    "StrokeCtlDisabled": "#e0e0e0",
    "TextErrorHover": "#9f282b",
    "TextEmphasis": "#185abd",
    "TextEmphasis2": "#185abd",
    "TextEmphasisRest": "#185abd",
    "TextCtlHover": "#242424",
    "TextEmphasisHover": "#1651aa",
    "StrokeStripeOuter": "#949494",
    "TextEmphasisPressed": "#0e336a",
    "TextCtl": "#242424",
    "BkgHeader": "#fafafa",
    "StrokeSelectedHover": "#c7c7c7",
    "StrokeKeyboard": "#000000",
    "StrokeOverSelectedPressed": "#474747",
    "StrokeKeyboardInverse": "#ffffff",
    "StrokeCtlPressed": "#8a8a8a",
    "StrokeKeyboardSelected": "#000000",
    "StrokeToggleSwitchOffDisabled": "#e0e0e0",
    "BkgToggleSwitchOnHover": "#1651aa",
    "TextCtlPressed": "#242424",
    "StrokeOverRest": "#00000000",
    "StrokeStripe": "#ebebeb",
    "TextErrorSelected": "#9f282b",
    "StrokeCtlHover": "#8a8a8a",
    "TextStripe": "#5c5c5c",
    "StrokeCtl": "#8a8a8a",
    "TextStripeDisabled": "#999999",
    "StrokeOverHover": "#c7c7c7",
    "StrokeOverPressed": "#b2b2b2",
    "TextHyperlinkParentHoveredPressed": "#1651aa",
    "BkgCtlEmphasis": "#185abd",
    "StrokeOverSelectedRest": "#616161",
    "BkgCtlHover": "#f5f5f5",
    "BkgCtlPressed": "#e0e0e0",
    "BkgCtlDisabled": "#f0f0f0",
    "TextCtlDisabled": "#999999",
    "StrokeCtlKeyboard": "#000000",
    "BkgCtlEmphasisHover": "#1651aa",
    "TextCtlEmphasis": "#ffffff",
    "TextCtlEmphasisHover": "#ffffff",
    "StrokeCtlEmphasis": "#185abd",
    "StrokeCtlEmphasisPressed": "#0e336a",
    "StrokeCtlEmphasisDisabled": "#e0e0e0",
    "StrokeCtlEmphasisKeyboard": "#ffffff",
    "BkgCtlSubtle": "#ffffff",
    "BkgCtlSubtleHover": "#f5f5f5",
    "BkgCtlSubtlePressed": "#e0e0e0",
    "BkgCtlSubtleDisabled": "#f0f0f0",
    "BkgCtlSubtleSelectionHighlight": "#616161",
    "BkgTextBox": "#ffffff",
    "BkgTextBoxHover": "#f5f5f5",
    "BkgTextBoxPressed": "#e0e0e0",
    "ThumbToggleSwitchOnDisabled": "#999999",
    "BkgTextBoxDisabled": "#f0f0f0",
    "BkgTextBoxSelectionHighlight": "#616161",
    "TextCtlSubtle": "#242424",
    "TextCtlSubtleHover": "#242424",
    "TextCtlSubtlePressed": "#242424",
    "TextCtlSubtleDisabled": "#999999",
    "TextCtlSubtleSelectionHighlight": "#ffffff",
    "TextTextBox": "#242424",
    "TextTextBoxHyperlink": "#185abd",
    "TextTextBoxPlaceholder": "#707070",
    "TextTextBoxHover": "#242424",
    "TextActiveHover": "#1651aa",
    "TextTextBoxPressed": "#242424",
    "TextTextBoxDisabled": "#999999",
    "TextTextBoxSelectionHighlight": "#ffffff",
    "SliderToolTipBkg": "#ffffff",
    "StrokeCtlSubtle": "#8a8a8a",
    "StrokeCtlSubtleHover": "#808080",
    "StrokeCtlSubtlePressed": "#6b6b6b",
    "StrokeCtlSubtleDisabled": "#d1d1d1",
    "StrokeCtlSubtleKeyboard": "#000000",
    "StrokeTextBox": "#8a8a8a",
    "StrokeTextBoxHover": "#808080",
    "StrokeTextBoxPressed": "#707070",
    "StrokeTextBoxDisabled": "#e0e0e0",
    "StrokeOverSubtleHover": "#00000000",
    "ThumbToggleSwitchOffDisabled": "#bdbdbd",
    "StrokeTextBoxKeyboard": "#000000",
    "TextHyperlink": "#185abd",
    "TextHyperlinkHover": "#1651aa",
    "TextHyperlinkParentHovered": "#0e336a",
    "TextHyperlinkPressed": "#0e336a",
    "TextHyperlinkParentHoveredHover": "#13458f",
    "TextHyperlinkParentSelected": "#0e336a",
    "TextHyperlinkParentSelectedHover": "#13458f",
    "TextHyperlinkParentSelectedPressed": "#1651aa",
    "TextActive": "#242424",
    "TextActivePressed": "#0e336a",
    "TextActiveSelected": "#13458f",
    "StrokeOnlyHover": "#1651aa",
    "GlyphAsButtonSubtlePressed": "#333333",
    "StrokeOnlyPressed": "#0e336a",
    "StrokeOnlySelected": "#185abd",
    "TextError": "#9f282b",
    "TextErrorPressed": "#9f282b",
    "ThumbToggleSwitchOff": "#616161",
    "ThumbToggleSwitchOffHover": "#575757",
    "ThumbToggleSwitchOffPressed": "#4d4d4d",
    "ThumbToggleSwitchOn": "#ffffff",
    "StrokeBadge": "#d13438",
    "ThumbToggleSwitchOnHover": "#ffffff",
    "ThumbToggleSwitchOnPressed": "#ffffff",
    "BkgToggleSwitchOff": "#ffffff",
    "BkgToggleSwitchOffHover": "#ffffff",
    "BkgToggleSwitchOffPressed": "#ffffff",
    "BkgToggleSwitchOffDisabled": "#f0f0f0",
    "BkgToggleSwitchOn": "#185abd",
    "BkgToggleSwitchOnPressed": "#0e336a",
    "BkgToggleSwitchOnDisabled": "#f0f0f0",
    "StrokeToggleSwitchOff": "#616161",
    "StrokeToggleSwitchOffHover": "#575757",
    "StrokeToggleSwitchOffPressed": "#4d4d4d",
    "StrokeToggleSwitchOn": "#185abd",
    "StrokeToggleSwitchOnHover": "#1651aa",
    "StrokeToggleSwitchOnPressed": "#0e336a",
    "StrokeToggleSwitchOnDisabled": "#e0e0e0",
    "SliderPrimary": "#616161",
    "SliderPrimaryHover": "#1651aa",
    "SliderPrimaryPressed": "#0e336a",
    "SliderKeyboard": "#000000",
    "SliderPrimaryDisabled": "#999999",
    "SliderBuffer": "#e0e0e0",
    "SliderToolTipBorder": "#e0e0e0",
    "BkgSubtle": "#f5f5f5",
    "GlyphAsButtonSubtle": "#707070",
    "AccentDark": "#616161",
    "AccentLight": "#d1d1d1",
    "AccentEmphasis": "#185abd",
    "AccentOutline": "#000000",
    "BkgTextBoxSelected": "#ebebeb",
    "BkgTextBoxFocus": "#ffffff",
    "BkgTextBoxHoverDisabled": "#f0f0f0",
    "BkgTextBoxSelectedDisabled": "#f0f0f0",
    "BkgCtlSubtleFocus": "#ffffff",
    "TextTextBoxSelected": "#242424",
    "BkgCtlSubtleSelected": "#ebebeb",
    "TextCtlSubtleSelected": "#242424",
    "BkgCtlSubtleHoverDisabled": "#f0f0f0",
    "BkgCtlSubtleSelectedDisabled": "#f0f0f0",
    "TextHeader": "#242424",
    "BkgBadge": "#d13438",
    "TextBadge": "#ffffff"
   }
  },
  "Typography": {
   "families": {
    "monospace": "Segoe UI",
    "primary": "Segoe UI",
    "serif": "Segoe UI",
    "secondary": "Segoe UI",
    "cursive": "Segoe UI",
    "sansSerif": "Segoe UI"
   },
   "sizes": {
    "xSmall": 11,
    "xxxSmall": 11,
    "medium": 12,
    "xxxLarge": 21,
    "xxSmall": 11,
    "large": 13,
    "small": 11,
    "xLarge": 15,
    "xxLarge": 19
   },
   "weights": {
    "light": "300",
    "semiLight": "350",
    "medium": "400",
    "semiBold": "600",
    "bold": "700"
   }
  }
 }
}
[10:20:32.969] prefers-reduced-motion: reduce true
[10:20:32.969] prefers-color-scheme: dark false
[10:20:32.969] ✓ spike1-theme
[10:20:50.167] ▶ spike1-theme
[10:20:50.168] officeTheme {
 "bodyBackgroundColor": "#262626",
 "bodyForegroundColor": "#f0f0f0",
 "controlBackgroundColor": "#363636",
 "controlForegroundColor": "#f0f0f0",
 "themeId": 2,
 "isDarkTheme": true,
 "fluentThemeData": {
  "VisualSurface": "Panes",
  "Theme": "Black",
  "Palettes": {
   "Base": {
    "StrokeOverSelectedHover": "#c7c7c7",
    "BkgCtlEmphasisFocus": "#296fe6",
    "Bkg": "#1f1f1f",
    "Text": "#ffffff",
    "BkgAccentTint": "#0c2145",
    "BkgHover": "#333333",
    "TextEmphasisSelected": "#82abf1",
    "TextSecondary": "#d6d6d6",
    "BkgPressed": "#141414",
    "StrokeCtlEmphasisHover": "#82abf1",
    "BkgSelectionHighlight": "#adadad",
    "BkgCtl": "#292929",
    "BkgSelected": "#2e2e2e",
    "BkgCtlEmphasisDisabled": "#141414",
    "TextRest": "#ffffff",
    "TextCtlEmphasisPressed": "#000000",
    "GlyphAsButtonSubtleHover": "#d6d6d6",
    "TextHover": "#ffffff",
    "TextPressed": "#ffffff",
    "SliderToolTipLabel": "#ffffff",
    "StrokeCtlSelected": "#858585",
    "TextSelected": "#ffffff",
    "TextDisabled": "#5c5c5c",
    "TextCtlEmphasisDisabled": "#5c5c5c",
    "BkgCtlEmphasisPressed": "#3d7ce8",
    "TextSelectionHighlight": "#000000",
    "SliderSecondary": "#808080",
    "TextAccentTint": "#ffffff",
    "BkgCtlSelected": "#383838",
    "TextCtlSelected": "#ffffff",
    "BkgStripe": "#00000000",
    "TextSecondaryRest": "#d6d6d6",
    "TextCtlSubtlePlaceholder": "#999999",
    "TextSecondaryHover": "#ffffff",
    "TextSecondaryPressed": "#ffffff",
    "TextSecondarySelected": "#ffffff",
    "StrokeCtlDisabled": "#424242",
    "TextErrorHover": "#f1bbbc",
    "TextEmphasis": "#82abf1",
    "TextEmphasis2": "#598fec",
    "TextEmphasisRest": "#82abf1",
    "TextCtlHover": "#ffffff",
    "TextEmphasisHover": "#aec6f0",
    "StrokeStripeOuter": "#707070",
    "TextEmphasisPressed": "#598fec",
    "TextCtl": "#ffffff",
    "BkgHeader": "#1f1f1f",
    "StrokeSelectedHover": "#757575",
    "StrokeKeyboard": "#ffffff",
    "StrokeOverSelectedPressed": "#949494",
    "StrokeKeyboardInverse": "#000000",
    "StrokeCtlPressed": "#858585",
    "StrokeKeyboardSelected": "#ffffff",
    "StrokeToggleSwitchOffDisabled": "#5c5c5c",
    "BkgToggleSwitchOnHover": "#82abf1",
    "TextCtlPressed": "#ffffff",
    "StrokeOverRest": "#00000000",
    "StrokeStripe": "#0a0a0a",
    "TextErrorSelected": "#f1bbbc",
    "StrokeCtlHover": "#858585",
    "TextStripe": "#a8a8a8",
    "StrokeCtl": "#757575",
    "TextStripeDisabled": "#5c5c5c",
    "StrokeOverHover": "#757575",
    "StrokeOverPressed": "#6b6b6b",
    "TextHyperlinkParentHoveredPressed": "#598fec",
    "BkgCtlEmphasis": "#598fec",
    "StrokeOverSelectedRest": "#adadad",
    "BkgCtlHover": "#3d3d3d",
    "BkgCtlPressed": "#1f1f1f",
    "BkgCtlDisabled": "#141414",
    "TextCtlDisabled": "#5c5c5c",
    "StrokeCtlKeyboard": "#ffffff",
    "BkgCtlEmphasisHover": "#82abf1",
    "TextCtlEmphasis": "#000000",
    "TextCtlEmphasisHover": "#000000",
    "StrokeCtlEmphasis": "#598fec",
    "StrokeCtlEmphasisPressed": "#3d7ce8",
    "StrokeCtlEmphasisDisabled": "#424242",
    "StrokeCtlEmphasisKeyboard": "#000000",
    "BkgCtlSubtle": "#292929",
    "BkgCtlSubtleHover": "#3d3d3d",
    "BkgCtlSubtlePressed": "#1f1f1f",
    "BkgCtlSubtleDisabled": "#141414",
    "BkgCtlSubtleSelectionHighlight": "#adadad",
    "BkgTextBox": "#292929",
    "BkgTextBoxHover": "#3d3d3d",
    "BkgTextBoxPressed": "#1f1f1f",
    "ThumbToggleSwitchOnDisabled": "#141414",
    "BkgTextBoxDisabled": "#141414",
    "BkgTextBoxSelectionHighlight": "#adadad",
    "TextCtlSubtle": "#ffffff",
    "TextCtlSubtleHover": "#ffffff",
    "TextCtlSubtlePressed": "#ffffff",
    "TextCtlSubtleDisabled": "#5c5c5c",
    "TextCtlSubtleSelectionHighlight": "#000000",
    "TextTextBox": "#ffffff",
    "TextTextBoxHyperlink": "#82abf1",
    "TextTextBoxPlaceholder": "#999999",
    "TextTextBoxHover": "#ffffff",
    "TextActiveHover": "#82abf1",
    "TextTextBoxPressed": "#ffffff",
    "TextTextBoxDisabled": "#5c5c5c",
    "TextTextBoxSelectionHighlight": "#000000",
    "SliderToolTipBkg": "#333333",
    "StrokeCtlSubtle": "#757575",
    "StrokeCtlSubtleHover": "#858585",
    "StrokeCtlSubtlePressed": "#858585",
    "StrokeCtlSubtleDisabled": "#424242",
    "StrokeCtlSubtleKeyboard": "#ffffff",
    "StrokeTextBox": "#757575",
    "StrokeTextBoxHover": "#858585",
    "StrokeTextBoxPressed": "#858585",
    "StrokeTextBoxDisabled": "#424242",
    "StrokeOverSubtleHover": "#00000000",
    "ThumbToggleSwitchOffDisabled": "#5c5c5c",
    "StrokeTextBoxKeyboard": "#ffffff",
    "TextHyperlink": "#82abf1",
    "TextHyperlinkHover": "#aec6f0",
    "TextHyperlinkParentHovered": "#aec6f0",
    "TextHyperlinkPressed": "#598fec",
    "TextHyperlinkParentHoveredHover": "#d2e0f4",
    "TextHyperlinkParentSelected": "#82abf1",
    "TextHyperlinkParentSelectedHover": "#aec6f0",
    "TextHyperlinkParentSelectedPressed": "#598fec",
    "TextActive": "#ffffff",
    "TextActivePressed": "#3d7ce8",
    "TextActiveSelected": "#82abf1",
    "StrokeOnlyHover": "#82abf1",
    "GlyphAsButtonSubtlePressed": "#e5e5e5",
    "StrokeOnlyPressed": "#3d7ce8",
    "StrokeOnlySelected": "#598fec",
    "TextError": "#f1bbbc",
    "TextErrorPressed": "#f1bbbc",
    "ThumbToggleSwitchOff": "#ffffff",
    "ThumbToggleSwitchOffHover": "#ffffff",
    "ThumbToggleSwitchOffPressed": "#ffffff",
    "ThumbToggleSwitchOn": "#000000",
    "StrokeBadge": "#d13438",
    "ThumbToggleSwitchOnHover": "#000000",
    "ThumbToggleSwitchOnPressed": "#000000",
    "BkgToggleSwitchOff": "#292929",
    "BkgToggleSwitchOffHover": "#292929",
    "BkgToggleSwitchOffPressed": "#292929",
    "BkgToggleSwitchOffDisabled": "#141414",
    "BkgToggleSwitchOn": "#598fec",
    "BkgToggleSwitchOnPressed": "#3d7ce8",
    "BkgToggleSwitchOnDisabled": "#5c5c5c",
    "StrokeToggleSwitchOff": "#ffffff",
    "StrokeToggleSwitchOffHover": "#ffffff",
    "StrokeToggleSwitchOffPressed": "#ffffff",
    "StrokeToggleSwitchOn": "#598fec",
    "StrokeToggleSwitchOnHover": "#82abf1",
    "StrokeToggleSwitchOnPressed": "#3d7ce8",
    "StrokeToggleSwitchOnDisabled": "#141414",
    "SliderPrimary": "#b2b2b2",
    "SliderPrimaryHover": "#598fec",
    "SliderPrimaryPressed": "#3d7ce8",
    "SliderKeyboard": "#ffffff",
    "SliderPrimaryDisabled": "#5c5c5c",
    "SliderBuffer": "#424242",
    "SliderToolTipBorder": "#424242",
    "BkgSubtle": "#141414",
    "GlyphAsButtonSubtle": "#999999",
    "AccentDark": "#adadad",
    "AccentLight": "#666666",
    "AccentEmphasis": "#598fec",
    "AccentOutline": "#ffffff",
    "BkgTextBoxSelected": "#383838",
    "BkgTextBoxFocus": "#292929",
    "BkgTextBoxHoverDisabled": "#141414",
    "BkgTextBoxSelectedDisabled": "#141414",
    "BkgCtlSubtleFocus": "#292929",
    "TextTextBoxSelected": "#ffffff",
    "BkgCtlSubtleSelected": "#383838",
    "TextCtlSubtleSelected": "#ffffff",
    "BkgCtlSubtleHoverDisabled": "#141414",
    "BkgCtlSubtleSelectedDisabled": "#141414",
    "TextHeader": "#ffffff",
    "BkgBadge": "#d13438",
    "TextBadge": "#ffffff"
   },
   "Card": {
    "StrokeOverSelectedHover": "#c7c7c7",
    "BkgCtlEmphasisFocus": "#296fe6",
    "Bkg": "#292929",
    "Text": "#ffffff",
    "BkgAccentTint": "#0c2145",
    "BkgHover": "#3d3d3d",
    "TextEmphasisSelected": "#82abf1",
    "TextSecondary": "#d6d6d6",
    "BkgPressed": "#1f1f1f",
    "StrokeCtlEmphasisHover": "#82abf1",
    "BkgSelectionHighlight": "#adadad",
    "BkgCtl": "#292929",
    "BkgSelected": "#383838",
    "BkgCtlEmphasisDisabled": "#141414",
    "TextRest": "#ffffff",
    "TextCtlEmphasisPressed": "#000000",
    "GlyphAsButtonSubtleHover": "#d6d6d6",
    "TextHover": "#ffffff",
    "TextPressed": "#ffffff",
    "SliderToolTipLabel": "#ffffff",
    "StrokeCtlSelected": "#858585",
    "TextSelected": "#ffffff",
    "TextDisabled": "#5c5c5c",
    "TextCtlEmphasisDisabled": "#5c5c5c",
    "BkgCtlEmphasisPressed": "#3d7ce8",
    "TextSelectionHighlight": "#000000",
    "SliderSecondary": "#808080",
    "TextAccentTint": "#ffffff",
    "BkgCtlSelected": "#383838",
    "TextCtlSelected": "#ffffff",
    "BkgStripe": "#00000000",
    "TextSecondaryRest": "#d6d6d6",
    "TextCtlSubtlePlaceholder": "#999999",
    "TextSecondaryHover": "#ffffff",
    "TextSecondaryPressed": "#ffffff",
    "TextSecondarySelected": "#ffffff",
    "StrokeCtlDisabled": "#424242",
    "TextErrorHover": "#f1bbbc",
    "TextEmphasis": "#82abf1",
    "TextEmphasis2": "#598fec",
    "TextEmphasisRest": "#82abf1",
    "TextCtlHover": "#ffffff",
    "TextEmphasisHover": "#aec6f0",
    "StrokeStripeOuter": "#7a7a7a",
    "TextEmphasisPressed": "#598fec",
    "TextCtl": "#ffffff",
    "BkgHeader": "#1f1f1f",
    "StrokeSelectedHover": "#757575",
    "StrokeKeyboard": "#ffffff",
    "StrokeOverSelectedPressed": "#949494",
    "StrokeKeyboardInverse": "#000000",
    "StrokeCtlPressed": "#858585",
    "StrokeKeyboardSelected": "#ffffff",
    "StrokeToggleSwitchOffDisabled": "#5c5c5c",
    "BkgToggleSwitchOnHover": "#82abf1",
    "TextCtlPressed": "#ffffff",
    "StrokeOverRest": "#00000000",
    "StrokeStripe": "#141414",
    "TextErrorSelected": "#f1bbbc",
    "StrokeCtlHover": "#858585",
    "TextStripe": "#b2b2b2",
    "StrokeCtl": "#757575",
    "TextStripeDisabled": "#5c5c5c",
    "StrokeOverHover": "#757575",
    "StrokeOverPressed": "#6b6b6b",
    "TextHyperlinkParentHoveredPressed": "#598fec",
    "BkgCtlEmphasis": "#598fec",
    "StrokeOverSelectedRest": "#adadad",
    "BkgCtlHover": "#3d3d3d",
    "BkgCtlPressed": "#1f1f1f",
    "BkgCtlDisabled": "#141414",
    "TextCtlDisabled": "#5c5c5c",
    "StrokeCtlKeyboard": "#ffffff",
    "BkgCtlEmphasisHover": "#82abf1",
    "TextCtlEmphasis": "#000000",
    "TextCtlEmphasisHover": "#000000",
    "StrokeCtlEmphasis": "#598fec",
    "StrokeCtlEmphasisPressed": "#3d7ce8",
    "StrokeCtlEmphasisDisabled": "#424242",
    "StrokeCtlEmphasisKeyboard": "#000000",
    "BkgCtlSubtle": "#292929",
    "BkgCtlSubtleHover": "#3d3d3d",
    "BkgCtlSubtlePressed": "#1f1f1f",
    "BkgCtlSubtleDisabled": "#141414",
    "BkgCtlSubtleSelectionHighlight": "#adadad",
    "BkgTextBox": "#292929",
    "BkgTextBoxHover": "#3d3d3d",
    "BkgTextBoxPressed": "#1f1f1f",
    "ThumbToggleSwitchOnDisabled": "#141414",
    "BkgTextBoxDisabled": "#141414",
    "BkgTextBoxSelectionHighlight": "#adadad",
    "TextCtlSubtle": "#ffffff",
    "TextCtlSubtleHover": "#ffffff",
    "TextCtlSubtlePressed": "#ffffff",
    "TextCtlSubtleDisabled": "#5c5c5c",
    "TextCtlSubtleSelectionHighlight": "#000000",
    "TextTextBox": "#ffffff",
    "TextTextBoxHyperlink": "#82abf1",
    "TextTextBoxPlaceholder": "#999999",
    "TextTextBoxHover": "#ffffff",
    "TextActiveHover": "#82abf1",
    "TextTextBoxPressed": "#ffffff",
    "TextTextBoxDisabled": "#5c5c5c",
    "TextTextBoxSelectionHighlight": "#000000",
    "SliderToolTipBkg": "#333333",
    "StrokeCtlSubtle": "#757575",
    "StrokeCtlSubtleHover": "#858585",
    "StrokeCtlSubtlePressed": "#858585",
    "StrokeCtlSubtleDisabled": "#424242",
    "StrokeCtlSubtleKeyboard": "#ffffff",
    "StrokeTextBox": "#757575",
    "StrokeTextBoxHover": "#858585",
    "StrokeTextBoxPressed": "#858585",
    "StrokeTextBoxDisabled": "#424242",
    "StrokeOverSubtleHover": "#00000000",
    "ThumbToggleSwitchOffDisabled": "#5c5c5c",
    "StrokeTextBoxKeyboard": "#ffffff",
    "TextHyperlink": "#82abf1",
    "TextHyperlinkHover": "#aec6f0",
    "TextHyperlinkParentHovered": "#aec6f0",
    "TextHyperlinkPressed": "#598fec",
    "TextHyperlinkParentHoveredHover": "#d2e0f4",
    "TextHyperlinkParentSelected": "#82abf1",
    "TextHyperlinkParentSelectedHover": "#aec6f0",
    "TextHyperlinkParentSelectedPressed": "#598fec",
    "TextActive": "#ffffff",
    "TextActivePressed": "#3d7ce8",
    "TextActiveSelected": "#82abf1",
    "StrokeOnlyHover": "#82abf1",
    "GlyphAsButtonSubtlePressed": "#e5e5e5",
    "StrokeOnlyPressed": "#3d7ce8",
    "StrokeOnlySelected": "#598fec",
    "TextError": "#f1bbbc",
    "TextErrorPressed": "#f1bbbc",
    "ThumbToggleSwitchOff": "#ffffff",
    "ThumbToggleSwitchOffHover": "#ffffff",
    "ThumbToggleSwitchOffPressed": "#ffffff",
    "ThumbToggleSwitchOn": "#000000",
    "StrokeBadge": "#d13438",
    "ThumbToggleSwitchOnHover": "#000000",
    "ThumbToggleSwitchOnPressed": "#000000",
    "BkgToggleSwitchOff": "#292929",
    "BkgToggleSwitchOffHover": "#292929",
    "BkgToggleSwitchOffPressed": "#292929",
    "BkgToggleSwitchOffDisabled": "#141414",
    "BkgToggleSwitchOn": "#598fec",
    "BkgToggleSwitchOnPressed": "#3d7ce8",
    "BkgToggleSwitchOnDisabled": "#5c5c5c",
    "StrokeToggleSwitchOff": "#ffffff",
    "StrokeToggleSwitchOffHover": "#ffffff",
    "StrokeToggleSwitchOffPressed": "#ffffff",
    "StrokeToggleSwitchOn": "#598fec",
    "StrokeToggleSwitchOnHover": "#82abf1",
    "StrokeToggleSwitchOnPressed": "#3d7ce8",
    "StrokeToggleSwitchOnDisabled": "#141414",
    "SliderPrimary": "#b2b2b2",
    "SliderPrimaryHover": "#598fec",
    "SliderPrimaryPressed": "#3d7ce8",
    "SliderKeyboard": "#ffffff",
    "SliderPrimaryDisabled": "#5c5c5c",
    "SliderBuffer": "#424242",
    "SliderToolTipBorder": "#424242",
    "BkgSubtle": "#141414",
    "GlyphAsButtonSubtle": "#999999",
    "AccentDark": "#adadad",
    "AccentLight": "#666666",
    "AccentEmphasis": "#598fec",
    "AccentOutline": "#ffffff",
    "BkgTextBoxSelected": "#383838",
    "BkgTextBoxFocus": "#292929",
    "BkgTextBoxHoverDisabled": "#141414",
    "BkgTextBoxSelectedDisabled": "#141414",
    "BkgCtlSubtleFocus": "#292929",
    "TextTextBoxSelected": "#ffffff",
    "BkgCtlSubtleSelected": "#383838",
    "TextCtlSubtleSelected": "#ffffff",
    "BkgCtlSubtleHoverDisabled": "#141414",
    "BkgCtlSubtleSelectedDisabled": "#141414",
    "TextHeader": "#ffffff",
    "BkgBadge": "#d13438",
    "TextBadge": "#ffffff"
   }
  },
  "Typography": {
   "families": {
    "monospace": "Segoe UI",
    "primary": "Segoe UI",
    "serif": "Segoe UI",
    "secondary": "Segoe UI",
    "cursive": "Segoe UI",
    "sansSerif": "Segoe UI"
   },
   "sizes": {
    "xSmall": 11,
    "xxxSmall": 11,
    "medium": 12,
    "xxxLarge": 21,
    "xxSmall": 11,
    "large": 13,
    "small": 11,
    "xLarge": 15,
    "xxLarge": 19
   },
   "weights": {
    "light": "300",
    "semiLight": "350",
    "medium": "400",
    "semiBold": "600",
    "bold": "700"
   }
  }
 }
}
[10:20:50.168] prefers-reduced-motion: reduce true
[10:20:50.168] prefers-color-scheme: dark false
[10:20:50.168] ✓ spike1-theme
[10:21:06.580] ▶ spike1-theme
[10:21:06.580] officeTheme {
 "bodyBackgroundColor": "#ffffff",
 "bodyForegroundColor": "#444444",
 "controlBackgroundColor": "#fdfdfd",
 "controlForegroundColor": "#444444",
 "themeId": 3,
 "isDarkTheme": false,
 "fluentThemeData": {
  "VisualSurface": "Panes",
  "Theme": "White",
  "Palettes": {
   "Base": {
    "StrokeOverSelectedHover": "#7a7a7a",
    "BkgCtlEmphasisFocus": "#185abd",
    "Bkg": "#fafafa",
    "Text": "#242424",
    "BkgAccentTint": "#d2e0f4",
    "BkgHover": "#f0f0f0",
    "TextEmphasisSelected": "#13458f",
    "TextSecondary": "#424242",
    "BkgPressed": "#d8d8d8",
    "StrokeCtlEmphasisHover": "#1651aa",
    "BkgSelectionHighlight": "#616161",
    "BkgCtl": "#ffffff",
    "BkgSelected": "#e5e5e5",
    "BkgCtlEmphasisDisabled": "#f0f0f0",
    "TextRest": "#242424",
    "TextCtlEmphasisPressed": "#ffffff",
    "GlyphAsButtonSubtleHover": "#3d3d3d",
    "TextHover": "#242424",
    "TextPressed": "#242424",
    "SliderToolTipLabel": "#242424",
    "StrokeCtlSelected": "#8a8a8a",
    "TextSelected": "#242424",
    "TextDisabled": "#999999",
    "TextCtlEmphasisDisabled": "#999999",
    "BkgCtlEmphasisPressed": "#0e336a",
    "TextSelectionHighlight": "#ffffff",
    "SliderSecondary": "#808080",
    "TextAccentTint": "#242424",
    "BkgCtlSelected": "#ebebeb",
    "TextCtlSelected": "#242424",
    "BkgStripe": "#00000000",
    "TextSecondaryRest": "#424242",
    "TextCtlSubtlePlaceholder": "#707070",
    "TextSecondaryHover": "#242424",
    "TextSecondaryPressed": "#242424",
    "TextSecondarySelected": "#242424",
    "StrokeCtlDisabled": "#e0e0e0",
    "TextErrorHover": "#9f282b",
    "TextEmphasis": "#1651aa",
    "TextEmphasis2": "#185abd",
    "TextEmphasisRest": "#1651aa",
    "TextCtlHover": "#242424",
    "TextEmphasisHover": "#13458f",
    "StrokeStripeOuter": "#8f8f8f",
    "TextEmphasisPressed": "#0e336a",
    "TextCtl": "#242424",
    "BkgHeader": "#fafafa",
    "StrokeSelectedHover": "#c7c7c7",
    "StrokeKeyboard": "#000000",
    "StrokeOverSelectedPressed": "#474747",
    "StrokeKeyboardInverse": "#ffffff",
    "StrokeCtlPressed": "#8a8a8a",
    "StrokeKeyboardSelected": "#000000",
    "StrokeToggleSwitchOffDisabled": "#e0e0e0",
    "BkgToggleSwitchOnHover": "#1651aa",
    "TextCtlPressed": "#242424",
    "StrokeOverRest": "#00000000",
    "StrokeStripe": "#e5e5e5",
    "TextErrorSelected": "#9f282b",
    "StrokeCtlHover": "#8a8a8a",
    "TextStripe": "#575757",
    "StrokeCtl": "#8a8a8a",
    "TextStripeDisabled": "#999999",
    "StrokeOverHover": "#c7c7c7",
    "StrokeOverPressed": "#b2b2b2",
    "TextHyperlinkParentHoveredPressed": "#1651aa",
    "BkgCtlEmphasis": "#185abd",
    "StrokeOverSelectedRest": "#616161",
    "BkgCtlHover": "#f5f5f5",
    "BkgCtlPressed": "#e0e0e0",
    "BkgCtlDisabled": "#f0f0f0",
    "TextCtlDisabled": "#999999",
    "StrokeCtlKeyboard": "#000000",
    "BkgCtlEmphasisHover": "#1651aa",
    "TextCtlEmphasis": "#ffffff",
    "TextCtlEmphasisHover": "#ffffff",
    "StrokeCtlEmphasis": "#185abd",
    "StrokeCtlEmphasisPressed": "#0e336a",
    "StrokeCtlEmphasisDisabled": "#e0e0e0",
    "StrokeCtlEmphasisKeyboard": "#ffffff",
    "BkgCtlSubtle": "#ffffff",
    "BkgCtlSubtleHover": "#f5f5f5",
    "BkgCtlSubtlePressed": "#e0e0e0",
    "BkgCtlSubtleDisabled": "#f0f0f0",
    "BkgCtlSubtleSelectionHighlight": "#616161",
    "BkgTextBox": "#ffffff",
    "BkgTextBoxHover": "#f5f5f5",
    "BkgTextBoxPressed": "#e0e0e0",
    "ThumbToggleSwitchOnDisabled": "#999999",
    "BkgTextBoxDisabled": "#f0f0f0",
    "BkgTextBoxSelectionHighlight": "#616161",
    "TextCtlSubtle": "#242424",
    "TextCtlSubtleHover": "#242424",
    "TextCtlSubtlePressed": "#242424",
    "TextCtlSubtleDisabled": "#999999",
    "TextCtlSubtleSelectionHighlight": "#ffffff",
    "TextTextBox": "#242424",
    "TextTextBoxHyperlink": "#185abd",
    "TextTextBoxPlaceholder": "#707070",
    "TextTextBoxHover": "#242424",
    "TextActiveHover": "#1651aa",
    "TextTextBoxPressed": "#242424",
    "TextTextBoxDisabled": "#999999",
    "TextTextBoxSelectionHighlight": "#ffffff",
    "SliderToolTipBkg": "#ffffff",
    "StrokeCtlSubtle": "#8a8a8a",
    "StrokeCtlSubtleHover": "#808080",
    "StrokeCtlSubtlePressed": "#6b6b6b",
    "StrokeCtlSubtleDisabled": "#d1d1d1",
    "StrokeCtlSubtleKeyboard": "#000000",
    "StrokeTextBox": "#8a8a8a",
    "StrokeTextBoxHover": "#808080",
    "StrokeTextBoxPressed": "#707070",
    "StrokeTextBoxDisabled": "#e0e0e0",
    "StrokeOverSubtleHover": "#00000000",
    "ThumbToggleSwitchOffDisabled": "#bdbdbd",
    "StrokeTextBoxKeyboard": "#000000",
    "TextHyperlink": "#1651aa",
    "TextHyperlinkHover": "#13458f",
    "TextHyperlinkParentHovered": "#0e336a",
    "TextHyperlinkPressed": "#0e336a",
    "TextHyperlinkParentHoveredHover": "#13458f",
    "TextHyperlinkParentSelected": "#0e336a",
    "TextHyperlinkParentSelectedHover": "#13458f",
    "TextHyperlinkParentSelectedPressed": "#1651aa",
    "TextActive": "#242424",
    "TextActivePressed": "#0e336a",
    "TextActiveSelected": "#13458f",
    "StrokeOnlyHover": "#1651aa",
    "GlyphAsButtonSubtlePressed": "#2e2e2e",
    "StrokeOnlyPressed": "#0e336a",
    "StrokeOnlySelected": "#185abd",
    "TextError": "#9f282b",
    "TextErrorPressed": "#9f282b",
    "ThumbToggleSwitchOff": "#616161",
    "ThumbToggleSwitchOffHover": "#575757",
    "ThumbToggleSwitchOffPressed": "#4d4d4d",
    "ThumbToggleSwitchOn": "#ffffff",
    "StrokeBadge": "#d13438",
    "ThumbToggleSwitchOnHover": "#ffffff",
    "ThumbToggleSwitchOnPressed": "#ffffff",
    "BkgToggleSwitchOff": "#ffffff",
    "BkgToggleSwitchOffHover": "#ffffff",
    "BkgToggleSwitchOffPressed": "#ffffff",
    "BkgToggleSwitchOffDisabled": "#f0f0f0",
    "BkgToggleSwitchOn": "#185abd",
    "BkgToggleSwitchOnPressed": "#0e336a",
    "BkgToggleSwitchOnDisabled": "#f0f0f0",
    "StrokeToggleSwitchOff": "#616161",
    "StrokeToggleSwitchOffHover": "#575757",
    "StrokeToggleSwitchOffPressed": "#4d4d4d",
    "StrokeToggleSwitchOn": "#185abd",
    "StrokeToggleSwitchOnHover": "#1651aa",
    "StrokeToggleSwitchOnPressed": "#0e336a",
    "StrokeToggleSwitchOnDisabled": "#e0e0e0",
    "SliderPrimary": "#616161",
    "SliderPrimaryHover": "#1651aa",
    "SliderPrimaryPressed": "#0e336a",
    "SliderKeyboard": "#000000",
    "SliderPrimaryDisabled": "#999999",
    "SliderBuffer": "#e0e0e0",
    "SliderToolTipBorder": "#e0e0e0",
    "BkgSubtle": "#f0f0f0",
    "GlyphAsButtonSubtle": "#6b6b6b",
    "AccentDark": "#616161",
    "AccentLight": "#d1d1d1",
    "AccentEmphasis": "#1651aa",
    "AccentOutline": "#000000",
    "BkgTextBoxSelected": "#ebebeb",
    "BkgTextBoxFocus": "#ffffff",
    "BkgTextBoxHoverDisabled": "#f0f0f0",
    "BkgTextBoxSelectedDisabled": "#f0f0f0",
    "BkgCtlSubtleFocus": "#ffffff",
    "TextTextBoxSelected": "#242424",
    "BkgCtlSubtleSelected": "#ebebeb",
    "TextCtlSubtleSelected": "#242424",
    "BkgCtlSubtleHoverDisabled": "#f0f0f0",
    "BkgCtlSubtleSelectedDisabled": "#f0f0f0",
    "TextHeader": "#242424",
    "BkgBadge": "#d13438",
    "TextBadge": "#ffffff"
   },
   "Card": {
    "StrokeOverSelectedHover": "#7a7a7a",
    "BkgCtlEmphasisFocus": "#185abd",
    "Bkg": "#ffffff",
    "Text": "#242424",
    "BkgAccentTint": "#d2e0f4",
    "BkgHover": "#f5f5f5",
    "TextEmphasisSelected": "#13458f",
    "TextSecondary": "#424242",
    "BkgPressed": "#e0e0e0",
    "StrokeCtlEmphasisHover": "#1651aa",
    "BkgSelectionHighlight": "#616161",
    "BkgCtl": "#ffffff",
    "BkgSelected": "#ebebeb",
    "BkgCtlEmphasisDisabled": "#f0f0f0",
    "TextRest": "#242424",
    "TextCtlEmphasisPressed": "#ffffff",
    "GlyphAsButtonSubtleHover": "#424242",
    "TextHover": "#242424",
    "TextPressed": "#242424",
    "SliderToolTipLabel": "#242424",
    "StrokeCtlSelected": "#8a8a8a",
    "TextSelected": "#242424",
    "TextDisabled": "#999999",
    "TextCtlEmphasisDisabled": "#999999",
    "BkgCtlEmphasisPressed": "#0e336a",
    "TextSelectionHighlight": "#ffffff",
    "SliderSecondary": "#808080",
    "TextAccentTint": "#242424",
    "BkgCtlSelected": "#ebebeb",
    "TextCtlSelected": "#242424",
    "BkgStripe": "#00000000",
    "TextSecondaryRest": "#424242",
    "TextCtlSubtlePlaceholder": "#707070",
    "TextSecondaryHover": "#242424",
    "TextSecondaryPressed": "#242424",
    "TextSecondarySelected": "#242424",
    "StrokeCtlDisabled": "#e0e0e0",
    "TextErrorHover": "#9f282b",
    "TextEmphasis": "#185abd",
    "TextEmphasis2": "#185abd",
    "TextEmphasisRest": "#185abd",
    "TextCtlHover": "#242424",
    "TextEmphasisHover": "#1651aa",
    "StrokeStripeOuter": "#949494",
    "TextEmphasisPressed": "#0e336a",
    "TextCtl": "#242424",
    "BkgHeader": "#fafafa",
    "StrokeSelectedHover": "#c7c7c7",
    "StrokeKeyboard": "#000000",
    "StrokeOverSelectedPressed": "#474747",
    "StrokeKeyboardInverse": "#ffffff",
    "StrokeCtlPressed": "#8a8a8a",
    "StrokeKeyboardSelected": "#000000",
    "StrokeToggleSwitchOffDisabled": "#e0e0e0",
    "BkgToggleSwitchOnHover": "#1651aa",
    "TextCtlPressed": "#242424",
    "StrokeOverRest": "#00000000",
    "StrokeStripe": "#ebebeb",
    "TextErrorSelected": "#9f282b",
    "StrokeCtlHover": "#8a8a8a",
    "TextStripe": "#5c5c5c",
    "StrokeCtl": "#8a8a8a",
    "TextStripeDisabled": "#999999",
    "StrokeOverHover": "#c7c7c7",
    "StrokeOverPressed": "#b2b2b2",
    "TextHyperlinkParentHoveredPressed": "#1651aa",
    "BkgCtlEmphasis": "#185abd",
    "StrokeOverSelectedRest": "#616161",
    "BkgCtlHover": "#f5f5f5",
    "BkgCtlPressed": "#e0e0e0",
    "BkgCtlDisabled": "#f0f0f0",
    "TextCtlDisabled": "#999999",
    "StrokeCtlKeyboard": "#000000",
    "BkgCtlEmphasisHover": "#1651aa",
    "TextCtlEmphasis": "#ffffff",
    "TextCtlEmphasisHover": "#ffffff",
    "StrokeCtlEmphasis": "#185abd",
    "StrokeCtlEmphasisPressed": "#0e336a",
    "StrokeCtlEmphasisDisabled": "#e0e0e0",
    "StrokeCtlEmphasisKeyboard": "#ffffff",
    "BkgCtlSubtle": "#ffffff",
    "BkgCtlSubtleHover": "#f5f5f5",
    "BkgCtlSubtlePressed": "#e0e0e0",
    "BkgCtlSubtleDisabled": "#f0f0f0",
    "BkgCtlSubtleSelectionHighlight": "#616161",
    "BkgTextBox": "#ffffff",
    "BkgTextBoxHover": "#f5f5f5",
    "BkgTextBoxPressed": "#e0e0e0",
    "ThumbToggleSwitchOnDisabled": "#999999",
    "BkgTextBoxDisabled": "#f0f0f0",
    "BkgTextBoxSelectionHighlight": "#616161",
    "TextCtlSubtle": "#242424",
    "TextCtlSubtleHover": "#242424",
    "TextCtlSubtlePressed": "#242424",
    "TextCtlSubtleDisabled": "#999999",
    "TextCtlSubtleSelectionHighlight": "#ffffff",
    "TextTextBox": "#242424",
    "TextTextBoxHyperlink": "#185abd",
    "TextTextBoxPlaceholder": "#707070",
    "TextTextBoxHover": "#242424",
    "TextActiveHover": "#1651aa",
    "TextTextBoxPressed": "#242424",
    "TextTextBoxDisabled": "#999999",
    "TextTextBoxSelectionHighlight": "#ffffff",
    "SliderToolTipBkg": "#ffffff",
    "StrokeCtlSubtle": "#8a8a8a",
    "StrokeCtlSubtleHover": "#808080",
    "StrokeCtlSubtlePressed": "#6b6b6b",
    "StrokeCtlSubtleDisabled": "#d1d1d1",
    "StrokeCtlSubtleKeyboard": "#000000",
    "StrokeTextBox": "#8a8a8a",
    "StrokeTextBoxHover": "#808080",
    "StrokeTextBoxPressed": "#707070",
    "StrokeTextBoxDisabled": "#e0e0e0",
    "StrokeOverSubtleHover": "#00000000",
    "ThumbToggleSwitchOffDisabled": "#bdbdbd",
    "StrokeTextBoxKeyboard": "#000000",
    "TextHyperlink": "#185abd",
    "TextHyperlinkHover": "#1651aa",
    "TextHyperlinkParentHovered": "#0e336a",
    "TextHyperlinkPressed": "#0e336a",
    "TextHyperlinkParentHoveredHover": "#13458f",
    "TextHyperlinkParentSelected": "#0e336a",
    "TextHyperlinkParentSelectedHover": "#13458f",
    "TextHyperlinkParentSelectedPressed": "#1651aa",
    "TextActive": "#242424",
    "TextActivePressed": "#0e336a",
    "TextActiveSelected": "#13458f",
    "StrokeOnlyHover": "#1651aa",
    "GlyphAsButtonSubtlePressed": "#333333",
    "StrokeOnlyPressed": "#0e336a",
    "StrokeOnlySelected": "#185abd",
    "TextError": "#9f282b",
    "TextErrorPressed": "#9f282b",
    "ThumbToggleSwitchOff": "#616161",
    "ThumbToggleSwitchOffHover": "#575757",
    "ThumbToggleSwitchOffPressed": "#4d4d4d",
    "ThumbToggleSwitchOn": "#ffffff",
    "StrokeBadge": "#d13438",
    "ThumbToggleSwitchOnHover": "#ffffff",
    "ThumbToggleSwitchOnPressed": "#ffffff",
    "BkgToggleSwitchOff": "#ffffff",
    "BkgToggleSwitchOffHover": "#ffffff",
    "BkgToggleSwitchOffPressed": "#ffffff",
    "BkgToggleSwitchOffDisabled": "#f0f0f0",
    "BkgToggleSwitchOn": "#185abd",
    "BkgToggleSwitchOnPressed": "#0e336a",
    "BkgToggleSwitchOnDisabled": "#f0f0f0",
    "StrokeToggleSwitchOff": "#616161",
    "StrokeToggleSwitchOffHover": "#575757",
    "StrokeToggleSwitchOffPressed": "#4d4d4d",
    "StrokeToggleSwitchOn": "#185abd",
    "StrokeToggleSwitchOnHover": "#1651aa",
    "StrokeToggleSwitchOnPressed": "#0e336a",
    "StrokeToggleSwitchOnDisabled": "#e0e0e0",
    "SliderPrimary": "#616161",
    "SliderPrimaryHover": "#1651aa",
    "SliderPrimaryPressed": "#0e336a",
    "SliderKeyboard": "#000000",
    "SliderPrimaryDisabled": "#999999",
    "SliderBuffer": "#e0e0e0",
    "SliderToolTipBorder": "#e0e0e0",
    "BkgSubtle": "#f5f5f5",
    "GlyphAsButtonSubtle": "#707070",
    "AccentDark": "#616161",
    "AccentLight": "#d1d1d1",
    "AccentEmphasis": "#185abd",
    "AccentOutline": "#000000",
    "BkgTextBoxSelected": "#ebebeb",
    "BkgTextBoxFocus": "#ffffff",
    "BkgTextBoxHoverDisabled": "#f0f0f0",
    "BkgTextBoxSelectedDisabled": "#f0f0f0",
    "BkgCtlSubtleFocus": "#ffffff",
    "TextTextBoxSelected": "#242424",
    "BkgCtlSubtleSelected": "#ebebeb",
    "TextCtlSubtleSelected": "#242424",
    "BkgCtlSubtleHoverDisabled": "#f0f0f0",
    "BkgCtlSubtleSelectedDisabled": "#f0f0f0",
    "TextHeader": "#242424",
    "BkgBadge": "#d13438",
    "TextBadge": "#ffffff"
   }
  },
  "Typography": {
   "families": {
    "monospace": "Segoe UI",
    "primary": "Segoe UI",
    "serif": "Segoe UI",
    "secondary": "Segoe UI",
    "cursive": "Segoe UI",
    "sansSerif": "Segoe UI"
   },
   "sizes": {
    "xSmall": 11,
    "xxxSmall": 11,
    "medium": 12,
    "xxxLarge": 21,
    "xxSmall": 11,
    "large": 13,
    "small": 11,
    "xLarge": 15,
    "xxLarge": 19
   },
   "weights": {
    "light": "300",
    "semiLight": "350",
    "medium": "400",
    "semiBold": "600",
    "bold": "700"
   }
  }
 }
}
[10:21:06.580] prefers-reduced-motion: reduce true
[10:21:06.580] prefers-color-scheme: dark false
[10:21:06.580] ✓ spike1-theme
```
# 1.10

/N/A

# 2.1

```log
[10:22:39.276] ▶ spike2-read
[10:22:39.733] headings read {
 "mainHeadings": 301,
 "tableCellHeadings": [
  "Heading in a table cell"
 ],
 "outlineLevelsSeen": [
  10,
  1,
  2,
  3
 ],
 "listStringSamples": [
  {
   "text": "Introduction",
   "style": "Heading1",
   "listString": "1",
   "listLevel": 0
  },
  {
   "text": "Scope",
   "style": "Heading2",
   "listString": "1.1",
   "listLevel": 1
  },
  {
   "text": "Definitions",
   "style": "Heading2",
   "listString": "1.2",
   "listLevel": 1
  },
  {
   "text": "General",
   "style": "Heading1",
   "listString": "2",
   "listLevel": 0
  },
  {
   "text": "Standards",
   "style": "Heading2",
   "listString": "2.1",
   "listLevel": 1
  },
  {
   "text": "Materials",
   "style": "Heading1",
   "listString": "3",
   "listLevel": 0
  },
  {
   "text": "Concrete",
   "style": "Heading2",
   "listString": "3.1",
   "listLevel": 1
  },
  {
   "text": "Safety",
   "style": "Heading1",
   "listString": "4",
   "listLevel": 0
  },
  {
   "text": "Means of escape",
   "style": "Heading2",
   "listString": "4.1",
   "listLevel": 1
  },
  {
   "text": "Structural fire resistance",
   "style": "Heading2",
   "listString": "4.2",
   "listLevel": 1
  },
  {
   "text": "Fire strategy",
   "style": "Heading2",
   "listString": "4.3",
   "listLevel": 1
  },
  {
   "text": "Heading with bold word",
   "style": "Heading2",
   "listString": "4.4",
   "listLevel": 1
  }
 ],
 "otherStories": [
  {
   "kind": "footnote",
   "headings": [
    "\u0002 Heading in a footnote"
   ]
  },
  {
   "kind": "endnote",
   "headings": [
    "\u0002 Heading in an endnote"
   ]
  },
  {
   "kind": "header Primary",
   "headings": [
    "Heading in the header"
   ]
  },
  {
   "kind": "footer Primary",
   "headings": [
    "Heading in the footer"
   ]
  },
  {
   "kind": "textBox",
   "headings": [
    "Heading in a text box"
   ]
  }
 ],
 "textBoxSupport": true,
 "totalMs": 456
}
[10:22:39.736] ✓ spike2-read
```

# 2.2

```log
[10:24:39.105] ▶ spike2-bookmark-ranges
[10:24:39.606] content range excludes the paragraph mark [
 {
  "paragraph": "Introduction",
  "content": "Introduction"
 },
 {
  "paragraph": "Scope",
  "content": "Scope"
 },
 {
  "paragraph": "Definitions",
  "content": "Definitions"
 },
 {
  "paragraph": "General",
  "content": "General"
 },
 {
  "paragraph": "Standards",
  "content": "Standards"
 }
]
[10:24:39.606] bookmark range vs heading content range [
 {
  "heading": "Introduction",
  "bookmark": "_Toc242545896",
  "relation": "Equal"
 },
 {
  "heading": "Scope",
  "bookmark": "_Ref242545576",
  "relation": "Equal"
 },
 {
  "heading": "Scope",
  "bookmark": "_Toc242545898",
  "relation": "Equal"
 },
 {
  "heading": "Definitions",
  "bookmark": "_Toc242545899",
  "relation": "Equal"
 },
 {
  "heading": "Definitions",
  "bookmark": "WholeParagraph",
  "relation": "ContainsStart"
 },
 {
  "heading": "General",
  "bookmark": "_Toc242545900",
  "relation": "Equal"
 },
 {
  "heading": "Standards",
  "bookmark": "zeta",
  "relation": "Equal"
 },
 {
  "heading": "Standards",
  "bookmark": "Alpha",
  "relation": "Equal"
 },
 {
  "heading": "Standards",
  "bookmark": "_Toc242545901",
  "relation": "Equal"
 },
 {
  "heading": "Materials",
  "bookmark": "_Toc242545902",
  "relation": "Equal"
 },
 {
  "heading": "Concrete",
  "bookmark": "_Toc242545903",
  "relation": "Equal"
 },
 {
  "heading": "Safety",
  "bookmark": "_Toc242545904",
  "relation": "Equal"
 },
 {
  "heading": "Means of escape",
  "bookmark": "_Hlk181818181",
  "relation": "Equal"
 },
 {
  "heading": "Means of escape",
  "bookmark": "_Toc242545905",
  "relation": "Equal"
 },
 {
  "heading": "Structural fire resistance",
  "bookmark": "_Toc242545906",
  "relation": "Equal"
 },
 {
  "heading": "Structural fire resistance",
  "bookmark": "PartOfText",
  "relation": "Inside"
 },
 {
  "heading": "Fire strategy",
  "bookmark": "_Toc242545907",
  "relation": "Equal"
 },
 {
  "heading": "Heading with bold word",
  "bookmark": "_Toc242545908",
  "relation": "Equal"
 },
 {
  "heading": "Heading in a table cell",
  "bookmark": "_Toc242545909",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 5",
  "bookmark": "_Toc242545910",
  "relation": "Equal"
 },
 {
  "heading": "Topic 5.1",
  "bookmark": "_Toc242545911",
  "relation": "Equal"
 },
 {
  "heading": "Topic 5.2",
  "bookmark": "_Toc242545912",
  "relation": "Equal"
 },
 {
  "heading": "Topic 5.3",
  "bookmark": "_Toc242545913",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 6",
  "bookmark": "_Toc242545914",
  "relation": "Equal"
 },
 {
  "heading": "Topic 6.1",
  "bookmark": "_Toc242545915",
  "relation": "Equal"
 },
 {
  "heading": "Topic 6.2",
  "bookmark": "_Toc242545916",
  "relation": "Equal"
 },
 {
  "heading": "Topic 6.3",
  "bookmark": "_Toc242545917",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 7",
  "bookmark": "_Toc242545918",
  "relation": "Equal"
 },
 {
  "heading": "Topic 7.1",
  "bookmark": "_Toc242545919",
  "relation": "Equal"
 },
 {
  "heading": "Topic 7.2",
  "bookmark": "_Toc242545920",
  "relation": "Equal"
 },
 {
  "heading": "Topic 7.3",
  "bookmark": "_Toc242545921",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 8",
  "bookmark": "_Toc242545922",
  "relation": "Equal"
 },
 {
  "heading": "Topic 8.1",
  "bookmark": "_Toc242545923",
  "relation": "Equal"
 },
 {
  "heading": "Topic 8.2",
  "bookmark": "_Toc242545924",
  "relation": "Equal"
 },
 {
  "heading": "Topic 8.3",
  "bookmark": "_Toc242545925",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 9",
  "bookmark": "_Toc242545926",
  "relation": "Equal"
 },
 {
  "heading": "Topic 9.1",
  "bookmark": "_Toc242545927",
  "relation": "Equal"
 },
 {
  "heading": "Topic 9.2",
  "bookmark": "_Toc242545928",
  "relation": "Equal"
 },
 {
  "heading": "Topic 9.3",
  "bookmark": "_Toc242545929",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 10",
  "bookmark": "_Toc242545930",
  "relation": "Equal"
 },
 {
  "heading": "Topic 10.1",
  "bookmark": "_Toc242545931",
  "relation": "Equal"
 },
 {
  "heading": "Topic 10.2",
  "bookmark": "_Toc242545932",
  "relation": "Equal"
 },
 {
  "heading": "Topic 10.3",
  "bookmark": "_Toc242545933",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 11",
  "bookmark": "_Toc242545934",
  "relation": "Equal"
 },
 {
  "heading": "Topic 11.1",
  "bookmark": "_Toc242545935",
  "relation": "Equal"
 },
 {
  "heading": "Topic 11.2",
  "bookmark": "_Toc242545936",
  "relation": "Equal"
 },
 {
  "heading": "Topic 11.3",
  "bookmark": "_Toc242545937",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 12",
  "bookmark": "_Toc242545938",
  "relation": "Equal"
 },
 {
  "heading": "Topic 12.1",
  "bookmark": "_Toc242545939",
  "relation": "Equal"
 },
 {
  "heading": "Topic 12.2",
  "bookmark": "_Toc242545940",
  "relation": "Equal"
 },
 {
  "heading": "Topic 12.3",
  "bookmark": "_Toc242545941",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 13",
  "bookmark": "_Toc242545942",
  "relation": "Equal"
 },
 {
  "heading": "Topic 13.1",
  "bookmark": "_Toc242545943",
  "relation": "Equal"
 },
 {
  "heading": "Topic 13.2",
  "bookmark": "_Toc242545944",
  "relation": "Equal"
 },
 {
  "heading": "Topic 13.3",
  "bookmark": "_Toc242545945",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 14",
  "bookmark": "_Toc242545946",
  "relation": "Equal"
 },
 {
  "heading": "Topic 14.1",
  "bookmark": "_Toc242545947",
  "relation": "Equal"
 },
 {
  "heading": "Topic 14.2",
  "bookmark": "_Toc242545948",
  "relation": "Equal"
 },
 {
  "heading": "Topic 14.3",
  "bookmark": "_Toc242545949",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 15",
  "bookmark": "_Toc242545950",
  "relation": "Equal"
 },
 {
  "heading": "Topic 15.1",
  "bookmark": "_Toc242545951",
  "relation": "Equal"
 },
 {
  "heading": "Topic 15.2",
  "bookmark": "_Toc242545952",
  "relation": "Equal"
 },
 {
  "heading": "Topic 15.3",
  "bookmark": "_Toc242545953",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 16",
  "bookmark": "_Toc242545954",
  "relation": "Equal"
 },
 {
  "heading": "Topic 16.1",
  "bookmark": "_Toc242545955",
  "relation": "Equal"
 },
 {
  "heading": "Topic 16.2",
  "bookmark": "_Toc242545956",
  "relation": "Equal"
 },
 {
  "heading": "Topic 16.3",
  "bookmark": "_Toc242545957",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 17",
  "bookmark": "_Toc242545958",
  "relation": "Equal"
 },
 {
  "heading": "Topic 17.1",
  "bookmark": "_Toc242545959",
  "relation": "Equal"
 },
 {
  "heading": "Topic 17.2",
  "bookmark": "_Toc242545960",
  "relation": "Equal"
 },
 {
  "heading": "Topic 17.3",
  "bookmark": "_Toc242545961",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 18",
  "bookmark": "_Toc242545962",
  "relation": "Equal"
 },
 {
  "heading": "Topic 18.1",
  "bookmark": "_Toc242545963",
  "relation": "Equal"
 },
 {
  "heading": "Topic 18.2",
  "bookmark": "_Toc242545964",
  "relation": "Equal"
 },
 {
  "heading": "Topic 18.3",
  "bookmark": "_Toc242545965",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 19",
  "bookmark": "_Toc242545966",
  "relation": "Equal"
 },
 {
  "heading": "Topic 19.1",
  "bookmark": "_Toc242545967",
  "relation": "Equal"
 },
 {
  "heading": "Topic 19.2",
  "bookmark": "_Toc242545968",
  "relation": "Equal"
 },
 {
  "heading": "Topic 19.3",
  "bookmark": "_Toc242545969",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 20",
  "bookmark": "_Toc242545970",
  "relation": "Equal"
 },
 {
  "heading": "Topic 20.1",
  "bookmark": "_Toc242545971",
  "relation": "Equal"
 },
 {
  "heading": "Topic 20.2",
  "bookmark": "_Toc242545972",
  "relation": "Equal"
 },
 {
  "heading": "Topic 20.3",
  "bookmark": "_Toc242545973",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 21",
  "bookmark": "_Toc242545974",
  "relation": "Equal"
 },
 {
  "heading": "Topic 21.1",
  "bookmark": "_Toc242545975",
  "relation": "Equal"
 },
 {
  "heading": "Topic 21.2",
  "bookmark": "_Toc242545976",
  "relation": "Equal"
 },
 {
  "heading": "Topic 21.3",
  "bookmark": "_Toc242545977",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 22",
  "bookmark": "_Toc242545978",
  "relation": "Equal"
 },
 {
  "heading": "Topic 22.1",
  "bookmark": "_Toc242545979",
  "relation": "Equal"
 },
 {
  "heading": "Topic 22.2",
  "bookmark": "_Toc242545980",
  "relation": "Equal"
 },
 {
  "heading": "Topic 22.3",
  "bookmark": "_Toc242545981",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 23",
  "bookmark": "_Toc242545982",
  "relation": "Equal"
 },
 {
  "heading": "Topic 23.1",
  "bookmark": "_Toc242545983",
  "relation": "Equal"
 },
 {
  "heading": "Topic 23.2",
  "bookmark": "_Toc242545984",
  "relation": "Equal"
 },
 {
  "heading": "Topic 23.3",
  "bookmark": "_Toc242545985",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 24",
  "bookmark": "_Toc242545986",
  "relation": "Equal"
 },
 {
  "heading": "Topic 24.1",
  "bookmark": "_Toc242545987",
  "relation": "Equal"
 },
 {
  "heading": "Topic 24.2",
  "bookmark": "_Toc242545988",
  "relation": "Equal"
 },
 {
  "heading": "Topic 24.3",
  "bookmark": "_Toc242545989",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 25",
  "bookmark": "_Toc242545990",
  "relation": "Equal"
 },
 {
  "heading": "Topic 25.1",
  "bookmark": "_Toc242545991",
  "relation": "Equal"
 },
 {
  "heading": "Topic 25.2",
  "bookmark": "_Toc242545992",
  "relation": "Equal"
 },
 {
  "heading": "Topic 25.3",
  "bookmark": "_Toc242545993",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 26",
  "bookmark": "_Toc242545994",
  "relation": "Equal"
 },
 {
  "heading": "Topic 26.1",
  "bookmark": "_Toc242545995",
  "relation": "Equal"
 },
 {
  "heading": "Topic 26.2",
  "bookmark": "_Toc242545996",
  "relation": "Equal"
 },
 {
  "heading": "Topic 26.3",
  "bookmark": "_Toc242545997",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 27",
  "bookmark": "_Toc242545998",
  "relation": "Equal"
 },
 {
  "heading": "Topic 27.1",
  "bookmark": "_Toc242545999",
  "relation": "Equal"
 },
 {
  "heading": "Topic 27.2",
  "bookmark": "_Toc242546000",
  "relation": "Equal"
 },
 {
  "heading": "Topic 27.3",
  "bookmark": "_Toc242546001",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 28",
  "bookmark": "_Toc242546002",
  "relation": "Equal"
 },
 {
  "heading": "Topic 28.1",
  "bookmark": "_Toc242546003",
  "relation": "Equal"
 },
 {
  "heading": "Topic 28.2",
  "bookmark": "_Toc242546004",
  "relation": "Equal"
 },
 {
  "heading": "Topic 28.3",
  "bookmark": "_Toc242546005",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 29",
  "bookmark": "_Toc242546006",
  "relation": "Equal"
 },
 {
  "heading": "Topic 29.1",
  "bookmark": "_Toc242546007",
  "relation": "Equal"
 },
 {
  "heading": "Topic 29.2",
  "bookmark": "_Toc242546008",
  "relation": "Equal"
 },
 {
  "heading": "Topic 29.3",
  "bookmark": "_Toc242546009",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 30",
  "bookmark": "_Toc242546010",
  "relation": "Equal"
 },
 {
  "heading": "Topic 30.1",
  "bookmark": "_Toc242546011",
  "relation": "Equal"
 },
 {
  "heading": "Topic 30.2",
  "bookmark": "_Toc242546012",
  "relation": "Equal"
 },
 {
  "heading": "Topic 30.3",
  "bookmark": "_Toc242546013",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 31",
  "bookmark": "_Toc242546014",
  "relation": "Equal"
 },
 {
  "heading": "Topic 31.1",
  "bookmark": "_Toc242546015",
  "relation": "Equal"
 },
 {
  "heading": "Topic 31.2",
  "bookmark": "_Toc242546016",
  "relation": "Equal"
 },
 {
  "heading": "Topic 31.3",
  "bookmark": "_Toc242546017",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 32",
  "bookmark": "_Toc242546018",
  "relation": "Equal"
 },
 {
  "heading": "Topic 32.1",
  "bookmark": "_Toc242546019",
  "relation": "Equal"
 },
 {
  "heading": "Topic 32.2",
  "bookmark": "_Toc242546020",
  "relation": "Equal"
 },
 {
  "heading": "Topic 32.3",
  "bookmark": "_Toc242546021",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 33",
  "bookmark": "_Toc242546022",
  "relation": "Equal"
 },
 {
  "heading": "Topic 33.1",
  "bookmark": "_Toc242546023",
  "relation": "Equal"
 },
 {
  "heading": "Topic 33.2",
  "bookmark": "_Toc242546024",
  "relation": "Equal"
 },
 {
  "heading": "Topic 33.3",
  "bookmark": "_Toc242546025",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 34",
  "bookmark": "_Toc242546026",
  "relation": "Equal"
 },
 {
  "heading": "Topic 34.1",
  "bookmark": "_Toc242546027",
  "relation": "Equal"
 },
 {
  "heading": "Topic 34.2",
  "bookmark": "_Toc242546028",
  "relation": "Equal"
 },
 {
  "heading": "Topic 34.3",
  "bookmark": "_Toc242546029",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 35",
  "bookmark": "_Toc242546030",
  "relation": "Equal"
 },
 {
  "heading": "Topic 35.1",
  "bookmark": "_Toc242546031",
  "relation": "Equal"
 },
 {
  "heading": "Topic 35.2",
  "bookmark": "_Toc242546032",
  "relation": "Equal"
 },
 {
  "heading": "Topic 35.3",
  "bookmark": "_Toc242546033",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 36",
  "bookmark": "_Toc242546034",
  "relation": "Equal"
 },
 {
  "heading": "Topic 36.1",
  "bookmark": "_Toc242546035",
  "relation": "Equal"
 },
 {
  "heading": "Topic 36.2",
  "bookmark": "_Toc242546036",
  "relation": "Equal"
 },
 {
  "heading": "Topic 36.3",
  "bookmark": "_Toc242546037",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 37",
  "bookmark": "_Toc242546038",
  "relation": "Equal"
 },
 {
  "heading": "Topic 37.1",
  "bookmark": "_Toc242546039",
  "relation": "Equal"
 },
 {
  "heading": "Topic 37.2",
  "bookmark": "_Toc242546040",
  "relation": "Equal"
 },
 {
  "heading": "Topic 37.3",
  "bookmark": "_Toc242546041",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 38",
  "bookmark": "_Toc242546042",
  "relation": "Equal"
 },
 {
  "heading": "Topic 38.1",
  "bookmark": "_Toc242546043",
  "relation": "Equal"
 },
 {
  "heading": "Topic 38.2",
  "bookmark": "_Toc242546044",
  "relation": "Equal"
 },
 {
  "heading": "Topic 38.3",
  "bookmark": "_Toc242546045",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 39",
  "bookmark": "_Toc242546046",
  "relation": "Equal"
 },
 {
  "heading": "Topic 39.1",
  "bookmark": "_Toc242546047",
  "relation": "Equal"
 },
 {
  "heading": "Topic 39.2",
  "bookmark": "_Toc242546048",
  "relation": "Equal"
 },
 {
  "heading": "Topic 39.3",
  "bookmark": "_Toc242546049",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 40",
  "bookmark": "_Toc242546050",
  "relation": "Equal"
 },
 {
  "heading": "Topic 40.1",
  "bookmark": "_Toc242546051",
  "relation": "Equal"
 },
 {
  "heading": "Topic 40.2",
  "bookmark": "_Toc242546052",
  "relation": "Equal"
 },
 {
  "heading": "Topic 40.3",
  "bookmark": "_Toc242546053",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 41",
  "bookmark": "_Toc242546054",
  "relation": "Equal"
 },
 {
  "heading": "Topic 41.1",
  "bookmark": "_Toc242546055",
  "relation": "Equal"
 },
 {
  "heading": "Topic 41.2",
  "bookmark": "_Toc242546056",
  "relation": "Equal"
 },
 {
  "heading": "Topic 41.3",
  "bookmark": "_Toc242546057",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 42",
  "bookmark": "_Toc242546058",
  "relation": "Equal"
 },
 {
  "heading": "Topic 42.1",
  "bookmark": "_Toc242546059",
  "relation": "Equal"
 },
 {
  "heading": "Topic 42.2",
  "bookmark": "_Toc242546060",
  "relation": "Equal"
 },
 {
  "heading": "Topic 42.3",
  "bookmark": "_Toc242546061",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 43",
  "bookmark": "_Toc242546062",
  "relation": "Equal"
 },
 {
  "heading": "Topic 43.1",
  "bookmark": "_Toc242546063",
  "relation": "Equal"
 },
 {
  "heading": "Topic 43.2",
  "bookmark": "_Toc242546064",
  "relation": "Equal"
 },
 {
  "heading": "Topic 43.3",
  "bookmark": "_Toc242546065",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 44",
  "bookmark": "_Toc242546066",
  "relation": "Equal"
 },
 {
  "heading": "Topic 44.1",
  "bookmark": "_Toc242546067",
  "relation": "Equal"
 },
 {
  "heading": "Topic 44.2",
  "bookmark": "_Toc242546068",
  "relation": "Equal"
 },
 {
  "heading": "Topic 44.3",
  "bookmark": "_Toc242546069",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 45",
  "bookmark": "_Toc242546070",
  "relation": "Equal"
 },
 {
  "heading": "Topic 45.1",
  "bookmark": "_Toc242546071",
  "relation": "Equal"
 },
 {
  "heading": "Topic 45.2",
  "bookmark": "_Toc242546072",
  "relation": "Equal"
 },
 {
  "heading": "Topic 45.3",
  "bookmark": "_Toc242546073",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 46",
  "bookmark": "_Toc242546074",
  "relation": "Equal"
 },
 {
  "heading": "Topic 46.1",
  "bookmark": "_Toc242546075",
  "relation": "Equal"
 },
 {
  "heading": "Topic 46.2",
  "bookmark": "_Toc242546076",
  "relation": "Equal"
 },
 {
  "heading": "Topic 46.3",
  "bookmark": "_Toc242546077",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 47",
  "bookmark": "_Toc242546078",
  "relation": "Equal"
 },
 {
  "heading": "Topic 47.1",
  "bookmark": "_Toc242546079",
  "relation": "Equal"
 },
 {
  "heading": "Topic 47.2",
  "bookmark": "_Toc242546080",
  "relation": "Equal"
 },
 {
  "heading": "Topic 47.3",
  "bookmark": "_Toc242546081",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 48",
  "bookmark": "_Toc242546082",
  "relation": "Equal"
 },
 {
  "heading": "Topic 48.1",
  "bookmark": "_Toc242546083",
  "relation": "Equal"
 },
 {
  "heading": "Topic 48.2",
  "bookmark": "_Toc242546084",
  "relation": "Equal"
 },
 {
  "heading": "Topic 48.3",
  "bookmark": "_Toc242546085",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 49",
  "bookmark": "_Toc242546086",
  "relation": "Equal"
 },
 {
  "heading": "Topic 49.1",
  "bookmark": "_Toc242546087",
  "relation": "Equal"
 },
 {
  "heading": "Topic 49.2",
  "bookmark": "_Toc242546088",
  "relation": "Equal"
 },
 {
  "heading": "Topic 49.3",
  "bookmark": "_Toc242546089",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 50",
  "bookmark": "_Toc242546090",
  "relation": "Equal"
 },
 {
  "heading": "Topic 50.1",
  "bookmark": "_Toc242546091",
  "relation": "Equal"
 },
 {
  "heading": "Topic 50.2",
  "bookmark": "_Toc242546092",
  "relation": "Equal"
 },
 {
  "heading": "Topic 50.3",
  "bookmark": "_Toc242546093",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 51",
  "bookmark": "_Toc242546094",
  "relation": "Equal"
 },
 {
  "heading": "Topic 51.1",
  "bookmark": "_Toc242546095",
  "relation": "Equal"
 },
 {
  "heading": "Topic 51.2",
  "bookmark": "_Toc242546096",
  "relation": "Equal"
 },
 {
  "heading": "Topic 51.3",
  "bookmark": "_Toc242546097",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 52",
  "bookmark": "_Toc242546098",
  "relation": "Equal"
 },
 {
  "heading": "Topic 52.1",
  "bookmark": "_Toc242546099",
  "relation": "Equal"
 },
 {
  "heading": "Topic 52.2",
  "bookmark": "_Toc242546100",
  "relation": "Equal"
 },
 {
  "heading": "Topic 52.3",
  "bookmark": "_Toc242546101",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 53",
  "bookmark": "_Toc242546102",
  "relation": "Equal"
 },
 {
  "heading": "Topic 53.1",
  "bookmark": "_Toc242546103",
  "relation": "Equal"
 },
 {
  "heading": "Topic 53.2",
  "bookmark": "_Toc242546104",
  "relation": "Equal"
 },
 {
  "heading": "Topic 53.3",
  "bookmark": "_Toc242546105",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 54",
  "bookmark": "_Toc242546106",
  "relation": "Equal"
 },
 {
  "heading": "Topic 54.1",
  "bookmark": "_Toc242546107",
  "relation": "Equal"
 },
 {
  "heading": "Topic 54.2",
  "bookmark": "_Toc242546108",
  "relation": "Equal"
 },
 {
  "heading": "Topic 54.3",
  "bookmark": "_Toc242546109",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 55",
  "bookmark": "_Toc242546110",
  "relation": "Equal"
 },
 {
  "heading": "Topic 55.1",
  "bookmark": "_Toc242546111",
  "relation": "Equal"
 },
 {
  "heading": "Topic 55.2",
  "bookmark": "_Toc242546112",
  "relation": "Equal"
 },
 {
  "heading": "Topic 55.3",
  "bookmark": "_Toc242546113",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 56",
  "bookmark": "_Toc242546114",
  "relation": "Equal"
 },
 {
  "heading": "Topic 56.1",
  "bookmark": "_Toc242546115",
  "relation": "Equal"
 },
 {
  "heading": "Topic 56.2",
  "bookmark": "_Toc242546116",
  "relation": "Equal"
 },
 {
  "heading": "Topic 56.3",
  "bookmark": "_Toc242546117",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 57",
  "bookmark": "_Toc242546118",
  "relation": "Equal"
 },
 {
  "heading": "Topic 57.1",
  "bookmark": "_Toc242546119",
  "relation": "Equal"
 },
 {
  "heading": "Topic 57.2",
  "bookmark": "_Toc242546120",
  "relation": "Equal"
 },
 {
  "heading": "Topic 57.3",
  "bookmark": "_Toc242546121",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 58",
  "bookmark": "_Toc242546122",
  "relation": "Equal"
 },
 {
  "heading": "Topic 58.1",
  "bookmark": "_Toc242546123",
  "relation": "Equal"
 },
 {
  "heading": "Topic 58.2",
  "bookmark": "_Toc242546124",
  "relation": "Equal"
 },
 {
  "heading": "Topic 58.3",
  "bookmark": "_Toc242546125",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 59",
  "bookmark": "_Toc242546126",
  "relation": "Equal"
 },
 {
  "heading": "Topic 59.1",
  "bookmark": "_Toc242546127",
  "relation": "Equal"
 },
 {
  "heading": "Topic 59.2",
  "bookmark": "_Toc242546128",
  "relation": "Equal"
 },
 {
  "heading": "Topic 59.3",
  "bookmark": "_Toc242546129",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 60",
  "bookmark": "_Toc242546130",
  "relation": "Equal"
 },
 {
  "heading": "Topic 60.1",
  "bookmark": "_Toc242546131",
  "relation": "Equal"
 },
 {
  "heading": "Topic 60.2",
  "bookmark": "_Toc242546132",
  "relation": "Equal"
 },
 {
  "heading": "Topic 60.3",
  "bookmark": "_Toc242546133",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 61",
  "bookmark": "_Toc242546134",
  "relation": "Equal"
 },
 {
  "heading": "Topic 61.1",
  "bookmark": "_Toc242546135",
  "relation": "Equal"
 },
 {
  "heading": "Topic 61.2",
  "bookmark": "_Toc242546136",
  "relation": "Equal"
 },
 {
  "heading": "Topic 61.3",
  "bookmark": "_Toc242546137",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 62",
  "bookmark": "_Toc242546138",
  "relation": "Equal"
 },
 {
  "heading": "Topic 62.1",
  "bookmark": "_Toc242546139",
  "relation": "Equal"
 },
 {
  "heading": "Topic 62.2",
  "bookmark": "_Toc242546140",
  "relation": "Equal"
 },
 {
  "heading": "Topic 62.3",
  "bookmark": "_Toc242546141",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 63",
  "bookmark": "_Toc242546142",
  "relation": "Equal"
 },
 {
  "heading": "Topic 63.1",
  "bookmark": "_Toc242546143",
  "relation": "Equal"
 },
 {
  "heading": "Topic 63.2",
  "bookmark": "_Toc242546144",
  "relation": "Equal"
 },
 {
  "heading": "Topic 63.3",
  "bookmark": "_Toc242546145",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 64",
  "bookmark": "_Toc242546146",
  "relation": "Equal"
 },
 {
  "heading": "Topic 64.1",
  "bookmark": "_Toc242546147",
  "relation": "Equal"
 },
 {
  "heading": "Topic 64.2",
  "bookmark": "_Toc242546148",
  "relation": "Equal"
 },
 {
  "heading": "Topic 64.3",
  "bookmark": "_Toc242546149",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 65",
  "bookmark": "_Toc242546150",
  "relation": "Equal"
 },
 {
  "heading": "Topic 65.1",
  "bookmark": "_Toc242546151",
  "relation": "Equal"
 },
 {
  "heading": "Topic 65.2",
  "bookmark": "_Toc242546152",
  "relation": "Equal"
 },
 {
  "heading": "Topic 65.3",
  "bookmark": "_Toc242546153",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 66",
  "bookmark": "_Toc242546154",
  "relation": "Equal"
 },
 {
  "heading": "Topic 66.1",
  "bookmark": "_Toc242546155",
  "relation": "Equal"
 },
 {
  "heading": "Topic 66.2",
  "bookmark": "_Toc242546156",
  "relation": "Equal"
 },
 {
  "heading": "Topic 66.3",
  "bookmark": "_Toc242546157",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 67",
  "bookmark": "_Toc242546158",
  "relation": "Equal"
 },
 {
  "heading": "Topic 67.1",
  "bookmark": "_Toc242546159",
  "relation": "Equal"
 },
 {
  "heading": "Topic 67.2",
  "bookmark": "_Toc242546160",
  "relation": "Equal"
 },
 {
  "heading": "Topic 67.3",
  "bookmark": "_Toc242546161",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 68",
  "bookmark": "_Toc242546162",
  "relation": "Equal"
 },
 {
  "heading": "Topic 68.1",
  "bookmark": "_Toc242546163",
  "relation": "Equal"
 },
 {
  "heading": "Topic 68.2",
  "bookmark": "_Toc242546164",
  "relation": "Equal"
 },
 {
  "heading": "Topic 68.3",
  "bookmark": "_Toc242546165",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 69",
  "bookmark": "_Toc242546166",
  "relation": "Equal"
 },
 {
  "heading": "Topic 69.1",
  "bookmark": "_Toc242546167",
  "relation": "Equal"
 },
 {
  "heading": "Topic 69.2",
  "bookmark": "_Toc242546168",
  "relation": "Equal"
 },
 {
  "heading": "Topic 69.3",
  "bookmark": "_Toc242546169",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 70",
  "bookmark": "_Toc242546170",
  "relation": "Equal"
 },
 {
  "heading": "Topic 70.1",
  "bookmark": "_Toc242546171",
  "relation": "Equal"
 },
 {
  "heading": "Topic 70.2",
  "bookmark": "_Toc242546172",
  "relation": "Equal"
 },
 {
  "heading": "Topic 70.3",
  "bookmark": "_Toc242546173",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 71",
  "bookmark": "_Toc242546174",
  "relation": "Equal"
 },
 {
  "heading": "Topic 71.1",
  "bookmark": "_Toc242546175",
  "relation": "Equal"
 },
 {
  "heading": "Topic 71.2",
  "bookmark": "_Toc242546176",
  "relation": "Equal"
 },
 {
  "heading": "Topic 71.3",
  "bookmark": "_Toc242546177",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 72",
  "bookmark": "_Toc242546178",
  "relation": "Equal"
 },
 {
  "heading": "Topic 72.1",
  "bookmark": "_Toc242546179",
  "relation": "Equal"
 },
 {
  "heading": "Topic 72.2",
  "bookmark": "_Toc242546180",
  "relation": "Equal"
 },
 {
  "heading": "Topic 72.3",
  "bookmark": "_Toc242546181",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 73",
  "bookmark": "_Toc242546182",
  "relation": "Equal"
 },
 {
  "heading": "Topic 73.1",
  "bookmark": "_Toc242546183",
  "relation": "Equal"
 },
 {
  "heading": "Topic 73.2",
  "bookmark": "_Toc242546184",
  "relation": "Equal"
 },
 {
  "heading": "Topic 73.3",
  "bookmark": "_Toc242546185",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 74",
  "bookmark": "_Toc242546186",
  "relation": "Equal"
 },
 {
  "heading": "Topic 74.1",
  "bookmark": "_Toc242546187",
  "relation": "Equal"
 },
 {
  "heading": "Topic 74.2",
  "bookmark": "_Toc242546188",
  "relation": "Equal"
 },
 {
  "heading": "Topic 74.3",
  "bookmark": "_Toc242546189",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 75",
  "bookmark": "_Toc242546190",
  "relation": "Equal"
 },
 {
  "heading": "Topic 75.1",
  "bookmark": "_Toc242546191",
  "relation": "Equal"
 },
 {
  "heading": "Topic 75.2",
  "bookmark": "_Toc242546192",
  "relation": "Equal"
 },
 {
  "heading": "Topic 75.3",
  "bookmark": "_Toc242546193",
  "relation": "Equal"
 },
 {
  "heading": "Chapter 76",
  "bookmark": "_Toc242546194",
  "relation": "Equal"
 },
 {
  "heading": "Topic 76.1",
  "bookmark": "_Toc242546195",
  "relation": "Equal"
 },
 {
  "heading": "Topic 76.2",
  "bookmark": "_Toc242546196",
  "relation": "Equal"
 },
 {
  "heading": "Topic 76.3",
  "bookmark": "_Toc242546197",
  "relation": "Equal"
 }
]
[10:24:39.608] ✓ spike2-bookmark-ranges
```

# 2.3

Reads correctly, 1 undo step, works after: control+A, F9. Ctrl click jumps to heading.

```log
[10:27:06.878] ▶ spike2-insert-new
[10:27:07.351] inserted {
 "heading": "Fire strategy",
 "order": "bookmarkFirst",
 "bookmark": "_RC3erzyku07e",
 "bookmarkCreated": true,
 "existingBookmarks": [
  "_Toc242545907"
 ],
 "replacedSelection": null,
 "writeSyncMs": 51,
 "fields": [
  {
   "code": " REF _RC3erzyku07e \\w \\h \u0001",
   "result": "4.3"
  },
  {
   "code": " REF _RC3erzyku07e \\h \u0001",
   "result": "Fire strategy"
  }
 ]
}
[10:27:07.351] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[10:27:07.352] ✓ spike2-insert-new
```

# 2.4

A few words selected: selection replaced, 1 undo step.

two paragraphs: selection replaced, 1 undo step.

# 2.5

Caret in between words: Reads correctly, 1 undo step, works after: control+A, F9. Ctrl click jumps to heading.
A few words selected: selection replaced, 1 undo step.
two paragraphs: selection replaced, 1 undo step.

```log[10:50:32.995] ▶ spike2-insert-new-last
[10:50:33.509] inserted {
 "heading": "Means of escape",
 "order": "bookmarkLast",
 "bookmark": "_RCfvlbj2sg3n",
 "bookmarkCreated": true,
 "existingBookmarks": [
  "_Hlk181818181",
  "_Toc242545905"
 ],
 "replacedSelection": null,
 "writeSyncMs": 100,
 "fields": [
  {
   "code": " REF _RCfvlbj2sg3n \\w \\h \u0001",
   "result": "4.1"
  },
  {
   "code": " REF _RCfvlbj2sg3n \\h \u0001",
   "result": "Means of escape"
  }
 ]
}
[10:50:33.509] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[10:50:33.511] ✓ spike2-insert-new-last
[10:51:41.693] ▶ spike2-insert-new-last
[10:51:42.215] inserted {
 "heading": "Means of escape",
 "order": "bookmarkLast",
 "bookmark": "_RC50s6v16xgp",
 "bookmarkCreated": true,
 "existingBookmarks": [
  "_Hlk181818181",
  "_Toc242545905"
 ],
 "replacedSelection": "strategy is described ",
 "writeSyncMs": 109,
 "fields": [
  {
   "code": " REF _RC50s6v16xgp \\w \\h \u0001",
   "result": "4.1"
  },
  {
   "code": " REF _RC50s6v16xgp \\h \u0001",
   "result": "Means of escape"
  }
 ]
}
[10:51:42.215] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[10:51:42.216] ✓ spike2-insert-new-last
[10:52:16.864] ▶ spike2-insert-new-last
[10:52:17.340] inserted {
 "heading": "Means of escape",
 "order": "bookmarkLast",
 "bookmark": "_RC50s6v16xgp",
 "bookmarkCreated": false,
 "existingBookmarks": [
  "_Hlk181818181",
  "_Toc242545905",
  "_RC50s6v16xgp"
 ],
 "replacedSelection": "First of two paragraphs.\rSecond of two paragraphs.\r",
 "writeSyncMs": 61,
 "fields": [
  {
   "code": " REF _RC50s6v16xgp \\w \\h \u0001",
   "result": "4.1"
  },
  {
   "code": " REF _RC50s6v16xgp \\h \u0001",
   "result": "Means of escape"
  }
 ]
}
[10:52:17.340] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[10:52:17.341] ✓ spike2-insert-new-last
```

# 2.6

One Undo Step

```log
[10:53:57.615] ▶ spike2-insert-reuse
[10:53:58.288] inserted {
 "heading": "Scope",
 "order": "bookmarkFirst",
 "bookmark": "_Ref242545576",
 "bookmarkCreated": false,
 "existingBookmarks": [
  "_Ref242545576",
  "_Toc242545898"
 ],
 "replacedSelection": null,
 "writeSyncMs": 253,
 "fields": [
  {
   "code": " REF _Ref242545576 \\w \\h \u0001",
   "result": "1.1"
  },
  {
   "code": " REF _Ref242545576 \\h \u0001",
   "result": "Scope"
  }
 ]
}
[10:53:58.288] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[10:53:58.290] ✓ spike2-insert-reuse
```

# 2.7

'Fire strategy' updates correctly with new number. 'Means of escape' does not, changes text to 'Fire Strategy' heading (now in 4.1 position, previously held by means of escape). Also updates it to a heading style.

# 2.8

Above/ below, Hading Number, page number, '§', '|' marks all follow surrounding bold and italic formatting. Heading text does not. 

```log
[11:08:24.164] ▶ spike2-all-formats
[11:08:24.164] format text
[11:08:24.848] inserted {
 "heading": "Fire strategy",
 "order": "bookmarkFirst",
 "bookmark": "_RC8uvbfmg7kr",
 "bookmarkCreated": true,
 "existingBookmarks": [
  "_Toc242545907"
 ],
 "replacedSelection": null,
 "writeSyncMs": 193,
 "fields": [
  {
   "code": " REF _RC8uvbfmg7kr \\h \u0001",
   "result": "Fire strategy"
  }
 ]
}
[11:08:24.848] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[11:08:24.850] format number
[11:08:25.539] inserted {
 "heading": "Fire strategy",
 "order": "bookmarkFirst",
 "bookmark": "_RC8uvbfmg7kr",
 "bookmarkCreated": false,
 "existingBookmarks": [
  "_Toc242545907",
  "_RC8uvbfmg7kr"
 ],
 "replacedSelection": null,
 "writeSyncMs": 130,
 "fields": [
  {
   "code": " REF _RC8uvbfmg7kr \\w \\h \u0001",
   "result": "4.3"
  }
 ]
}
[11:08:25.539] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[11:08:25.541] format numberText
[11:08:26.283] inserted {
 "heading": "Fire strategy",
 "order": "bookmarkFirst",
 "bookmark": "_RC8uvbfmg7kr",
 "bookmarkCreated": false,
 "existingBookmarks": [
  "_Toc242545907",
  "_RC8uvbfmg7kr"
 ],
 "replacedSelection": null,
 "writeSyncMs": 322,
 "fields": [
  {
   "code": " REF _RC8uvbfmg7kr \\w \\h \u0001",
   "result": "4.3"
  },
  {
   "code": " REF _RC8uvbfmg7kr \\h \u0001",
   "result": "Fire strategy"
  }
 ]
}
[11:08:26.283] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[11:08:26.284] format sectionNumberText
[11:08:27.018] inserted {
 "heading": "Fire strategy",
 "order": "bookmarkFirst",
 "bookmark": "_RC8uvbfmg7kr",
 "bookmarkCreated": false,
 "existingBookmarks": [
  "_Toc242545907",
  "_RC8uvbfmg7kr"
 ],
 "replacedSelection": null,
 "writeSyncMs": 322,
 "fields": [
  {
   "code": " REF _RC8uvbfmg7kr \\w \\h \u0001",
   "result": "4.3"
  },
  {
   "code": " REF _RC8uvbfmg7kr \\h \u0001",
   "result": "Fire strategy"
  }
 ]
}
[11:08:27.018] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[11:08:27.020] format page
[11:08:27.597] inserted {
 "heading": "Fire strategy",
 "order": "bookmarkFirst",
 "bookmark": "_RC8uvbfmg7kr",
 "bookmarkCreated": false,
 "existingBookmarks": [
  "_Toc242545907",
  "_RC8uvbfmg7kr"
 ],
 "replacedSelection": null,
 "writeSyncMs": 134,
 "fields": [
  {
   "code": " PAGEREF _RC8uvbfmg7kr \\h \u0001",
   "result": "12"
  }
 ]
}
[11:08:27.597] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[11:08:27.598] format aboveBelow
[11:08:28.166] inserted {
 "heading": "Fire strategy",
 "order": "bookmarkFirst",
 "bookmark": "_RC8uvbfmg7kr",
 "bookmarkCreated": false,
 "existingBookmarks": [
  "_Toc242545907",
  "_RC8uvbfmg7kr"
 ],
 "replacedSelection": null,
 "writeSyncMs": 138,
 "fields": [
  {
   "code": " REF _RC8uvbfmg7kr \\p \\h \u0001",
   "result": "below"
  }
 ]
}
[11:08:28.166] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[11:08:28.167] format textAboveBelow
[11:08:28.930] inserted {
 "heading": "Fire strategy",
 "order": "bookmarkFirst",
 "bookmark": "_RC8uvbfmg7kr",
 "bookmarkCreated": false,
 "existingBookmarks": [
  "_Toc242545907",
  "_RC8uvbfmg7kr"
 ],
 "replacedSelection": null,
 "writeSyncMs": 260,
 "fields": [
  {
   "code": " REF _RC8uvbfmg7kr \\h \u0001",
   "result": "Fire strategy"
  },
  {
   "code": " REF _RC8uvbfmg7kr \\p \\h \u0001",
   "result": "below"
  }
 ]
}
[11:08:28.930] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[11:08:28.931] ✓ spike2-all-formats
[11:09:01.970] ▶ spike2-all-formats
[11:09:01.970] format text
[11:09:02.536] inserted {
 "heading": "Fire strategy",
 "order": "bookmarkFirst",
 "bookmark": "_RC8uvbfmg7kr",
 "bookmarkCreated": false,
 "existingBookmarks": [
  "_Toc242545907",
  "_RC8uvbfmg7kr"
 ],
 "replacedSelection": null,
 "writeSyncMs": 128,
 "fields": [
  {
   "code": " REF _RC8uvbfmg7kr \\h \u0001",
   "result": "Fire strategy"
  }
 ]
}
[11:09:02.536] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[11:09:02.537] format number
[11:09:03.091] inserted {
 "heading": "Fire strategy",
 "order": "bookmarkFirst",
 "bookmark": "_RC8uvbfmg7kr",
 "bookmarkCreated": false,
 "existingBookmarks": [
  "_Toc242545907",
  "_RC8uvbfmg7kr"
 ],
 "replacedSelection": null,
 "writeSyncMs": 126,
 "fields": [
  {
   "code": " REF _RC8uvbfmg7kr \\w \\h \u0001",
   "result": "4.3"
  }
 ]
}
[11:09:03.091] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[11:09:03.092] format numberText
[11:09:03.753] inserted {
 "heading": "Fire strategy",
 "order": "bookmarkFirst",
 "bookmark": "_RC8uvbfmg7kr",
 "bookmarkCreated": false,
 "existingBookmarks": [
  "_Toc242545907",
  "_RC8uvbfmg7kr"
 ],
 "replacedSelection": null,
 "writeSyncMs": 250,
 "fields": [
  {
   "code": " REF _RC8uvbfmg7kr \\w \\h \u0001",
   "result": "4.3"
  },
  {
   "code": " REF _RC8uvbfmg7kr \\h \u0001",
   "result": "Fire strategy"
  }
 ]
}
[11:09:03.753] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[11:09:03.755] format sectionNumberText
[11:09:04.489] inserted {
 "heading": "Fire strategy",
 "order": "bookmarkFirst",
 "bookmark": "_RC8uvbfmg7kr",
 "bookmarkCreated": false,
 "existingBookmarks": [
  "_Toc242545907",
  "_RC8uvbfmg7kr"
 ],
 "replacedSelection": null,
 "writeSyncMs": 322,
 "fields": [
  {
   "code": " REF _RC8uvbfmg7kr \\w \\h \u0001",
   "result": "4.3"
  },
  {
   "code": " REF _RC8uvbfmg7kr \\h \u0001",
   "result": "Fire strategy"
  }
 ]
}
[11:09:04.489] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[11:09:04.491] format page
[11:09:05.039] inserted {
 "heading": "Fire strategy",
 "order": "bookmarkFirst",
 "bookmark": "_RC8uvbfmg7kr",
 "bookmarkCreated": false,
 "existingBookmarks": [
  "_Toc242545907",
  "_RC8uvbfmg7kr"
 ],
 "replacedSelection": null,
 "writeSyncMs": 129,
 "fields": [
  {
   "code": " PAGEREF _RC8uvbfmg7kr \\h \u0001",
   "result": "12"
  }
 ]
}
[11:09:05.039] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[11:09:05.040] format aboveBelow
[11:09:05.586] inserted {
 "heading": "Fire strategy",
 "order": "bookmarkFirst",
 "bookmark": "_RC8uvbfmg7kr",
 "bookmarkCreated": false,
 "existingBookmarks": [
  "_Toc242545907",
  "_RC8uvbfmg7kr"
 ],
 "replacedSelection": null,
 "writeSyncMs": 129,
 "fields": [
  {
   "code": " REF _RC8uvbfmg7kr \\p \\h \u0001",
   "result": "below"
  }
 ]
}
[11:09:05.586] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[11:09:05.587] format textAboveBelow
[11:09:06.252] inserted {
 "heading": "Fire strategy",
 "order": "bookmarkFirst",
 "bookmark": "_RC8uvbfmg7kr",
 "bookmarkCreated": false,
 "existingBookmarks": [
  "_Toc242545907",
  "_RC8uvbfmg7kr"
 ],
 "replacedSelection": null,
 "writeSyncMs": 256,
 "fields": [
  {
   "code": " REF _RC8uvbfmg7kr \\h \u0001",
   "result": "Fire strategy"
  },
  {
   "code": " REF _RC8uvbfmg7kr \\p \\h \u0001",
   "result": "below"
  }
 ]
}
[11:09:06.252] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[11:09:06.253] ✓ spike2-all-formats
```

# 2.9

Yes bold leaks into reference. When Carat is in bold or italic paragraph text and you insert the '§ 4.4' portion takes on the paragraphs bold or italic style. The heading text portion remains 'Heading with **bold** word' not in the surround paragraphs bold or italic style

```log
[11:03:07.913] ▶ spike2-insert-direct-bold
[11:03:08.700] inserted {
 "heading": "Heading with bold word",
 "order": "bookmarkFirst",
 "bookmark": "_RCou48al62r1",
 "bookmarkCreated": true,
 "existingBookmarks": [
  "_Toc242545908"
 ],
 "replacedSelection": null,
 "writeSyncMs": 257,
 "fields": [
  {
   "code": " REF _RCou48al62r1 \\w \\h \u0001",
   "result": "4.4"
  },
  {
   "code": " REF _RCou48al62r1 \\h \u0001",
   "result": "Heading with bold word"
  }
 ]
}
[11:03:08.700] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[11:03:08.702] ✓ spike2-insert-direct-bold
[11:03:27.144] ▶ spike2-insert-direct-bold
[11:03:27.802] inserted {
 "heading": "Heading with bold word",
 "order": "bookmarkFirst",
 "bookmark": "_RCou48al62r1",
 "bookmarkCreated": false,
 "existingBookmarks": [
  "_Toc242545908",
  "_RCou48al62r1"
 ],
 "replacedSelection": null,
 "writeSyncMs": 248,
 "fields": [
  {
   "code": " REF _RCou48al62r1 \\w \\h \u0001",
   "result": "4.4"
  },
  {
   "code": " REF _RCou48al62r1 \\h \u0001",
   "result": "Heading with bold word"
  }
 ]
}
[11:03:27.802] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[11:03:27.803] ✓ spike2-insert-direct-bold
```

# 2.10

```log
[11:13:33.761] ▶ spike2-references
[11:13:33.817] REF/PAGEREF fields [
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545896 \\h \u0001",
  "result": "11",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545897 \\h \u0001",
  "result": "11",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545898 \\h \u0001",
  "result": "11",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545899 \\h \u0001",
  "result": "11",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545900 \\h \u0001",
  "result": "12",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545901 \\h \u0001",
  "result": "12",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545902 \\h \u0001",
  "result": "12",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545903 \\h \u0001",
  "result": "12",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545904 \\h \u0001",
  "result": "12",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545905 \\h \u0001",
  "result": "12",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545906 \\h \u0001",
  "result": "12",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545907 \\h \u0001",
  "result": "12",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545908 \\h \u0001",
  "result": "12",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545909 \\h \u0001",
  "result": "12",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545910 \\h \u0001",
  "result": "12",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545911 \\h \u0001",
  "result": "13",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545912 \\h \u0001",
  "result": "13",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545913 \\h \u0001",
  "result": "13",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545914 \\h \u0001",
  "result": "13",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545915 \\h \u0001",
  "result": "13",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545916 \\h \u0001",
  "result": "13",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545917 \\h \u0001",
  "result": "13",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545918 \\h \u0001",
  "result": "13",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545919 \\h \u0001",
  "result": "13",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545920 \\h \u0001",
  "result": "13",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545921 \\h \u0001",
  "result": "13",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545922 \\h \u0001",
  "result": "14",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545923 \\h \u0001",
  "result": "14",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545924 \\h \u0001",
  "result": "14",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545925 \\h \u0001",
  "result": "14",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545926 \\h \u0001",
  "result": "14",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545927 \\h \u0001",
  "result": "14",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545928 \\h \u0001",
  "result": "14",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545929 \\h \u0001",
  "result": "14",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545930 \\h \u0001",
  "result": "14",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545931 \\h \u0001",
  "result": "14",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545932 \\h \u0001",
  "result": "14",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545933 \\h \u0001",
  "result": "15",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545934 \\h \u0001",
  "result": "15",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545935 \\h \u0001",
  "result": "15",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545936 \\h \u0001",
  "result": "15",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545937 \\h \u0001",
  "result": "15",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545938 \\h \u0001",
  "result": "15",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545939 \\h \u0001",
  "result": "15",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545940 \\h \u0001",
  "result": "15",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545941 \\h \u0001",
  "result": "15",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545942 \\h \u0001",
  "result": "15",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545943 \\h \u0001",
  "result": "15",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545944 \\h \u0001",
  "result": "16",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545945 \\h \u0001",
  "result": "16",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545946 \\h \u0001",
  "result": "16",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545947 \\h \u0001",
  "result": "16",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545948 \\h \u0001",
  "result": "16",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545949 \\h \u0001",
  "result": "16",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545950 \\h \u0001",
  "result": "16",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545951 \\h \u0001",
  "result": "16",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545952 \\h \u0001",
  "result": "16",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545953 \\h \u0001",
  "result": "16",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545954 \\h \u0001",
  "result": "16",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545955 \\h \u0001",
  "result": "17",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545956 \\h \u0001",
  "result": "17",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545957 \\h \u0001",
  "result": "17",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545958 \\h \u0001",
  "result": "17",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545959 \\h \u0001",
  "result": "17",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545960 \\h \u0001",
  "result": "17",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545961 \\h \u0001",
  "result": "17",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545962 \\h \u0001",
  "result": "17",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545963 \\h \u0001",
  "result": "17",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545964 \\h \u0001",
  "result": "17",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545965 \\h \u0001",
  "result": "17",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545966 \\h \u0001",
  "result": "18",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545967 \\h \u0001",
  "result": "18",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545968 \\h \u0001",
  "result": "18",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545969 \\h \u0001",
  "result": "18",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545970 \\h \u0001",
  "result": "18",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545971 \\h \u0001",
  "result": "18",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545972 \\h \u0001",
  "result": "18",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545973 \\h \u0001",
  "result": "18",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545974 \\h \u0001",
  "result": "18",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545975 \\h \u0001",
  "result": "18",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545976 \\h \u0001",
  "result": "18",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545977 \\h \u0001",
  "result": "19",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545978 \\h \u0001",
  "result": "19",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545979 \\h \u0001",
  "result": "19",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545980 \\h \u0001",
  "result": "19",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545981 \\h \u0001",
  "result": "19",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545982 \\h \u0001",
  "result": "19",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545983 \\h \u0001",
  "result": "19",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545984 \\h \u0001",
  "result": "19",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545985 \\h \u0001",
  "result": "19",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545986 \\h \u0001",
  "result": "19",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545987 \\h \u0001",
  "result": "19",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545988 \\h \u0001",
  "result": "20",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545989 \\h \u0001",
  "result": "20",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545990 \\h \u0001",
  "result": "20",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545991 \\h \u0001",
  "result": "20",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545992 \\h \u0001",
  "result": "20",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545993 \\h \u0001",
  "result": "20",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545994 \\h \u0001",
  "result": "20",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545995 \\h \u0001",
  "result": "20",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545996 \\h \u0001",
  "result": "20",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545997 \\h \u0001",
  "result": "20",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545998 \\h \u0001",
  "result": "20",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242545999 \\h \u0001",
  "result": "21",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546000 \\h \u0001",
  "result": "21",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546001 \\h \u0001",
  "result": "21",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546002 \\h \u0001",
  "result": "21",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546003 \\h \u0001",
  "result": "21",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546004 \\h \u0001",
  "result": "21",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546005 \\h \u0001",
  "result": "21",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546006 \\h \u0001",
  "result": "21",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546007 \\h \u0001",
  "result": "21",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546008 \\h \u0001",
  "result": "21",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546009 \\h \u0001",
  "result": "21",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546010 \\h \u0001",
  "result": "22",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546011 \\h \u0001",
  "result": "22",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546012 \\h \u0001",
  "result": "22",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546013 \\h \u0001",
  "result": "22",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546014 \\h \u0001",
  "result": "22",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546015 \\h \u0001",
  "result": "22",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546016 \\h \u0001",
  "result": "22",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546017 \\h \u0001",
  "result": "22",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546018 \\h \u0001",
  "result": "22",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546019 \\h \u0001",
  "result": "22",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546020 \\h \u0001",
  "result": "22",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546021 \\h \u0001",
  "result": "23",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546022 \\h \u0001",
  "result": "23",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546023 \\h \u0001",
  "result": "23",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546024 \\h \u0001",
  "result": "23",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546025 \\h \u0001",
  "result": "23",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546026 \\h \u0001",
  "result": "23",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546027 \\h \u0001",
  "result": "23",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546028 \\h \u0001",
  "result": "23",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546029 \\h \u0001",
  "result": "23",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546030 \\h \u0001",
  "result": "23",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546031 \\h \u0001",
  "result": "23",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546032 \\h \u0001",
  "result": "24",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546033 \\h \u0001",
  "result": "24",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546034 \\h \u0001",
  "result": "24",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546035 \\h \u0001",
  "result": "24",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546036 \\h \u0001",
  "result": "24",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546037 \\h \u0001",
  "result": "24",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546038 \\h \u0001",
  "result": "24",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546039 \\h \u0001",
  "result": "24",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546040 \\h \u0001",
  "result": "24",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546041 \\h \u0001",
  "result": "24",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546042 \\h \u0001",
  "result": "24",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546043 \\h \u0001",
  "result": "25",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546044 \\h \u0001",
  "result": "25",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546045 \\h \u0001",
  "result": "25",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546046 \\h \u0001",
  "result": "25",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546047 \\h \u0001",
  "result": "25",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546048 \\h \u0001",
  "result": "25",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546049 \\h \u0001",
  "result": "25",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546050 \\h \u0001",
  "result": "25",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546051 \\h \u0001",
  "result": "25",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546052 \\h \u0001",
  "result": "25",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546053 \\h \u0001",
  "result": "25",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546054 \\h \u0001",
  "result": "26",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546055 \\h \u0001",
  "result": "26",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546056 \\h \u0001",
  "result": "26",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546057 \\h \u0001",
  "result": "26",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546058 \\h \u0001",
  "result": "26",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546059 \\h \u0001",
  "result": "26",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546060 \\h \u0001",
  "result": "26",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546061 \\h \u0001",
  "result": "26",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546062 \\h \u0001",
  "result": "26",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546063 \\h \u0001",
  "result": "26",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546064 \\h \u0001",
  "result": "26",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546065 \\h \u0001",
  "result": "27",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546066 \\h \u0001",
  "result": "27",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546067 \\h \u0001",
  "result": "27",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546068 \\h \u0001",
  "result": "27",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546069 \\h \u0001",
  "result": "27",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546070 \\h \u0001",
  "result": "27",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546071 \\h \u0001",
  "result": "27",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546072 \\h \u0001",
  "result": "27",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546073 \\h \u0001",
  "result": "27",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546074 \\h \u0001",
  "result": "27",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546075 \\h \u0001",
  "result": "27",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546076 \\h \u0001",
  "result": "28",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546077 \\h \u0001",
  "result": "28",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546078 \\h \u0001",
  "result": "28",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546079 \\h \u0001",
  "result": "28",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546080 \\h \u0001",
  "result": "28",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546081 \\h \u0001",
  "result": "28",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546082 \\h \u0001",
  "result": "28",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546083 \\h \u0001",
  "result": "28",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546084 \\h \u0001",
  "result": "28",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546085 \\h \u0001",
  "result": "28",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546086 \\h \u0001",
  "result": "28",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546087 \\h \u0001",
  "result": "29",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546088 \\h \u0001",
  "result": "29",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546089 \\h \u0001",
  "result": "29",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546090 \\h \u0001",
  "result": "29",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546091 \\h \u0001",
  "result": "29",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546092 \\h \u0001",
  "result": "29",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546093 \\h \u0001",
  "result": "29",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546094 \\h \u0001",
  "result": "29",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546095 \\h \u0001",
  "result": "29",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546096 \\h \u0001",
  "result": "29",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546097 \\h \u0001",
  "result": "29",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546098 \\h \u0001",
  "result": "30",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546099 \\h \u0001",
  "result": "30",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546100 \\h \u0001",
  "result": "30",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546101 \\h \u0001",
  "result": "30",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546102 \\h \u0001",
  "result": "30",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546103 \\h \u0001",
  "result": "30",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546104 \\h \u0001",
  "result": "30",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546105 \\h \u0001",
  "result": "30",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546106 \\h \u0001",
  "result": "30",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546107 \\h \u0001",
  "result": "30",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546108 \\h \u0001",
  "result": "30",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546109 \\h \u0001",
  "result": "31",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546110 \\h \u0001",
  "result": "31",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546111 \\h \u0001",
  "result": "31",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546112 \\h \u0001",
  "result": "31",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546113 \\h \u0001",
  "result": "31",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546114 \\h \u0001",
  "result": "31",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546115 \\h \u0001",
  "result": "31",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546116 \\h \u0001",
  "result": "31",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546117 \\h \u0001",
  "result": "31",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546118 \\h \u0001",
  "result": "31",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546119 \\h \u0001",
  "result": "31",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546120 \\h \u0001",
  "result": "32",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546121 \\h \u0001",
  "result": "32",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546122 \\h \u0001",
  "result": "32",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546123 \\h \u0001",
  "result": "32",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546124 \\h \u0001",
  "result": "32",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546125 \\h \u0001",
  "result": "32",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546126 \\h \u0001",
  "result": "32",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546127 \\h \u0001",
  "result": "32",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546128 \\h \u0001",
  "result": "32",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546129 \\h \u0001",
  "result": "32",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546130 \\h \u0001",
  "result": "32",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546131 \\h \u0001",
  "result": "33",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546132 \\h \u0001",
  "result": "33",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546133 \\h \u0001",
  "result": "33",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546134 \\h \u0001",
  "result": "33",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546135 \\h \u0001",
  "result": "33",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546136 \\h \u0001",
  "result": "33",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546137 \\h \u0001",
  "result": "33",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546138 \\h \u0001",
  "result": "33",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546139 \\h \u0001",
  "result": "33",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546140 \\h \u0001",
  "result": "33",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546141 \\h \u0001",
  "result": "33",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546142 \\h \u0001",
  "result": "34",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546143 \\h \u0001",
  "result": "34",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546144 \\h \u0001",
  "result": "34",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546145 \\h \u0001",
  "result": "34",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546146 \\h \u0001",
  "result": "34",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546147 \\h \u0001",
  "result": "34",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546148 \\h \u0001",
  "result": "34",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546149 \\h \u0001",
  "result": "34",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546150 \\h \u0001",
  "result": "34",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546151 \\h \u0001",
  "result": "34",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546152 \\h \u0001",
  "result": "34",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546153 \\h \u0001",
  "result": "35",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546154 \\h \u0001",
  "result": "35",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546155 \\h \u0001",
  "result": "35",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546156 \\h \u0001",
  "result": "35",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546157 \\h \u0001",
  "result": "35",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546158 \\h \u0001",
  "result": "35",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546159 \\h \u0001",
  "result": "35",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546160 \\h \u0001",
  "result": "35",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546161 \\h \u0001",
  "result": "35",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546162 \\h \u0001",
  "result": "35",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546163 \\h \u0001",
  "result": "35",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546164 \\h \u0001",
  "result": "36",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546165 \\h \u0001",
  "result": "36",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546166 \\h \u0001",
  "result": "36",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546167 \\h \u0001",
  "result": "36",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546168 \\h \u0001",
  "result": "36",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546169 \\h \u0001",
  "result": "36",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546170 \\h \u0001",
  "result": "36",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546171 \\h \u0001",
  "result": "36",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546172 \\h \u0001",
  "result": "36",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546173 \\h \u0001",
  "result": "36",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546174 \\h \u0001",
  "result": "36",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546175 \\h \u0001",
  "result": "37",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546176 \\h \u0001",
  "result": "37",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546177 \\h \u0001",
  "result": "37",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546178 \\h \u0001",
  "result": "37",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546179 \\h \u0001",
  "result": "37",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546180 \\h \u0001",
  "result": "37",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546181 \\h \u0001",
  "result": "37",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546182 \\h \u0001",
  "result": "37",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546183 \\h \u0001",
  "result": "37",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546184 \\h \u0001",
  "result": "37",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546185 \\h \u0001",
  "result": "37",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546186 \\h \u0001",
  "result": "38",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546187 \\h \u0001",
  "result": "38",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546188 \\h \u0001",
  "result": "38",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546189 \\h \u0001",
  "result": "38",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546190 \\h \u0001",
  "result": "38",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546191 \\h \u0001",
  "result": "38",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546192 \\h \u0001",
  "result": "38",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546193 \\h \u0001",
  "result": "38",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546194 \\h \u0001",
  "result": "38",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546195 \\h \u0001",
  "result": "38",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546196 \\h \u0001",
  "result": "38",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _Toc242546197 \\h \u0001",
  "result": "39",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _RC8uvbfmg7kr \\h \u0001",
  "result": "Fire strategy",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _RC8uvbfmg7kr \\p \\h \u0001",
  "result": "below",
  "font": {
   "bold": true,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _RC8uvbfmg7kr \\p \\h \u0001",
  "result": "below",
  "font": {
   "bold": true,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _RC8uvbfmg7kr \\h \u0001",
  "result": "12",
  "font": {
   "bold": true,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _RC8uvbfmg7kr \\w \\h \u0001",
  "result": "4.3",
  "font": {
   "bold": true,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _RC8uvbfmg7kr \\h \u0001",
  "result": "Fire strategy",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _RC8uvbfmg7kr \\w \\h \u0001",
  "result": "4.3",
  "font": {
   "bold": true,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _RC8uvbfmg7kr \\h \u0001",
  "result": "Fire strategy",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _RC8uvbfmg7kr \\w \\h \u0001",
  "result": "4.3",
  "font": {
   "bold": true,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _RC8uvbfmg7kr \\h \u0001",
  "result": "Fire strategy",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _RC8uvbfmg7kr \\h \u0001",
  "result": "Fire strategy",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _RC8uvbfmg7kr \\p \\h \u0001",
  "result": "below",
  "font": {
   "bold": false,
   "italic": true,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _RC8uvbfmg7kr \\p \\h \u0001",
  "result": "below",
  "font": {
   "bold": false,
   "italic": true,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "PageRef",
  "code": " PAGEREF _RC8uvbfmg7kr \\h \u0001",
  "result": "12",
  "font": {
   "bold": false,
   "italic": true,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _RC8uvbfmg7kr \\w \\h \u0001",
  "result": "4.3",
  "font": {
   "bold": false,
   "italic": true,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _RC8uvbfmg7kr \\h \u0001",
  "result": "Fire strategy",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _RC8uvbfmg7kr \\w \\h \u0001",
  "result": "4.3",
  "font": {
   "bold": false,
   "italic": true,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _RC8uvbfmg7kr \\h \u0001",
  "result": "Fire strategy",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _RC8uvbfmg7kr \\w \\h \u0001",
  "result": "4.3",
  "font": {
   "bold": false,
   "italic": true,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _RC8uvbfmg7kr \\h \u0001",
  "result": "Fire strategy",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _Ref242545576 \\r \\h \u0001",
  "result": "1.1",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 },
 {
  "type": "Ref",
  "code": " REF _Ref242545576 \\h \u0001",
  "result": "Scope",
  "font": {
   "bold": false,
   "italic": false,
   "name": "Aptos",
   "size": 12
  }
 }
]
[11:13:33.819] ✓ spike2-references
```

# 2.11 Bookmark + REF in each other story

Note this writes the following text at the caret position `tableCell: Heading in a table cell ; footnote:   Heading in a footnote ; endnote:   Heading in an endnote ; header: Heading in the header ; footer: Heading in the footer ; textBox: Heading in a text box ; `

All link correctly and update correctly on f9, one undo step to undo inserted text and links

```log
[11:18:54.646] ▶ spike2-stories
[11:18:56.447] story bookmarks and REFs [
 {
  "kind": "tableCell",
  "heading": "Heading in a table cell",
  "bookmark": "_RCmk22sl5095",
  "result": "Heading in a table cell"
 },
 {
  "kind": "footnote",
  "heading": "\u0002 Heading in a footnote",
  "bookmark": "_RC9xqp5ryvx5",
  "result": "\u0002 Heading in a footnote"
 },
 {
  "kind": "endnote",
  "heading": "\u0002 Heading in an endnote",
  "bookmark": "_RCwxisqse1kr",
  "result": "\u0002 Heading in an endnote"
 },
 {
  "kind": "header",
  "heading": "Heading in the header",
  "bookmark": "_RCyi3c4bsyhx",
  "result": "Heading in the header"
 },
 {
  "kind": "footer",
  "heading": "Heading in the footer",
  "bookmark": "_RCukaf119x1h",
  "result": "Heading in the footer"
 },
 {
  "kind": "textBox",
  "heading": "Heading in a text box",
  "bookmark": "_RCrfd9su8vw4",
  "result": "Heading in a text box"
 }
]
[11:18:56.447] Now F9 and Ctrl+click each reference; note any story where either fails
[11:18:56.448] ✓ spike2-stories

```

# 2.12

N/A

# 3.1

```log
[11:27:45.494] Requirement sets {
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
[11:27:45.494] Focus probe installed: press the shortcut in the document, or the ribbon button
[11:28:26.057] ▶ spike3-detect-deleted
[11:28:26.064] tracked changes per heading [
 {
  "heading": "Kept heading",
  "changes": []
 },
 {
  "heading": "Deleted heading",
  "changes": [
   {
    "type": "Deleted",
    "text": "Deleted heading\r"
   }
  ]
 },
 {
  "heading": "Inserted heading",
  "changes": [
   {
    "type": "Added",
    "text": "Inserted heading\r"
   }
  ]
 }
]
[11:28:26.065] ✓ spike3-detect-deleted
```

# 3.2

One tracked insertion, One undo step

```log
[11:29:41.781] ▶ spike3-tracking-on
[11:29:41.932] changeTrackingMode TrackAll
[11:29:41.932] ✓ spike3-tracking-on
[11:29:51.233] ▶ spike3-insert
[11:29:51.982] inserted {
 "heading": "Fire strategy",
 "order": "bookmarkFirst",
 "bookmark": "_RC5mk6p3ti7b",
 "bookmarkCreated": true,
 "existingBookmarks": [
  "_Toc242545907"
 ],
 "replacedSelection": null,
 "writeSyncMs": 333,
 "fields": [
  {
   "code": " REF _RC5mk6p3ti7b \\w \\h \u0001",
   "result": "4.3"
  },
  {
   "code": " REF _RC5mk6p3ti7b \\h \u0001",
   "result": "Fire strategy"
  }
 ]
}
[11:29:51.982] Now: count Ctrl+Z presses to restore the document; F9; Ctrl+click; compare formatting
[11:29:51.984] ✓ spike3-insert
```

# 3.3

For 'Fire Strategy' cross reference insert via spike 2 button: Accept all, Control+Click and f9 work correctly. If you update the heading and f9 it works correctly. If you reorder the heading it fails on update, shows as deleted for heading text and displays 'unknown field change' and heading number gets repointed at an incorrect heading. When change tracking is disabled the heading reordering and field update works correctly - seems to be a know issue with change tracking on: `https://learn.microsoft.com/en-us/answers/questions/4988311/word-cross-references-breaking-down`

# 3.4



```log
[11:45:50.198] ▶ spike3-reject-all
[11:45:50.201] rejected all
[11:45:50.202] ✓ spike3-reject-all
[11:46:00.069] ▶ spike2-bookmark-ranges
[11:46:00.076] content range excludes the paragraph mark [
 {
  "paragraph": "Kept heading",
  "content": "Kept heading"
 },
 {
  "paragraph": "Deleted heading",
  "content": "Deleted heading"
 }
]
[11:46:00.076] bookmark range vs heading content range []
[11:46:00.076] ✓ spike2-bookmark-ranges
```

# 3.5

Defered




