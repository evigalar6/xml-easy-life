async function fetchXmlFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || !tab.url) {
    return { ok: false, message: "No active tab found." };
  }

  if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
    return { ok: false, message: "Cannot read XML from internal Chrome pages." };
  }

  try {
    const response = await fetch(tab.url, { credentials: "include" });
    const raw = await response.text();
    const contentType = (response.headers.get("content-type") || "").toLowerCase();

    const looksLikeXml =
      contentType.includes("xml") ||
      raw.trimStart().startsWith("<?xml") ||
      raw.includes("<rss") ||
      raw.includes("<feed");

    if (!looksLikeXml) {
      return {
        ok: false,
        message: `Active tab does not appear to be XML (content-type: ${contentType || "unknown"}).`
      };
    }

    await chrome.storage.local.set({
      pendingXmlPayload: {
        source: tab.url,
        xml: raw,
        loadedAt: new Date().toISOString()
      }
    });

    await chrome.tabs.create({ url: chrome.runtime.getURL("workbench/workbench.html") });

    return { ok: true };
  } catch (error) {
    return { ok: false, message: `Failed to fetch tab content: ${error.message}` };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "LOAD_ACTIVE_TAB_XML") {
    fetchXmlFromActiveTab().then(sendResponse);
    return true;
  }

  if (message?.type === "FETCH_ACTIVE_TAB_XML_ONLY") {
    (async () => {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tab || !tab.url) {
        return { ok: false, message: "No active tab found." };
      }
      if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
        return { ok: false, message: "Cannot read XML from internal Chrome pages." };
      }
      try {
        const response = await fetch(tab.url, { credentials: "include" });
        const raw = await response.text();
        const contentType = (response.headers.get("content-type") || "").toLowerCase();
        const looksLikeXml =
          contentType.includes("xml") ||
          raw.trimStart().startsWith("<?xml") ||
          raw.includes("<rss") ||
          raw.includes("<feed");
        if (!looksLikeXml) {
          return {
            ok: false,
            message: `Active tab does not appear to be XML (content-type: ${contentType || "unknown"}).`
          };
        }
        return { ok: true, xml: raw, url: tab.url };
      } catch (error) {
        return { ok: false, message: `Failed to fetch tab content: ${error.message}` };
      }
    })().then(sendResponse);
    return true;
  }

  if (message?.type === "OPEN_WORKBENCH") {
    chrome.tabs.create({ url: chrome.runtime.getURL("workbench/workbench.html") }).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  return false;
});
