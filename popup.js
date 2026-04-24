function showMessage(text) {
  const box = document.getElementById("message");
  box.style.display = "block";
  box.textContent = text;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToActiveTab(message) {
  const tab = await getActiveTab();

  if (!tab || !tab.id) {
    return { ok: false, message: "No active tab found." };
  }

  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (err) {
    return {
      ok: false,
      message: "Cannot connect to this page. Refresh the page and try again.\n" + String(err && err.message ? err.message : err)
    };
  }
}

document.getElementById("openConfig").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
  window.close();
});

document.getElementById("openStatus").addEventListener("click", async () => {
  const result = await sendToActiveTab({ type: "SHOW_VIDEO_HELPER_PANEL" });

  if (result && result.ok) {
    window.close();
  } else {
    showMessage(result && result.message ? result.message : JSON.stringify(result, null, 2));
  }
});
