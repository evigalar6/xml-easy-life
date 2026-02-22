# XML Easy Life (Chrome Extension MVP)

XML Easy Life is a lightweight Chrome extension workbench for interview prep and day-to-day XML debugging.

## Features

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
- XSD schema validation and XSLT transform preview can be added next.
