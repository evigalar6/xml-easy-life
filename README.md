# XML Easy Life (Chrome Extension MVP)

XML Easy Life is a lightweight Chrome extension workbench for interview prep and day-to-day XML debugging.

## Features

- Upload local `.xml` files
- Load XML from the current active tab
- Validate XML well-formedness
- Format XML for readability
- Run XPath queries and inspect matching results
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
- XSD schema validation and XSLT transform preview can be added next.
