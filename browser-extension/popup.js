const DEFAULT_APP_URL = "http://localhost:3000/";
const APP_URL_KEY = "mywalletAppUrl";
const TAB_PATTERNS = [
  "http://localhost/*",
  "http://127.0.0.1/*",
  "https://mywalletnp.vercel.app/*",
];

const elements = {
  connectionStatus: document.getElementById("connection-status"),
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
  automationStatus: document.getElementById("automation-status"),
  automationTargets: document.getElementById("automation-targets"),
  quickAddForm: document.getElementById("quick-add-form"),
  formMessage: document.getElementById("form-message"),
  categoryList: document.getElementById("category-list"),
  txType: document.getElementById("tx-type"),
  txAmount: document.getElementById("tx-amount"),
  txCategory: document.getElementById("tx-category"),
  txDescription: document.getElementById("tx-description"),
  txDate: document.getElementById("tx-date"),
  refreshButton: document.getElementById("refresh-button"),
  appUrl: document.getElementById("app-url"),
  saveUrlButton: document.getElementById("save-url-button"),
  openAppButton: document.getElementById("open-app-button"),
  openSettingsButton: document.getElementById("open-settings-button"),
  openDashboardButton: document.getElementById("open-dashboard-button"),
  openPortfolioButton: document.getElementById("open-portfolio-button"),
  openMeroShareSettingsButton: document.getElementById("open-meroshare-settings-button"),
  openSecurityButton: document.getElementById("open-security-button"),
  openMeroShareButton: document.getElementById("open-meroshare-button"),
  openIpoResultButton: document.getElementById("open-ipo-result-button"),
  startOnboardingButton: document.getElementById("start-onboarding-button"),
  openAppEmptyButton: document.getElementById("open-app-empty-button"),
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

function setStatus(message) {
  elements.connectionStatus.textContent = message;
  elements.statusStripText.textContent = message;
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
  return stored[APP_URL_KEY] || DEFAULT_APP_URL;
}

async function saveAppUrl() {
  const url = elements.appUrl.value.trim() || DEFAULT_APP_URL;
  await chrome.storage.sync.set({ [APP_URL_KEY]: url });
  setStatus(`Saved preferred app URL: ${url}`);
}

async function sendBackgroundAction(action, route) {
  const response = await chrome.runtime.sendMessage({
    type: "MYWALLET_BACKGROUND_ACTION",
    action,
    route,
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Background action failed.");
  }
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
  } catch (_error) {
  }

  return null;
}

async function findConnectedTab() {
  const tabs = await chrome.tabs.query({ url: TAB_PATTERNS });
  for (const tab of tabs) {
    if (!tab.id) continue;
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

async function requestFromApp(action, payload = null) {
  if (!connectedTabId) {
    throw new Error("Open your MyWallet app tab first.");
  }

  const response = await chrome.tabs.sendMessage(connectedTabId, {
    type: "MYWALLET_EXTENSION_REQUEST",
    requestId: createRequestId(),
    action,
    payload,
  });

  if (!response?.ok) {
    throw new Error(response?.error || "MyWallet app request failed.");
  }

  return response.data;
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
    meta.innerHTML = `<strong>${item.description || "Untitled"}</strong><span>${item.category} • ${item.date}</span>`;

    const amount = document.createElement("div");
    amount.className = `transaction-amount ${item.type}`;
    const prefix = item.type === "expense" ? "-" : "+";
    amount.textContent = `${prefix}${formatCurrency(Number(item.amount), currencySymbol)}`;

    li.append(meta, amount);
    elements.recentTransactions.appendChild(li);
  });
}

function renderBudgetPulse(items, currencySymbol) {
  elements.budgetPulse.innerHTML = "";
  if (!Array.isArray(items) || items.length === 0) {
    const li = document.createElement("li");
    li.innerHTML = "<strong>No budgets yet</strong><span>Create a few budgets in MyWallet to track spending pressure here.</span>";
    elements.budgetPulse.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${item.name}</strong>
      <span>${formatCurrency(Number(item.spent), currencySymbol)} of ${formatCurrency(Number(item.limit), currencySymbol)} used</span>
      <span class="pill ${item.status}">${item.progress}% ${item.status}</span>
    `;
    elements.budgetPulse.appendChild(li);
  });
}

function renderGoalProgress(items, currencySymbol) {
  elements.goalProgress.innerHTML = "";
  if (!Array.isArray(items) || items.length === 0) {
    const li = document.createElement("li");
    li.innerHTML = "<strong>No goals yet</strong><span>Add goals in MyWallet and the extension will surface your strongest progress here.</span>";
    elements.goalProgress.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${item.title}</strong>
      <span>${formatCurrency(Number(item.currentAmount), currencySymbol)} of ${formatCurrency(Number(item.targetAmount), currencySymbol)}</span>
      <span>${item.progress}% complete${item.targetDate ? ` • target ${item.targetDate}` : ""}</span>
    `;
    elements.goalProgress.appendChild(li);
  });
}

function renderAutomation(snapshot) {
  const automation = snapshot?.automation || {};
  elements.automationTargets.innerHTML = "";
  const targets = Array.isArray(automation.futureTargets) ? automation.futureTargets : [];

  elements.automationStatus.textContent = automation.meroshareConfigured
    ? "MeroShare is configured in the app. The extension is now ready to grow into guided browser automation flows."
    : "MeroShare automation is not fully configured yet. Use the MeroShare settings shortcut below to prepare the app.";

  if (targets.length === 0) {
    const li = document.createElement("li");
    li.innerHTML = "<strong>No automation capabilities published yet</strong><span>The bridge will expose future browser automation hooks here.</span>";
    elements.automationTargets.appendChild(li);
    return;
  }

  targets.forEach((target) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${target}</strong><span>Planned extension-driven capability.</span>`;
    elements.automationTargets.appendChild(li);
  });
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
    elements.statusStripTitle.textContent = "Setup Needed";
    setStatus("Open MyWallet and finish onboarding to unlock the extension.");
    return;
  }

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
  renderAutomation(snapshot);
  renderCategoryOptions(snapshot);

  const userName = snapshot?.user?.name ? ` for ${snapshot.user.name}` : "";
  setStatus(`Connected to MyWallet${userName}`);
}

async function refreshConnection() {
  elements.statusStripTitle.textContent = "Searching";
  setStatus("Looking for an open MyWallet tab...");
  const snapshot = await findConnectedTab();
  if (!snapshot) {
    elements.statusStripTitle.textContent = "Disconnected";
    elements.snapshotPanel.classList.add("hidden");
    elements.onboardingPanel.classList.add("hidden");
    setStatus("No active MyWallet tab found. Open the app, then refresh.");
    return;
  }

  renderSnapshot(snapshot);
}

async function openApp() {
  await sendBackgroundAction("open-app");
}

async function openAppRoute(route) {
  await sendBackgroundAction("open-app", route);
}

async function handleQuickAdd(event) {
  event.preventDefault();
  setFormMessage("Sending transaction to MyWallet...");

  try {
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
  }
}

elements.txType.addEventListener("change", () => renderCategoryOptions(cachedSnapshot));
elements.refreshButton.addEventListener("click", refreshConnection);
elements.saveUrlButton.addEventListener("click", saveAppUrl);
elements.openAppButton.addEventListener("click", async () => {
  await openApp();
  setStatus("Opened MyWallet.");
});
elements.openSettingsButton.addEventListener("click", async () => {
  await openAppRoute("/settings");
  setStatus("Opened MyWallet settings.");
});
elements.openDashboardButton.addEventListener("click", async () => {
  await openAppRoute("/");
  setStatus("Opened MyWallet dashboard.");
});
elements.openPortfolioButton.addEventListener("click", async () => {
  await openAppRoute("/");
  setStatus("Opened MyWallet portfolio view.");
});
elements.openMeroShareSettingsButton.addEventListener("click", async () => {
  await openAppRoute("/settings?tab=meroshare");
  setStatus("Opened MeroShare settings.");
});
elements.openSecurityButton.addEventListener("click", async () => {
  await openAppRoute("/settings?tab=security");
  setStatus("Opened security settings.");
});
elements.openMeroShareButton.addEventListener("click", async () => {
  await sendBackgroundAction("open-meroshare");
  setStatus("Opened MeroShare.");
});
elements.openIpoResultButton.addEventListener("click", async () => {
  await sendBackgroundAction("open-ipo-result");
  setStatus("Opened CDSC IPO result page.");
});
elements.toggleConnectionButton.addEventListener("click", () => {
  setConnectionPanelOpen(!connectionPanelOpen);
});
elements.startOnboardingButton.addEventListener("click", async () => {
  await openAppRoute("/welcome");
  setStatus("Opened MyWallet onboarding.");
});
elements.openAppEmptyButton.addEventListener("click", async () => {
  await openAppRoute("/");
  setStatus("Opened MyWallet.");
});
elements.quickAddForm.addEventListener("submit", handleQuickAdd);
document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => setPopupTab(button.dataset.tab || "overview"));
});

document.addEventListener("DOMContentLoaded", async () => {
  elements.appUrl.value = await getStoredAppUrl();
  setPopupTab(activeTab);
  setConnectionPanelOpen(false);
  await refreshConnection();
});
