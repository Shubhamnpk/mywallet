const DEFAULT_APP_URL = "http://localhost:3000/";
const APP_URL_KEY = "mywalletAppUrl";
const MEROSHARE_LOGIN_URL = "https://meroshare.cdsc.com.np/#/login";
const IPO_RESULT_URL = "https://iporesult.cdsc.com.np/";

function normalizeAppUrl(value) {
  const rawUrl = typeof value === "string" ? value.trim() || DEFAULT_APP_URL : DEFAULT_APP_URL;
  const url = new URL(rawUrl);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Stored MyWallet app URL must use http:// or https://.");
  }

  return url.toString();
}

async function getStoredAppUrl() {
  const stored = await chrome.storage.sync.get(APP_URL_KEY);
  try {
    return normalizeAppUrl(stored[APP_URL_KEY]);
  } catch {
    await chrome.storage.sync.set({ [APP_URL_KEY]: DEFAULT_APP_URL });
    return DEFAULT_APP_URL;
  }
}

function waitForTabComplete(tabId, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error("MeroShare tab did not finish loading in time."));
    }, timeoutMs);

    const onUpdated = (updatedTabId, changeInfo) => {
      if (updatedTabId !== tabId || changeInfo.status !== "complete") return;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve();
    };

    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) return;
      if (tab?.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    });
  });
}

async function openMeroShareTab(active) {
  const tab = await chrome.tabs.create({ url: MEROSHARE_LOGIN_URL, active });
  if (!tab.id) throw new Error("Could not open MeroShare tab.");
  await waitForTabComplete(tab.id);
  return tab.id;
}

function debuggerSend(tabId, method, params = {}) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result);
    });
  });
}

function debuggerAttach(tabId) {
  return new Promise((resolve, reject) => {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

function debuggerDetach(tabId) {
  return new Promise((resolve) => {
    chrome.debugger.detach({ tabId }, () => resolve());
  });
}

async function evaluateInTab(tabId, func, args = []) {
  const [execution] = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args,
  });
  return execution?.result;
}

async function waitForTabValue(tabId, func, args = [], timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = await evaluateInTab(tabId, func, args);
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for MeroShare page.");
}

async function getElementCenter(tabId, selector, textIncludes = "") {
  const rect = await waitForTabValue(tabId, (targetSelector, targetText) => {
    const nodes = Array.from(document.querySelectorAll(targetSelector));
    const node = nodes.find((item) => {
      if (!targetText) return true;
      return (item.textContent || "").toLowerCase().includes(targetText.toLowerCase());
    });
    if (!node) return null;
    const bounds = node.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    return {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    };
  }, [selector, textIncludes]);
  return rect;
}

async function debuggerClick(tabId, selector, textIncludes = "") {
  const point = await getElementCenter(tabId, selector, textIncludes);
  await debuggerSend(tabId, "Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.x,
    y: point.y,
    button: "none",
  });
  await debuggerSend(tabId, "Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1,
  });
  await debuggerSend(tabId, "Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1,
  });
}

async function debuggerType(tabId, value) {
  await debuggerSend(tabId, "Input.insertText", { text: String(value) });
}

async function loginMeroShareWithBrowserInput(tabId, credentials) {
  await debuggerAttach(tabId);
  try {
    await debuggerClick(tabId, ".select2-selection");
    await waitForTabValue(tabId, () => document.querySelector(".select2-search__field"));
    await debuggerType(tabId, credentials.dpId);
    await waitForTabValue(tabId, (dpId) => {
      const options = Array.from(document.querySelectorAll(".select2-results__option"));
      return options.some((option) => {
        const label = option.textContent || "";
        return label.includes(dpId) && !label.toLowerCase().includes("searching");
      });
    }, [credentials.dpId], 15000);
    await debuggerClick(tabId, ".select2-results__option", credentials.dpId);
    await waitForTabValue(tabId, () => {
      const rendered = document.querySelector(".select2-selection__rendered");
      const label = rendered?.textContent?.trim() || "";
      return label && !label.toLowerCase().includes("select") && !label.toLowerCase().includes("choose");
    }, [], 10000);

    await debuggerClick(tabId, "#username");
    await debuggerType(tabId, credentials.username);
    await debuggerClick(tabId, "#password");
    await debuggerType(tabId, credentials.password);
    await debuggerClick(tabId, 'button[type="submit"]');

    await waitForTabValue(tabId, () => {
      const body = document.body.textContent || "";
      return window.location.href.includes("/dashboard") ||
        document.querySelector(".toast-error, .toast-message") ||
        body.includes("Attempts remaining");
    }, [], 30000);

    const loginError = await evaluateInTab(tabId, () => {
      if (window.location.href.includes("/dashboard")) return "";
      return document.querySelector(".toast-error, .toast-message")?.textContent?.trim() || "MeroShare login failed. Check credentials.";
    });
    if (loginError) throw new Error(loginError);
  } finally {
    await debuggerDetach(tabId);
  }
}

async function runMeroShareTask({ task, credentials, ipoName, kitta }) {
  if (!credentials?.dpId || !credentials?.username || !credentials?.password || !credentials?.crn || !credentials?.pin) {
    throw new Error("Missing MeroShare credentials from MyWallet.");
  }

  if (!ipoName) {
    throw new Error("Choose an IPO first.");
  }

  const tabId = await openMeroShareTab(true);
  await loginMeroShareWithBrowserInput(tabId, credentials);
  const [execution] = await chrome.scripting.executeScript({
    target: { tabId },
    func: runMeroShareAutomationInPage,
    args: [{ task, credentials, ipoName, kitta, skipLogin: true }],
  });

  if (!execution?.result) {
    throw new Error("MeroShare automation did not return a result.");
  }

  if (!execution.result.ok) {
    throw new Error(execution.result.error || "MeroShare automation failed.");
  }

  return execution.result.data;
}

async function runMeroShareAutomationInPage(input) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const normalize = (value) => String(value || "")
    .toLowerCase()
    .replace(/\b(limited|ltd|public|private|pvt|co|company|inc)\b/g, "")
    .replace(/[().,-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const isMatch = (candidate, target) => {
    const candidateName = normalize(candidate);
    const targetName = normalize(target);
    return Boolean(candidateName && targetName && (candidateName.includes(targetName) || targetName.includes(candidateName)));
  };
  const text = (node) => node?.textContent?.trim() || "";
  const visible = (node) => {
    if (!node) return false;
    const style = window.getComputedStyle(node);
    return style.display !== "none" && style.visibility !== "hidden" && node.getClientRects().length > 0;
  };
  const waitFor = async (predicate, timeoutMs = 30000, intervalMs = 250) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const value = predicate();
      if (value) return value;
      await sleep(intervalMs);
    }
    throw new Error("Timed out waiting for MeroShare page.");
  };
  const waitForSelector = (selector, timeoutMs = 30000) => waitFor(() => {
    const node = document.querySelector(selector);
    return visible(node) ? node : null;
  }, timeoutMs);
  const setNativeValue = (element, value) => {
    const prototype = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (descriptor?.set) {
      descriptor.set.call(element, String(value));
    } else {
      element.value = String(value);
    }
  };
  const fireInputEvents = (element) => {
    element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "a" }));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "a" }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const setInputValue = async (selector, value) => {
    const input = document.querySelector(selector);
    if (!input) throw new Error(`Missing MeroShare field: ${selector}`);
    input.focus();
    setNativeValue(input, "");
    fireInputEvents(input);
    await sleep(80);
    setNativeValue(input, value);
    fireInputEvents(input);
    await waitFor(() => input.value === String(value), 3000, 100);
    input.blur();
  };
  const clickText = (selectors, label) => {
    const lowerLabel = label.toLowerCase();
    const nodes = Array.from(document.querySelectorAll(selectors));
    const node = nodes.find((item) => text(item).toLowerCase().includes(lowerLabel));
    if (!node) return false;
    node.click();
    return true;
  };

  const selectDp = async (dpId) => {
    const requestedDp = String(dpId).trim();
    if (!requestedDp) throw new Error("DP code is required.");

    const selection = await waitForSelector(".select2-selection", 20000);
    selection.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    selection.click();
    const search = await waitForSelector(".select2-search__field", 10000);

    search.focus();
    setNativeValue(search, requestedDp);
    fireInputEvents(search);
    await sleep(1600);

    const option = await waitFor(() => {
      const options = Array.from(document.querySelectorAll(".select2-results__option"));
      return options.find((item) => {
        const itemText = text(item).toLowerCase();
        return itemText.includes(requestedDp.toLowerCase()) && !itemText.includes("searching");
      }) || options.find((item) => {
        const itemText = text(item).toLowerCase();
        return itemText && !itemText.includes("searching") && !itemText.includes("no results");
      });
    }, 15000);

    option.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    option.click();
    await waitFor(() => {
      const rendered = text(document.querySelector(".select2-selection__rendered"));
      return rendered && !rendered.toLowerCase().includes("select") && !rendered.toLowerCase().includes("choose");
    }, 10000);
    await sleep(500);
  };

  const login = async () => {
    if (!window.location.href.includes("/login")) {
      window.location.href = "https://meroshare.cdsc.com.np/#/login";
      await sleep(1200);
    }

    await selectDp(input.credentials.dpId);
    await waitForSelector("#username", 20000);
    await setInputValue("#username", input.credentials.username);
    await setInputValue("#password", input.credentials.password);

    const submit = document.querySelector('button[type="submit"]');
    if (submit) submit.click();
    else document.querySelector("#password")?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));

    await waitFor(() => {
      const body = document.body.textContent || "";
      return window.location.href.includes("/dashboard") ||
        document.querySelector(".toast-error, .toast-message") ||
        body.includes("Attempts remaining");
    }, 30000);

    if (!window.location.href.includes("/dashboard")) {
      const errorText = text(document.querySelector(".toast-error, .toast-message"));
      throw new Error(errorText || "MeroShare login failed. Check credentials.");
    }
  };

  const goToAsba = async () => {
    window.location.href = "https://meroshare.cdsc.com.np/#/asba";
    await waitFor(() => window.location.href.includes("/asba"), 10000);
    await waitFor(() => document.querySelector(".nav-link, .company-list, .asba-table, app-no-records-found"), 20000);
    await sleep(1500);
  };

  const clickApplyTab = async () => {
    clickText(".nav-link, .nav-item a", "Apply for Issue");
    await sleep(1800);
    await waitFor(() => document.querySelector(".company-list, .asba-table, app-no-records-found"), 20000);
  };

  const clickReportTab = async () => {
    const clicked = clickText(".nav-link, .nav-item a, a span", "Application Report");
    if (!clicked) throw new Error("Could not find Application Report tab.");
    await sleep(3000);
    await waitFor(() => document.querySelector(".company-list, .asba-table, app-no-records-found"), 20000);
  };

  const findIssueAndClick = async (mode) => {
    const cards = Array.from(document.querySelectorAll(".company-list"));
    const discovered = [];

    for (const card of cards) {
      const name = text(card.querySelector('span[tooltip="Company Name"], .company-name'));
      if (name) discovered.push(name);
      if (!isMatch(name, input.ipoName)) continue;

      const buttons = Array.from(card.querySelectorAll(".action-buttons button, .btn-issue, button"));
      const targetButton = mode === "report"
        ? buttons.find((button) => text(button).toLowerCase().includes("report")) || card.querySelector(".btn-issue")
        : buttons.find((button) => text(button).toLowerCase().includes("apply")) ||
          buttons.find((button) => text(button).toLowerCase().includes("edit"));

      if (targetButton) {
        targetButton.click();
        return { status: text(targetButton).toLowerCase().includes("edit") ? "EDIT" : "CLICKED", discovered };
      }
    }

    const rows = Array.from(document.querySelectorAll(".asba-table tbody tr"));
    for (const row of rows) {
      const rowText = text(row);
      const name = rowText.split("\n")[0]?.trim() || rowText;
      if (name) discovered.push(name);
      if (!isMatch(name, input.ipoName)) continue;

      const buttons = Array.from(row.querySelectorAll("button, .btn-apply, .btn-issue, .btn-report, .ca-report, .ca.report, i.mdi-file-document"));
      const targetButton = mode === "report"
        ? buttons.find((button) => text(button).toLowerCase().includes("report") || button.outerHTML.includes("mdi-file-document"))
        : buttons.find((button) => text(button).toLowerCase().includes("apply")) ||
          buttons.find((button) => text(button).toLowerCase().includes("edit"));

      if (targetButton) {
        targetButton.click();
        return { status: text(targetButton).toLowerCase().includes("edit") ? "EDIT" : "CLICKED", discovered };
      }
    }

    throw new Error(`IPO "${input.ipoName}" not found. Available: ${discovered.slice(0, 6).join(", ") || "none"}`);
  };

  const selectFirstRealOption = async (selector) => {
    const select = await waitForSelector(selector, 12000);
    await waitFor(() => select.options.length > 0, 10000);
    const option = Array.from(select.options).find((item) => {
      const value = item.value?.trim();
      return value && !value.toLowerCase().includes("choose") && !value.toLowerCase().includes("select");
    }) || select.options[1] || select.options[0];
    if (!option?.value) return null;
    select.value = option.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return option.value;
  };

  const applyIpo = async () => {
    await goToAsba();
    await clickApplyTab();
    const issue = await findIssueAndClick("apply");

    if (issue.status === "EDIT") {
      const appliedKitta = await waitForSelector("#appliedKitta", 15000);
      return {
        message: `Already applied for ${appliedKitta.value || "this IPO"}.`,
        alreadyApplied: true,
        quantity: appliedKitta.value || null,
      };
    }

    await waitForSelector("#selectBank", 15000);
    await selectFirstRealOption("#selectBank");
    await sleep(1200);
    try {
      await selectFirstRealOption("#accountNumber");
      await sleep(700);
    } catch {
    }

    await setInputValue("#appliedKitta", Number(input.kitta || 10));
    await setInputValue("#crnNumber", input.credentials.crn);

    const disclaimer = document.querySelector("#disclaimer");
    if (disclaimer && !disclaimer.checked) disclaimer.click();

    if (!clickText('button[type="submit"], button', "Proceed")) {
      throw new Error("Could not find Proceed button.");
    }

    await waitForSelector("#transactionPIN", 15000);
    await setInputValue("#transactionPIN", input.credentials.pin);

    if (!clickText('button[type="submit"], button', "Apply")) {
      throw new Error("Could not find final Apply button.");
    }

    await waitFor(() => document.querySelector(".toast-success, .toast-error, .toast-message"), 30000);
    const success = text(document.querySelector(".toast-success"));
    const error = text(document.querySelector(".toast-error, .toast-message"));
    if (!success) throw new Error(error || "Application was not confirmed by MeroShare.");
    return { message: success };
  };

  const checkResult = async () => {
    await goToAsba();
    await clickReportTab();
    await findIssueAndClick("report");
    await waitFor(() => document.querySelector(".asba-report-detail, .modal-content, .card-body, .row"), 15000);
    await sleep(2500);

    const data = {};
    document.querySelectorAll(".form-group").forEach((group) => {
      const label = text(group.querySelector("label"));
      const value = text(group.querySelector(".form-value span")) || text(group.querySelector(".input-group label"));
      if (label && value) data[label] = value;
    });

    const rawStatus = data.Status || data["Allotment Status"] || "Unknown";
    const lowerStatus = String(rawStatus).toLowerCase();
    const isAllotted = lowerStatus.includes("alloted") && !lowerStatus.includes("not");
    const isVerified = lowerStatus === "verified";
    const status = isVerified ? "Application Verified (Result Pending)" : rawStatus;
    const allottedQuantity = data["Allotted Quantity"] || (isAllotted ? data["Applied Quantity"] || "0" : "0");
    return { status, isAllotted, allottedQuantity, allDetails: data };
  };

  try {
    if (!input.skipLogin) {
      await login();
    } else {
      await waitFor(() => window.location.href.includes("/dashboard"), 30000);
    }
    const data = input.task === "check" ? await checkResult() : await applyIpo();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "MeroShare automation failed." };
  }
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
      await chrome.tabs.create({ url: MEROSHARE_LOGIN_URL });
      sendResponse({ ok: true });
      return;
    }

    if (message.action === "open-ipo-result") {
      await chrome.tabs.create({ url: IPO_RESULT_URL });
      sendResponse({ ok: true });
      return;
    }

    if (message.action === "apply-ipo-in-browser" || message.action === "check-ipo-in-browser") {
      const result = await runMeroShareTask({
        task: message.action === "check-ipo-in-browser" ? "check" : "apply",
        credentials: message.credentials,
        ipoName: message.ipoName,
        kitta: message.kitta,
      });
      sendResponse({ ok: true, data: result });
      return;
    }

    sendResponse({ ok: false, error: "Unknown background action." });
  })().catch((error) => {
    sendResponse({ ok: false, error: error instanceof Error ? error.message : "Unknown background error." });
  });

  return true;
});
