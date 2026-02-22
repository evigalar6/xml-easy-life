const xmlInput = document.getElementById("xmlInput");
const lineNumbers = document.getElementById("lineNumbers");
const xpathInput = document.getElementById("xpathInput");
const namespaceInput = document.getElementById("namespaceInput");
const detectNsBtn = document.getElementById("detectNsBtn");
const results = document.getElementById("results");
const copyResultsBtn = document.getElementById("copyResultsBtn");
const meta = document.getElementById("meta");
const xsdMeta = document.getElementById("xsdMeta");
const xsdFileInfo = document.getElementById("xsdFileInfo");
const fileInput = document.getElementById("fileInput");
const loadFromTabBtn = document.getElementById("loadFromTabBtn");
const xsdFileInput = document.getElementById("xsdFileInput");
const validateXsdBtn = document.getElementById("validateXsdBtn");
const xsltFileInput = document.getElementById("xsltFileInput");
const xsltInput = document.getElementById("xsltInput");
const xsltOutput = document.getElementById("xsltOutput");
const copyXsltOutputBtn = document.getElementById("copyXsltOutputBtn");
const downloadXsltOutputBtn = document.getElementById("downloadXsltOutputBtn");
const runXsltBtn = document.getElementById("runXsltBtn");
const root = document.documentElement;
const helpBtn = document.getElementById("helpBtn");
const helpModal = document.getElementById("helpModal");
const closeHelpBtn = document.getElementById("closeHelpBtn");
const ackHelpBtn = document.getElementById("ackHelpBtn");
const helpBackdrop = document.getElementById("helpBackdrop");
const themeToggleBtn = document.getElementById("themeToggle");
const loadSampleBtn = document.getElementById("loadSample");
const recentSelect = document.getElementById("recentSelect");
const loadRecentBtn = document.getElementById("loadRecentBtn");
const formatBtn = document.getElementById("formatBtn");
const validateBtn = document.getElementById("validateBtn");
const runXpathBtn = document.getElementById("runXpath");
const inspectorSummary = document.getElementById("inspectorSummary");
const refreshInspectorBtn = document.getElementById("refreshInspectorBtn");
const generateXpathBtn = document.getElementById("generateXpathBtn");
const xpathSuggestions = document.getElementById("xpathSuggestions");
const xpathSuggestionsList = document.getElementById("xpathSuggestionsList");
const errorNavRow = document.getElementById("errorNavRow");
const jumpErrorBtn = document.getElementById("jumpErrorBtn");
const prevErrorBtn = document.getElementById("prevErrorBtn");
const nextErrorBtn = document.getElementById("nextErrorBtn");
const errorNavInfo = document.getElementById("errorNavInfo");
const tabInspectorBtn = document.getElementById("tabInspector");
const tabXpathBtn = document.getElementById("tabXpath");
const tabXsdBtn = document.getElementById("tabXsd");
const tabXsltBtn = document.getElementById("tabXslt");
const tabPanelInspector = document.getElementById("tabPanelInspector");
const tabPanelXpath = document.getElementById("tabPanelXpath");
const tabPanelXsd = document.getElementById("tabPanelXsd");
const tabPanelXslt = document.getElementById("tabPanelXslt");

const utils = window.XmlEasyShared || {};
const {
  extractParserIssues,
  inferElementPathFromCursor,
  xpathLiteral,
  buildBasicXsdRules,
  validateXmlAgainstBasicXsdRules,
  extractNamespacesFromRoot
} = utils;

const RECENT_KEY = "recentXmlItems";
const ACTIVE_TAB_KEY = "activeWorkbenchTab";
const MAX_RECENT_ITEMS = 8;

let parserErrors = [];
let activeParserErrorIndex = -1;
let isFormattedView = false;
let originalXmlSnapshot = "";
let recentItems = [];
let hasUserChangedTab = false;
let lastCursorOffset = 0;
let xsdState = {
  name: "",
  text: "",
  rules: null
};

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

function setXsdMeta(message, kind = "") {
  xsdMeta.textContent = message;
  xsdMeta.className = `meta ${kind}`.trim();
}

function setXsdFileInfo(message, kind = "") {
  xsdFileInfo.textContent = message;
  xsdFileInfo.className = `meta ${kind}`.trim();
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

function setResultsContent(text, showCopy = false) {
  results.textContent = text;
  copyResultsBtn.hidden = !showCopy;
}

function setXsltOutputContent(text, showActions = false) {
  xsltOutput.textContent = text;
  copyXsltOutputBtn.hidden = !showActions;
  downloadXsltOutputBtn.hidden = !showActions;
}

function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function getTabConfig() {
  return {
    inspector: { button: tabInspectorBtn, panel: tabPanelInspector },
    xpath: { button: tabXpathBtn, panel: tabPanelXpath },
    xsd: { button: tabXsdBtn, panel: tabPanelXsd },
    xslt: { button: tabXsltBtn, panel: tabPanelXslt }
  };
}

async function setActiveTab(tabKey) {
  const config = getTabConfig();
  const chosen = config[tabKey] ? tabKey : "inspector";
  for (const [key, entry] of Object.entries(config)) {
    const isActive = key === chosen;
    entry.button.setAttribute("aria-selected", String(isActive));
    entry.panel.hidden = !isActive;
  }
  await chrome.storage.local.set({ [ACTIVE_TAB_KEY]: chosen });
}

async function setActiveTabFromUser(tabKey) {
  hasUserChangedTab = true;
  await setActiveTab(tabKey);
}

function buildInspectorSummary() {
  const xmlText = xmlInput.value;
  if (!xmlText.trim()) {
    return "No XML loaded yet.";
  }

  const parsed = parseXml(xmlText);
  if (!parsed.ok) {
    return `XML status: invalid\\n${parsed.error}`;
  }

  const doc = parsed.doc;
  const rootEl = doc.documentElement;
  const elementCount = doc.getElementsByTagName("*").length;
  const lineCount = xmlText.split("\\n").length;
  const byteLength = new TextEncoder().encode(xmlText).length;
  const namespaces = extractNamespacesFromRoot ? extractNamespacesFromRoot(doc) : {};
  const namespaceLines = Object.keys(namespaces).length
    ? Object.entries(namespaces)
        .map(([prefix, uri]) => `${prefix || "(default)"} = ${uri}`)
        .join("\\n")
    : "None detected on root.";

  return [
    `XML status: valid`,
    `Root element: <${rootEl.tagName}>`,
    `Element count: ${elementCount}`,
    `Line count: ${lineCount}`,
    `Approx. bytes: ${byteLength}`,
    ``,
    `Namespaces:`,
    namespaceLines
  ].join("\\n");
}

function refreshInspectorSummary() {
  inspectorSummary.textContent = buildInspectorSummary();
}

function updateLineNumbers() {
  const totalLines = Math.max(1, xmlInput.value.split("\n").length);
  lineNumbers.textContent = Array.from({ length: totalLines }, (_v, i) => String(i + 1)).join("\n");
}

function syncLineNumberScroll() {
  lineNumbers.scrollTop = xmlInput.scrollTop;
}

function getEffectiveCursorOffset() {
  const editorFocused = document.activeElement === xmlInput;
  const selectionCandidate = typeof xmlInput.selectionStart === "number" ? xmlInput.selectionStart : null;
  const raw =
    editorFocused || (selectionCandidate != null && selectionCandidate > 0)
      ? (selectionCandidate ?? lastCursorOffset)
      : lastCursorOffset;
  const safe = Number.isFinite(raw) ? raw : lastCursorOffset;
  return Math.max(0, Math.min(xmlInput.value.length, safe));
}

function rememberCursorOffset() {
  const raw = typeof xmlInput.selectionStart === "number" ? xmlInput.selectionStart : lastCursorOffset;
  const safe = Number.isFinite(raw) ? raw : lastCursorOffset;
  lastCursorOffset = Math.max(0, Math.min(xmlInput.value.length, safe));
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

function clearEditorSelectionVisuals() {
  const caret = getEffectiveCursorOffset();
  xmlInput.setSelectionRange(caret, caret);
  xmlInput.classList.remove("error-focus");
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
  if (index < 0 || index >= parserErrors.length) return;

  activeParserErrorIndex = index;
  const issue = parserErrors[index];
  const lineRange = getLineRange(xmlInput.value, issue.line, issue.column);
  xmlInput.focus();
  xmlInput.setSelectionRange(lineRange.start, lineRange.end);
  rememberCursorOffset();
  xmlInput.classList.add("error-focus");
  setTimeout(() => xmlInput.classList.remove("error-focus"), 900);

  const avgLineHeight = parseFloat(getComputedStyle(xmlInput).lineHeight) || 22;
  xmlInput.scrollTop = Math.max(0, (issue.line - 2) * avgLineHeight);
  syncLineNumberScroll();
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
      issues: extractParserIssues ? extractParserIssues(errorText) : []
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
  const offset = getEffectiveCursorOffset();
  return xmlInput.value.slice(0, offset).split("\n").length;
}

function buildAbsoluteIndexedXPath(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return "";

  const segments = [];
  let current = node;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === current.tagName) index += 1;
      sibling = sibling.previousElementSibling;
    }
    segments.unshift(`${current.tagName}[${index}]`);
    current = current.parentElement;
  }
  return `/${segments.join("/")}`;
}

function buildLocalNameIndexedXPath(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return "";

  const segments = [];
  let current = node;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.localName === current.localName) index += 1;
      sibling = sibling.previousElementSibling;
    }
    segments.unshift(`*[local-name()=${xpathLiteral(current.localName)}][${index}]`);
    current = current.parentElement;
  }
  return `/${segments.join("/")}`;
}

function getRepresentativeNode(doc, pathStack) {
  if (!pathStack.length) return doc.documentElement;

  const absolutePath = `/${pathStack.join("/")}`;
  const node = doc.evaluate(absolutePath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  if (node) return node;

  const fallbackTag = pathStack[pathStack.length - 1];
  return doc.evaluate(`//${fallbackTag}`, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

function buildXpathSuggestionsForNode(node) {
  const suggestions = [];
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return suggestions;

  const absolute = buildAbsoluteIndexedXPath(node);
  if (absolute) {
    suggestions.push({ label: "Absolute", score: "Fragile", xpath: absolute });
  }

  suggestions.push({ label: "By tag", score: "Broad", xpath: `//${node.tagName}` });

  if (node.namespaceURI && node.localName && xpathLiteral) {
    const localPath = buildLocalNameIndexedXPath(node);
    if (localPath) {
      suggestions.push({
        label: "By local-name",
        score: "Namespace-safe",
        xpath: localPath
      });
    }
  }

  if (node.attributes && node.attributes.length > 0 && xpathLiteral) {
    const attrs = Array.from(node.attributes);
    const attr = attrs.find((candidate) => candidate.name !== "xmlns" && candidate.prefix !== "xmlns");
    if (attr) {
      suggestions.push({
        label: "By attribute",
        score: "Stable",
        xpath: `//${node.tagName}[@${attr.name}=${xpathLiteral(attr.value)}]`
      });
    }
  }

  const textValue = (node.textContent || "").trim().replace(/\s+/g, " ");
  if (textValue && textValue.length <= 80 && node.children.length === 0 && xpathLiteral) {
    suggestions.push({
      label: "By text",
      score: "Medium",
      xpath: `//${node.tagName}[text()=${xpathLiteral(textValue)}]`
    });
  }

  const unique = new Map();
  for (const item of suggestions) {
    if (!unique.has(item.xpath)) unique.set(item.xpath, item);
  }
  return [...unique.values()].slice(0, 5);
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

function stringifyXPathResultNode(node) {
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

function parseNamespaceInput() {
  const map = {};
  const lines = namespaceInput.value.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const prefix = trimmed.slice(0, eq).trim();
    const uri = trimmed.slice(eq + 1).trim();
    if (prefix && uri) map[prefix] = uri;
  }
  return map;
}

function setNamespaceInputFromMap(map) {
  const keys = Object.keys(map).sort();
  namespaceInput.value = keys.map((prefix) => `${prefix}=${map[prefix]}`).join("\n");
}

function pickDefaultNamespaceAlias(map) {
  const base = "ns";
  if (!map[base]) return base;
  let i = 1;
  while (map[`${base}${i}`]) i += 1;
  return `${base}${i}`;
}

function buildNamespaceResolver(doc, userMap) {
  const autoMap = extractNamespacesFromRoot ? extractNamespacesFromRoot(doc) : {};
  const merged = { ...autoMap, ...userMap };
  return {
    merged,
    resolver(prefix) {
      return merged[prefix] || null;
    }
  };
}

function extractNamespacesFromDocumentRoot(doc) {
  const map = {};
  const rootEl = doc?.documentElement;
  if (!rootEl) return map;
  for (const attr of Array.from(rootEl.attributes || [])) {
    if (attr.name === "xmlns") {
      map[""] = attr.value;
    } else if (attr.name.startsWith("xmlns:")) {
      map[attr.name.slice(6)] = attr.value;
    }
  }
  return map;
}

function evaluateXPathAsString(expression, contextNode, resolver) {
  const doc = contextNode.ownerDocument || contextNode;
  const result = doc.evaluate(expression, contextNode, resolver, XPathResult.ANY_TYPE, null);
  if (result.resultType === XPathResult.STRING_TYPE) return result.stringValue;
  if (result.resultType === XPathResult.NUMBER_TYPE) return String(result.numberValue);
  if (result.resultType === XPathResult.BOOLEAN_TYPE) return String(result.booleanValue);
  const node = result.iterateNext();
  if (!node) return "";
  if (node.nodeType === Node.ATTRIBUTE_NODE) return node.nodeValue || "";
  return (node.textContent || "").trim();
}

function evaluateXPathAsNodes(expression, contextNode, resolver) {
  const doc = contextNode.ownerDocument || contextNode;
  const result = doc.evaluate(expression, contextNode, resolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
  const nodes = [];
  let node = result.iterateNext();
  while (node) {
    nodes.push(node);
    node = result.iterateNext();
  }
  return nodes;
}

function runXsltTransformLite(xmlDoc, xsltDoc, resolver) {
  const xslNs = "http://www.w3.org/1999/XSL/Transform";
  const templates = xsltDoc.getElementsByTagNameNS(xslNs, "template");
  let rootTemplate = null;
  for (const t of Array.from(templates)) {
    if (t.getAttribute("match") === "/") {
      rootTemplate = t;
      break;
    }
  }
  if (!rootTemplate) {
    throw new Error("Unsupported XSLT: missing template with match=\"/\".");
  }

  const stats = {
    forEachTotal: 0,
    forEachMatchedNodes: 0,
    valueOfTotal: 0,
    valueOfNonEmpty: 0
  };

  function decodeEscapes(text) {
    return String(text || "")
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t");
  }

  function renderNodes(xsltNodes, contextNode) {
    let out = "";
    for (const node of Array.from(xsltNodes || [])) {
      if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) {
        out += decodeEscapes(node.nodeValue || "");
        continue;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }
      const isXsl = node.namespaceURI === xslNs;
      if (!isXsl) {
        // Literal result element: keep text-content only for text output.
        out += renderNodes(node.childNodes, contextNode);
        continue;
      }
      const local = node.localName;
      if (local === "for-each") {
        const select = node.getAttribute("select");
        if (!select) continue;
        stats.forEachTotal += 1;
        const iterNodes = evaluateXPathAsNodes(select, contextNode, resolver);
        stats.forEachMatchedNodes += iterNodes.length;
        for (const iterNode of iterNodes) {
          out += renderNodes(node.childNodes, iterNode);
        }
      } else if (local === "value-of") {
        const select = node.getAttribute("select");
        if (!select) continue;
        stats.valueOfTotal += 1;
        const value = evaluateXPathAsString(select, contextNode, resolver);
        if (value) stats.valueOfNonEmpty += 1;
        out += value;
      } else if (local === "text") {
        out += decodeEscapes(node.textContent || "");
      } else if (local === "if") {
        const testExpr = node.getAttribute("test");
        if (!testExpr) continue;
        const truthy = evaluateXPathAsString(testExpr, contextNode, resolver);
        if (truthy && truthy !== "false" && truthy !== "0") {
          out += renderNodes(node.childNodes, contextNode);
        }
      }
    }
    return out;
  }

  const rendered = renderNodes(rootTemplate.childNodes, xmlDoc);
  return { output: rendered, stats };
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
    setResultsContent("", false);
    setMeta(`Invalid XML: ${parsed.error}`, "error");
    return;
  }
  setParserErrors([]);

  try {
    const userNs = parseNamespaceInput();
    const { merged, resolver } = buildNamespaceResolver(parsed.doc, userNs);
    const result = parsed.doc.evaluate(expr, parsed.doc, resolver, XPathResult.ANY_TYPE, null);

    if (
      result.resultType === XPathResult.NUMBER_TYPE ||
      result.resultType === XPathResult.STRING_TYPE ||
      result.resultType === XPathResult.BOOLEAN_TYPE
    ) {
      const primitive =
        result.resultType === XPathResult.NUMBER_TYPE
          ? String(result.numberValue)
          : result.resultType === XPathResult.BOOLEAN_TYPE
            ? String(result.booleanValue)
            : result.stringValue;
      setResultsContent(primitive, true);
      setMeta("XPath evaluated to a scalar value.", "ok");
      return;
    }

    const output = [];
    let node = result.iterateNext();
    while (node) {
      const str = stringifyXPathResultNode(node);
      if (str) output.push(str);
      node = result.iterateNext();
    }

    if (output.length === 0) {
      setResultsContent("No nodes matched.", true);
      const hasDefaultNs = Boolean(merged[""]);
      const hasPrefix = /\b[A-Za-z_][\w.-]*:/.test(expr);
      if (hasDefaultNs && !hasPrefix) {
        setMeta("No match. XML has a default namespace; use prefixed names in XPath.", "error");
      } else {
        setMeta("XPath executed successfully.", "ok");
      }
      return;
    }

    setResultsContent(output.join("\n\n"), true);
    setMeta(`XPath matched ${output.length} node(s).`, "ok");
  } catch (error) {
    setResultsContent("", false);
    setMeta(`XPath error: ${error.message}`, "error");
  }
}

function openHelpModal() {
  helpModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeHelpModal() {
  helpModal.hidden = true;
  document.body.style.overflow = "";
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

function setXmlContent(xmlText) {
  xmlInput.value = xmlText;
  updateLineNumbers();
  syncLineNumberScroll();
  lastCursorOffset = Math.min(lastCursorOffset, xmlInput.value.length);
  clearXpathSuggestions();
  resetFormatToggle();
  setParserErrors([]);
  refreshInspectorSummary();
}

async function getRecentItems() {
  const store = await chrome.storage.local.get([RECENT_KEY]);
  return Array.isArray(store[RECENT_KEY]) ? store[RECENT_KEY] : [];
}

async function saveRecentItems(items) {
  await chrome.storage.local.set({ [RECENT_KEY]: items });
}

function refreshRecentSelect() {
  recentSelect.innerHTML = "";
  if (!recentItems.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No recent XML yet";
    recentSelect.appendChild(option);
    return;
  }

  for (const item of recentItems) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.name} • ${new Date(item.loadedAt).toLocaleString()}`;
    recentSelect.appendChild(option);
  }
}

async function addRecentXmlItem(name, xmlText, source) {
  if (!xmlText?.trim()) return;
  const now = new Date().toISOString();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const newItem = {
    id,
    name: name || source || "XML sample",
    source: source || "manual",
    loadedAt: now,
    xml: xmlText
  };

  const withoutSame = recentItems.filter((item) => item.xml !== xmlText);
  recentItems = [newItem, ...withoutSame].slice(0, MAX_RECENT_ITEMS);
  refreshRecentSelect();
  await saveRecentItems(recentItems);
}

async function loadXmlFromActiveTabInPlace() {
  const response = await chrome.runtime.sendMessage({ type: "FETCH_ACTIVE_TAB_XML_ONLY" });
  if (!response?.ok) {
    throw new Error(response?.message || "Could not load XML from active tab.");
  }
  setXmlContent(response.xml);
  await addRecentXmlItem("Active tab XML", response.xml, response.url || "tab");
  setMeta(`Loaded XML from active tab: ${response.url || "unknown"}`, "ok");
  setResultsContent(`Loaded ${new Date().toISOString()}.`, false);
}

function runBasicXsdValidation() {
  const schemaName = xsdState.name || "No schema";
  setXsdMeta(`Validation in progress (${schemaName})...`);

  if (!xsdState.text || !xsdState.rules) {
    setXsdMeta("Upload a valid XSD first.", "error");
    return;
  }

  const parsedXml = parseXml(xmlInput.value);
  if (!parsedXml.ok) {
    setXsdMeta(`XML invalid: ${parsedXml.error}`, "error");
    return;
  }

  const outcome = validateXmlAgainstBasicXsdRules(parsedXml.doc, xsdState.rules);
  if (outcome.ok) {
    setXsdMeta(`[${xsdState.name}] ${outcome.summary}`, "ok");
  } else {
    setXsdMeta(`[${xsdState.name}] ${outcome.summary} ${outcome.details.join(" ")}`.trim(), "error");
  }
}

function runXsltTransform() {
  const parsedXml = parseXml(xmlInput.value);
  if (!parsedXml.ok) {
    setMeta(`XML invalid: ${parsedXml.error}`, "error");
    setXsltOutputContent("", false);
    return;
  }

  const xsltText = xsltInput.value.trim();
  if (!xsltText) {
    setMeta("Provide XSLT first.", "error");
    return;
  }

  const parsedXslt = parseXml(xsltText);
  if (!parsedXslt.ok) {
    setMeta(`XSLT invalid: ${parsedXslt.error}`, "error");
    setXsltOutputContent("", false);
    return;
  }

  try {
    const userNs = parseNamespaceInput();
    const xmlNs = extractNamespacesFromRoot ? extractNamespacesFromRoot(parsedXml.doc) : {};
    const xsltNs = extractNamespacesFromDocumentRoot(parsedXslt.doc);
    const mergedNs = { ...xmlNs, ...xsltNs, ...userNs };
    const resolver = (prefix) => mergedNs[prefix] || null;
    const transformed = runXsltTransformLite(parsedXml.doc, parsedXslt.doc, resolver);
    setXsltOutputContent(transformed.output || "Transform produced empty output.", true);

    if (transformed.stats.forEachTotal > 0 && transformed.stats.forEachMatchedNodes === 0) {
      setMeta(
        "Transform ran, but XSLT selectors matched 0 nodes. Check XML/XSLT namespaces or element paths.",
        "error"
      );
      return;
    }

    setMeta("XSLT transform completed (JS engine).", "ok");
  } catch (error) {
    setXsltOutputContent("", false);
    setMeta(`XSLT transform failed: ${error.message}`, "error");
  }
}

themeToggleBtn.addEventListener("click", () => {
  const current = root.dataset.theme || "light";
  setTheme(current === "dark" ? "light" : "dark");
});

tabInspectorBtn.addEventListener("click", () => {
  setActiveTabFromUser("inspector");
});

tabXpathBtn.addEventListener("click", () => {
  setActiveTabFromUser("xpath");
});

tabXsdBtn.addEventListener("click", () => {
  setActiveTabFromUser("xsd");
});

tabXsltBtn.addEventListener("click", () => {
  setActiveTabFromUser("xslt");
});

refreshInspectorBtn.addEventListener("click", () => {
  refreshInspectorSummary();
  setMeta("XML re-scan complete.", "ok");
});

helpBtn.addEventListener("click", openHelpModal);
closeHelpBtn.addEventListener("click", closeHelpModal);
ackHelpBtn.addEventListener("click", closeHelpModal);
helpBackdrop.addEventListener("click", closeHelpModal);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !helpModal.hidden) {
    closeHelpModal();
  }
});

loadSampleBtn.addEventListener("click", async () => {
  await withButtonProcessing(
    loadSampleBtn,
    async () => {
      setXmlContent(formatXml(SAMPLE_XML));
      namespaceInput.value = "";
      setResultsContent("Sample loaded.", false);
      setMeta("Sample XML loaded.", "ok");
      await addRecentXmlItem("Sample XML", xmlInput.value, "sample");
    },
    "Loading..."
  );
});

loadFromTabBtn.addEventListener("click", async () => {
  await withButtonProcessing(
    loadFromTabBtn,
    async () => {
      try {
        await loadXmlFromActiveTabInPlace();
      } catch (error) {
        setMeta(error.message, "error");
      }
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
        refreshInspectorSummary();
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
      refreshInspectorSummary();
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
      const xmlText = xmlInput.value;
      if (!xmlText.trim()) {
        setMeta("Paste or upload XML first.", "error");
        return;
      }

      clearEditorSelectionVisuals();
      const parsed = parseXml(xmlText);
      if (!parsed.ok) {
        setParserErrors(parsed.issues);
        setMeta(`Invalid XML: ${parsed.error}`, "error");
        if (parsed.issues.length > 0) {
          jumpToParserError(0);
        }
        return;
      }

      setParserErrors([]);
      setMeta("XML is well-formed.", "ok");
    },
    "Checking..."
  );
});

runXpathBtn.addEventListener("click", async () => {
  await withButtonProcessing(
    runXpathBtn,
    async () => {
      evaluateXpath();
    },
    "Running..."
  );
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

      const pathStack = inferElementPathFromCursor
        ? inferElementPathFromCursor(xmlText, lastCursorOffset)
        : [];
      const targetNode = getRepresentativeNode(parsed.doc, pathStack);
      if (!targetNode) {
        clearXpathSuggestions();
        setMeta("No element found at cursor.", "error");
        return;
      }

      const suggestions = buildXpathSuggestionsForNode(targetNode);
      renderXpathSuggestions(suggestions);
      setMeta(`Generated ${suggestions.length} XPath suggestion(s) from line ${getCursorLineNumber()}.`, "ok");
    },
    "Generating..."
  );
});

detectNsBtn.addEventListener("click", async () => {
  await withButtonProcessing(
    detectNsBtn,
    async () => {
      const parsed = parseXml(xmlInput.value);
      if (!parsed.ok) {
        setMeta(`Invalid XML: ${parsed.error}`, "error");
        return;
      }

      const detected = extractNamespacesFromRoot ? extractNamespacesFromRoot(parsed.doc) : {};
      const defaultNs = detected[""];
      if (defaultNs) {
        delete detected[""];
        const hasAliasForDefault = Object.values(detected).some((uri) => uri === defaultNs);
        if (!hasAliasForDefault) {
          const alias = pickDefaultNamespaceAlias(detected);
          detected[alias] = defaultNs;
        }
      }
      setNamespaceInputFromMap(detected);
      if (defaultNs) {
        setMeta("Detected namespaces. Added a prefix alias for default namespace.", "ok");
      } else {
        setMeta("Detected namespace prefixes from XML root.", "ok");
      }
    },
    "Detecting..."
  );
});

validateXsdBtn.addEventListener("click", async () => {
  await withButtonProcessing(
    validateXsdBtn,
    async () => {
      runBasicXsdValidation();
    },
    "Validating..."
  );
});

runXsltBtn.addEventListener("click", async () => {
  await withButtonProcessing(
    runXsltBtn,
    async () => {
      runXsltTransform();
    },
    "Transforming..."
  );
});

loadRecentBtn.addEventListener("click", () => {
  const id = recentSelect.value;
  if (!id) {
    setMeta("No recent item selected.", "error");
    return;
  }
  const item = recentItems.find((entry) => entry.id === id);
  if (!item) {
    setMeta("Could not find selected recent item.", "error");
    return;
  }
  setXmlContent(item.xml);
  setMeta(`Loaded recent XML: ${item.name}`, "ok");
  setResultsContent("Recent XML loaded.", false);
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    const text = String(reader.result || "");
    setXmlContent(text);
    setMeta(`Loaded file: ${file.name}`, "ok");
    setResultsContent("File loaded. Run Validate or XPath.", false);
    await addRecentXmlItem(file.name, text, "upload");
  };
  reader.onerror = () => {
    setMeta("Could not read selected XML file.", "error");
  };
  reader.readAsText(file);
});

xsdFileInput.addEventListener("change", () => {
  const file = xsdFileInput.files?.[0];
  if (!file) return;

  setXsdFileInfo(`Selected XSD: ${file.name}`);
  setXsdMeta("Validation not run yet.");

  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "");
    const parsed = parseXml(text);
    if (!parsed.ok) {
      xsdState = { name: "", text: "", rules: null };
      setXsdFileInfo(`Selected XSD: ${file.name} (invalid)`, "error");
      setXsdMeta(`XSD invalid: ${parsed.error}`, "error");
      return;
    }

    const rules = buildBasicXsdRules ? buildBasicXsdRules(parsed.doc) : { supported: false, reason: "XSD helper unavailable." };
    xsdState = {
      name: file.name,
      text,
      rules
    };

    if (!rules.supported) {
      setXsdFileInfo(`Loaded XSD: ${file.name}`, "ok");
      setXsdMeta(`Loaded, but limited checks unavailable: ${rules.reason}`, "error");
    } else {
      setXsdFileInfo(`Loaded XSD: ${file.name}`, "ok");
      setXsdMeta("Ready for basic XSD checks.", "ok");
    }
  };
  reader.onerror = () => {
    xsdState = { name: "", text: "", rules: null };
    setXsdFileInfo("No XSD loaded.", "error");
    setXsdMeta("Could not read XSD file.", "error");
  };
  reader.readAsText(file);
});

xsltFileInput.addEventListener("change", () => {
  const file = xsltFileInput.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    xsltInput.value = String(reader.result || "");
    setMeta(`Loaded XSLT file: ${file.name}`, "ok");
  };
  reader.onerror = () => {
    setMeta("Could not read XSLT file.", "error");
  };
  reader.readAsText(file);
});

xmlInput.addEventListener("input", () => {
  rememberCursorOffset();
  updateLineNumbers();
  refreshInspectorSummary();
  clearXpathSuggestions();
  resetFormatToggle();
  setParserErrors([]);
});

xmlInput.addEventListener("click", rememberCursorOffset);
xmlInput.addEventListener("keydown", rememberCursorOffset);
xmlInput.addEventListener("keyup", rememberCursorOffset);
xmlInput.addEventListener("select", rememberCursorOffset);
xmlInput.addEventListener("mouseup", rememberCursorOffset);
xmlInput.addEventListener("focus", rememberCursorOffset);
xmlInput.addEventListener("blur", rememberCursorOffset);
xmlInput.addEventListener("scroll", syncLineNumberScroll);

prevErrorBtn.addEventListener("click", () => {
  if (!parserErrors.length) return;
  const next = (activeParserErrorIndex - 1 + parserErrors.length) % parserErrors.length;
  jumpToParserError(next);
});

nextErrorBtn.addEventListener("click", () => {
  if (!parserErrors.length) return;
  const next = (activeParserErrorIndex + 1) % parserErrors.length;
  jumpToParserError(next);
});

jumpErrorBtn.addEventListener("click", () => {
  if (!parserErrors.length || activeParserErrorIndex < 0) return;
  jumpToParserError(activeParserErrorIndex);
});

copyResultsBtn.addEventListener("click", async () => {
  const output = results.textContent.trim();
  if (!output) return;
  try {
    await navigator.clipboard.writeText(output);
    setMeta("Results copied to clipboard.", "ok");
  } catch (_error) {
    setMeta("Could not copy results in this context.", "error");
  }
});

copyXsltOutputBtn.addEventListener("click", async () => {
  const output = xsltOutput.textContent.trim();
  if (!output) return;
  try {
    await navigator.clipboard.writeText(output);
    setMeta("Transform output copied to clipboard.", "ok");
  } catch (_error) {
    setMeta("Could not copy transform output in this context.", "error");
  }
});

downloadXsltOutputBtn.addEventListener("click", () => {
  const output = xsltOutput.textContent.trim();
  if (!output) return;
  try {
    const isXml = output.startsWith("<");
    const suffix = isXml ? "xml" : "txt";
    const filename = `xslt-transform-output.${suffix}`;
    downloadTextFile(output, filename);
    setMeta(`Transform output downloaded as ${filename}.`, "ok");
  } catch (_error) {
    setMeta("Could not download transform output in this context.", "error");
  }
});

async function loadPendingXml() {
  const store = await chrome.storage.local.get(["pendingXmlPayload", "themePreference", RECENT_KEY, ACTIVE_TAB_KEY]);

  if (store.themePreference) {
    setTheme(store.themePreference);
  } else {
    setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }

  recentItems = Array.isArray(store[RECENT_KEY]) ? store[RECENT_KEY] : [];
  refreshRecentSelect();
  if (!hasUserChangedTab) {
    await setActiveTab(store[ACTIVE_TAB_KEY] || "inspector");
  }

  if (store.pendingXmlPayload?.xml) {
    setXmlContent(store.pendingXmlPayload.xml);
    await addRecentXmlItem("Tab XML", store.pendingXmlPayload.xml, store.pendingXmlPayload.source || "tab");
    setMeta(`Loaded XML from tab: ${store.pendingXmlPayload.source}`, "ok");
    setResultsContent(`Loaded ${store.pendingXmlPayload.loadedAt}.`, false);
    await chrome.storage.local.remove("pendingXmlPayload");
  }
}

loadPendingXml().catch((error) => {
  setMeta(`Failed to load startup data: ${error.message}`, "error");
});

updateLineNumbers();
syncLineNumberScroll();
refreshInspectorSummary();
clearXpathSuggestions();
resetFormatToggle();
setResultsContent(results.textContent || "No query yet.", false);
setXsltOutputContent(xsltOutput.textContent || "No transform yet.", false);
updateErrorNavigation();
