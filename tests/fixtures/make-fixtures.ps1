<#
.SYNOPSIS
    Builds the RAD-CUT fixture documents (see README.md in this folder) by driving Word for Windows.

.DESCRIPTION
    Word itself creates every document, so Word-owned details (multilevel list numbering,
    _Toc bookmarks from a real table of contents, _Ref bookmarks from Insert > Cross-reference,
    tracked revisions) are genuine Word output.

    For each document it also writes <name>.manifest.txt: every paragraph in every story
    (story | list number | style | text), every bookmark (hidden ones included) and every
    revision. Use it to keep tests/fakes/fake-documents.ts in step with the .docx files.

    Personal information (author, last saved by, revision and comment authors) is removed on save.

.PARAMETER OutDir
    Where to save the documents. Defaults to the folder this script lives in.

.PARAMETER Only
    Build a subset, e.g. -Only tracked,plain-headings

.PARAMETER Visible
    Show Word while it works (slower, useful for debugging).

.PARAMETER LogPath
    Log file. Defaults to make-fixtures.log next to the documents. Every step and every
    paragraph added is logged there; the console shows steps only. If a step fails, the log
    ends with the failing step, the last action, the COM error chain and the script stack,
    and the half-built document is saved to %TEMP% for inspection.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\make-fixtures.ps1
#>
[CmdletBinding()]
param(
    [string] $OutDir = $PSScriptRoot,
    [ValidateSet('spec-300', 'guide-500', 'tracked', 'plain-headings')]
    [string[]] $Only = @('spec-300', 'guide-500', 'tracked', 'plain-headings'),
    [switch] $Visible,
    [string] $LogPath
)

$ErrorActionPreference = 'Stop'
$Missing = [System.Reflection.Missing]::Value

# Word constants used below
$wdFormatXMLDocument   = 16
$wdDoNotSaveChanges    = 0
$wdRefTypeHeading      = 1
$wdContentText         = -1   # "Heading text"
$wdNumberRelativeContext = -2 # "Heading number"
$wdListNoNumbering     = 0
$wdHeaderFooterPrimary = 1
$wdOutlineLevel2       = 2
$wdOutlineLevelBodyText = 10
$wdWord9TableBehavior  = 1
$msoTextOrientationHorizontal = 1

#region Logging

$script:Step = '(starting)'
$script:LastAction = '(none)'
$script:CurrentDoc = $null
$script:CurrentName = $null
$script:StyleIds = @{}
$script:StyleMethodLogged = @{}

function Write-Log {
    param([string] $Message, [ValidateSet('INFO', 'WARN', 'ERROR', 'DEBUG')] [string] $Level = 'INFO')
    $line = '{0:HH:mm:ss.fff} {1,-5} {2}' -f (Get-Date), $Level, $Message
    if ($script:LogFile) {
        [System.IO.File]::AppendAllText($script:LogFile, $line + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding $false))
    }
    switch ($Level) {
        'ERROR' { Write-Host $line -ForegroundColor Red }
        'WARN'  { Write-Host $line -ForegroundColor Yellow }
        'INFO'  { Write-Host $line }
        'DEBUG' { Write-Verbose $line }   # file only, unless run with -Verbose
    }
}

function Enter-Step([string] $Name) {
    $script:Step = $Name
    Write-Log "-- $Name"
}

function Set-LastAction([string] $Action) {
    $script:LastAction = $Action
    Write-Log $Action -Level DEBUG
}

# "Type: message [HRESULT]" for the exception and each inner exception.
function Get-ErrorChain([Exception] $Exception) {
    $parts = @()
    for ($e = $Exception; $null -ne $e; $e = $e.InnerException) {
        $parts += '{0}: {1} [HRESULT 0x{2:X8}]' -f $e.GetType().Name, $e.Message.Trim(), $e.HResult
    }
    $parts -join "`n    <- "
}

#endregion

#region COM helpers

# Late-bound call through IDispatch. Avoids the [ref]/optional-argument quirks of calling
# some Word methods directly from PowerShell.
function Invoke-Com {
    param(
        [Parameter(Mandatory)] $Object,
        [Parameter(Mandatory)] [string] $Method,
        [object[]] $Arguments = @()
    )
    $target = $Object.psobject.BaseObject
    $argv = New-Object 'object[]' $Arguments.Count
    for ($i = 0; $i -lt $Arguments.Count; $i++) {
        $a = $Arguments[$i]
        if ($null -ne $a) { $a = $a.psobject.BaseObject }
        $argv[$i] = $a
    }
    [System.__ComObject].InvokeMember($Method, [System.Reflection.BindingFlags]::InvokeMethod, $null, $target, $argv)
}

function Get-DocRange($Doc, [int] $Start, [int] $End) {
    Invoke-Com $Doc 'Range' @($Start, $End)
}

#endregion

#region Document building helpers

# Localised names of the built-in styles (works on non-English Word too).
function Get-StyleNames($Doc) {
    $builtIn = [ordered]@{
        Normal       = @(-1,   'Normal')
        Heading1     = @(-2,   'Heading 1')
        Heading2     = @(-3,   'Heading 2')
        Heading3     = @(-4,   'Heading 3')
        Title        = @(-63,  'Title')
        Subtitle     = @(-75,  'Subtitle')
        Caption      = @(-35,  'Caption')
        Quote        = @(-181, 'Quote')
        Header       = @(-32,  'Header')
        Footer       = @(-33,  'Footer')
        FootnoteText = @(-30,  'Footnote Text')
        EndnoteText  = @(-44,  'Endnote Text')
    }
    $names = @{}
    foreach ($key in $builtIn.Keys) {
        $id, $fallback = $builtIn[$key]
        $name = $null
        $style = $null
        try { $style = Invoke-Com $Doc.Styles 'Item' @($id) }
        catch { Write-Log "Style $key (id $id): lookup by id failed: $(Get-ErrorChain $_.Exception)" -Level WARN }
        if ($null -ne $style) {
            # 1 = paragraph, 4 = linked. Anything else means the id in the table above is wrong.
            if ($style.Type -ne 1 -and $style.Type -ne 4) {
                throw "Style id $id for $key resolved to '$($style.NameLocal)', which is not a paragraph style (type $($style.Type))"
            }
            $name = [string] $style.NameLocal
        }
        if ([string]::IsNullOrWhiteSpace($name)) {
            Write-Log "Style $key (id $id): using fallback name '$fallback'" -Level WARN
            $name = $fallback
        }
        $names[$key] = $name
        $script:StyleIds[$name] = $id
        Write-Log ("Style {0,-12} id {1,5} -> '{2}'" -f $key, $id, $name) -Level DEBUG
    }
    $names
}

# Applies a paragraph style. Tries several COM routes in turn, logs any that fail, and on
# total failure throws with diagnostics about the style, the paragraph and the document.
function Set-ParaStyle($Para, [string] $Name) {
    if ([string]::IsNullOrWhiteSpace($Name)) { throw "Set-ParaStyle called with an empty style name (last action: $script:LastAction)" }
    $attempts = [ordered]@{
        'Paragraph.Style = name'     = { $Para.Style = $Name }
        'Range.Style = name'         = { $Para.Range.Style = $Name }
        'Range.Style = Style object' = {
            $styleObject = Invoke-Com $Para.Range.Document.Styles 'Item' @($Name)
            [void] [System.__ComObject].InvokeMember('Style', [System.Reflection.BindingFlags]::SetProperty, $null,
                $Para.Range.psobject.BaseObject, [object[]] @($styleObject.psobject.BaseObject))
        }
        'Range.Style = built-in id'  = {
            if (-not $script:StyleIds.ContainsKey($Name)) { throw "'$Name' has no built-in id" }
            $Para.Range.Style = [int] $script:StyleIds[$Name]
        }
    }
    $failures = @()
    foreach ($method in $attempts.Keys) {
        try {
            & $attempts[$method]
            if ($failures.Count -gt 0 -and -not $script:StyleMethodLogged.ContainsKey($method)) {
                $script:StyleMethodLogged[$method] = $true
                Write-Log "Style '$Name' applied via '$method' after: $($failures -join ' | ')" -Level WARN
            }
            return
        }
        catch { $failures += "$method -> $(Get-ErrorChain $_.Exception)" }
    }

    # Everything failed: gather what we can about why.
    $diag = @("Could not apply style '$Name' to paragraph '$(Format-ManifestText $Para.Range.Text)'")
    try { $diag += "  story type: $($Para.Range.StoryType); current style: '$($Para.Style.NameLocal)'" } catch { }
    try {
        $doc = $Para.Range.Document
        $diag += "  document protection: $($doc.ProtectionType) (-1 = none); attached template: $($doc.AttachedTemplate.FullName)"
    } catch { }
    try {
        $st = Invoke-Com $Para.Range.Document.Styles 'Item' @($Name)
        $diag += "  style exists: type $($st.Type) (1 = paragraph, 4 = linked), built-in $($st.BuiltIn), locked $($st.Locked), in use $($st.InUse)"
    } catch { $diag += "  style lookup by name failed: $(Get-ErrorChain $_.Exception)" }
    $diag += $failures | ForEach-Object { "  tried $_" }
    throw ($diag -join "`n")
}

# One multilevel list with Heading 1-3 linked to levels 1-3: numbers read 4, 4.3, 4.4.1.
function Set-HeadingNumbering($Doc, $S) {
    $template = Invoke-Com $Doc.ListTemplates 'Add' @($true, 'FixtureHeadings')
    $formats = @('%1', '%1.%2', '%1.%2.%3')
    $styles = @($S.Heading1, $S.Heading2, $S.Heading3)
    for ($i = 1; $i -le 3; $i++) {
        $level = $template.ListLevels.Item($i)
        $level.NumberFormat = $formats[$i - 1]
        $level.NumberStyle = 0          # wdListNumberStyleArabic
        $level.TrailingCharacter = 0    # wdTrailingTab
        $level.Alignment = 0            # wdListLevelAlignLeft
        $level.NumberPosition = 0
        $level.TextPosition = 42.5
        $level.TabPosition = 42.5
        $level.StartAt = 1
        $level.ResetOnHigher = $i - 1
        Set-LastAction "Link list level $i to style '$($styles[$i - 1])'"
        $level.LinkedStyle = $styles[$i - 1]
    }
    for ($i = 1; $i -le 3; $i++) {
        Set-LastAction "LinkToListTemplate: style '$($styles[$i - 1])' -> level $i"
        $style = Invoke-Com $Doc.Styles 'Item' @($styles[$i - 1])
        $null = Invoke-Com $style 'LinkToListTemplate' @($template, $i)
    }
}

function New-FixtureDocument([string] $Name) {
    Enter-Step "$Name : create document"
    $script:ReuseLast = $true   # a new document starts with one empty paragraph to fill
    $script:CurrentName = $Name
    $doc = Invoke-Com $script:Word.Documents 'Add'
    $script:CurrentDoc = $doc
    Write-Log ("Attached template: {0}; protection: {1}; compatibility: {2}" -f $doc.AttachedTemplate.FullName, $doc.ProtectionType, $doc.CompatibilityMode) -Level DEBUG
    $doc
}

# Appends a paragraph at the end of the main story with clean formatting and returns it.
function Add-Para($Doc, [string] $Text, [string] $Style) {
    Set-LastAction "Add-Para '$Text' [$Style]"
    if ($script:ReuseLast) { $script:ReuseLast = $false }
    else { $Doc.Paragraphs.Last.Range.InsertParagraphAfter() }
    $p = $Doc.Paragraphs.Last
    $p.Range.Font.Reset()
    $p.Range.ParagraphFormat.Reset()
    Set-ParaStyle $p $Style
    if ($Text) { $p.Range.InsertBefore($Text) }
    $Doc.Paragraphs.Last
}

function Get-ParaText($Para) {
    $Para.Range.Text.TrimEnd([char]13, [char]7)
}

function Find-Para($Doc, [string] $Text) {
    foreach ($p in $Doc.Paragraphs) {
        if ((Get-ParaText $p) -ceq $Text) { return $p }
    }
    throw "Paragraph not found: '$Text'"
}

# Range over the first occurrence of $Fragment inside a paragraph.
function Get-SubRange($Doc, $Para, [string] $Fragment) {
    $index = $Para.Range.Text.IndexOf($Fragment, [StringComparison]::Ordinal)
    if ($index -lt 0) { throw "'$Fragment' not found in paragraph '$(Get-ParaText $Para)'" }
    $start = $Para.Range.Start + $index
    Get-DocRange $Doc $start ($start + $Fragment.Length)
}

# Collapsed range just before the paragraph mark.
function Get-ParaEnd($Doc, $Para) {
    $end = $Para.Range.End - 1
    Get-DocRange $Doc $end $end
}

function Add-Bookmark($Doc, [string] $Name, $Range) {
    $null = Invoke-Com $Doc.Bookmarks 'Add' @($Name, $Range)
}

function Remove-Numbering($Para) {
    if ($Para.Range.ListFormat.ListType -ne $wdListNoNumbering) {
        $null = Invoke-Com $Para.Range.ListFormat 'RemoveNumbers'
    }
}

#endregion

#region Manifest

function Format-ManifestText([string] $Text) {
    $Text = ($Text -replace '\r\x07$', [string][char]7).TrimEnd([char]13)
    [regex]::Replace($Text, '[\x00-\x1F]', { param($m) '\x{0:X2}' -f [int][char]$m.Value })
}

function Write-Manifest($Doc, [string] $Path) {
    $storyNames = @{
        1 = 'main'; 2 = 'footnotes'; 3 = 'endnotes'; 4 = 'comments'; 5 = 'textbox'
        6 = 'even header'; 7 = 'header'; 8 = 'even footer'; 9 = 'footer'
        10 = 'first header'; 11 = 'first footer'
    }
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("# $($Doc.Name) - generated by make-fixtures.ps1")
    $lines.Add('')
    $lines.Add('## Paragraphs (story | list number | style | text; \x07 = cell end, \x01 = picture, \x02 = note mark, \x05 = comment mark, \x13/\x14/\x15 = field)')
    foreach ($story in $Doc.StoryRanges) {
        $s = $story
        while ($null -ne $s) {
            $type = [int] $s.StoryType
            if ($storyNames.ContainsKey($type)) {
                foreach ($p in $s.Paragraphs) {
                    $lines.Add(('{0} | {1} | {2} | {3}' -f $storyNames[$type], $p.Range.ListFormat.ListString,
                        $p.Style.NameLocal, (Format-ManifestText $p.Range.Text)))
                }
            }
            $s = $s.NextStoryRange
        }
    }

    $lines.Add('')
    $lines.Add('## Bookmarks (name | story | covered text)')
    $Doc.Bookmarks.ShowHidden = $true
    foreach ($b in $Doc.Bookmarks) {
        $lines.Add(('{0} | {1} | {2}' -f $b.Name, $storyNames[[int] $b.StoryType], (Format-ManifestText $b.Range.Text)))
    }

    if ($Doc.Revisions.Count -gt 0) {
        $lines.Add('')
        $lines.Add('## Revisions (type: 1 = insert, 2 = delete | text)')
        foreach ($r in $Doc.Revisions) {
            $lines.Add(('{0} | {1}' -f $r.Type, (Format-ManifestText $r.Range.Text)))
        }
    }

    [System.IO.File]::WriteAllLines($Path, $lines, (New-Object System.Text.UTF8Encoding $false))
}

function Save-Fixture($Doc, [string] $FileName) {
    Enter-Step "$FileName : save and write manifest"
    $path = Join-Path $OutDir $FileName
    $Doc.RemovePersonalInformation = $true
    $null = Invoke-Com $Doc 'SaveAs2' @($path, $wdFormatXMLDocument)
    Write-Manifest $Doc ([System.IO.Path]::ChangeExtension($path, '.manifest.txt'))
    $null = Invoke-Com $Doc 'Close' @($wdDoNotSaveChanges)
    $script:CurrentDoc = $null
    Write-Log "Saved $path"
}

#endregion

#region Fixtures

function New-Spec300 {
    $doc = New-FixtureDocument 'spec-300'
    Enter-Step 'resolve style names'
    $S = Get-StyleNames $doc
    Enter-Step 'spec-300 : heading numbering'
    Set-HeadingNumbering $doc $S
    Enter-Step 'spec-300 : main text'

    # Placeholder for the table of contents, inserted once all headings exist.
    $null = Add-Para $doc '' $S.Normal

    $null = Add-Para $doc 'Introduction' $S.Heading1
    $null = Add-Para $doc 'This specification sets out the requirements.' $S.Normal
    $p = Add-Para $doc 'Bold body text.' $S.Normal
    $p.Range.Font.Bold = $true
    $p = Add-Para $doc 'Italic body text.' $S.Normal
    $p.Range.Font.Italic = $true
    $null = Add-Para $doc 'A quotation.' $S.Quote
    $null = Add-Para $doc 'Figure 1 Site plan' $S.Caption
    $null = Add-Para $doc 'Scope' $S.Heading2
    $null = Add-Para $doc 'Scope body.' $S.Normal
    $null = Add-Para $doc 'Definitions' $S.Heading2
    $null = Add-Para $doc 'Definitions body.' $S.Normal
    $null = Add-Para $doc 'General' $S.Heading1
    $null = Add-Para $doc 'Standards' $S.Heading2
    $null = Add-Para $doc 'Materials' $S.Heading1
    $null = Add-Para $doc 'Concrete' $S.Heading2
    $null = Add-Para $doc 'Safety' $S.Heading1
    $null = Add-Para $doc 'Means of escape' $S.Heading2
    $null = Add-Para $doc 'Structural fire resistance' $S.Heading2
    $null = Add-Para $doc 'Fire strategy' $S.Heading2
    $null = Add-Para $doc 'The fire strategy is described here.' $S.Normal

    $p = Add-Para $doc 'Heading with bold word' $S.Heading2
    (Get-SubRange $doc $p 'bold').Font.Bold = $true

    $null = Add-Para $doc 'First of two paragraphs.' $S.Normal
    $null = Add-Para $doc 'Second of two paragraphs.' $S.Normal

    Enter-Step 'spec-300 : table'
    # One table: a Normal cell and a Heading 3 cell (numbered 4.4.1).
    $blank = Add-Para $doc '' $S.Normal
    $table = Invoke-Com $doc.Tables 'Add' @($blank.Range, 1, 2, $wdWord9TableBehavior, 0)
    $table.Cell(1, 1).Range.Text = 'Cell text in the main table.'
    Set-ParaStyle ($table.Cell(1, 1).Range.Paragraphs.Item(1)) $S.Normal
    $table.Cell(1, 2).Range.Text = 'Heading in a table cell'
    Set-ParaStyle ($table.Cell(1, 2).Range.Paragraphs.Item(1)) $S.Heading3
    $script:ReuseLast = $true   # Word leaves an empty paragraph after the table; fill it next

    Enter-Step 'spec-300 : inline picture'
    $p = Add-Para $doc 'Paragraph with an inline picture.' $S.Normal
    $null = Invoke-Com $doc.InlineShapes 'AddPicture' @($script:PicturePath, $false, $true, (Get-ParaEnd $doc $p))

    Enter-Step 'spec-300 : cross-references'
    # Two Insert > Cross-reference references to "Scope" (gives Scope a _Ref bookmark).
    $items = @(Invoke-Com $doc 'GetCrossReferenceItems' @($wdRefTypeHeading))
    $scopeItem = 0
    for ($i = 0; $i -lt $items.Count; $i++) {
        if ($items[$i].Trim() -match '^(\S+\s+)?Scope$') { $scopeItem = $i + 1; break }
    }
    if ($scopeItem -eq 0) { throw "'Scope' not offered by the cross-reference list" }

    $p = Add-Para $doc 'References made by Word: see section ' $S.Normal
    $null = Invoke-Com (Get-ParaEnd $doc $p) 'InsertCrossReference' @($wdRefTypeHeading, $wdNumberRelativeContext, $scopeItem, $true, $false)
    (Get-ParaEnd $doc $doc.Paragraphs.Last).InsertAfter(' and heading ')
    $null = Invoke-Com (Get-ParaEnd $doc $doc.Paragraphs.Last) 'InsertCrossReference' @($wdRefTypeHeading, $wdContentText, $scopeItem, $true, $false)
    (Get-ParaEnd $doc $doc.Paragraphs.Last).InsertAfter('.')

    Enter-Step 'spec-300 : filler chapters 5-76'
    # Filler: Chapter 5 .. Chapter 76, each with three topics.
    for ($n = 5; $n -le 76; $n++) {
        $null = Add-Para $doc "Chapter $n" $S.Heading1
        $null = Add-Para $doc "Chapter $n body." $S.Normal
        for ($m = 1; $m -le 3; $m++) {
            $null = Add-Para $doc "Topic $n.$m" $S.Heading2
            $null = Add-Para $doc "Topic $n.$m body." $S.Normal
        }
    }

    $null = Add-Para $doc 'Title of the document' $S.Title
    $null = Add-Para $doc 'Subtitle of the document' $S.Subtitle

    Enter-Step 'spec-300 : bookmarks'
    # User bookmarks
    $p = Find-Para $doc 'Definitions'
    Add-Bookmark $doc 'WholeParagraph' $p.Range                       # includes the paragraph mark
    $p = Find-Para $doc 'Standards'
    Add-Bookmark $doc 'zeta' (Get-SubRange $doc $p 'Standards')
    Add-Bookmark $doc 'Alpha' (Get-SubRange $doc $p 'Standards')
    $p = Find-Para $doc 'Means of escape'
    Add-Bookmark $doc '_Hlk181818181' (Get-SubRange $doc $p 'Means of escape')
    $p = Find-Para $doc 'Structural fire resistance'
    Add-Bookmark $doc 'PartOfText' (Get-SubRange $doc $p 'fire')

    Enter-Step 'spec-300 : comment'
    # Comment
    $p = Find-Para $doc 'This specification sets out the requirements.'
    $null = Invoke-Com $doc.Comments 'Add' @((Get-SubRange $doc $p 'requirements'), 'A comment.')

    Enter-Step 'spec-300 : text box'
    # Text box, anchored to "Introduction"
    $p = Find-Para $doc 'Introduction'
    $box = Invoke-Com $doc.Shapes 'AddTextbox' @($msoTextOrientationHorizontal, 300, 0, 180, 90, $p.Range)
    $box.TextFrame.TextRange.InsertBefore("Heading in a text box`rText box body.")
    $paras = $box.TextFrame.TextRange.Paragraphs
    Set-ParaStyle ($paras.Item(1)) $S.Heading1
    Set-ParaStyle ($paras.Item(2)) $S.Normal
    Remove-Numbering $paras.Item(1)

    Enter-Step 'spec-300 : footnote and endnote'
    # Footnote and endnote, referenced from filler body paragraphs
    $p = Find-Para $doc 'Chapter 5 body.'
    $note = Invoke-Com $doc.Footnotes 'Add' @((Get-ParaEnd $doc $p))
    $note.Range.Text = "Heading in a footnote`rFootnote text."
    Set-ParaStyle ($note.Range.Paragraphs.Item(1)) $S.Heading1
    Set-ParaStyle ($note.Range.Paragraphs.Item(2)) $S.FootnoteText
    Remove-Numbering $note.Range.Paragraphs.Item(1)

    $p = Find-Para $doc 'Chapter 6 body.'
    $note = Invoke-Com $doc.Endnotes 'Add' @((Get-ParaEnd $doc $p))
    $note.Range.Text = "Heading in an endnote`rEndnote text."
    Set-ParaStyle ($note.Range.Paragraphs.Item(1)) $S.Heading1
    Set-ParaStyle ($note.Range.Paragraphs.Item(2)) $S.EndnoteText
    Remove-Numbering $note.Range.Paragraphs.Item(1)

    Enter-Step 'spec-300 : header and footer'
    # Primary header and footer
    $section = $doc.Sections.Item(1)
    $section.Headers.Item($wdHeaderFooterPrimary).Range.InsertBefore("Heading in the header`rHeader text.")
    $paras = $section.Headers.Item($wdHeaderFooterPrimary).Range.Paragraphs
    Set-ParaStyle ($paras.Item(1)) $S.Heading1
    Set-ParaStyle ($paras.Item(2)) $S.Header
    Remove-Numbering $paras.Item(1)

    $section.Footers.Item($wdHeaderFooterPrimary).Range.InsertBefore("Heading in the footer`rFooter text.")
    $paras = $section.Footers.Item($wdHeaderFooterPrimary).Range.Paragraphs
    Set-ParaStyle ($paras.Item(1)) $S.Heading1
    Set-ParaStyle ($paras.Item(2)) $S.Footer
    Remove-Numbering $paras.Item(1)

    Enter-Step 'spec-300 : table of contents and field update'
    # Table of contents (hyperlinked, so every heading gets a _Toc bookmark)
    $start = $doc.Paragraphs.Item(1).Range.Start
    $toc = Invoke-Com $doc.TablesOfContents 'Add' @(
        (Get-DocRange $doc $start $start),
        $true,      # UseHeadingStyles
        1, 3,       # Upper/LowerHeadingLevel
        $false,     # UseFields
        $Missing,   # TableID
        $true,      # RightAlignPageNumbers
        $true,      # IncludePageNumbers
        $Missing,   # AddedStyles
        $true,      # UseHyperlinks -> _Toc bookmarks
        $true,      # HidePageNumbersInWeb
        $false)     # UseOutlineLevels
    $null = $toc.Update()
    $null = $doc.Fields.Update()

    Save-Fixture $doc 'spec-300.docx'
}

function New-Guide500 {
    $doc = New-FixtureDocument 'guide-500'
    Enter-Step 'resolve style names'
    $S = Get-StyleNames $doc

    Enter-Step 'guide-500 : heading numbering'
    Set-HeadingNumbering $doc $S
    Enter-Step 'guide-500 : 100 parts'
    for ($n = 1; $n -le 100; $n++) {
        $null = Add-Para $doc "Part $n" $S.Heading1
        $null = Add-Para $doc "Numbered section $n.1" $S.Heading2
        $null = Add-Para $doc "Numbered section $n.2" $S.Heading2
        $null = Add-Para $doc "Unnumbered note $n-1" $S.Heading2
        $null = Add-Para $doc "Note body $n-1." $S.Normal
        $null = Add-Para $doc "Unnumbered note $n-2" $S.Heading2
        $null = Add-Para $doc "Note body $n-2." $S.Normal
    }

    Enter-Step 'guide-500 : remove numbering from unnumbered notes'
    # Done afterwards so the direct "no numbering" never carries into the next new paragraph.
    foreach ($p in $doc.Paragraphs) {
        if ((Get-ParaText $p) -clike 'Unnumbered note *') { Remove-Numbering $p }
    }

    Save-Fixture $doc 'guide-500.docx'
}

function New-Tracked {
    $doc = New-FixtureDocument 'tracked'
    Enter-Step 'resolve style names'
    $S = Get-StyleNames $doc
    Enter-Step 'tracked : heading numbering'
    Set-HeadingNumbering $doc $S

    Enter-Step 'tracked : untracked content'
    $null = Add-Para $doc 'Kept heading' $S.Heading1
    $null = Add-Para $doc 'Body under the kept heading.' $S.Normal
    $null = Add-Para $doc 'Deleted heading' $S.Heading1
    $null = Add-Para $doc '' $S.Normal     # receives the tracked insertion

    Enter-Step 'tracked : tracked insertion and deletion'
    $doc.TrackRevisions = $true
    try { $doc.TrackFormatting = $false } catch { }   # keep the restyle below out of the revisions

    $doc.Paragraphs.Last.Range.InsertBefore("Inserted heading`r")
    $doc.Paragraphs.Last.Range.InsertBefore('Body under the inserted heading.')
    Set-ParaStyle ($doc.Paragraphs.Item(4)) $S.Heading1           # Inserted heading
    $null = $doc.Paragraphs.Item(3).Range.Delete()         # Deleted heading, paragraph mark included

    try { $doc.TrackFormatting = $true } catch { }
    # TrackRevisions stays on in the saved file.

    Save-Fixture $doc 'tracked.docx'
}

function New-PlainHeadings {
    $doc = New-FixtureDocument 'plain-headings'
    Enter-Step 'resolve style names'
    $S = Get-StyleNames $doc
    # Deliberately no heading numbering.
    Enter-Step 'plain-headings : content'

    $p = Add-Para $doc 'Overview' $S.Heading1
    Remove-Numbering $p   # only acts if your Normal template numbers headings
    $null = Add-Para $doc 'Overview body.' $S.Normal

    $p = Add-Para $doc 'Outline-level heading' $S.Normal
    $p.OutlineLevel = $wdOutlineLevel2

    $p = Add-Para $doc 'Bold fake heading' $S.Normal
    $p.Range.Font.Bold = $true
    $p.Range.Font.Size = 16
    $p.OutlineLevel = $wdOutlineLevelBodyText

    $p = Add-Para $doc '' $S.Heading2
    Remove-Numbering $p
    $null = Add-Para $doc 'Closing body.' $S.Normal

    Save-Fixture $doc 'plain-headings.docx'
}

#endregion

#region Main

if (-not (Test-Path -LiteralPath $OutDir)) { throw "Output folder not found: $OutDir" }
$OutDir = (Resolve-Path -LiteralPath $OutDir).Path
if (-not $LogPath) { $LogPath = Join-Path $OutDir 'make-fixtures.log' }
$script:LogFile = $LogPath
[System.IO.File]::WriteAllText($script:LogFile, '')
Write-Log "Log file: $LogPath"
Write-Log "PowerShell $($PSVersionTable.PSVersion); building: $($Only -join ', '); output: $OutDir"

# Small blue square for the inline picture.
$script:PicturePath = Join-Path ([System.IO.Path]::GetTempPath()) 'fixture-picture.png'
[System.IO.File]::WriteAllBytes($script:PicturePath, [Convert]::FromBase64String(
    'iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAAH0lEQVR42mPQK91GFcQwatCoQaMGjRo0atCoQQNvEACraQhuavp60gAAAABJRU5ErkJggg=='))

$script:Word = $null
$failed = $false
try {
    Enter-Step 'start Word'
    $script:Word = New-Object -ComObject Word.Application
    $script:Word.Visible = [bool] $Visible
    $script:Word.DisplayAlerts = 0
    $script:Word.ScreenUpdating = [bool] $Visible
    Write-Log ("Word {0} (build {1}), UI language {2}, Normal template: {3}" -f $script:Word.Version, $script:Word.Build,
        $script:Word.Language, $script:Word.NormalTemplate.FullName)

    if ($Only -contains 'spec-300')       { New-Spec300 }
    if ($Only -contains 'guide-500')      { New-Guide500 }
    if ($Only -contains 'tracked')        { New-Tracked }
    if ($Only -contains 'plain-headings') { New-PlainHeadings }
    Enter-Step 'done'
}
catch {
    $failed = $true
    $err = $_
    Write-Log "FAILED in step: $script:Step" -Level ERROR
    Write-Log "Last action:    $script:LastAction" -Level ERROR
    Write-Log "Error:          $(Get-ErrorChain $err.Exception)" -Level ERROR
    Write-Log "At:             $($err.InvocationInfo.PositionMessage)" -Level ERROR
    Write-Log "Script stack:`n$($err.ScriptStackTrace)" -Level ERROR
    if ($null -ne $script:CurrentDoc) {
        try {
            $partial = Join-Path ([System.IO.Path]::GetTempPath()) "$($script:CurrentName)-FAILED.docx"
            $null = Invoke-Com $script:CurrentDoc 'SaveAs2' @($partial, $wdFormatXMLDocument)
            Write-Log "Half-built document saved to $partial" -Level ERROR
        }
        catch { Write-Log "Could not save the half-built document: $(Get-ErrorChain $_.Exception)" -Level WARN }
    }
}
finally {
    if ($null -ne $script:Word) {
        try { $null = Invoke-Com $script:Word 'Quit' @($wdDoNotSaveChanges) } catch { }
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($script:Word)
    }
    Remove-Item -LiteralPath $script:PicturePath -ErrorAction SilentlyContinue
}

#endregion

if ($failed) {
    Write-Host "See $LogPath for the full log." -ForegroundColor Red
    exit 1
}
