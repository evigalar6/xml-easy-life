const xmlInput = document.getElementById("xmlInput");
const lineNumbers = document.getElementById("lineNumbers");
const xpathInput = document.getElementById("xpathInput");
const results = document.getElementById("results");
const meta = document.getElementById("meta");
const fileInput = document.getElementById("fileInput");
const root = document.documentElement;
const themeToggleBtn = document.getElementById("themeToggle");
const loadSampleBtn = document.getElementById("loadSample");
const formatBtn = document.getElementById("formatBtn");
const validateBtn = document.getElementById("validateBtn");
const runXpathBtn = document.getElementById("runXpath");
const generateXpathBtn = document.getElementById("generateXpathBtn");
const xpathSuggestions = document.getElementById("xpathSuggestions");
const xpathSuggestionsList = document.getElementById("xpathSuggestionsList");
const errorNavRow = document.getElementById("errorNavRow");
const jumpErrorBtn = document.getElementById("jumpErrorBtn");
const prevErrorBtn = document.getElementById("prevErrorBtn");
const nextErrorBtn = document.getElementById("nextErrorBtn");
const errorNavInfo = document.getElementById("errorNavInfo");

let parserErrors = [];
let activeParserErrorIndex = -1;
let isFormattedView = false;
let originalXmlSnapshot = "";

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="bk101">
    <author>Gambardella, Matthew</author>
    <title>XML Developer's Guide</title>
    <genre>Computer</genre>
    <price>44.95</price>
  </book>
  <book id="bk102">
    <author>Ralls, Kim</author>
    <title>Midnight Rain</title>
    <genre>Fantasy</genre>
    <price>5.95</price>
  </book>
</catalog>`;

function setMeta(message, kind = "") {
  meta.textContent = message;
  meta.className = `meta ${kind}`.trim();
}

function resetFormatToggle() {
  isFormattedView = false;
  originalXmlSnapshot = "";
  formatBtn.textContent = "Format XML";
  formatBtn.setAttribute("aria-pressed", "false");
}

function setFormatToggleActive() {
  isFormattedView = true;
  formatBtn.textContent = "Show Original XML";
  formatBtn.setAttribute("aria-pressed", "true");
}

function clearXpathSuggestions() {
  xpathSuggestions.hidden = true;
  xpathSuggestionsList.innerHTML = "";
}

function updateLineNumbers() {
  const totalLines = Math.max(1, xmlInput.value.split("\n").length);
  lineNumbers.textContent = Array.from({ length: totalLines }, (_, i) => String(i + 1)).join("\n");
}

function syncLineNumberScroll() {
  lineNumbers.scrollTop = xmlInput.scrollTop;
}

function extractParserIssues(errorText) {
  const issues = [];
  const regex = /error on line\s+(\d+)\s+at column\s+(\d+)/gi;
  let match = regex.exec(errorText);
  while (match) {
    issues.push({
      line: Number(match[1]),
      column: Number(match[2]),
      message: `Line ${match[1]}, column ${match[2]}`
    });
    match = regex.exec(errorText);
  }
  return issues;
}

function updateErrorNavigation() {
  const hasErrors = parserErrors.length > 0;
  errorNavRow.hidden = !hasErrors;
  if (!hasErrors) {
    errorNavInfo.textContent = "No errors";
    jumpErrorBtn.hidden = true;
    prevErrorBtn.hidden = true;
    nextErrorBtn.hidden = true;
    return;
  }

  jumpErrorBtn.hidden = false;
  const hasMultiple = parserErrors.length > 1;
  prevErrorBtn.hidden = !hasMultiple;
  nextErrorBtn.hidden = !hasMultiple;

  errorNavInfo.textContent = `Error ${activeParserErrorIndex + 1} of ${parserErrors.length} (${parserErrors[activeParserErrorIndex].message})`;
}

function setParserErrors(issues) {
  parserErrors = issues;
  activeParserErrorIndex = issues.length > 0 ? 0 : -1;
  updateErrorNavigation();
}

function getLineRange(text, line, fallbackColumn) {
  const lines = text.split("\n");
  let offset = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const lineNumber = i + 1;
    if (lineNumber === line) {
      const start = offset;
      const end = offset + lines[i].length;
      if (start === end) {
        const caret = Math.max(0, Math.min(lines[i].length, fallbackColumn - 1));
        return { start: offset + caret, end: offset + caret };
      }
      return { start, end };
    }
    offset += lines[i].length + 1;
  }
  return { start: text.length, end: text.length };
}

function jumpToParserError(index) {
  if (index < 0 || index >= parserErrors.length) {
    return;
  }
  activeParserErrorIndex = index;
  const issue = parserErrors[index];
  const lineRange = getLineRange(xmlInput.value, issue.line, issue.column);
  xmlInput.focus();
  xmlInput.setSelectionRange(lineRange.start, lineRange.end);
  xmlInput.classList.add("error-focus");
  setTimeout(() => {
    xmlInput.classList.remove("error-focus");
  }, 900);
  const totalLines = xmlInput.value.split("\n");
  const avgLineHeight = parseFloat(getComputedStyle(xmlInput).lineHeight) || 22;
  const targetTop = Math.max(0, (issue.line - 2) * avgLineHeight);
  if (totalLines.length > 1) {
    xmlInput.scrollTop = targetTop;
    syncLineNumberScroll();
  }
  updateErrorNavigation();
}

function parseXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const errorNode = doc.querySelector("parsererror");
  if (errorNode) {
    const errorText = errorNode.textContent.trim();
    return {
      ok: false,
      error: errorText,
      issues: extractParserIssues(errorText)
    };
  }
  return { ok: true, doc, issues: [] };
}

function formatXml(xml) {
  const reg = /(>)(<)(\/*)/g;
  let pretty = xml.replace(reg, "$1\n$2$3");
  let pad = 0;

  pretty = pretty
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";

      if (/^<\//.test(trimmed)) {
        pad = Math.max(pad - 1, 0);
      }

      const out = `${"  ".repeat(pad)}${trimmed}`;

      if (/^<[^!?][^>]*[^/]?>$/.test(trimmed) && !/^<.*<\//.test(trimmed)) {
        pad += 1;
      }

      return out;
    })
    .filter(Boolean)
    .join("\n");

  return pretty;
}

function documentToString(doc) {
  return new XMLSerializer().serializeToString(doc);
}

function getCursorLineNumber() {
  const offset = xmlInput.selectionStart || 0;
  return xmlInput.value.slice(0, offset).split("\n").length;
}

function inferElementPathFromCursor(xmlText, cursorOffset) {
  const snippet = xmlText.slice(0, cursorOffset);
  const stack = [];
  const tagRegex = /<\/?([A-Za-z_][\w:.-]*)(\s[^<>]*)?>/g;
  let match = tagRegex.exec(snippet);
  while (match) {
    const fullTag = match[0];
    const tagName = match[1];
    const isClosing = fullTag.startsWith("</");
    const isSelfClosing = /\/>\s*$/.test(fullTag);
    if (isClosing) {
      if (stack.length > 0 && stack[stack.length - 1] === tagName) {
        stack.pop();
      }
    } else if (!isSelfClosing) {
      stack.push(tagName);
    }
    match = tagRegex.exec(snippet);
  }
  return stack;
}

function xpathLiteral(value) {
  if (!value.includes("'")) {
    return `'${value}'`;
  }
  if (!value.includes('"')) {
    return `"${value}"`;
  }
  const parts = value.split("'");
  return `concat('${parts.join(`', "'", '`)}')`;
}

function buildAbsoluteIndexedXPath(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }
  const segments = [];
  let current = node;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === current.tagName) {
        index += 1;
      }
      sibling = sibling.previousElementSibling;
    }
    segments.unshift(`${current.tagName}[${index}]`);
    current = current.parentElement;
  }
  return `/${segments.join("/")}`;
}

function getRepresentativeNode(doc, pathStack) {
  if (!pathStack.length) {
    return doc.documentElement;
  }
  const absolutePath = `/${pathStack.join("/")}`;
  const fromPath = doc.evaluate(absolutePath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
    .singleNodeValue;
  if (fromPath) return fromPath;
  const fallbackTag = pathStack[pathStack.length - 1];
  return doc.evaluate(`//${fallbackTag}`, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
    .singleNodeValue;
}

function buildXpathSuggestionsForNode(node) {
  const suggestions = [];
  if (!node || node.nodeType !== Node.ELEMENT_NODE) {
    return suggestions;
  }

  const absolute = buildAbsoluteIndexedXPath(node);
  if (absolute) {
    suggestions.push({
      label: "Absolute",
      score: "Fragile",
      xpath: absolute
    });
  }

  suggestions.push({
    label: "By tag",
    score: "Broad",
    xpath: `//${node.tagName}`
  });

  if (node.attributes && node.attributes.length > 0) {
    const attr = node.attributes[0];
    suggestions.push({
      label: "By attribute",
      score: "Stable",
      xpath: `//${node.tagName}[@${attr.name}=${xpathLiteral(attr.value)}]`
    });
  }

  const textValue = (node.textContent || "").trim().replace(/\s+/g, " ");
  if (textValue && textValue.length <= 80 && node.children.length === 0) {
    suggestions.push({
      label: "By text",
      score: "Medium",
      xpath: `//${node.tagName}[text()=${xpathLiteral(textValue)}]`
    });
  }

  const unique = new Map();
  for (const item of suggestions) {
    if (!unique.has(item.xpath)) {
      unique.set(item.xpath, item);
    }
  }
  return [...unique.values()].slice(0, 4);
}

function renderXpathSuggestions(items) {
  xpathSuggestionsList.innerHTML = "";
  if (!items.length) {
    clearXpathSuggestions();
    return;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "xpath-suggestion-item";

    const code = document.createElement("code");
    code.textContent = `${item.label} • ${item.score}: ${item.xpath}`;

    const actions = document.createElement("div");
    actions.className = "xpath-suggestion-actions";

    const useBtn = document.createElement("button");
    useBtn.className = "ghost";
    useBtn.textContent = "Use";
    useBtn.addEventListener("click", () => {
      xpathInput.value = item.xpath;
      setMeta("XPath inserted into input.", "ok");
    });

    const copyBtn = document.createElement("button");
    copyBtn.className = "ghost";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(item.xpath);
        setMeta("XPath copied.", "ok");
      } catch (_error) {
        setMeta("Clipboard copy failed in this context.", "error");
      }
    });

    actions.appendChild(useBtn);
    actions.appendChild(copyBtn);
    row.appendChild(code);
    row.appendChild(actions);
    xpathSuggestionsList.appendChild(row);
  }

  xpathSuggestions.hidden = false;
}

function stringifyXPathResult(node) {
  if (node.nodeType === Node.ATTRIBUTE_NODE) {
    return `@${node.nodeName}="${node.nodeValue}"`;
  }
  if (node.nodeType === Node.TEXT_NODE) {
    return node.nodeValue.trim();
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    return node.outerHTML;
  }
  return node.textContent || node.nodeName;
}

function evaluateXpath() {
  const xmlText = xmlInput.value.trim();
  const expr = xpathInput.value.trim();

  if (!xmlText || !expr) {
    setMeta("Provide both XML and an XPath expression.", "error");
    return;
  }

  const parsed = parseXml(xmlText);
  if (!parsed.ok) {
    setParserErrors([]);
    setMeta(`Invalid XML: ${parsed.error}`, "error");
    return;
  }
  setParserErrors([]);

  try {
    const iterator = parsed.doc.evaluate(expr, parsed.doc, null, XPathResult.ANY_TYPE, null);
    const output = [];
    let node = iterator.iterateNext();

    while (node) {
      const str = stringifyXPathResult(node);
      if (str) output.push(str);
      node = iterator.iterateNext();
    }

    if (output.length === 0) {
      results.textContent = "No nodes matched.";
      setMeta("XPath executed successfully.", "ok");
      return;
    }

    results.textContent = output.join("\n\n");
    setMeta(`XPath matched ${output.length} node(s).`, "ok");
  } catch (error) {
    results.textContent = "";
    setMeta(`XPath error: ${error.message}`, "error");
  }
}

function setTheme(theme) {
  root.dataset.theme = theme;
  themeToggleBtn.setAttribute("aria-pressed", String(theme === "dark"));
  chrome.storage.local.set({ themePreference: theme });
}

function waitForPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function withButtonProcessing(button, task, label = "Processing...") {
  if (!button) return task();

  const previousLabel = button.textContent;
  button.disabled = true;
  button.classList.add("is-processing");
  button.setAttribute("aria-busy", "true");
  button.textContent = label;

  // Ensure state is painted before heavier work starts.
  await waitForPaint();

  try {
    return await task();
  } finally {
    button.disabled = false;
    button.classList.remove("is-processing");
    button.removeAttribute("aria-busy");
    if (button.textContent === label) {
      button.textContent = previousLabel;
    }
  }
}

themeToggleBtn.addEventListener("click", async () => {
  const current = root.dataset.theme || "light";
  setTheme(current === "dark" ? "light" : "dark");
});

loadSampleBtn.addEventListener("click", async () => {
  await withButtonProcessing(
    loadSampleBtn,
    async () => {
      xmlInput.value = formatXml(SAMPLE_XML);
      updateLineNumbers();
      syncLineNumberScroll();
      clearXpathSuggestions();
      resetFormatToggle();
      setParserErrors([]);
      results.textContent = "Sample loaded.";
      setMeta("Sample XML loaded.", "ok");
    },
    "Loading..."
  );
});

formatBtn.addEventListener("click", async () => {
  await withButtonProcessing(
    formatBtn,
    async () => {
      if (isFormattedView) {
        xmlInput.value = originalXmlSnapshot;
        updateLineNumbers();
        syncLineNumberScroll();
        resetFormatToggle();
        setMeta("Original XML restored.", "ok");
        return;
      }

      const xmlText = xmlInput.value;
      if (!xmlText.trim()) {
        setMeta("Nothing to format yet.", "error");
        return;
      }
      const parsed = parseXml(xmlText);
      if (!parsed.ok) {
        setParserErrors([]);
        setMeta(`Invalid XML: ${parsed.error}`, "error");
        return;
      }

      originalXmlSnapshot = xmlInput.value;
      xmlInput.value = formatXml(documentToString(parsed.doc));
      updateLineNumbers();
      syncLineNumberScroll();
      clearXpathSuggestions();
      setFormatToggleActive();
      setParserErrors([]);
      setMeta("XML formatted successfully.", "ok");
    },
    isFormattedView ? "Restoring..." : "Formatting..."
  );
});

validateBtn.addEventListener("click", async () => {
  await withButtonProcessing(
    validateBtn,
    async () => {
      const xmlText = xmlInput.value.trim();
      if (!xmlText) {
        setMeta("Paste or upload XML first.", "error");
        return;
      }

      const parsed = parseXml(xmlText);
      if (!parsed.ok) {
        setParserErrors(parsed.issues);
        setMeta(`Invalid XML: ${parsed.error}`, "error");
        return;
      }

      setParserErrors([]);
      setMeta("XML is well-formed.", "ok");
    },
    "Checking..."
  );
});

runXpathBtn.addEventListener("click", async () => {
  await withButtonProcessing(runXpathBtn, async () => {
    evaluateXpath();
  }, "Running...");
});

generateXpathBtn.addEventListener("click", async () => {
  await withButtonProcessing(
    generateXpathBtn,
    async () => {
      const xmlText = xmlInput.value;
      if (!xmlText.trim()) {
        clearXpathSuggestions();
        setMeta("Paste or upload XML first.", "error");
        return;
      }

      const parsed = parseXml(xmlText);
      if (!parsed.ok) {
        clearXpathSuggestions();
        setMeta(`Invalid XML: ${parsed.error}`, "error");
        return;
      }

      const pathStack = inferElementPathFromCursor(xmlText, xmlInput.selectionStart || 0);
      const targetNode = getRepresentativeNode(parsed.doc, pathStack);
      if (!targetNode) {
        clearXpathSuggestions();
        setMeta("No element found at the current cursor location.", "error");
        return;
      }

      const suggestions = buildXpathSuggestionsForNode(targetNode);
      renderXpathSuggestions(suggestions);
      setMeta(
        `Generated ${suggestions.length} XPath suggestion(s) from line ${getCursorLineNumber()}.`,
        "ok"
      );
    },
    "Generating..."
  );
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "");
    xmlInput.value = text;
    updateLineNumbers();
    syncLineNumberScroll();
    clearXpathSuggestions();
    resetFormatToggle();
    setParserErrors([]);
    setMeta(`Loaded file: ${file.name}`, "ok");
    results.textContent = "File loaded. Run Validate or XPath.";
  };
  reader.onerror = () => {
    setMeta("Could not read selected file.", "error");
  };
  reader.readAsText(file);
});

xmlInput.addEventListener("input", () => {
  updateLineNumbers();
  clearXpathSuggestions();
  resetFormatToggle();
  // Input changed, older parser issues may no longer match current content.
  setParserErrors([]);
});

xmlInput.addEventListener("scroll", syncLineNumberScroll);

prevErrorBtn.addEventListener("click", () => {
  if (parserErrors.length === 0) return;
  const next = (activeParserErrorIndex - 1 + parserErrors.length) % parserErrors.length;
  jumpToParserError(next);
});

nextErrorBtn.addEventListener("click", () => {
  if (parserErrors.length === 0) return;
  const next = (activeParserErrorIndex + 1) % parserErrors.length;
  jumpToParserError(next);
});

jumpErrorBtn.addEventListener("click", () => {
  if (parserErrors.length === 0 || activeParserErrorIndex < 0) return;
  jumpToParserError(activeParserErrorIndex);
});

async function loadPendingXml() {
  const store = await chrome.storage.local.get(["pendingXmlPayload", "themePreference"]);

  if (store.themePreference) {
    setTheme(store.themePreference);
  } else {
    setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }

  const payload = store.pendingXmlPayload;
  if (!payload?.xml) {
    return;
  }

  xmlInput.value = payload.xml;
  updateLineNumbers();
  syncLineNumberScroll();
  clearXpathSuggestions();
  resetFormatToggle();
  setParserErrors([]);
  setMeta(`Loaded XML from tab: ${payload.source}`, "ok");
  results.textContent = `Loaded ${payload.loadedAt}.`;

  await chrome.storage.local.remove("pendingXmlPayload");
}

loadPendingXml().catch((error) => {
  setMeta(`Failed to load startup data: ${error.message}`, "error");
});

updateLineNumbers();
syncLineNumberScroll();
clearXpathSuggestions();
resetFormatToggle();
updateErrorNavigation();
