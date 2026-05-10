const DEFAULT_APP_URL = "http://localhost:3000/";
const APP_URL_KEY = "mywalletAppUrl";
const MEROSHARE_CREDENTIALS_KEY = "mywalletMeroShareCredentials";
const TAB_PATTERNS = [
  "http://localhost/*",
  "http://127.0.0.1/*",
  "https://mywalletnp.vercel.app/*",
];
const DEFAULT_STATUS = "Ready when your wallet tab is open";

const elements = {
  connectedHeader: document.getElementById("connected-header"),
  connectedHeaderStatus: document.getElementById("connected-header-status"),
  connectedHeaderUser: document.getElementById("connected-header-user"),
  heroPanel: document.getElementById("hero-panel"),
  connectionStatus: document.getElementById("connection-status"),
  statusStrip: document.getElementById("status-strip"),
  statusStripTitle: document.getElementById("status-strip-title"),
  statusStripText: document.getElementById("status-strip-text"),
  toggleConnectionButton: document.getElementById("toggle-connection-button"),
  onboardingPanel: document.getElementById("onboarding-panel"),
  connectionPanel: document.getElementById("connection-panel"),
  snapshotPanel: document.getElementById("snapshot-panel"),
  connectedUser: document.getElementById("connected-user"),
  balanceValue: document.getElementById("balance-value"),
  expenseValue: document.getElementById("expense-value"),
  netValue: document.getElementById("net-value"),
  transactionsValue: document.getElementById("transactions-value"),
  budgetsValue: document.getElementById("budgets-value"),
  goalsValue: document.getElementById("goals-value"),
  iposValue: document.getElementById("ipos-value"),
  portfolioValue: document.getElementById("portfolio-value"),
  budgetPulse: document.getElementById("budget-pulse"),
  goalProgress: document.getElementById("goal-progress"),
  recentTransactions: document.getElementById("recent-transactions"),
  quickAddForm: document.getElementById("quick-add-form"),
  formMessage: document.getElementById("form-message"),
  categoryList: document.getElementById("category-list"),
  txType: document.getElementById("tx-type"),
  txAmount: document.getElementById("tx-amount"),
  txCategory: document.getElementById("tx-category"),
  txDescription: document.getElementById("tx-description"),
  txDate: document.getElementById("tx-date"),
  refreshButton: document.getElementById("refresh-button"),
  refreshHeroButton: document.getElementById("refresh-hero-button"),
  appUrl: document.getElementById("app-url"),
  saveUrlButton: document.getElementById("save-url-button"),
  openAppButton: document.getElementById("open-app-button"),
  openSettingsButton: document.getElementById("open-settings-button"),
  openDashboardButton: document.getElementById("open-dashboard-button"),
  openPortfolioButton: document.getElementById("open-portfolio-button"),
  openMeroShareSettingsButton: document.getElementById("open-meroshare-settings-button"),
  openSecurityButton: document.getElementById("open-security-button"),
  startOnboardingButton: document.getElementById("start-onboarding-button"),
  openAppEmptyButton: document.getElementById("open-app-empty-button"),
  ipoAutomationForm: document.getElementById("ipo-automation-form"),
  ipoSelect: document.getElementById("ipo-select"),
  ipoName: document.getElementById("ipo-name"),
  ipoKitta: document.getElementById("ipo-kitta"),
  applyIpoButton: document.getElementById("apply-ipo-button"),
  checkIpoButton: document.getElementById("check-ipo-button"),
  ipoMessage: document.getElementById("ipo-message"),
  meroShareCredentialsForm: document.getElementById("meroshare-credentials-form"),
  meroDpId: document.getElementById("mero-dp-id"),
  meroUsername: document.getElementById("mero-username"),
  meroPassword: document.getElementById("mero-password"),
  meroCrn: document.getElementById("mero-crn"),
  meroPin: document.getElementById("mero-pin"),
  clearMeroCredentialsButton: document.getElementById("clear-mero-credentials-button"),
  meroCredentialsMessage: document.getElementById("mero-credentials-message"),
};

elements.txDate.value = new Date().toISOString().slice(0, 10);

let connectedTabId = null;
let cachedSnapshot = null;
let activeTab = "overview";
let connectionPanelOpen = false;

function formatCurrency(value, symbol = "NPR") {
  if (!Number.isFinite(value)) return "-";
  return `${symbol} ${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function normalizeAppUrl(value) {
  const rawUrl = typeof value === "string" ? value.trim() || DEFAULT_APP_URL : DEFAULT_APP_URL;

  try {
    const url = new URL(rawUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Use an http:// or https:// app URL.");
    }

    return url.toString();
  } catch (error) {
    if (error instanceof Error && error.message.includes("http")) {
      throw error;
    }

    throw new Error("Enter a valid MyWallet app URL.");
  }
}

function setStatus(message) {
  elements.connectionStatus.textContent = message;
  elements.statusStripText.textContent = message;
}

function setConnectedChrome(isConnected, message = "Connected", userName = "") {
  elements.connectedHeader.classList.toggle("hidden", !isConnected);
  elements.heroPanel.classList.toggle("hidden", isConnected);
  elements.statusStrip.classList.toggle("hidden", isConnected);
  elements.connectedHeaderStatus.textContent = message;
  elements.connectedHeaderUser.textContent = userName;
}

function setRefreshDisabled(isDisabled) {
  elements.refreshButton.disabled = isDisabled;
  elements.refreshHeroButton.disabled = isDisabled;
}

function setFormMessage(message) {
  elements.formMessage.textContent = message;
}

function setConnectionPanelOpen(isOpen) {
  connectionPanelOpen = isOpen;
  elements.connectionPanel.classList.toggle("hidden", !isOpen);
  elements.toggleConnectionButton.textContent = isOpen ? "Hide" : "Manage";
}

function setPopupTab(tabName) {
  activeTab = tabName;
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.panel !== tabName);
  });
}

function createRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function getStoredAppUrl() {
  const stored = await chrome.storage.sync.get(APP_URL_KEY);
  try {
    return normalizeAppUrl(stored[APP_URL_KEY] || DEFAULT_APP_URL);
  } catch {
    return DEFAULT_APP_URL;
  }
}

async function saveAppUrl() {
  const url = normalizeAppUrl(elements.appUrl.value);
  elements.appUrl.value = url;
  await chrome.storage.sync.set({ [APP_URL_KEY]: url });
}

async function getStoredMeroShareCredentials() {
  const stored = await chrome.storage.local.get(MEROSHARE_CREDENTIALS_KEY);
  return stored[MEROSHARE_CREDENTIALS_KEY] || null;
}

async function saveMeroShareCredentials(event) {
  event.preventDefault();
  const credentials = {
    dpId: elements.meroDpId.value.trim(),
    username: elements.meroUsername.value.trim(),
    password: elements.meroPassword.value,
    crn: elements.meroCrn.value.trim(),
    pin: elements.meroPin.value.trim(),
  };

  const missingField = Object.entries(credentials).find(([, value]) => !value);
  if (missingField) {
    elements.meroCredentialsMessage.textContent = "Fill all MeroShare login fields before saving.";
    return;
  }

  await chrome.storage.local.set({ [MEROSHARE_CREDENTIALS_KEY]: credentials });
  elements.meroCredentialsMessage.textContent = "MeroShare login saved in this extension.";
  renderIpoAutomation(cachedSnapshot);
}

async function loadMeroShareCredentials() {
  const credentials = await getStoredMeroShareCredentials();
  if (!credentials) {
    elements.meroCredentialsMessage.textContent = "Save your MeroShare login here to apply without opening MyWallet.";
    return null;
  }

  elements.meroDpId.value = credentials.dpId || "";
  elements.meroUsername.value = credentials.username || "";
  elements.meroPassword.value = credentials.password || "";
  elements.meroCrn.value = credentials.crn || "";
  elements.meroPin.value = credentials.pin || "";
  elements.meroCredentialsMessage.textContent = "MeroShare login is saved in this extension.";
  return credentials;
}

async function clearMeroShareCredentials() {
  await chrome.storage.local.remove(MEROSHARE_CREDENTIALS_KEY);
  elements.meroShareCredentialsForm.reset();
  elements.meroCredentialsMessage.textContent = "MeroShare login cleared from this extension.";
  renderIpoAutomation(cachedSnapshot);
}

async function sendBackgroundAction(action, payload = {}) {
  let response;
  try {
    response = await chrome.runtime.sendMessage({
      type: "MYWALLET_BACKGROUND_ACTION",
      action,
      ...payload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Receiving end does not exist") || message.includes("Could not establish connection")) {
      throw new Error("The extension background service is not active. Reload MyWallet Companion from chrome://extensions, then reopen this popup.");
    }

    throw new Error(message || "Could not reach the extension background service.");
  }

  if (!response?.ok) {
    throw new Error(response?.error || "Background action failed.");
  }

  return response.data;
}

async function pingTab(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "MYWALLET_EXTENSION_REQUEST",
      requestId: createRequestId(),
      action: "ping",
    });

    if (response?.ok && response?.data?.connected) {
      return response.data;
    }
  } catch {
  }

  return null;
}

async function ensureBridgeInjected(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content-script.js"],
    });
  } catch {
    // Some pages cannot be scripted; ping will surface whether this tab is usable.
  }
}

function uniqueTabs(tabs) {
  const seen = new Set();
  return tabs.filter((tab) => {
    if (!tab.id || seen.has(tab.id)) return false;
    seen.add(tab.id);
    return true;
  });
}

async function findConnectedTab() {
  const appUrl = await getStoredAppUrl();
  const preferredUrl = new URL(appUrl);
  const preferredPattern = `${preferredUrl.origin}/*`;
  const tabs = uniqueTabs([
    ...(await chrome.tabs.query({ url: preferredPattern })),
    ...(await chrome.tabs.query({ url: TAB_PATTERNS })),
  ]);

  for (const tab of tabs) {
    if (!tab.id) continue;
    await ensureBridgeInjected(tab.id);
    const snapshot = await pingTab(tab.id);
    if (snapshot) {
      connectedTabId = tab.id;
      cachedSnapshot = snapshot;
      return snapshot;
    }
  }

  connectedTabId = null;
  cachedSnapshot = null;
  return null;
}

async function requestFromApp(action, payload = null, timeoutMs = 5000) {
  if (!connectedTabId) {
    throw new Error("Open your MyWallet app tab first.");
  }

  let response;
  try {
    await ensureBridgeInjected(connectedTabId);
    response = await chrome.tabs.sendMessage(connectedTabId, {
      type: "MYWALLET_EXTENSION_REQUEST",
      requestId: createRequestId(),
      action,
      payload,
      timeoutMs,
    });
  } catch (error) {
    connectedTabId = null;
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Receiving end does not exist") || message.includes("Could not establish connection")) {
      throw new Error("MyWallet tab is open but the extension bridge is not attached. Reload the MyWallet tab, then click Refresh in the extension.");
    }

    throw new Error(message || "Could not reach the MyWallet tab.");
  }

  if (!response?.ok) {
    throw new Error(response?.error || "MyWallet app request failed.");
  }

  return response.data;
}

function appendTextRow(parent, { title, lines = [], pill = null }) {
  const li = document.createElement("li");
  const strong = document.createElement("strong");
  strong.textContent = title;
  li.appendChild(strong);

  lines.forEach((line) => {
    const span = document.createElement("span");
    span.textContent = line;
    li.appendChild(span);
  });

  if (pill) {
    const span = document.createElement("span");
    span.className = `pill ${pill.status}`;
    span.textContent = pill.label;
    li.appendChild(span);
  }

  parent.appendChild(li);
}

function renderRecentTransactions(items, currencySymbol) {
  elements.recentTransactions.innerHTML = "";
  if (!Array.isArray(items) || items.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No transactions yet.";
    elements.recentTransactions.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    const meta = document.createElement("div");
    meta.className = "transaction-meta";

    const title = document.createElement("strong");
    title.textContent = item.description || "Untitled";

    const detail = document.createElement("span");
    detail.textContent = `${item.category || "Uncategorized"} - ${item.date || "No date"}`;

    const amount = document.createElement("div");
    const type = item.type === "income" ? "income" : "expense";
    amount.className = `transaction-amount ${type}`;
    amount.textContent = `${type === "expense" ? "-" : "+"}${formatCurrency(Number(item.amount), currencySymbol)}`;

    meta.append(title, detail);
    li.append(meta, amount);
    elements.recentTransactions.appendChild(li);
  });
}

function renderBudgetPulse(items, currencySymbol) {
  elements.budgetPulse.innerHTML = "";
  if (!Array.isArray(items) || items.length === 0) {
    appendTextRow(elements.budgetPulse, {
      title: "No budgets yet",
      lines: ["Create a few budgets in MyWallet to track spending pressure here."],
    });
    return;
  }

  items.forEach((item) => {
    const status = ["over", "warning", "healthy"].includes(item.status) ? item.status : "healthy";
    appendTextRow(elements.budgetPulse, {
      title: item.name || "Untitled budget",
      lines: [
        `${formatCurrency(Number(item.spent), currencySymbol)} of ${formatCurrency(Number(item.limit), currencySymbol)} used`,
      ],
      pill: {
        status,
        label: `${Number(item.progress || 0)}% ${status}`,
      },
    });
  });
}

function renderGoalProgress(items, currencySymbol) {
  elements.goalProgress.innerHTML = "";
  if (!Array.isArray(items) || items.length === 0) {
    appendTextRow(elements.goalProgress, {
      title: "No goals yet",
      lines: ["Add goals in MyWallet and the extension will surface your strongest progress here."],
    });
    return;
  }

  items.forEach((item) => {
    const progress = Number(item.progress || 0);
    appendTextRow(elements.goalProgress, {
      title: item.title || "Untitled goal",
      lines: [
        `${formatCurrency(Number(item.currentAmount), currencySymbol)} of ${formatCurrency(Number(item.targetAmount), currencySymbol)}`,
        `${progress}% complete${item.targetDate ? ` - target ${item.targetDate}` : ""}`,
      ],
    });
  });
}

function renderIpoAutomation(snapshot) {
  const targets = Array.isArray(snapshot?.ipoAutomationTargets) ? snapshot.ipoAutomationTargets : [];
  const previousValue = elements.ipoSelect.value;
  elements.ipoSelect.innerHTML = "";

  if (targets.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No IPO targets available";
    elements.ipoSelect.appendChild(option);
  } else {
    targets.forEach((ipo) => {
      const option = document.createElement("option");
      option.value = ipo.company || "";
      option.textContent = `${ipo.company || "Untitled IPO"} (${ipo.status || "unknown"})`;
      elements.ipoSelect.appendChild(option);
    });
  }

  if (previousValue && Array.from(elements.ipoSelect.options).some((option) => option.value === previousValue)) {
    elements.ipoSelect.value = previousValue;
  }

  const hasIpoName = Boolean(getSelectedIpoName());
  elements.applyIpoButton.disabled = !hasIpoName;
  elements.checkIpoButton.disabled = !hasIpoName;

  if (!hasIpoName) {
    elements.ipoMessage.textContent = "Choose an IPO from MyWallet data or type the IPO name manually.";
  } else if (!elements.ipoMessage.textContent) {
    elements.ipoMessage.textContent = "Choose an IPO, then apply or check its result.";
  }
}

function renderCategoryOptions(snapshot) {
  const type = elements.txType.value;
  const categories = snapshot?.suggestedCategories?.[type] || [];
  elements.categoryList.innerHTML = "";
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    elements.categoryList.appendChild(option);
  });
}

function renderSnapshot(snapshot) {
  cachedSnapshot = snapshot;
  const currencySymbol = snapshot?.user?.currency || "NPR";
  const summary = snapshot?.summary || {};

  const isOnboarded = Boolean(snapshot?.user?.name);
  elements.onboardingPanel.classList.toggle("hidden", isOnboarded);
  elements.snapshotPanel.classList.toggle("hidden", !isOnboarded);

  if (!isOnboarded) {
    setConnectedChrome(false);
    elements.statusStripTitle.textContent = "Setup Needed";
    setStatus("Open MyWallet and finish onboarding to unlock the extension.");
    return;
  }

  setConnectedChrome(true, "Connected", snapshot.user.name);
  elements.statusStripTitle.textContent = "Connected";
  if (snapshot?.user?.name) {
    elements.connectedUser.textContent = snapshot.user.name;
    elements.connectedUser.classList.remove("hidden");
  } else {
    elements.connectedUser.classList.add("hidden");
  }

  elements.balanceValue.textContent = formatCurrency(Number(summary.balance), currencySymbol);
  elements.expenseValue.textContent = formatCurrency(Number(summary.monthlyExpenseTotal), currencySymbol);
  elements.netValue.textContent = formatCurrency(Number(summary.monthlyNet), currencySymbol);
  elements.transactionsValue.textContent = String(summary.transactionCount ?? 0);
  elements.budgetsValue.textContent = String(summary.budgetCount ?? 0);
  elements.goalsValue.textContent = String(summary.goalCount ?? 0);
  elements.iposValue.textContent = String(summary.ipoOpenCount ?? 0);
  elements.portfolioValue.textContent = formatCurrency(Number(summary.portfolioValue), currencySymbol);
  renderBudgetPulse(snapshot.budgetHealth, currencySymbol);
  renderGoalProgress(snapshot.goalProgress, currencySymbol);
  renderRecentTransactions(snapshot.recentTransactions, currencySymbol);
  renderIpoAutomation(snapshot);
  renderCategoryOptions(snapshot);

  const userName = snapshot?.user?.name ? ` for ${snapshot.user.name}` : "";
  setStatus(`Connected to MyWallet${userName}`);
}

async function refreshConnection() {
  const wasConnected = Boolean(cachedSnapshot?.user?.name);
  setConnectedChrome(wasConnected, wasConnected ? "Refreshing..." : "Connected");
  elements.statusStripTitle.textContent = "Searching";
  setStatus("Looking for an open MyWallet tab...");
  setRefreshDisabled(true);

  try {
    const snapshot = await findConnectedTab();
    if (!snapshot) {
      setConnectedChrome(false);
      elements.statusStripTitle.textContent = "Disconnected";
      elements.snapshotPanel.classList.add("hidden");
      elements.onboardingPanel.classList.add("hidden");
      setStatus("No active MyWallet tab found. Open the app, then refresh.");
      return;
    }

    renderSnapshot(snapshot);
  } catch (error) {
    setConnectedChrome(false);
    elements.statusStripTitle.textContent = "Disconnected";
    elements.snapshotPanel.classList.add("hidden");
    elements.onboardingPanel.classList.add("hidden");
    setStatus(error instanceof Error ? error.message : "Could not refresh the MyWallet connection.");
  } finally {
    setRefreshDisabled(false);
  }
}

async function openApp() {
  await sendBackgroundAction("open-app");
}

async function openAppRoute(route) {
  await sendBackgroundAction("open-app", { route });
}

async function handleQuickAdd(event) {
  event.preventDefault();
  setFormMessage("Sending transaction to MyWallet...");
  const submitButton = elements.quickAddForm.querySelector("button[type='submit']");
  submitButton.disabled = true;

  try {
    if (!connectedTabId) {
      await refreshConnection();
    }

    const snapshot = await requestFromApp("addTransaction", {
      type: elements.txType.value,
      amount: Number(elements.txAmount.value),
      category: elements.txCategory.value.trim(),
      description: elements.txDescription.value.trim(),
      date: elements.txDate.value,
    });

    renderSnapshot(snapshot);
    elements.quickAddForm.reset();
    elements.txType.value = "expense";
    elements.txDate.value = new Date().toISOString().slice(0, 10);
    renderCategoryOptions(snapshot);
    setFormMessage("Transaction added successfully.");
  } catch (error) {
    setFormMessage(error instanceof Error ? error.message : "Failed to add transaction.");
  } finally {
    submitButton.disabled = false;
  }
}

function setIpoAutomationBusy(isBusy) {
  elements.applyIpoButton.disabled = isBusy;
  elements.checkIpoButton.disabled = isBusy;
  elements.ipoSelect.disabled = isBusy;
  elements.ipoKitta.disabled = isBusy;
}

function formatAutomationResult(result, fallback) {
  if (!result || typeof result !== "object") return fallback;
  if (result.message) return result.message;
  if (result.status) {
    if (result.isAllotted) {
      return `Allotted: ${result.allottedQuantity || 0} units.`;
    }

    return `Result: ${result.status}`;
  }

  return fallback;
}

function getSelectedIpoName() {
  return elements.ipoName.value.trim() || elements.ipoSelect.value;
}

async function runIpoAutomation(action) {
  const ipoName = getSelectedIpoName();
  if (!ipoName) {
    elements.ipoMessage.textContent = "Choose an IPO or type the IPO name first.";
    return;
  }

  setIpoAutomationBusy(true);
  elements.ipoMessage.textContent = action === "applyMeroShareIPO"
    ? `Applying for ${ipoName}...`
    : `Checking result for ${ipoName}...`;

  try {
    const credentials = await getStoredMeroShareCredentials();
    if (!credentials) {
      throw new Error("Save your MeroShare login in the extension first.");
    }

    const result = await sendBackgroundAction(
      action === "applyMeroShareIPO" ? "apply-ipo-in-browser" : "check-ipo-in-browser",
      {
        credentials,
        ipoName,
        kitta: Number(elements.ipoKitta.value || 10),
      }
    );

    elements.ipoMessage.textContent = formatAutomationResult(
      result,
      action === "applyMeroShareIPO" ? "IPO application completed in your browser." : "Result check completed in your browser."
    );
  } catch (error) {
    elements.ipoMessage.textContent = error instanceof Error ? error.message : "MeroShare automation failed.";
  } finally {
    setIpoAutomationBusy(false);
    renderIpoAutomation(cachedSnapshot);
  }
}

function bindAction(element, action, successMessage) {
  element.addEventListener("click", async () => {
    element.disabled = true;

    try {
      await action();
      setStatus(successMessage);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Action failed.");
    } finally {
      element.disabled = false;
    }
  });
}

elements.txType.addEventListener("change", () => renderCategoryOptions(cachedSnapshot));
elements.refreshButton.addEventListener("click", refreshConnection);
elements.refreshHeroButton.addEventListener("click", refreshConnection);
bindAction(elements.saveUrlButton, saveAppUrl, "Preferred app URL saved.");
bindAction(elements.openAppButton, openApp, "Opened MyWallet.");
bindAction(elements.openSettingsButton, () => openAppRoute("/settings"), "Opened MyWallet settings.");
bindAction(elements.openDashboardButton, () => openAppRoute("/"), "Opened MyWallet dashboard.");
bindAction(elements.openPortfolioButton, () => openAppRoute("/?tab=portfolio"), "Opened MyWallet portfolio view.");
bindAction(elements.openMeroShareSettingsButton, () => openAppRoute("/settings?tab=meroshare"), "Opened MeroShare settings.");
bindAction(elements.openSecurityButton, () => openAppRoute("/settings?tab=security"), "Opened security settings.");
elements.toggleConnectionButton.addEventListener("click", () => {
  setConnectionPanelOpen(!connectionPanelOpen);
});
bindAction(elements.startOnboardingButton, () => openAppRoute("/welcome?start=1"), "Opened MyWallet onboarding.");
bindAction(elements.openAppEmptyButton, () => openAppRoute("/"), "Opened MyWallet.");
elements.quickAddForm.addEventListener("submit", handleQuickAdd);
elements.meroShareCredentialsForm.addEventListener("submit", saveMeroShareCredentials);
elements.clearMeroCredentialsButton.addEventListener("click", clearMeroShareCredentials);
elements.ipoAutomationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void runIpoAutomation("applyMeroShareIPO");
});
elements.checkIpoButton.addEventListener("click", () => {
  void runIpoAutomation("checkIPOAllotment");
});
elements.ipoSelect.addEventListener("change", () => renderIpoAutomation(cachedSnapshot));
elements.ipoName.addEventListener("input", () => renderIpoAutomation(cachedSnapshot));
document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => setPopupTab(button.dataset.tab || "overview"));
});

document.addEventListener("DOMContentLoaded", async () => {
  elements.appUrl.value = await getStoredAppUrl();
  setStatus(DEFAULT_STATUS);
  setConnectedChrome(false);
  setPopupTab(activeTab);
  setConnectionPanelOpen(false);
  await loadMeroShareCredentials();
  await refreshConnection().catch(() => {
    elements.statusStripTitle.textContent = "Optional";
    setStatus("MyWallet is not connected. MeroShare automation can still run from saved extension login.");
  });
});
