const STORAGE_KEYS = {
  allowedHost: "avhAllowedHost",
  allowedOrigin: "avhAllowedOrigin",
  waitLimitSeconds: "avhWaitLimitSeconds",
  scanIntervalSeconds: "avhScanIntervalSeconds"
};

function showMessage(text, type = "ok") {
  const box = document.getElementById("message");
  box.className = "message " + type;
  box.textContent = text;
}

function parseUrlOrHost(raw) {
  const value = String(raw || "").trim();
  if (!value) throw new Error("Please enter a test URL or host.");

  let url;
  try {
    url = new URL(value);
  } catch {
    try {
      url = new URL("https://" + value);
    } catch {
      throw new Error("Invalid URL. Use https://test.example.com or test.example.com.");
    }
  }

  return { host: url.hostname, origin: url.origin };
}

function parsePositiveInt(value, fallback, min, max) {
  const n = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

async function loadSettings() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.allowedHost,
    STORAGE_KEYS.allowedOrigin,
    STORAGE_KEYS.waitLimitSeconds,
    STORAGE_KEYS.scanIntervalSeconds
  ]);

  document.getElementById("testUrl").value = data[STORAGE_KEYS.allowedOrigin] || data[STORAGE_KEYS.allowedHost] || "";
  document.getElementById("waitLimit").value = data[STORAGE_KEYS.waitLimitSeconds] || 180;
  document.getElementById("scanInterval").value = data[STORAGE_KEYS.scanIntervalSeconds] || 15;
}

async function saveSettings() {
  const parsed = parseUrlOrHost(document.getElementById("testUrl").value);
  const waitLimitSeconds = parsePositiveInt(document.getElementById("waitLimit").value, 180, 10, 3600);
  const scanIntervalSeconds = parsePositiveInt(document.getElementById("scanInterval").value, 15, 3, 600);

  if (scanIntervalSeconds > waitLimitSeconds) {
    throw new Error("Scan interval should not be greater than wait limit.");
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.allowedHost]: parsed.host,
    [STORAGE_KEYS.allowedOrigin]: parsed.origin,
    [STORAGE_KEYS.waitLimitSeconds]: waitLimitSeconds,
    [STORAGE_KEYS.scanIntervalSeconds]: scanIntervalSeconds
  });

  await notifyActiveTab(parsed, waitLimitSeconds, scanIntervalSeconds);

  showMessage(`Saved. Host: ${parsed.host}. Wait: ${waitLimitSeconds}s. Scan: ${scanIntervalSeconds}s.`);
}

async function notifyActiveTab(parsed, waitLimitSeconds, scanIntervalSeconds) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    await chrome.tabs.sendMessage(tab.id, {
      type: "SET_ALLOWED_SITE",
      host: parsed.host,
      origin: parsed.origin
    });

    await chrome.tabs.sendMessage(tab.id, {
      type: "SET_TIMING_SETTINGS",
      waitLimitSeconds,
      scanIntervalSeconds
    });
  } catch {
    // The active tab may not have content script access yet. Storage is still saved.
  }
}

document.getElementById("useCurrentUrl").addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) {
      showMessage("Cannot read the current active tab URL.", "err");
      return;
    }

    const parsed = new URL(tab.url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      showMessage("Current active tab is not a regular web page.", "err");
      return;
    }

    document.getElementById("testUrl").value = parsed.origin;
    showMessage(`Loaded active tab URL: ${parsed.origin}`);
  } catch (err) {
    showMessage(String(err.message || err), "err");
  }
});

document.getElementById("saveConfig").addEventListener("click", async () => {
  try {
    await saveSettings();
    setTimeout(() => window.close(), 550);
  } catch (err) {
    showMessage(String(err.message || err), "err");
  }
});

document.getElementById("closePage").addEventListener("click", () => {
  window.close();
});

loadSettings();
