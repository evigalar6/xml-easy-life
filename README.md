# XML Easy Life (Chrome Extension MVP)

XML Easy Life is a lightweight Chrome extension workbench for interview prep and day-to-day XML debugging.

## What it does

- Upload local `.xml` files
- Load XML from the current active tab
- Validate XML well-formedness
- Format XML for readability with a reversible toggle (`Format XML` / `Show Original XML`)
- Run XPath queries and inspect matching results
- Generate XPath suggestions from current cursor context (`Use` / `Copy`)
- Code-area style XML input with line numbers
- Parser-aware error navigation (`Prev Error` / `Next Error`) with line+column jump
- Visible custom scrollbars for editor and results panels
- Button interaction states (pressed/processing/disabled)
- Calm, modern UI with light and dark mode

## XPath suggestion types

When you click `Generate XPath From Cursor`, the extension creates a few candidate selectors with a quality hint:

- `Absolute • Fragile`
  - Example: `/CATALOG[1]/CD[1]/COUNTRY[1]`
  - Exact node path with indexes from root.
  - Best for one-off debugging.
  - Fragile because structure/order changes can break it.

- `By tag • Broad`
  - Example: `//COUNTRY`
  - Matches all nodes with that tag name.
  - Good for exploration and quick checks.
  - Broad because it can return many nodes.

- `By attribute • Stable` (shown when attributes exist)
  - Example: `//CD[@id='cd-101']`
  - Usually the best production-style selector when attribute is unique.
  - More stable than index-based paths.

- `By text • Medium`
  - Example: `//COUNTRY[text()='USA']`
  - Useful when value matching is what you need.
  - Medium reliability because text can change.

Use `Use` to place a suggestion into the XPath input, or `Copy` to copy it to clipboard.

## How XPath generation works

- XML must be well-formed.
- The generator uses current cursor position in the editor.
- It infers the element context from open tags before that position.
- It resolves a target element and emits multiple candidate XPath expressions.

Ambiguity can happen when cursor is:
- on whitespace between siblings
- before the root element or after document end
- in invalid XML

In ambiguous cases, generation may fall back to a nearby or root element.

## Editor behavior

- The XML editor is an internal scrollable area (fixed viewport) so you can navigate large files without page jumping.
- Line numbers are synced with editor scroll.
- `Validate` enables error navigation only when parser issues exist:
  - one issue: `Jump To Error`
  - multiple issues: `Jump To Error`, `Prev Error`, `Next Error`

## Project structure

```text
.
├── background.js
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── manifest.json
├── popup/
│   ├── popup.css
│   ├── popup.html
│   └── popup.js
└── workbench/
    ├── workbench.css
    ├── workbench.html
    └── workbench.js
```

## Run locally

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this project directory (`xml easy life`)
5. Click extension icon and open the workbench

## Notes

- This MVP validates XML well-formedness via browser parser.
- Parser error detail depends on browser-provided `parsererror` output (often first error only).
- XPath generator is heuristic (cursor + tag-stack based), not a full AST-aware XML IDE engine.
- XSD schema validation, XSLT transform preview, and namespace-assisted XPath generation can be added next.
