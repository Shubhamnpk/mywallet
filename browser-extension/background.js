const DEFAULT_APP_URL = "http://localhost:3000/";
const APP_URL_KEY = "mywalletAppUrl";

async function getStoredAppUrl() {
  const stored = await chrome.storage.sync.get(APP_URL_KEY);
  return stored[APP_URL_KEY] || DEFAULT_APP_URL;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "MYWALLET_BACKGROUND_ACTION") {
    return false;
  }

  (async () => {
    const appUrl = await getStoredAppUrl();

    if (message.action === "open-app") {
      const target = message.route ? new URL(message.route, appUrl).toString() : appUrl;
      await chrome.tabs.create({ url: target });
      sendResponse({ ok: true });
      return;
    }

    if (message.action === "open-meroshare") {
      await chrome.tabs.create({ url: "https://meroshare.cdsc.com.np/#/login" });
      sendResponse({ ok: true });
      return;
    }

    if (message.action === "open-ipo-result") {
      await chrome.tabs.create({ url: "https://iporesult.cdsc.com.np/" });
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: "Unknown background action." });
  })().catch((error) => {
    sendResponse({ ok: false, error: error instanceof Error ? error.message : "Unknown background error." });
  });

  return true;
});
