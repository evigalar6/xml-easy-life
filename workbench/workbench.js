const xmlInput = document.getElementById("xmlInput");
const xpathInput = document.getElementById("xpathInput");
const results = document.getElementById("results");
const meta = document.getElementById("meta");
const fileInput = document.getElementById("fileInput");
const root = document.documentElement;

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

function parseXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const errorNode = doc.querySelector("parsererror");
  if (errorNode) {
    return { ok: false, error: errorNode.textContent.trim() };
  }
  return { ok: true, doc };
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
    setMeta(`Invalid XML: ${parsed.error}`, "error");
    return;
  }

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
  chrome.storage.local.set({ themePreference: theme });
}

document.getElementById("themeToggle").addEventListener("click", async () => {
  const current = root.dataset.theme || "light";
  setTheme(current === "dark" ? "light" : "dark");
});

document.getElementById("loadSample").addEventListener("click", () => {
  xmlInput.value = formatXml(SAMPLE_XML);
  results.textContent = "Sample loaded.";
  setMeta("Sample XML loaded.", "ok");
});

document.getElementById("formatBtn").addEventListener("click", () => {
  const xmlText = xmlInput.value.trim();
  if (!xmlText) {
    setMeta("Nothing to format yet.", "error");
    return;
  }

  const parsed = parseXml(xmlText);
  if (!parsed.ok) {
    setMeta(`Invalid XML: ${parsed.error}`, "error");
    return;
  }

  xmlInput.value = formatXml(documentToString(parsed.doc));
  setMeta("XML formatted successfully.", "ok");
});

document.getElementById("validateBtn").addEventListener("click", () => {
  const xmlText = xmlInput.value.trim();
  if (!xmlText) {
    setMeta("Paste or upload XML first.", "error");
    return;
  }

  const parsed = parseXml(xmlText);
  if (!parsed.ok) {
    setMeta(`Invalid XML: ${parsed.error}`, "error");
    return;
  }

  setMeta("XML is well-formed.", "ok");
});

document.getElementById("runXpath").addEventListener("click", evaluateXpath);

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "");
    xmlInput.value = text;
    setMeta(`Loaded file: ${file.name}`, "ok");
    results.textContent = "File loaded. Run Validate or XPath.";
  };
  reader.onerror = () => {
    setMeta("Could not read selected file.", "error");
  };
  reader.readAsText(file);
});

async function loadPendingXml() {
  const store = await chrome.storage.local.get(["pendingXmlPayload", "themePreference"]);

  if (store.themePreference) {
    root.dataset.theme = store.themePreference;
  } else {
    root.dataset.theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  const payload = store.pendingXmlPayload;
  if (!payload?.xml) {
    return;
  }

  xmlInput.value = payload.xml;
  setMeta(`Loaded XML from tab: ${payload.source}`, "ok");
  results.textContent = `Loaded ${payload.loadedAt}.`;

  await chrome.storage.local.remove("pendingXmlPayload");
}

loadPendingXml().catch((error) => {
  setMeta(`Failed to load startup data: ${error.message}`, "error");
});
