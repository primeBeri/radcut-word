# Contract: format template grammar

User-defined formats (FR-018). Parsed and validated by the core (`parseTemplate`) into
`FormatPart[]` (see [data-model.md](../data-model.md)).

```text
template    = 1*( placeholder / literal )
placeholder = "{" name "}"
name        = "number" / "text" / "page" / "abovebelow"     ; case-insensitive
literal     = 1*( char / "{{" / "}}" )                      ; "{{" and "}}" are literal braces
char        = any character except "{" and "}"
```

## Rules

| Rule | Error shown |
|---|---|
| At least one placeholder | "Add at least one of {number}, {text}, {page} or {abovebelow}." |
| Only the four names | "Unknown placeholder {xyz}. Use {number}, {text}, {page} or {abovebelow}." |
| Braces balanced | "Unmatched { or }. Write {{ or }} for a literal brace." |
| Length 1–200 characters | "Templates can be up to 200 characters." |
| Label 1–40 characters, unique among formats (case-insensitive) | "A format with this name already exists."; empty: "Give the template a name."; too long: "Names can be up to 40 characters." (added 2026-10-17) |

A placeholder may appear more than once; each occurrence becomes its own field. Names are
compared and stored without surrounding spaces. Checks run in this order: length, then left to
right through the text (the first unmatched brace or unknown placeholder is the one named), then
the placeholder check.

A template that fails these checks when settings are loaded (edited outside the add-in, or a
newer rule) is left out, and the settings view says "A saved template couldn't be read, so it was
left out." (`templateDropped`).

## Examples

| Template | Parts |
|---|---|
| `see §{number} {text}, {abovebelow}` | "see §", number, " ", text, ", ", aboveBelow |
| `{text} (p. {page})` | text, " (p. ", page, ")" |
| `{{draft}} {number}` | "{draft} ", number |
| `see section` | error: no placeholder |
| `{num}` | error: unknown placeholder |

Built-in formats are defined with the same parts model, so preview and insertion share one code
path.
