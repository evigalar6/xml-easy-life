const statusEl = document.getElementById("status");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#d65f5f" : "";
}

document.getElementById("openWorkbench").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "OPEN_WORKBENCH" }, (result) => {
    if (chrome.runtime.lastError || !result?.ok) {
      setStatus(chrome.runtime.lastError?.message || "Could not open workbench.", true);
      return;
    }
    window.close();
  });
});

document.getElementById("loadFromTab").addEventListener("click", () => {
  setStatus("Loading XML from active tab...");
  chrome.runtime.sendMessage({ type: "LOAD_ACTIVE_TAB_XML" }, (result) => {
    if (chrome.runtime.lastError || !result?.ok) {
      setStatus(result?.message || chrome.runtime.lastError?.message || "Could not load from tab.", true);
      return;
    }
    setStatus("Loaded. Opening workbench.");
    window.close();
  });
});
