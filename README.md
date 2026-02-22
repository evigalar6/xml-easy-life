# XML Easy Life

XML Easy Life is a Chrome extension workbench for XML-heavy workflows: inspect data, validate structure, evaluate XPath, generate selectors, and preview XSLT output quickly.

## What it does
![Demo Placeholder](docs/demo.gif)

`docs/demo.gif` is an optional demo recording for your portfolio README.

## Feature Overview

### XML input and navigation
- Upload local `.xml` files
- Load XML directly from current active tab
- Load from recent XML history (stored in `chrome.storage.local`)
- Internal scrollable editor viewport with synced line numbers
- Reversible formatting toggle:
  - `Format XML`
  - `Show Original XML`

### XPath tooling
- Evaluate XPath against current XML
- Namespace-aware XPath evaluation with custom prefix mappings
- Auto-detect namespace prefixes from XML root (`xmlns:...`)
- Cursor-based XPath generator (`Use` / `Copy` actions)
- Result panel with fixed scrollable viewport and one-click copy

### XPath suggestion types
- `Absolute • Fragile`
  - Example: `/CATALOG[1]/CD[1]/COUNTRY[1]`
  - Exact indexed path from root
  - Precise but sensitive to structural changes
- `By tag • Broad`
  - Example: `//COUNTRY`
  - Fast exploration, often many matches
- `By attribute • Stable`
  - Example: `//CD[@id='cd-101']`
  - Usually best when attribute is unique
- `By text • Medium`
  - Example: `//COUNTRY[text()='USA']`
  - Useful, but value changes can break selectors

### Validation and transformation
- XML well-formedness validation
- Error navigation after validation:
  - single issue: `Jump To Error`
  - multiple issues: `Jump To Error`, `Prev Error`, `Next Error`
- XSD validation (basic heuristic mode):
  - checks root element compatibility
  - checks required direct child elements from inline `xs:sequence`
- XSLT preview:
  - upload/paste stylesheet
  - run transform
  - copy full transform output

### UX and docs
- In-app help popover (`How To Use This Tool`) with formatted, scrollable guidance
- Light/dark theme support
- Processing/pressed/disabled button states

## How XPath generation works

The generator uses:
1. Well-formed XML
2. Current cursor position
3. Open-tag stack before cursor

Ambiguity can happen when cursor is:
- on whitespace between siblings
- before root or after document end
- inside invalid XML

In ambiguous cases, generation may fall back to a nearby/root element.

## Project Structure

```text
.
├── background.js
├── manifest.json
├── package.json
├── tests/
│   └── shared.test.js
├── popup/
│   ├── popup.css
│   ├── popup.html
│   └── popup.js
├── workbench/
│   ├── shared.js
│   ├── workbench.css
│   ├── workbench.html
│   └── workbench.js
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Architecture Notes

- `background.js`
  - message-based bridge for loading XML from active tab
- `workbench/workbench.js`
  - UI state, event wiring, validation flows, XPath/XSLT execution
- `workbench/shared.js`
  - testable pure helpers:
    - parser issue extraction
    - cursor path inference
    - XPath literal escaping
    - basic XSD rule extraction + validation
    - namespace extraction
- `tests/shared.test.js`
  - unit tests for shared helper logic (Node built-in test runner)

## Run Locally

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this project folder
5. Open the extension popup and launch workbench

## Run Tests

```bash
npm test
```

## End-to-End Sample Files

Use `test-files/` for manual extension testing (XML/XSD/XSLT fixtures and step-by-step guide).

- `test-files/README.md`
- `test-files/catalog_valid.xml`
- `test-files/catalog_basic.xsd`
- `test-files/catalog_missing_required.xml`
- `test-files/catalog_malformed.xml`
- `test-files/books_ns.xml`
- `test-files/books_ns.xslt`
- `test-files/rss_feed.xml`
- `test-files/atom_feed.xml`
- `test-files/soap_books.xml`
- `test-files/soap_books_extract_titles.xslt`

## Limitations

- Browser XML parser usually reports first parse error detail only.
- XPath default namespace behavior follows browser XPath rules:
  - unprefixed names do not match default namespace elements.
- XSD validation is intentionally lightweight:
  - currently supports root + required direct children in inline sequences.
- XSLT preview depends on browser `XSLTProcessor` support and stylesheet complexity.

## Roadmap Ideas

- Rich namespace assistant for default namespace prefix rewriting
- Expanded XSD support (references, complex types, deeper structure)
- Advanced XPath generator scoring and uniqueness checks
- Export/import project sessions
