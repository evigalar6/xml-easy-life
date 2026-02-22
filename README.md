# XML Easy Life

XML Easy Life is a Chrome extension for practical XML workflows: inspect and validate XML, generate and run XPath (including namespace-aware SOAP cases), run lightweight XSD checks, and preview/download XSLT transform output.

## Why This Tool Is Useful

Most XML workflows are split across multiple tools: browser tabs, online XPath testers, desktop XML editors, and manual copy-paste between them. XML Easy Life keeps the core workflow in one lightweight extension UI.

Key practical advantages:
- Single workspace for `Inspector`, `XPath`, `XSD`, and `XSLT`
- Fast “load -> inspect -> query -> validate -> transform” loop with less context switching
- Namespace-aware XPath workflow that is friendlier for SOAP/Atom/default-namespace XML
- Cursor-based XPath generation to speed up routine selector building
- Built-in parser error navigation and editor line numbers for quicker debugging
- Local-file friendly workflow (upload, recent history, copy/download outputs)
- Lightweight and browser-native, without requiring a heavyweight desktop XML suite

## Feature Overview

### Tabs
- `Inspector`
  - Reversible formatting toggle: `Format XML` <-> `Show Original XML`
  - Well-formedness validation
  - Parser error navigation (`Jump To Error`, `Prev Error`, `Next Error`)
  - `Re-scan XML` summary (status, root, counts, namespaces)
- `XPath`
  - Manual namespace map (`prefix=uri`)
  - `Detect Namespaces From XML`
  - Cursor-based XPath suggestion generator (`Use` / `Copy`)
  - XPath matcher with scrollable results and copy button
- `XSD`
  - Upload XSD and run lightweight structural validation
- `XSLT`
  - Upload/paste stylesheet
  - Run JS-based XSLT-lite transform
  - Copy output
  - Download output (`.xml` when output looks like XML, otherwise `.txt`)

### XML Input Workflow
- Upload local XML files
- Load XML from current browser tab
- Load from recent XML history (`chrome.storage.local`)
- Scrollable editor with synced line numbers
- Explicit editor/result scrollbars

### XPath Generator Notes
Generator is based on:
1. Well-formed XML
2. Current cursor position
3. Open-tag context before cursor

Suggestion types include:
- `Absolute • Fragile`
- `By tag • Broad`
- `By local-name • Namespace-safe` (useful for SOAP/namespaced XML)
- `By attribute • Stable` (namespace declaration attributes are excluded)
- `By text • Medium`

Ambiguity may happen when cursor is on whitespace between siblings, outside root scope, or XML is invalid.

## Inspector Summary (`Re-scan XML`)

Recomputes a quick snapshot of current input:
- XML validity
- Root element
- Element count
- Line count
- Approximate byte size
- Namespace declarations found on root

## Project Structure

```text
.
├── .gitignore
├── README.md
├── manifest.json
├── package.json
├── background.js
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── workbench/
│   ├── workbench.html
│   ├── workbench.css
│   ├── workbench.js
│   └── shared.js
├── tests/
│   └── shared.test.js
├── test-files/
│   ├── README.md
│   ├── catalog_valid.xml
│   ├── catalog_malformed.xml
│   ├── catalog_missing_required.xml
│   ├── catalog_basic.xsd
│   ├── books_ns.xml
│   ├── books_ns.xslt
│   ├── soap_books.xml
│   ├── soap_books_extract_titles.xslt
│   ├── rss_feed.xml
│   └── atom_feed.xml
└── docs/
    ├── README.md
    └── demo.gif
```

## Architecture Notes

- `background.js`
  - Messaging bridge used to fetch XML from active tab.
- `workbench/workbench.js`
  - UI state and tab management
  - Validation/navigation logic
  - XPath eval + suggestion rendering
  - XSD/XSLT flows
- `workbench/shared.js`
  - Reusable helpers for parsing issues, cursor inference, XPath literals, basic XSD rule extraction, namespace extraction.
- `tests/shared.test.js`
  - Unit tests for shared helper behavior.

## Run Locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.
5. Open popup and launch the workbench.

## Run Tests

```bash
npm test
```

## Manual E2E Testing

Use fixtures in `test-files/` to validate full flows:
- Validation errors and error navigation
- Namespace detection and XPath matching
- SOAP namespace scenarios
- XSD checks
- XSLT transforms (including output copy/download)

## Current Limitations

- Browser XML parser generally exposes first parse error details most clearly.
- XPath default-namespace behavior follows browser rules (unprefixed names do not match default-namespace elements).
- XSD validation is intentionally lightweight and not full schema engine coverage.
- XSLT support is a practical JS subset (`template match="/"`, `for-each`, `value-of`, `text`, simple `if`).

## Roadmap Ideas

- Richer namespace assistant for default namespace workflows
- Deeper XSD compatibility
- Extended XSLT support
- Session export/import
