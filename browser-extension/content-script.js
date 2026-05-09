const EXTENSION_SOURCE = "mywallet-extension";
const APP_SOURCE = "mywallet-app";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "MYWALLET_EXTENSION_REQUEST") {
    return false;
  }

  const timeout = window.setTimeout(() => {
    window.removeEventListener("message", onMessage);
    sendResponse({ ok: false, error: "MyWallet app did not respond in time." });
  }, 5000);

  const onMessage = (event) => {
    if (event.source !== window) return;
    const payload = event.data;
    if (!payload || payload.source !== APP_SOURCE || payload.type !== "RESPONSE") return;
    if (payload.requestId !== message.requestId) return;

    window.clearTimeout(timeout);
    window.removeEventListener("message", onMessage);
    sendResponse(payload);
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
