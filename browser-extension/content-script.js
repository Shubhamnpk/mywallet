const EXTENSION_SOURCE = "mywallet-extension";
const APP_SOURCE = "mywallet-app";

if (!window.__MYWALLET_EXTENSION_BRIDGE_INSTALLED__) {
  window.__MYWALLET_EXTENSION_BRIDGE_INSTALLED__ = true;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "MYWALLET_EXTENSION_REQUEST") {
    return false;
  }

  if (!message.requestId || typeof message.action !== "string") {
    sendResponse({ ok: false, error: "Invalid MyWallet extension request." });
    return false;
  }

  let didRespond = false;
  const respondOnce = (payload) => {
    if (didRespond) return;
    didRespond = true;
    sendResponse(payload);
  };

  const timeoutMs = Number.isFinite(message.timeoutMs) ? message.timeoutMs : 5000;
  const timeout = window.setTimeout(() => {
    window.removeEventListener("message", onMessage);
    respondOnce({ ok: false, error: "MyWallet app did not respond in time." });
  }, timeoutMs);

  const onMessage = (event) => {
    if (event.source !== window) return;
    const payload = event.data;
    if (!payload || payload.source !== APP_SOURCE || payload.type !== "RESPONSE") return;
    if (payload.requestId !== message.requestId) return;

    window.clearTimeout(timeout);
    window.removeEventListener("message", onMessage);
    respondOnce(payload);
  };

  window.addEventListener("message", onMessage);
  window.postMessage(
    {
      source: EXTENSION_SOURCE,
      type: "REQUEST",
      requestId: message.requestId,
      action: message.action,
      payload: message.payload || null,
    },
    window.location.origin
  );

  return true;
});
}
