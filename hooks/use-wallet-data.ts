"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { DataIntegrityManager } from "@/lib/data-integrity"
import { SecureKeyManager } from "@/lib/key-manager"
import type {
  UserProfile,
  MeroShareApplicationLog,
  Transaction,
  Budget,
  Goal,
  DebtAccount,
  CreditAccount,
  DebtCreditTransaction,
  Category,
  Portfolio,
  PortfolioItem,
  ShareTransaction,
  UpcomingIPO,
  TopStocksData,
  MarketSummaryMetric,
  MarketSummaryHistoryItem,
  MarketStatusData,
  NepseNoticesBundle,
  NepseDisclosure,
  NepseExchangeMessage,
  SIPPlan,
} from "@/types/wallet"

import { calculateBalance, initializeDefaultCategories, calculateTimeEquivalent } from "@/lib/wallet-utils"
import { generateId } from "@/lib/utils"
import { loadFromLocalStorage, saveToLocalStorage } from "@/lib/storage"
import { updateBudgetSpendingHelper, updateGoalContributionHelper, updateCategoryStatsHelper } from "@/lib/wallet-ops"
import { calculateGoalNetSavedAmount } from "@/lib/goal-calculations"
import { SessionManager } from "@/lib/session-manager"
import { SecurePinManager } from "@/lib/secure-pin-manager"
import { parseNepaliDateRange, getIPOStatus } from "@/lib/nepali-date-utils"
import { normalizeStockSymbol } from "@/lib/stock-symbol"
import {
  getDefaultNotificationSettings,
  isAppInForeground,
  normalizeNotificationSettings,
  requestBrowserNotificationPermission,
  IN_APP_REMINDER_COOLDOWN_MS,
  REMINDER_CACHE_KEY,
  showAppNotification,
} from "@/lib/notifications"
import {
  getBrowserPushSubscriptionActive,
  getWebPushServerStatus,
  subscribeDeviceToWebPush,
} from "@/lib/push-client"
import {
  recordNotificationDelivery,
  wasRecentlyDelivered,
  type NotificationHistorySource,
} from "@/lib/notification-history"
import { calculateSipNetInvestment, formatSipDate, getSipCompletedTransactionForDueDate, getSipScheduleSummary, normalizeSipPlans } from "@/lib/sip"
import { getGoalChallengeSummary, syncGoalChallengeState } from "@/lib/goal-challenge"
import { toast } from "sonner"
import { showUndoToast } from "@/components/ui/undo-toast"

const HOUR_MS = 60 * 60 * 1000
const REMINDER_SCAN_INTERVAL_MS = 30 * 60 * 1000
const BACKGROUND_REMINDER_STARTUP_DELAY_MS = 20 * 1000
const REMOTE_PUSH_AUTO_SYNC_INTERVAL_MS = 6 * HOUR_MS
const IPO_PER_COMPANY_COOLDOWN_MS = 24 * HOUR_MS
const DELETE_UNDO_WINDOW_MS = 5000
const UNITS_EPSILON = 1e-12
const MARKET_DATA_REFRESH_INTERVAL_MS = 10 * 60 * 1000
const APP_BOOT_TS = Date.now()
const REMOTE_PUSH_AUTO_SYNC_KEY = "wallet_remote_push_auto_sync_at_v1"

// Module-level cache for portfolio prices (persists across re-renders)
let globalPortfolioCache: {
  stockPriceData: any[],
  sectorData: Record<string, string[]>,
  cryptoPrices: Record<string, any>,
  timestamp: number
} | null = null
const normalizeUnits = (value: number) => {
  if (!Number.isFinite(value)) return 0
  if (Math.abs(value) <= UNITS_EPSILON) return 0
  return Number(value.toFixed(12))
}

type TransactionDeleteSnapshot = {
  transactions: Transaction[]
  debtAccounts: DebtAccount[]
  debtCreditTransactions: DebtCreditTransaction[]
  balance: number
}

type PendingTransactionDeletion = {
  transactionId: string
  snapshot: TransactionDeleteSnapshot
  timeoutId: ReturnType<typeof setTimeout>
}

const calculateCashBalanceFromTransactions = (txs: Transaction[]) => {
  return txs.reduce((sum, tx) => {
    if (tx.type === "income") return sum + (tx.actual ?? tx.amount)
    return sum - (tx.actual ?? tx.amount)
  }, 0)
}

const normalizeGoals = (items: Goal[]) =>
  items.map((goal) => ({
    ...goal,
    updatedAt: goal.updatedAt || goal.createdAt || new Date().toISOString(),
  }))

type TombstoneRecord = {
  id: string
  deletedAt: string
}

const TOMBSTONE_KEYS = {
  transactions: "deleted_transactions",
  budgets: "deleted_budgets",
  goals: "deleted_goals",
  debtAccounts: "deleted_debtAccounts",
  creditAccounts: "deleted_creditAccounts",
  debtCreditTransactions: "deleted_debtCreditTransactions",
  categories: "deleted_categories",
  shareTransactions: "deleted_shareTransactions",
  portfolios: "deleted_portfolios",
} as const

const TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

const getCustomCategoriesOnly = (items: Category[]) => items.filter((category) => !category?.isDefault)

const mergeDefaultAndCustomCategories = (customCategories: Category[]) => {
  const normalizedCustomCategories = getCustomCategoriesOnly(customCategories)
  const defaults = initializeDefaultCategories()
  const customNameTypeKeys = new Set(
    normalizedCustomCategories.map((category) => `${category.type}:${category.name.trim().toLowerCase()}`),
  )

  const filteredDefaults = defaults.filter(
    (category) => !customNameTypeKeys.has(`${category.type}:${category.name.trim().toLowerCase()}`),
  )

  return [...filteredDefaults, ...normalizedCustomCategories]
}

const recordDeletion = async (tombstoneKey: string, ids: string[]) => {
  if (ids.length === 0) return
  try {
    const stored = await loadFromLocalStorage([tombstoneKey])
    const existing = Array.isArray(stored[tombstoneKey]) ? stored[tombstoneKey] as TombstoneRecord[] : []
    const now = new Date().toISOString()
    const cutoff = Date.now() - TOMBSTONE_RETENTION_MS
    const retained = existing.filter((entry) => Date.parse(entry.deletedAt || "") >= cutoff)
    const next = [...retained.filter((entry) => !ids.includes(entry.id))]
    ids.forEach((id) => {
      next.push({ id, deletedAt: now })
    })
    await saveToLocalStorage(tombstoneKey, next, true)
  } catch {
  }
}

const findDebtHistoryEntryIndex = (
  entries: DebtCreditTransaction[],
  transaction: Transaction,
  targetType: "charge" | "payment",
  targetAmount: number,
) => {
  if (!transaction.debtAccountId) return -1

  const linkedIdx = entries.findIndex((entry) => entry.sourceTransactionId === transaction.id)
  if (linkedIdx >= 0) return linkedIdx

  const candidates = entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) =>
      entry.accountType === "debt" &&
      entry.accountId === transaction.debtAccountId &&
      entry.type === targetType &&
      Math.abs(entry.amount - targetAmount) < 0.0001
    )

  if (candidates.length === 0) return -1

  const txTime = new Date(transaction.date).getTime()
  if (Number.isNaN(txTime)) return candidates[candidates.length - 1].index

  let best = candidates[0]
  let bestDiff = Math.abs(new Date(best.entry.date).getTime() - txTime)

  for (let i = 1; i < candidates.length; i += 1) {
    const candidate = candidates[i]
    const diff = Math.abs(new Date(candidate.entry.date).getTime() - txTime)
    if (diff < bestDiff) {
      best = candidate
      bestDiff = diff
    }
  }

  return best.index
}

const computePostDeleteState = (snapshot: TransactionDeleteSnapshot, transactionId: string) => {
  const deletedTransaction = snapshot.transactions.find((tx) => tx.id === transactionId)
  if (!deletedTransaction) {
    return {
      transactions: snapshot.transactions,
      debtAccounts: snapshot.debtAccounts,
      debtCreditTransactions: snapshot.debtCreditTransactions,
      balance: snapshot.balance,
    }
  }

  const nextTransactions = snapshot.transactions.filter((tx) => tx.id !== transactionId)
  let nextDebtAccounts = [...snapshot.debtAccounts]
  let nextDebtCreditTransactions = [...snapshot.debtCreditTransactions]

  const isRepaymentTx = deletedTransaction.status === "repayment" && Boolean(deletedTransaction.debtAccountId)
  const isDebtChargeTx =
    deletedTransaction.status === "debt" &&
    Boolean(deletedTransaction.debtAccountId) &&
    (deletedTransaction.debtUsed ?? 0) > 0

  if (isRepaymentTx) {
    const repaymentAmount = deletedTransaction.total ?? deletedTransaction.amount
    const historyIndex = findDebtHistoryEntryIndex(nextDebtCreditTransactions, deletedTransaction, "payment", repaymentAmount)

    if (historyIndex >= 0) {
      const historyEntry = nextDebtCreditTransactions[historyIndex]
      nextDebtCreditTransactions = nextDebtCreditTransactions.filter((_, index) => index !== historyIndex)
      nextDebtAccounts = nextDebtAccounts.map((account) =>
        account.id === historyEntry.accountId
          ? { ...account, balance: Math.max(0, account.balance + historyEntry.amount) }
          : account
      )
    } else if (deletedTransaction.debtAccountId) {
      nextDebtAccounts = nextDebtAccounts.map((account) =>
        account.id === deletedTransaction.debtAccountId
          ? { ...account, balance: Math.max(0, account.balance + repaymentAmount) }
          : account
      )
    }
  }

  if (isDebtChargeTx) {
    const chargeAmount = deletedTransaction.debtUsed ?? deletedTransaction.amount
    const historyIndex = findDebtHistoryEntryIndex(nextDebtCreditTransactions, deletedTransaction, "charge", chargeAmount)

    if (historyIndex >= 0) {
      const historyEntry = nextDebtCreditTransactions[historyIndex]
      nextDebtCreditTransactions = nextDebtCreditTransactions.filter((_, index) => index !== historyIndex)
      nextDebtAccounts = nextDebtAccounts.map((account) =>
        account.id === historyEntry.accountId
          ? { ...account, balance: Math.max(0, account.balance - historyEntry.amount) }
          : account
      )
    } else if (deletedTransaction.debtAccountId) {
      nextDebtAccounts = nextDebtAccounts.map((account) =>
        account.id === deletedTransaction.debtAccountId
          ? { ...account, balance: Math.max(0, account.balance - chargeAmount) }
          : account
      )
    }
  }

  // Keep behavior consistent with repayment flow: remove fully settled debt accounts.
  nextDebtAccounts = nextDebtAccounts.filter((account) => account.balance > 0)

  return {
    transactions: nextTransactions,
    debtAccounts: nextDebtAccounts,
    debtCreditTransactions: nextDebtCreditTransactions,
    balance: calculateCashBalanceFromTransactions(nextTransactions),
  }
}

const rebuildDebtAccountsFromHistory = (
  accounts: DebtAccount[],
  history: DebtCreditTransaction[],
) => {
  if (accounts.length === 0) return accounts

  return accounts
    .map((account) => {
      // Calculate balance based on originalBalance + all charges/interest - all payments
      let calculatedBalance = account.originalBalance ?? 0

      history.forEach((tx) => {
        if (tx.accountId === account.id && tx.accountType === "debt") {
          if (tx.type === "charge" || tx.type === "interest") {
            calculatedBalance += tx.amount
          } else if (tx.type === "payment") {
            calculatedBalance -= tx.amount
          }
        }
      })

      return {
        ...account,
        balance: Math.max(0, calculatedBalance),
      }
    })
    .filter((account) => account.balance > 0)
}

const readReminderCache = (): Record<string, number> => {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(REMINDER_CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch (error) {
    console.warn("Failed to read reminder cache:", error)
    return {}
  }
}

const saveReminderCache = (cache: Record<string, number>) => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(REMINDER_CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.warn("Failed to save reminder cache:", error)
  }
}

const shouldSendReminder = (cache: Record<string, number>, key: string, cooldownMs: number) => {
  const lastSentAt = cache[key] ?? 0
  return Date.now() - lastSentAt >= cooldownMs
}

const normalizeReminderText = (value?: string) =>
  (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")

const buildIpoReminderBaseKey = (ipo: UpcomingIPO) => {
  const company = normalizeReminderText(ipo.company) || "ipo"
  const openingDate = normalizeReminderText(ipo.openingDate || ipo.openingDay)
  const closingDate = normalizeReminderText(ipo.closingDate || ipo.closingDay)
  const dateRange = normalizeReminderText(ipo.date_range)

  return [company, openingDate, closingDate, dateRange]
    .filter(Boolean)
    .join("|")
}


export function useWalletData() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [debtAccounts, setDebtAccounts] = useState<DebtAccount[]>([])
  const [creditAccounts, setCreditAccounts] = useState<CreditAccount[]>([])
  const [debtCreditTransactions, setDebtCreditTransactions] = useState<DebtCreditTransaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isFirstTime, setIsFirstTime] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [balance, setBalance] = useState(0)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [emergencyFund, setEmergencyFund] = useState(0)
  const [balanceChange, setBalanceChange] = useState<{ amount: number; type: "income" | "expense" } | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [shareTransactions, setShareTransactions] = useState<ShareTransaction[]>([])
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null)
  const [sectorsMap, setSectorsMap] = useState<Record<string, string>>({})
  const [scripNamesMap, setScripNamesMap] = useState<Record<string, string>>({})
  const [upcomingIPOs, setUpcomingIPOs] = useState<UpcomingIPO[]>([])
  const [isIPOsLoading, setIsIPOsLoading] = useState(false)
  const [topStocks, setTopStocks] = useState<TopStocksData | null>(null)
  const [marketSummary, setMarketSummary] = useState<MarketSummaryMetric[]>([])
  const [marketSummaryHistory, setMarketSummaryHistory] = useState<MarketSummaryHistoryItem[]>([])
  const [marketStatus, setMarketStatus] = useState<MarketStatusData | null>(null)
  const [noticesBundle, setNoticesBundle] = useState<NepseNoticesBundle | null>(null)
  const [disclosures, setDisclosures] = useState<NepseDisclosure[]>([])
  const [exchangeMessages, setExchangeMessages] = useState<NepseExchangeMessage[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const pendingTransactionDeletionRef = useRef<PendingTransactionDeletion | null>(null)
  const userProfileRef = useRef<UserProfile | null>(null)
  const shareTransactionsRef = useRef<ShareTransaction[]>([])

  const refreshMarketData = useCallback(async () => {
    const sectorsTask = fetch("/api/nepse/sectors")
      .then(res => res.json())
      .then(data => {
        const sMap: Record<string, string> = {}
        const nMap: Record<string, string> = {}
        Object.entries(data).forEach(([sector, scrips]) => {
          if (Array.isArray(scrips)) {
            scrips.forEach((scrip: any) => {
              const symbol = normalizeStockSymbol(typeof scrip === "string" ? scrip : (scrip.symbol || ""))
              if (symbol) {
                sMap[symbol] = sector
                if (scrip.name) {
                  nMap[symbol] = scrip.name.trim()
                }
              }
            })
          }
        })
        setSectorsMap(prev => ({ ...prev, ...sMap }))
        setScripNamesMap(prev => ({ ...prev, ...nMap }))
      })

    const localNamesTask = fetch("/name.json")
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return
        const nMap: Record<string, string> = {}
        data.forEach((item: any) => {
          if (item.symbol && item.name) {
            nMap[normalizeStockSymbol(item.symbol)] = item.name.trim()
          }
        })
        setScripNamesMap(prev => ({ ...prev, ...nMap }))
        void saveToLocalStorage("scripNamesMap", nMap)
      })

    const upcomingIposTask = fetch("/api/nepse/upcoming")
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return
        const processedIPOs: UpcomingIPO[] = data.map(ipo => {
          const normalizedReservedFor =
            typeof ipo?.reserved_for === "string" ? ipo.reserved_for.trim() : ""

          const normalizedReservedFlag =
            typeof ipo?.is_reserved_share === "boolean"
              ? ipo.is_reserved_share
              : typeof ipo?.is_reserved_share === "string"
                ? ipo.is_reserved_share.trim().toLowerCase() === "true"
                : typeof ipo?.is_reserved_share === "number"
                  ? ipo.is_reserved_share === 1
                  : normalizedReservedFor.length > 0

          const baseIpo: UpcomingIPO = {
            ...ipo,
            is_reserved_share: normalizedReservedFlag,
            reserved_for: normalizedReservedFor,
          }
          const dates = parseNepaliDateRange(ipo.date_range)
          if (!dates) return baseIpo

          const statusInfo = getIPOStatus(dates.start, dates.end)
          return {
            ...baseIpo,
            ...statusInfo,
            openingDate: dates.start.toISOString(),
            closingDate: dates.end.toISOString(),
          }
        })
        setUpcomingIPOs(processedIPOs)
      })

    const topStocksTask = fetch("/api/nepse/top-stocks")
      .then(async (res) => {
        const data = await res.json()
        return {
          data,
          headerDate: res.headers.get("date"),
        }
      })
      .then(({ data, headerDate }: { data: TopStocksData; headerDate: string | null }) => {
        if (!data || typeof data !== "object") return
        const fetchedAt = headerDate && !Number.isNaN(Date.parse(headerDate))
          ? new Date(headerDate).toISOString()
          : new Date().toISOString()

        setTopStocks({
          top_gainer: Array.isArray(data.top_gainer) ? data.top_gainer : [],
          top_loser: Array.isArray(data.top_loser) ? data.top_loser : [],
          top_turnover: Array.isArray(data.top_turnover) ? data.top_turnover : [],
          top_trade: Array.isArray(data.top_trade) ? data.top_trade : [],
          top_transaction: Array.isArray(data.top_transaction) ? data.top_transaction : [],
          last_updated: typeof data.last_updated === "string" ? data.last_updated : undefined,
          fetched_at: typeof data.fetched_at === "string" ? data.fetched_at : fetchedAt,
        })
      })

    const marketSummaryTask = fetch("/api/nepse/market-summary")
      .then(res => res.json())
      .then((data: MarketSummaryMetric[]) => {
        if (Array.isArray(data)) {
          setMarketSummary(data)
        }
      })

    const marketSummaryHistoryTask = fetch("/api/nepse/market-summary/history")
      .then(res => res.json())
      .then((data: MarketSummaryHistoryItem[]) => {
        if (Array.isArray(data)) {
          setMarketSummaryHistory(data)
        }
      })

    const marketStatusTask = fetch("/api/nepse/market-status")
      .then(async (res) => {
        const data = await res.json()
        return {
          data,
          headerDate: res.headers.get("date"),
        }
      })
      .then(({ data, headerDate }: { data: any; headerDate: string | null }) => {
        if (!data || typeof data !== "object") return

        const rawStatus = typeof data.status === "string" ? data.status.trim() : ""
        const statusLower = rawStatus.toLowerCase()
        const rawIsOpen = data.is_open ?? data.market_open ?? data.open

        const isOpen = typeof rawIsOpen === "boolean"
          ? rawIsOpen
          : typeof rawIsOpen === "number"
            ? rawIsOpen === 1
            : typeof rawIsOpen === "string"
              ? ["open", "opened", "true", "1", "yes"].includes(rawIsOpen.trim().toLowerCase())
              : statusLower.includes("open")
                ? true
                : statusLower.includes("close")
                  ? false
                  : null

        const normalizedLastChecked = typeof data.last_checked === "string"
          ? data.last_checked
          : typeof data.lastCheck === "string"
            ? data.lastCheck
            : typeof data.last_updated === "string"
              ? data.last_updated
              : undefined

        const fetchedAt = headerDate && !Number.isNaN(Date.parse(headerDate))
          ? new Date(headerDate).toISOString()
          : new Date().toISOString()

        setMarketStatus({
          isOpen,
          status: rawStatus || undefined,
          last_checked: normalizedLastChecked,
          fetched_at: fetchedAt,
        })
      })

    const noticesTask = fetch("/api/nepse/notices")
      .then(res => res.json())
      .then((data: NepseNoticesBundle) => {
        if (data && typeof data === "object") {
          setNoticesBundle(data)
        }
      })

    const disclosuresTask = fetch("/api/nepse/disclosures")
      .then(res => res.json())
      .then((data: NepseDisclosure[]) => {
        if (Array.isArray(data)) {
          setDisclosures(data)
        }
      })

    const exchangeMessagesTask = fetch("/api/nepse/exchange-messages")
      .then(res => res.json())
      .then((data: NepseExchangeMessage[]) => {
        if (Array.isArray(data)) {
          setExchangeMessages(data)
        }
      })

    const results = await Promise.allSettled([
      sectorsTask,
      localNamesTask,
      upcomingIposTask,
      topStocksTask,
      marketSummaryTask,
      marketSummaryHistoryTask,
      marketStatusTask,
      noticesTask,
      disclosuresTask,
      exchangeMessagesTask,
    ])

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`Error refreshing market dataset #${index + 1}:`, result.reason)
      }
    })
  }, [])
  const normalizeAssetType = (assetType?: "stock" | "crypto") => assetType === "crypto" ? "crypto" : "stock"
  const getHoldingKey = (portfolioId: string, symbol: string, assetType?: "stock" | "crypto", cryptoId?: string) => {
    const normalizedAssetType = normalizeAssetType(assetType)
    const normalizedSymbol = normalizedAssetType === "stock"
      ? normalizeStockSymbol(symbol)
      : symbol.trim().toUpperCase()
    return `${portfolioId}::${normalizedSymbol}::${normalizedAssetType}::${(cryptoId || "").trim()}`
  }

  useEffect(() => {
    userProfileRef.current = userProfile
  }, [userProfile])

  // Auto-enable remote push subscription when share features are enabled and browser permission is already granted.
  // This keeps "Remote IPO alerts" on by default for share users without forcing permission prompts.
  useEffect(() => {
    if (!isLoaded || typeof window === "undefined") return
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return
    if (Notification.permission !== "granted") return
    if (!userProfile?.meroShare?.shareFeaturesEnabled || !userProfile?.meroShare?.shareNotificationsEnabled) return

    let cancelled = false
    const now = Date.now()

    try {
      const raw = localStorage.getItem(REMOTE_PUSH_AUTO_SYNC_KEY)
      const last = raw ? Number(raw) : 0
      if (Number.isFinite(last) && last > 0 && now - last < REMOTE_PUSH_AUTO_SYNC_INTERVAL_MS) {
        return
      }
    } catch (error) {
      console.warn("Failed to read push sync timestamp:", error)
    }

    const run = async () => {
      try {
        const active = await getBrowserPushSubscriptionActive()
        if (active) {
          localStorage.setItem(REMOTE_PUSH_AUTO_SYNC_KEY, String(Date.now()))
          return
        }
        const status = await getWebPushServerStatus()
        if (!status.ready) return
        const result = await subscribeDeviceToWebPush()
        if (cancelled || !result.ok) return
        localStorage.setItem(REMOTE_PUSH_AUTO_SYNC_KEY, String(Date.now()))
      } catch (error) {
        console.warn("Push subscription failed:", error)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [
    isLoaded,
    userProfile?.meroShare?.shareFeaturesEnabled,
    userProfile?.meroShare?.shareNotificationsEnabled,
  ])

  useEffect(() => {
    shareTransactionsRef.current = shareTransactions
  }, [shareTransactions])

  // Reminder engine: budgets, goals, and IPO windows.
  useEffect(() => {
    if (!isLoaded || typeof window === "undefined") return

    const notificationSettings = normalizeNotificationSettings(userProfile?.notificationSettings)

    if (!notificationSettings.enabled) {
      return
    }

      const runReminderScan = async () => {
        const cache = readReminderCache()
        const now = new Date()
        let emittedCount = 0
        const maxPerScan = 6
        const appInForeground = isAppInForeground()
        const allowBackgroundBrowserReminders =
          !appInForeground &&
          (document.visibilityState === "hidden" || Date.now() - APP_BOOT_TS >= BACKGROUND_REMINDER_STARTUP_DELAY_MS)

      type StoredBillReminder = {
        id: string
        name: string
        amount: number
        dueDate: string
        isPaid: boolean
        reminderDays: number
      }

      let billRows: StoredBillReminder[] = []
      try {
        const stored = await loadFromLocalStorage(["wallet_bill_reminders"])
        const raw = stored.wallet_bill_reminders
        if (Array.isArray(raw)) {
          billRows = raw.filter(
            (b): b is StoredBillReminder =>
              b &&
              typeof b === "object" &&
              typeof (b as StoredBillReminder).id === "string" &&
              typeof (b as StoredBillReminder).dueDate === "string",
          )
        }
      } catch {
      }

        const emitReminder = (
          key: string,
          title: string,
          description: string,
          browserCooldownMs: number,
          source: NotificationHistorySource,
          inAppCooldownMs = IN_APP_REMINDER_COOLDOWN_MS,
      ) => {
        if (emittedCount >= maxPerScan) return

        const inAppCacheKey = `${key}:inapp`
        const browserCacheKey = `${key}:browser`
        const historyCooldownMs = Math.max(browserCooldownMs, inAppCooldownMs)
        if (wasRecentlyDelivered(key, source, historyCooldownMs)) {
          return
        }
          const canInApp = shouldSendReminder(cache, inAppCacheKey, inAppCooldownMs)
          const canBrowser = shouldSendReminder(cache, browserCacheKey, browserCooldownMs)
          if (!canInApp && !canBrowser) return

        let didEmit = false

        if (
          canInApp &&
          notificationSettings.inAppToasts &&
          appInForeground
        ) {
          toast(title, { description, duration: 9000 })
          cache[inAppCacheKey] = Date.now()
          recordNotificationDelivery({
            dedupeKey: key,
            title,
            body: description,
            source,
            channel: "toast",
          })
          didEmit = true
        }

          if (
            canBrowser &&
            allowBackgroundBrowserReminders &&
            notificationSettings.browserNotifications &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            void showAppNotification({
            title,
            body: description,
            tag: key,
          })
          cache[browserCacheKey] = Date.now()
          recordNotificationDelivery({
            dedupeKey: key,
            title,
            body: description,
            source,
            channel: "browser",
          })
          didEmit = true
          }

          if (!didEmit) return
          // Cross-channel dedupe: if either toast or browser channel emitted,
          // cool down both channels to avoid duplicate bursts when app focus changes.
          const emittedAt = Date.now()
          cache[inAppCacheKey] = emittedAt
          cache[browserCacheKey] = emittedAt
          emittedCount += 1
        }

      // Nudge once a week to enable browser notifications.
      if (
        notificationSettings.browserNotifications &&
        notificationSettings.permissionNudges &&
        "Notification" in window &&
        Notification.permission === "default"
      ) {
        const permissionNudgeKey = "notification-permission-nudge"
        if (shouldSendReminder(cache, permissionNudgeKey, 7 * 24 * HOUR_MS)) {
          toast("Enable browser reminders", {
            description: "Get alerts for budgets, goals, bills, IPO windows, and SIP installments.",
            action: {
              label: "Enable",
              onClick: () => {
                void requestBrowserNotificationPermission()
              },
            },
            duration: 10000,
          })
          cache[permissionNudgeKey] = Date.now()
          recordNotificationDelivery({
            dedupeKey: permissionNudgeKey,
            title: "Enable browser reminders",
            body: "Get alerts for budgets, goals, bills, IPO windows, and SIP installments.",
            source: "nudge",
            channel: "toast",
          })
          emittedCount += 1
        }
      }

      // Budget reminders.
      if (notificationSettings.budgetReminders) {
        budgets
          .filter((b) => b.limit > 0)
          .forEach((budget) => {
            const usage = (budget.spent / budget.limit) * 100
            const budgetLabel = budget.name || budget.category || "Budget"
            const warningThreshold = Math.min(95, Math.max(1, (budget.alertThreshold || 0.8) * 100))
            const criticalThreshold = Math.min(99, Math.max(warningThreshold + 5, 90))

            if (usage >= 100) {
              emitReminder(
                `budget-over-${budget.id}`,
                `${budgetLabel} is over budget`,
                `Spent ${usage.toFixed(0)}% of limit. Review this budget to prevent further overspending.`,
                12 * HOUR_MS,
                "budget",
              )
            } else if (usage >= criticalThreshold) {
              emitReminder(
                `budget-critical-${budget.id}`,
                `${budgetLabel} is near limit`,
                `You've used ${usage.toFixed(0)}% of this budget. Slow spending to stay on track.`,
                24 * HOUR_MS,
                "budget",
              )
            } else if (usage >= warningThreshold) {
              emitReminder(
                `budget-warning-${budget.id}`,
                `${budgetLabel} crossed ${warningThreshold.toFixed(0)}%`,
                `You've used ${usage.toFixed(0)}% of this budget.`,
                24 * HOUR_MS,
                "budget",
              )
            }
          })
      }

      // Goal reminders.
      if (notificationSettings.goalReminders) {
        goals
          .filter((g) => g.targetAmount > 0 && g.currentAmount < g.targetAmount)
          .forEach((goal) => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100
            const date = new Date(goal.targetDate)
            if (Number.isNaN(date.getTime())) return

            const daysRemaining = Math.ceil((date.getTime() - now.getTime()) / (24 * HOUR_MS))
            const goalLabel = goal.title || goal.name || "Goal"

            if (daysRemaining < 0) {
              emitReminder(
                `goal-overdue-${goal.id}`,
                `Goal overdue: ${goalLabel}`,
                `This goal is past target date and is ${progress.toFixed(0)}% complete.`,
                24 * HOUR_MS,
                "goal",
              )
            } else if (daysRemaining <= 3) {
              emitReminder(
                `goal-due-soon-${goal.id}`,
                `Goal due soon: ${goalLabel}`,
                `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left. Progress: ${progress.toFixed(0)}%.`,
                12 * HOUR_MS,
                "goal",
              )
            } else if (daysRemaining <= 7) {
              emitReminder(
                `goal-week-left-${goal.id}`,
                `Goal deadline in ${daysRemaining} days`,
                `${goalLabel} is ${progress.toFixed(0)}% complete.`,
                24 * HOUR_MS,
                "goal",
              )
            }
          })
      }

      // IPO reminders only when share notifications are enabled.
      if (
        notificationSettings.ipoReminders &&
        userProfile?.meroShare?.shareFeaturesEnabled &&
        userProfile?.meroShare?.shareNotificationsEnabled
      ) {
        type IpoReminderCandidate = {
          companyKey: string
          company: string
          title: string
          description: string
          priority: number
          type: "closing-soon" | "open" | "opening-soon"
        }

        const ipoCandidatesByCompany = new Map<string, IpoReminderCandidate>()

        upcomingIPOs.forEach((ipo) => {
          const company = ipo.company || "IPO"
          const ipoReminderBaseKey = buildIpoReminderBaseKey(ipo)
          const companyKey = normalizeReminderText(company) || ipoReminderBaseKey
          const daysRemaining =
            ipo.daysRemaining ??
            (ipo.closingDate
              ? Math.ceil((new Date(ipo.closingDate).getTime() - now.getTime()) / (24 * HOUR_MS))
              : undefined)

          let nextCandidate: IpoReminderCandidate | null = null
          if (ipo.status === "open") {
            if (typeof daysRemaining === "number" && daysRemaining <= 1) {
              nextCandidate = {
                companyKey,
                company,
                title: `IPO closing soon: ${company}`,
                description: `Application window is closing ${daysRemaining <= 0 ? "today" : "tomorrow"}.`,
                priority: 1,
                type: "closing-soon",
              }
            } else {
              nextCandidate = {
                companyKey,
                company,
                title: `IPO is open: ${company}`,
                description: "You can apply from the Portfolio section.",
                priority: 2,
                type: "open",
              }
            }
          } else if (ipo.status === "upcoming" && typeof daysRemaining === "number" && daysRemaining <= 1) {
            nextCandidate = {
              companyKey,
              company,
              title: `IPO opening soon: ${company}`,
              description: `Subscription starts ${daysRemaining <= 0 ? "today" : "tomorrow"}.`,
              priority: 3,
              type: "opening-soon",
            }
          }

          if (!nextCandidate) return
          const existing = ipoCandidatesByCompany.get(companyKey)
          if (!existing || nextCandidate.priority < existing.priority) {
            ipoCandidatesByCompany.set(companyKey, nextCandidate)
          }
        })

        const ipoCandidates = Array.from(ipoCandidatesByCompany.values()).sort((a, b) =>
          a.priority - b.priority || a.company.localeCompare(b.company),
        )

        ipoCandidates.forEach((candidate) => {
          const companyCooldownKey = `ipo-company-${candidate.companyKey}`
          emitReminder(
            companyCooldownKey,
            candidate.title,
            candidate.description,
            IPO_PER_COMPANY_COOLDOWN_MS,
            "ipo",
            IPO_PER_COMPANY_COOLDOWN_MS,
          )
        })
      }

      if (notificationSettings.sipReminders) {
        const sipPlans = normalizeSipPlans(userProfile?.sipPlans).filter((plan) => plan.status === "active")

        sipPlans.forEach((plan) => {
          const schedule = getSipScheduleSummary(plan, shareTransactions, now)
          if (!schedule) return

          const planLabel = plan.assetName || plan.symbol || "SIP"
          const amountLabel = Number.isFinite(plan.installmentAmount)
            ? `${userProfile?.currency || "Rs."}${plan.installmentAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
            : "your selected amount"

          if (schedule.isDueToday) {
            emitReminder(
              `sip-due-today-${plan.id}`,
              `SIP due today: ${planLabel}`,
              `Your ${amountLabel} ${plan.frequency} SIP is scheduled for today.`,
              10 * HOUR_MS,
              "sip",
            )
            return
          }

          if (schedule.shouldSendUpcomingReminder) {
              emitReminder(
                `sip-upcoming-${plan.id}`,
                `SIP due in ${schedule.daysUntilNext} day${schedule.daysUntilNext === 1 ? "" : "s"}`,
                `${planLabel} is scheduled on ${formatSipDate(schedule.nextDate.toISOString())}. Keep ${amountLabel} ready.`,
                18 * HOUR_MS,
                "sip",
            )
          }

          if (schedule.isRecentlyMissed && schedule.previousDate) {
            emitReminder(
              `sip-missed-${plan.id}-${formatSipDate(schedule.previousDate.toISOString())}`,
              `SIP missed: ${planLabel}`,
              `The installment scheduled on ${formatSipDate(schedule.previousDate.toISOString())} may still be pending.`,
              24 * HOUR_MS,
              "sip",
            )
          }
        })
      }

      // Bill reminders (stored in wallet_bill_reminders).
      if (notificationSettings.billReminders) {
        const dayMs = 24 * HOUR_MS
        billRows
          .filter((b) => !b.isPaid)
          .forEach((bill) => {
            const due = new Date(bill.dueDate)
            if (Number.isNaN(due.getTime())) return
            const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / dayMs)
            const label = bill.name?.trim() || "Bill"
            const amt = Number.isFinite(bill.amount) ? bill.amount : 0
            const cur = userProfile?.currency || "Rs."
            const amountPart = amt > 0 ? `${cur}${amt.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ""

            if (daysUntilDue < 0) {
              emitReminder(
                `bill-overdue-${bill.id}`,
                `Bill overdue: ${label}`,
                amountPart ? `${amountPart} was due.` : "This bill is past its due date.",
                12 * HOUR_MS,
                "bill",
              )
            } else if (daysUntilDue === 0) {
              emitReminder(
                `bill-due-today-${bill.id}`,
                `Bill due today: ${label}`,
                amountPart ? `Amount ${amountPart}.` : "Due today.",
                18 * HOUR_MS,
                "bill",
              )
            } else {
              const lead = Math.max(1, Math.min(30, bill.reminderDays || 3))
              if (daysUntilDue > 0 && daysUntilDue <= lead) {
                emitReminder(
                  `bill-due-soon-${bill.id}`,
                  `Bill due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}: ${label}`,
                  amountPart ? `Amount ${amountPart}.` : "Check your upcoming payment.",
                  24 * HOUR_MS,
                  "bill",
                )
              }
            }
          })
      }

      saveReminderCache(cache)
    }

    void runReminderScan()
    const intervalId = window.setInterval(runReminderScan, REMINDER_SCAN_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [
    isLoaded,
    budgets,
    goals,
    upcomingIPOs,
    shareTransactions,
    userProfile?.notificationSettings,
    userProfile?.sipPlans,
    userProfile?.currency,
    userProfile?.meroShare?.shareFeaturesEnabled,
    userProfile?.meroShare?.shareNotificationsEnabled,
  ])

  // Transactions are the source of truth for holdings.
  // Keep portfolio reconciled in case older stored portfolio snapshots drift.
  useEffect(() => {
    if (!isLoaded) return
    void recomputePortfolio(shareTransactions)
  }, [isLoaded, shareTransactions])

  useEffect(() => {
    if (isLoaded) return

    loadDataWithIntegrityCheck()
  }, [isLoaded])
  // NEPSE market prefetch: only for signed-in profiles with share/portfolio features enabled
  // (avoids hitting APIs for anonymous welcome visitors and users who do not use stocks)
  useEffect(() => {
    if (!isLoaded) return
    if (!userProfile?.meroShare?.shareFeaturesEnabled) return

    setIsIPOsLoading(true)
    void refreshMarketData().finally(() => setIsIPOsLoading(false))
  }, [isLoaded, refreshMarketData, userProfile?.meroShare?.shareFeaturesEnabled, userProfile?.createdAt])

  useEffect(() => {
    if (!isLoaded) return
    if (!userProfile?.meroShare?.shareFeaturesEnabled) return

    const intervalId = window.setInterval(() => {
      setIsIPOsLoading(true)
      void refreshMarketData().finally(() => setIsIPOsLoading(false))
    }, MARKET_DATA_REFRESH_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [isLoaded, refreshMarketData, userProfile?.meroShare?.shareFeaturesEnabled])

  // Automatically refresh share and crypto prices on app load if features are enabled
  useEffect(() => {
    if (isLoaded && userProfile?.meroShare?.shareFeaturesEnabled) {
      void fetchPortfolioPrices()
    }
  }, [isLoaded, userProfile?.meroShare?.shareFeaturesEnabled])

  // Automatically update portfolio if sectors are missing but map is available
  useEffect(() => {
    if (isLoaded && sectorsMap && portfolio.length > 0) {
      const needsUpdate = portfolio.some(p => !p.sector && sectorsMap[normalizeStockSymbol(p.symbol)])
      if (needsUpdate) {
        setPortfolio(prev => prev.map(p => ({
          ...p,
          sector: p.sector || sectorsMap[normalizeStockSymbol(p.symbol)] || "Others"
        })))
      }
    }
  }, [isLoaded, sectorsMap, portfolio.length])

  // Migration to encrypted storage (legacy plaintext -> encrypted)
  useEffect(() => {
    if (isLoaded && !localStorage.getItem("encryption_v2_migrated")) {
      const migrateToEncrypted = async () => {
        try {
          const key = await SecureKeyManager.getMasterKey("")
          if (!key) {
            return
          }
          const sensitiveKeys = [
            "userProfile",
            "transactions",
            "budgets",
            "goals",
            "debtAccounts",
            "creditAccounts",
            "debtCreditTransactions",
            "categories",
            "emergencyFund",
            "portfolio",
            "shareTransactions",
            "portfolios",
            "celebratedAchievements",
          ]

          for (const storageKey of sensitiveKeys) {
            const raw = localStorage.getItem(storageKey)
            if (!raw || raw.startsWith("encrypted:")) continue

            let parsed: any = raw
            try {
              parsed = JSON.parse(raw)
            } catch (error) {
              console.warn("Failed to parse migration data:", error)
            }

            await saveToLocalStorage(storageKey, parsed, true)
          }

          localStorage.setItem("encryption_v2_migrated", "true")
        } catch (error) {
        }
      }
      migrateToEncrypted()
    }
  }, [isLoaded])
  type SaveFailureReason = "unlock_required" | "storage_full" | "unknown"

  const isQuotaExceeded = (error: unknown) => {
    if (!error) return false
    if (error instanceof DOMException) {
      return error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED"
    }
    const err = error as { name?: string; message?: string }
    if (err?.name === "QuotaExceededError") return true
    const message = err?.message || String(error)
    return message.toLowerCase().includes("quota")
  }

  const isMissingEncryptionKey = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    return message.includes("No encryption key available")
  }

  async function saveDataWithIntegrityDetailed(key: string, data: any): Promise<{ success: boolean; reason?: SaveFailureReason }> {
    const sensitiveKeys = [
      "userProfile",
      "transactions",
      "budgets",
      "goals",
      "debtAccounts",
      "creditAccounts",
      "debtCreditTransactions",
      "portfolio",
      "shareTransactions",
      "emergencyFund"
    ];
    const shouldEncrypt = sensitiveKeys.includes(key);

    try {
      await saveToLocalStorage(key, data, shouldEncrypt)

      const allData = {
        userProfile,
        transactions,
        budgets,
        goals,
        debtAccounts,
        creditAccounts,
        debtCreditTransactions,
        categories,
        emergencyFund,
        portfolio,
        shareTransactions,
        [key]: data,
      }

      await DataIntegrityManager.updateIntegrityRecord(allData)
      return { success: true }
    } catch (error) {
      if (isMissingEncryptionKey(error)) {
        return { success: false, reason: "unlock_required" }
      }
      if (isQuotaExceeded(error)) {
        return { success: false, reason: "storage_full" }
      }
      return { success: false, reason: "unknown" }
    }
  }

  async function saveDataWithIntegrity(key: string, data: any): Promise<boolean> {
    const sensitiveKeys = [
      "userProfile",
      "transactions",
      "budgets",
      "goals",
      "debtAccounts",
      "creditAccounts",
      "debtCreditTransactions",
      "portfolio",
      "shareTransactions",
      "emergencyFund"
    ];
    const shouldEncrypt = sensitiveKeys.includes(key);

    try {
      await saveToLocalStorage(key, data, shouldEncrypt)

      const allData = {
        userProfile,
        transactions,
        budgets,
        goals,
        debtAccounts,
        creditAccounts,
        debtCreditTransactions,
        categories,
        emergencyFund,
        portfolio,
        shareTransactions,
        [key]: data,
      }

      await DataIntegrityManager.updateIntegrityRecord(allData)
      return true
    } catch {
      try {
        await saveToLocalStorage(key, data, shouldEncrypt)
        return true
      } catch (e) {
        return false
      }
    }
  }

  const loadDataWithIntegrityCheck = async () => {
    try {
      if (typeof window === 'undefined') {
        setShowOnboarding(true)
        setIsAuthenticated(true)
        setIsLoaded(true)
        return
      }

      const storedData = await loadFromLocalStorage([
        "userProfile",
        "transactions",
        "budgets",
        "goals",
        "debtAccounts",
        "creditAccounts",
        "debtCreditTransactions",
        "categories",
        "emergencyFund",
        "portfolio",
        "shareTransactions",
        "portfolios",
      ])

      const parseLocalJson = <T>(key: string, fallback: T): T => {
        const raw = localStorage.getItem(key)
        if (!raw) return fallback
        try {
          return JSON.parse(raw) as T
        } catch {
          return fallback
        }
      }

      const emergencyFundRaw = storedData.emergencyFund
      const parsedData = {
        userProfile: storedData.userProfile ?? null,
        transactions: Array.isArray(storedData.transactions) ? storedData.transactions : [],
        budgets: Array.isArray(storedData.budgets) ? storedData.budgets : [],
        goals: Array.isArray(storedData.goals) ? normalizeGoals(storedData.goals) : [],
        debtAccounts: Array.isArray(storedData.debtAccounts) ? storedData.debtAccounts : [],
        creditAccounts: Array.isArray(storedData.creditAccounts) ? storedData.creditAccounts : [],
        debtCreditTransactions: Array.isArray(storedData.debtCreditTransactions) ? storedData.debtCreditTransactions : [],
        categories: Array.isArray(storedData.categories) ? storedData.categories : [],
        emergencyFund:
          typeof emergencyFundRaw === "number"
            ? emergencyFundRaw
            : Number.parseFloat(String(emergencyFundRaw ?? 0)) || 0,
        portfolio: Array.isArray(storedData.portfolio) ? storedData.portfolio : [],
        shareTransactions: Array.isArray(storedData.shareTransactions) ? storedData.shareTransactions : [],
        portfolios: Array.isArray(storedData.portfolios) ? storedData.portfolios : [],
        activePortfolioId: localStorage.getItem("activePortfolioId") || null,
        sectorsMap: parseLocalJson("sectorsMap", {} as Record<string, string>),
        scripNamesMap: parseLocalJson("scripNamesMap", {} as Record<string, string>),
      }
      const normalizedDebtAccounts = rebuildDebtAccountsFromHistory(
        parsedData.debtAccounts,
        parsedData.debtCreditTransactions,
      )

      if (parsedData.userProfile || parsedData.transactions.length > 0) {
        const validation = await DataIntegrityManager.validateAllData(parsedData)

        if (!validation.isValid) {
        } else {
        }
      }

      if (parsedData.userProfile) {
        const normalizedProfile: UserProfile = {
          ...parsedData.userProfile,
          notificationSettings: normalizeNotificationSettings(parsedData.userProfile.notificationSettings),
          sipPlans: normalizeSipPlans(parsedData.userProfile.sipPlans),
        }
        setUserProfile(normalizedProfile)
        setIsFirstTime(false)

        if (normalizedProfile.securityEnabled && normalizedProfile.pin) {
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(true)
        }

        if (
          JSON.stringify(parsedData.userProfile.notificationSettings || null) !==
          JSON.stringify(normalizedProfile.notificationSettings)
        ) {
          await saveDataWithIntegrity("userProfile", normalizedProfile)
        }
      } else {
        setShowOnboarding(true)
        setIsAuthenticated(true)
      }

      if (parsedData.transactions.length > 0) {
        setTransactions(parsedData.transactions)
        const actualBalance = parsedData.transactions.reduce((sum: number, tx: Transaction) => {
          if (tx.type === "income") {
            return sum + (tx.actual ?? tx.amount)
          } else {
            return sum - (tx.actual ?? tx.amount)
          }
        }, 0)
        setBalance(actualBalance)
      }

      setBudgets(parsedData.budgets)
      setGoals(parsedData.goals)
      setDebtAccounts(normalizedDebtAccounts)
      setCreditAccounts(parsedData.creditAccounts)
      setDebtCreditTransactions(parsedData.debtCreditTransactions)
      setEmergencyFund(parsedData.emergencyFund)
      setPortfolio(parsedData.portfolio)
      setShareTransactions(parsedData.shareTransactions)

      if (JSON.stringify(normalizedDebtAccounts) !== JSON.stringify(parsedData.debtAccounts)) {
        await saveDataWithIntegrity("debtAccounts", normalizedDebtAccounts)
      }

      setPortfolios(parsedData.portfolios)
      const finalActiveId = parsedData.activePortfolioId || (parsedData.portfolios.length > 0 ? parsedData.portfolios[0].id : null)
      setActivePortfolioId(finalActiveId)
      setSectorsMap(parsedData.sectorsMap)
      setScripNamesMap(parsedData.scripNamesMap)

      // Migration: Update existing items if they don't have portfolioId
      if (parsedData.portfolio.length > 0 && !parsedData.portfolio[0].portfolioId) {
        const updated = parsedData.portfolio.map((p: any) => ({ ...p, portfolioId: finalActiveId }))
        setPortfolio(updated)
        saveToLocalStorage("portfolio", updated)
      }

      if (parsedData.shareTransactions.length > 0 && !parsedData.shareTransactions[0].portfolioId) {
        const updated = parsedData.shareTransactions.map((t: any) => ({ ...t, portfolioId: finalActiveId }))
        setShareTransactions(updated)
        saveToLocalStorage("shareTransactions", updated)
      }

      // If we have history but no holdings, recompute
      if (parsedData.shareTransactions.length > 0 && parsedData.portfolio.length === 0) {
        const recomputed = await recomputePortfolio(parsedData.shareTransactions)
      }

      const hasAnyData = parsedData.userProfile || parsedData.transactions.length > 0 ||
        parsedData.budgets.length > 0 || parsedData.goals.length > 0
      if (parsedData.categories.length > 0) {
        setCategories(mergeDefaultAndCustomCategories(parsedData.categories))
      } else if (hasAnyData) {
        setCategories(initializeDefaultCategories())
        await saveDataWithIntegrity("categories", [])
      } else {
        setCategories([])
      }

      setIsLoaded(true)
    } catch {
      setShowOnboarding(true)
      setIsAuthenticated(true)
      setIsLoaded(true)
    }
  }

  // saveDataWithIntegrity is declared above as a hoisted function
  const handleOnboardingComplete = (profileData: UserProfile) => {
    const completeProfile = {
      ...profileData,
      securityEnabled: profileData.securityEnabled,
      notificationSettings: normalizeNotificationSettings(profileData.notificationSettings ?? getDefaultNotificationSettings()),
      sipPlans: normalizeSipPlans(profileData.sipPlans),
      createdAt: new Date().toISOString(),
    }

    setUserProfile(completeProfile)
    saveDataWithIntegrity("userProfile", completeProfile)
    setShowOnboarding(false)
    setIsFirstTime(false)
    setIsAuthenticated(true)
  }

  const addTransaction = async (transaction: Omit<Transaction, "id" | "timeEquivalent">) => {
    if (transaction.type === "income") {
      const newTransaction: Transaction = {
        ...transaction,
        id: generateId('tx'),
        timeEquivalent: userProfile ? calculateTimeEquivalent(transaction.amount, userProfile) : undefined,
        total: transaction.amount,
        actual: transaction.amount,
        debtUsed: 0,
        debtAccountId: null,
        status: "normal",
      }

      const updatedTransactions = [...transactions, newTransaction]
      setTransactions(updatedTransactions)
      setBalance(balance + transaction.amount)
      await saveDataWithIntegrity("transactions", updatedTransactions)

      return {
        transaction: newTransaction,
        budgetWarnings: [],
        needsDebtCreation: false,
        debtAmount: 0
      }
    }

    // Handle expense transactions
    const transactionAmount = transaction.amount
    const isExternalFundedExpense =
      transaction.allocationType === "credit" ||
      (transaction.allocationType === "debt" && (transaction.status === "debt" || (transaction.actual ?? 0) === 0))

    if (isExternalFundedExpense) {
      const newTransaction: Transaction = {
        ...transaction,
        id: generateId('tx'),
        timeEquivalent: userProfile ? calculateTimeEquivalent(transactionAmount, userProfile) : undefined,
        total: transactionAmount,
        actual: transaction.actual ?? 0,
        debtUsed: transaction.debtUsed ?? transactionAmount,
        debtAccountId: transaction.debtAccountId ?? null,
        status: transaction.status ?? "debt",
      }

      const updatedTransactions = [...transactions, newTransaction]
      setTransactions(updatedTransactions)
      await saveDataWithIntegrity("transactions", updatedTransactions)

      if (newTransaction.category) {
        const budgetResults = updateBudgetSpending(newTransaction.category, newTransaction.amount)
      }

      return {
        transaction: newTransaction,
        budgetWarnings: [],
        needsDebtCreation: false,
        debtAmount: 0
      }
    }

    // Check if balance is sufficient
    if (balance >= transactionAmount) {
      const newTransaction: Transaction = {
        ...transaction,
        id: generateId('tx'),
        timeEquivalent: userProfile ? calculateTimeEquivalent(transactionAmount, userProfile) : undefined,
        total: transactionAmount,
        actual: transactionAmount,
        debtUsed: 0,
        debtAccountId: null,
        status: "normal",
      }

      const updatedTransactions = [...transactions, newTransaction]
      setTransactions(updatedTransactions)
      setBalance(balance - transactionAmount)
      await saveDataWithIntegrity("transactions", updatedTransactions)

      // Handle budget spending
      if (newTransaction.category) {
        const budgetResults = updateBudgetSpending(newTransaction.category, newTransaction.amount)
      }

      if (newTransaction.allocationType === "goal" && newTransaction.allocationTarget) {
        updateGoalContribution(newTransaction.allocationTarget, newTransaction.amount)
      }

      return {
        transaction: newTransaction,
        budgetWarnings: [],
        needsDebtCreation: false,
        debtAmount: 0
      }
    } else {
      const availableBalance = balance
      const debtNeeded = transactionAmount - availableBalance

      return {
        transaction: null,
        budgetWarnings: [],
        needsDebtCreation: true,
        debtAmount: debtNeeded,
        availableBalance,
        pendingTransaction: transaction
      }
    }
  }

  const updateBudgetSpending = (category: string, amount: number) => {
    const { updatedBudgets, warnings } = updateBudgetSpendingHelper(budgets, category, amount, userProfile?.currency)
    setBudgets(updatedBudgets)
    saveToLocalStorage("budgets", updatedBudgets, true)
    return warnings
  }

  const updateGoalContribution = (goalId: string, amount: number) => {
    const updatedGoals = updateGoalContributionHelper(goals, goalId, amount, new Date().toISOString())
    setGoals(updatedGoals)
    saveToLocalStorage("goals", updatedGoals, true)
  }

  const addToEmergencyFund = (amount: number) => {
    const newEmergencyFund = emergencyFund + amount
    setEmergencyFund(newEmergencyFund)
    saveToLocalStorage("emergencyFund", newEmergencyFund.toString(), true)
  }

  const transferToGoal = async (goalId: string, amount: number) => {
    if (amount <= 0) {
      return {
        error: "Transfer amount must be greater than zero",
        success: false,
      }
    }

    if (balance < amount) {
      return {
        error: `Insufficient balance. Available: ${userProfile?.currency || "$"}${balance.toFixed(2)}, Requested: ${userProfile?.currency || "$"}${amount.toFixed(2)}`,
        success: false,
      }
    }

    const goal = goals.find((g) => g.id === goalId)
    if (!goal) {
      return {
        error: "Goal not found",
        success: false,
      }
    }

    const transferTransaction: Transaction = {
      id: generateId('tx'),
      type: "expense",
      amount: amount,
      description: `Transfer to goal: ${goal.title}`,
      category: "Goal Transfer",
      date: new Date().toISOString(),
      allocationType: "goal",
      allocationTarget: goalId,
      timeEquivalent: userProfile ? calculateTimeEquivalent(amount, userProfile) : undefined,
      total: amount,
      actual: amount,
      debtUsed: 0,
      debtAccountId: null,
      status: "normal",
    }

    const updatedTransactions = [...transactions, transferTransaction]
    setTransactions(updatedTransactions)
    await saveDataWithIntegrity("transactions", updatedTransactions)
    // Calculate balance based on actual cash flow
    const newBalance = updatedTransactions.reduce((sum: number, tx: Transaction) => {
      if (tx.type === "income") {
        return sum + (tx.actual ?? tx.amount)
      } else {
        return sum - (tx.actual ?? tx.amount)
      }
    }, 0)
    setBalance(newBalance)

    updateGoalContribution(goalId, amount)
    return {
      success: true,
      transaction: transferTransaction,
      newGoalAmount: calculateGoalNetSavedAmount(goalId, updatedTransactions),
    }
  }

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    const currentProfile = userProfileRef.current
    if (!currentProfile) return

    const previousProfile = currentProfile
    const updatedProfile = {
      ...currentProfile,
      ...updates,
      notificationSettings: normalizeNotificationSettings({
        ...currentProfile.notificationSettings,
        ...(updates.notificationSettings || {}),
      }),
      sipPlans: normalizeSipPlans(updates.sipPlans ?? currentProfile.sipPlans),
    }
    userProfileRef.current = updatedProfile
    setUserProfile(updatedProfile)
    void (async () => {
      const result = await saveDataWithIntegrityDetailed("userProfile", updatedProfile)
      if (!result.success) {
        userProfileRef.current = previousProfile
        setUserProfile(previousProfile)
        if (result.reason === "storage_full") {
          toast.error("Storage full", {
            description: "Profile image is too large to save. Please use a smaller image."
          })
        } else if (result.reason === "unlock_required") {
          toast.error("Unlock required", {
            description: "Please unlock your wallet to save changes."
          })
        } else {
          toast.error("Save failed", {
            description: "Unable to save profile changes. Please try again."
          })
        }
      }
    })()
  }

  const saveSipPlan = (planInput: Omit<SIPPlan, "id" | "createdAt" | "updatedAt"> & { id?: string }) => {
    const currentProfile = userProfileRef.current
    if (!currentProfile) return null

    const nowIso = new Date().toISOString()
    const existingPlans = normalizeSipPlans(currentProfile.sipPlans)
    const existingPlan = planInput.id ? existingPlans.find((plan) => plan.id === planInput.id) : undefined

    const nextPlan: SIPPlan = {
      ...existingPlan,
      ...planInput,
      id: existingPlan?.id || planInput.id || generateId("sip"),
      assetType: "stock",
      createdAt: existingPlan?.createdAt || nowIso,
      updatedAt: nowIso,
    }

    const updatedPlans = existingPlan
      ? existingPlans.map((plan) => (plan.id === nextPlan.id ? nextPlan : plan))
      : [...existingPlans, nextPlan]

    updateUserProfile({ sipPlans: updatedPlans })
    return nextPlan
  }

  const deleteSipPlan = async (id: string) => {
    const currentProfile = userProfileRef.current
    if (!currentProfile) return

    const updatedPlans = normalizeSipPlans(currentProfile.sipPlans).filter((plan) => plan.id !== id)
    updateUserProfile({ sipPlans: updatedPlans })

    const currentTransactions = shareTransactionsRef.current
    const updatedTransactions = currentTransactions.map((tx) => {
      if (tx.sipPlanId !== id) return tx

      return {
        ...tx,
        sipPlanId: undefined,
        sipDueDate: undefined,
        sipNetAmount: undefined,
        sipDpsCharge: undefined,
        sipGrossAmount: undefined,
      }
    })

    shareTransactionsRef.current = updatedTransactions
    setShareTransactions(updatedTransactions)
    await saveDataWithIntegrity("shareTransactions", updatedTransactions)
  }

  // calculateTimeEquivalent is provided by lib/wallet-utils
  const addDebtAccount = (debt: Omit<DebtAccount, "id">) => {
    const newDebt: DebtAccount = {
      ...debt,
      id: generateId('debt'),
      originalBalance: debt.balance,
      totalInterestPaid: 0,
      createdAt: new Date().toISOString(),
    }

    const updatedDebts = [...debtAccounts, newDebt]
    setDebtAccounts(updatedDebts)
    saveToLocalStorage("debtAccounts", updatedDebts, true)
    return newDebt
  }

  const createDebtForTransaction = async (debtAmount: number, transactionDescription: string) => {
    return { debtAmount, transactionDescription }
  }

  const addDebtToAccount = async (debtId: string, amount: number, description?: string, category?: string) => {
    const debt = debtAccounts.find((d) => d.id === debtId)
    if (!debt) return { success: false, error: 'Debt account not found' }

    const debtAdditionTransactionId = generateId('tx')
    const debtCharge: DebtCreditTransaction = {
      id: generateId('debt_tx'),
      accountId: debtId,
      accountType: 'debt',
      type: 'charge',
      amount,
      description: description || `Added to ${debt?.name || 'debt'}`,
      date: new Date().toISOString(),
      balanceAfter: debt.balance + amount,
      sourceTransactionId: debtAdditionTransactionId,
    }

    const updatedDebtTransactions = [...debtCreditTransactions, debtCharge]
    setDebtCreditTransactions(updatedDebtTransactions)
    saveToLocalStorage('debtCreditTransactions', updatedDebtTransactions, true)

    // Rebuild debt accounts from updated history - this ensures balance is derived
    const updatedDebts = rebuildDebtAccountsFromHistory(debtAccounts, updatedDebtTransactions)
    setDebtAccounts(updatedDebts)
    saveToLocalStorage('debtAccounts', updatedDebts, true)

    // Also create a regular transaction for main transactions list
    const debtAdditionTransaction: Transaction = {
      id: debtAdditionTransactionId,
      type: "expense",
      amount,
      description: `Added to debt: ${debt?.name || 'debt'}`,
      category: category || "Debt",
      date: new Date().toISOString(),
      timeEquivalent: userProfile ? calculateTimeEquivalent(amount, userProfile) : undefined,
      total: amount,
      actual: 0,
      debtUsed: amount,
      debtAccountId: debtId,
      status: "debt",
    }

    const updatedTransactions = [...transactions, debtAdditionTransaction]
    setTransactions(updatedTransactions)
    await saveDataWithIntegrity("transactions", updatedTransactions)

    return { success: true, transaction: debtCharge }
  }

  const completeTransactionWithDebt = async (
    pendingTransaction: Omit<Transaction, "id" | "timeEquivalent">,
    debtAccountName: string,
    debtAccountId: string,
    availableBalance: number,
    debtAmount: number
  ) => {
    // Set balance to 0 when all available balance is used
    const newBalance = 0
    setBalance(newBalance)


    // Create debt transaction record
    const newTransaction: Transaction = {
      ...pendingTransaction,
      id: generateId('tx'),
      timeEquivalent: userProfile ? calculateTimeEquivalent(pendingTransaction.amount, userProfile) : undefined,
      total: pendingTransaction.amount,
      actual: availableBalance,
      debtUsed: debtAmount,
      debtAccountId: debtAccountId,
      status: "debt",
    }

    const updatedTransactions = [...transactions, newTransaction]
    setTransactions(updatedTransactions)
    await saveDataWithIntegrity("transactions", updatedTransactions)

    // Handle budget spending
    if (newTransaction.category) {
      const budgetResults = updateBudgetSpending(newTransaction.category, newTransaction.amount)
    }

    if (newTransaction.allocationType === "goal" && newTransaction.allocationTarget) {
      updateGoalContribution(newTransaction.allocationTarget, newTransaction.amount)
    }

    return {
      transaction: newTransaction,
      newBalance,
      debtAccountId
    }
  }

  const addCreditAccount = (credit: Omit<CreditAccount, "id">) => {
    const newCredit: CreditAccount = {
      ...credit,
      id: generateId('credit'),
      availableCredit: credit.creditLimit - credit.balance,
      utilizationRate: (credit.balance / credit.creditLimit) * 100,
      createdAt: new Date().toISOString(),
    }

    const updatedCredits = [...creditAccounts, newCredit]
    setCreditAccounts(updatedCredits)
    saveToLocalStorage("creditAccounts", updatedCredits, true)
    return newCredit
  }

  const updateCreditBalance = (creditId: string, newBalance: number) => {
    const updatedCredits = creditAccounts.map((credit) => {
      if (credit.id === creditId) {
        return {
          ...credit,
          balance: newBalance,
          availableCredit: credit.creditLimit - newBalance,
          utilizationRate: (newBalance / credit.creditLimit) * 100,
        }
      }
      return credit
    })

    setCreditAccounts(updatedCredits)
    saveToLocalStorage("creditAccounts", updatedCredits, true)
  }

  const makeDebtPayment = async (debtId: string, paymentAmount: number) => {
    if (balance < paymentAmount) {
      return {
        error: "Insufficient balance for debt payment",
        success: false,
      }
    }

    const debt = debtAccounts.find((d) => d.id === debtId)
    if (!debt) {
      return {
        error: "Debt account not found",
        success: false,
      }
    }

    const paymentTransactionId = generateId('tx')
    const paymentTransaction: Transaction = {
      id: paymentTransactionId,
      type: "expense",
      amount: paymentAmount,
      description: `Debt payment: ${debt.name}`,
      category: "Debt Payment",
      date: new Date().toISOString(),
      timeEquivalent: userProfile ? calculateTimeEquivalent(paymentAmount, userProfile) : undefined,
      total: paymentAmount,
      actual: paymentAmount,
      debtUsed: 0,
      debtAccountId: debtId,
      status: "repayment",
    }

    const updatedTransactions = [...transactions, paymentTransaction]
    setTransactions(updatedTransactions)
    await saveDataWithIntegrity("transactions", updatedTransactions)
    // Calculate balance based on actual cash flow
    const newBalance = updatedTransactions.reduce((sum: number, tx: Transaction) => {
      if (tx.type === "income") {
        return sum + (tx.actual ?? tx.amount)
      } else {
        return sum - (tx.actual ?? tx.amount)
      }
    }, 0)
    setBalance(newBalance)

    const debtTransaction: DebtCreditTransaction = {
      id: generateId('debt_tx'),
      accountId: debtId,
      accountType: "debt",
      type: "payment",
      amount: paymentAmount,
      description: `Payment towards ${debt.name}`,
      date: new Date().toISOString(),
      balanceAfter: Math.max(0, debt.balance - paymentAmount),
      sourceTransactionId: paymentTransactionId,
    }

    const updatedDebtTransactions = [...debtCreditTransactions, debtTransaction]

    // If balanceAfter is zero (calculated locally first), add congratulatory record
    let finalDebtTransactions = updatedDebtTransactions
    const currentCalculatedBalance = Math.max(0, debt.balance - paymentAmount)

    if (currentCalculatedBalance === 0) {
      const congrats: DebtCreditTransaction = {
        id: generateId('debt_tx'),
        accountId: debtId,
        accountType: 'debt',
        type: 'closed',
        amount: 0,
        description: `Debt ${debt.name} fully repaid. Congratulations!`,
        date: new Date().toISOString(),
        balanceAfter: 0,
      }
      finalDebtTransactions = [...updatedDebtTransactions, congrats]
    }

    setDebtCreditTransactions(finalDebtTransactions)
    saveToLocalStorage("debtCreditTransactions", finalDebtTransactions, true)

    // Rebuild debt accounts from updated history - this ensures balance is derived
    const updatedDebts = rebuildDebtAccountsFromHistory(debtAccounts, finalDebtTransactions)
    setDebtAccounts(updatedDebts)
    saveToLocalStorage("debtAccounts", updatedDebts, true)

    return {
      success: true,
      transaction: paymentTransaction,
      newBalance: Math.max(0, debt.balance - paymentAmount),
    }
  }

  const addBudget = async (budget: Omit<Budget, "id">) => {
    const newBudget: Budget = {
      ...budget,
      id: generateId('budget'),
      spent: 0,
      category: budget.categories[0] || "General",
      alertThreshold: 0.8,
      allowDebt: false,
    }

    const updatedBudgets = [...budgets, newBudget]
    setBudgets(updatedBudgets)
    await saveDataWithIntegrity("budgets", updatedBudgets)
  }

  const updateBudget = async (id: string, updates: Partial<Budget>) => {
    const updatedBudgets = budgets.map((budget) => (budget.id === id ? { ...budget, ...updates } : budget))
    setBudgets(updatedBudgets)
    await saveDataWithIntegrity("budgets", updatedBudgets)
  }

  const deleteBudget = async (id: string) => {
    const updatedBudgets = budgets.filter((budget) => budget.id !== id)
    setBudgets(updatedBudgets)
    await saveDataWithIntegrity("budgets", updatedBudgets)
    await recordDeletion(TOMBSTONE_KEYS.budgets, [id])
  }

  // Accept goal payload from UI
  const addGoal = (
    goal: Omit<Goal, "id" | "currentAmount">
  ) => {
    const createdAt = new Date().toISOString()
    const newGoal: Goal = {
      id: generateId('goal'),
      title: goal.title,
      name: goal.name || goal.title,
      targetAmount: goal.targetAmount,
      currentAmount: 0,
      targetDate: goal.targetDate,
      category: goal.category,
      priority: goal.priority,
      createdAt,
      updatedAt: createdAt,
      autoContribute: goal.autoContribute,
      contributionAmount: goal.contributionAmount,
      contributionFrequency: goal.contributionFrequency,
      description: goal.description || "",
      challengePlan: goal.challengePlan,
    }

    const updatedGoals = [...goals, newGoal]
    setGoals(updatedGoals)
    saveToLocalStorage("goals", updatedGoals, true)
    return newGoal
  }

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    const updatedAt = new Date().toISOString()
    const updatedGoals = goals.map((goal) => (goal.id === id ? { ...goal, ...updates, updatedAt } : goal))
    setGoals(updatedGoals)
    await saveDataWithIntegrity("goals", updatedGoals)
  }

  const deleteGoal = async (id: string) => {
    const updatedGoals = goals.filter((goal) => goal.id !== id)
    setGoals(updatedGoals)
    await saveDataWithIntegrity("goals", updatedGoals)
    await recordDeletion(TOMBSTONE_KEYS.goals, [id])
  }

  useEffect(() => {
    const syncTimestamp = new Date().toISOString()
    const syncedGoals = goals.map((goal) => {
      const syncedGoal = syncGoalChallengeState(goal)
      return syncedGoal === goal ? goal : { ...syncedGoal, updatedAt: syncTimestamp }
    })
    const hasChanges = syncedGoals.some((goal, index) => goal !== goals[index])
    if (!hasChanges) return

    // Use setTimeout to avoid calling setState synchronously in effect
    setTimeout(() => {
      setGoals(syncedGoals)
    }, 0)
    void saveDataWithIntegrity("goals", syncedGoals)
  }, [goals, saveDataWithIntegrity])

  const useGoalForInvestment = async (
    goalId: string,
    amount: number,
    options?: { market?: "nepal" | "uk" | "split"; notes?: string },
  ) => {
    if (amount <= 0) {
      return {
        error: "Investment amount must be greater than zero",
        success: false,
      }
    }

    const goal = goals.find((entry) => entry.id === goalId)
    if (!goal) {
      return {
        error: "Goal not found",
        success: false,
      }
    }

    const challengeSummary = getGoalChallengeSummary(goal)
    if (!challengeSummary) {
      return {
        error: "This goal does not support investment mode",
        success: false,
      }
    }

    // Use transaction-based calculation for accurate balance
    const actualGoalBalance = calculateGoalNetSavedAmount(goalId, transactions)
    if (actualGoalBalance < amount) {
      return {
        error: `Insufficient goal balance. Available: ${userProfile?.currency || "$"}${actualGoalBalance.toFixed(2)}, Requested: ${userProfile?.currency || "$"}${amount.toFixed(2)}`,
        success: false,
      }
    }

    const market = options?.market || "split"
    const completedAt = new Date().toISOString()
    const modeLabel = challengeSummary.plan.mode === "hard" ? "Hard mode" : "Easy mode"
    const marketLabel = market === "split"
      ? `${challengeSummary.utilization.nepalPercent}% Nepal / ${challengeSummary.utilization.ukPercent}% UK`
      : market === "nepal"
        ? "Nepal market"
        : "UK market"

    const investmentTransaction: Transaction = {
      id: generateId("tx"),
      type: "expense",
      amount,
      description: `Goal investment (${modeLabel}): ${goal.title} - ${marketLabel}${options?.notes ? ` - ${options.notes}` : ""}`,
      category: "Goal Investment",
      date: completedAt,
      allocationType: "goal",
      allocationTarget: goalId,
      timeEquivalent: userProfile ? calculateTimeEquivalent(amount, userProfile) : undefined,
      total: amount,
      actual: 0,
      debtUsed: 0,
      debtAccountId: null,
      status: "normal",
    }

    const pointsAwarded = challengeSummary.plan.mode === "hard"
      ? challengeSummary.utilization.hardModeRewardPoints
      : 0

    const updatedGoals = goals.map((entry) => {
      if (entry.id !== goalId) return entry

      const currentPoints = entry.challengePoints || { total: 0, history: [] }
      return {
        ...entry,
        currentAmount: challengeSummary.plan.mode === "hard"
          ? Math.max(0, entry.currentAmount - amount)
          : entry.currentAmount,
        updatedAt: completedAt,
        challengePoints: challengeSummary.plan.mode === "hard"
          ? {
              total: currentPoints.total + pointsAwarded,
              history: [
                ...currentPoints.history,
                {
                  id: generateId("goal_pts"),
                  type: "investment_reward" as const,
                  points: pointsAwarded,
                  awardedAt: completedAt,
                  description: `${marketLabel}${options?.notes ? ` - ${options.notes}` : ""}`,
                },
              ],
            }
          : currentPoints,
      }
    })

    setGoals(updatedGoals)
    await saveDataWithIntegrity("goals", updatedGoals)

    const updatedTransactions = [...transactions, investmentTransaction]
    setTransactions(updatedTransactions)
    await saveDataWithIntegrity("transactions", updatedTransactions)

    return {
      success: true,
      transaction: investmentTransaction,
      pointsAwarded,
      remainingGoalAmount: calculateGoalNetSavedAmount(goalId, updatedTransactions),
      mode: challengeSummary.plan.mode,
    }
  }

  useEffect(() => {
    return () => {
      if (pendingTransactionDeletionRef.current) {
        clearTimeout(pendingTransactionDeletionRef.current.timeoutId)
        pendingTransactionDeletionRef.current = null
      }
    }
  }, [])

  const applyWalletState = (nextState: {
    transactions: Transaction[]
    debtAccounts: DebtAccount[]
    debtCreditTransactions: DebtCreditTransaction[]
    balance: number
  }) => {
    setTransactions(nextState.transactions)
    setDebtAccounts(nextState.debtAccounts)
    setDebtCreditTransactions(nextState.debtCreditTransactions)
    setBalance(nextState.balance)
  }

  const commitWalletState = async (nextState: {
    transactions: Transaction[]
    debtAccounts: DebtAccount[]
    debtCreditTransactions: DebtCreditTransaction[]
    balance: number
  }) => {
    await saveDataWithIntegrity("transactions", nextState.transactions)
    await saveDataWithIntegrity("debtAccounts", nextState.debtAccounts)
    await saveDataWithIntegrity("debtCreditTransactions", nextState.debtCreditTransactions)
  }

  const finalizePendingTransactionDeletion = async (transactionId: string) => {
    const pending = pendingTransactionDeletionRef.current
    if (!pending || pending.transactionId !== transactionId) return

    clearTimeout(pending.timeoutId)
    pendingTransactionDeletionRef.current = null

    const nextState = computePostDeleteState(pending.snapshot, transactionId)
    applyWalletState(nextState)
    await commitWalletState(nextState)
    await recordDeletion(TOMBSTONE_KEYS.transactions, [transactionId])
  }

  const undoPendingTransactionDeletion = (transactionId: string) => {
    const pending = pendingTransactionDeletionRef.current
    if (!pending || pending.transactionId !== transactionId) return

    clearTimeout(pending.timeoutId)
    pendingTransactionDeletionRef.current = null
    applyWalletState({
      transactions: pending.snapshot.transactions,
      debtAccounts: pending.snapshot.debtAccounts,
      debtCreditTransactions: pending.snapshot.debtCreditTransactions,
      balance: pending.snapshot.balance,
    })
    toast.success("Transaction restored", {
      description: "Your transaction has been successfully recovered.",
      icon: "↩️",
    })
  }

  const deleteTransaction = async (id: string) => {
    const transactionExists = transactions.some((transaction) => transaction.id === id)
    if (!transactionExists) return

    if (pendingTransactionDeletionRef.current) {
      await finalizePendingTransactionDeletion(pendingTransactionDeletionRef.current.transactionId)
    }

    const snapshot: TransactionDeleteSnapshot = {
      transactions: [...transactions],
      debtAccounts: [...debtAccounts],
      debtCreditTransactions: [...debtCreditTransactions],
      balance,
    }

    const nextState = computePostDeleteState(snapshot, id)
    applyWalletState(nextState)

    const timeoutId = setTimeout(() => {
      void finalizePendingTransactionDeletion(id)
    }, DELETE_UNDO_WINDOW_MS)

    pendingTransactionDeletionRef.current = {
      transactionId: id,
      snapshot,
      timeoutId,
    }

    showUndoToast({
      message: "Transaction deleted",
      description: "You can undo this action if it was a mistake.",
      onUndo: () => undoPendingTransactionDeletion(id),
      duration: DELETE_UNDO_WINDOW_MS,
      type: "delete",
    })
  }

  const isTransactionEditable = (tx: Transaction) => {
    if (tx.status === "repayment" || tx.status === "debt") return false
    if (
      tx.allocationType === "credit" ||
      tx.allocationType === "debt" ||
      tx.allocationType === "fastdebt" ||
      tx.allocationType === "debt_loan"
    ) return false
    return true
  }

  const updateTransaction = async (
    id: string,
    updates: Partial<Pick<Transaction, "amount" | "description" | "category" | "date" | "subcategory">>,
  ): Promise<{ success: boolean; transaction?: Transaction; error?: string }> => {
    if (pendingTransactionDeletionRef.current) {
      await finalizePendingTransactionDeletion(pendingTransactionDeletionRef.current.transactionId)
    }

    const old = transactions.find((t) => t.id === id)
    if (!old) return { success: false, error: "Transaction not found" }
    if (!isTransactionEditable(old)) {
      return {
        success: false,
        error:
          "This transaction is linked to debt or credit in a way that cannot be edited safely here. Delete it and add a new one if you need to change it.",
      }
    }

    const amount = updates.amount ?? old.amount
    const description = (updates.description ?? old.description).trim()
    const category = (updates.category ?? old.category).trim()
    const date =
      updates.date !== undefined
        ? new Date(`${updates.date}T12:00:00`).toISOString()
        : old.date
    const subcategory =
      updates.subcategory !== undefined
        ? updates.subcategory === ""
          ? undefined
          : updates.subcategory
        : old.subcategory

    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: "Amount must be greater than zero" }
    }
    if (!description) return { success: false, error: "Description is required" }
    if (!category) return { success: false, error: "Category is required" }

    const postDelete = computePostDeleteState(
      { transactions, debtAccounts, debtCreditTransactions, balance },
      id,
    )

    let nextBudgets = budgets
    const applyBudgetDelta = (cat: string, delta: number) => {
      if (!cat || delta === 0) return
      const { updatedBudgets } = updateBudgetSpendingHelper(nextBudgets, cat, delta, userProfile?.currency)
      nextBudgets = updatedBudgets
    }

    let nextGoals = goals

    const oldGoalSpend =
      old.type === "expense" && old.allocationType === "goal" && (old.actual ?? 0) === 0 && old.allocationTarget
    const oldGoalWallet =
      old.type === "expense" && old.allocationType === "goal" && (old.actual ?? 0) > 0 && old.allocationTarget

    if (old.type === "expense" && old.category) {
      applyBudgetDelta(old.category, -old.amount)
    }

    if (oldGoalSpend && old.allocationTarget) {
      nextGoals = nextGoals.map((g) =>
        g.id === old.allocationTarget
          ? { ...g, currentAmount: g.currentAmount + old.amount, updatedAt: new Date().toISOString() }
          : g,
      )
    } else if (oldGoalWallet && old.allocationTarget) {
      nextGoals = updateGoalContributionHelper(nextGoals, old.allocationTarget, -old.amount, new Date().toISOString())
    }

    const merged: Transaction = {
      ...old,
      amount,
      description,
      category,
      date,
      subcategory,
      timeEquivalent: userProfile ? calculateTimeEquivalent(amount, userProfile) : undefined,
    }

    if (merged.type === "income") {
      merged.total = amount
      merged.actual = amount
      merged.debtUsed = 0
      merged.debtAccountId = null
      merged.status = "normal"
    } else {
      merged.status = "normal"
      merged.debtAccountId = null
      merged.debtUsed = 0
      merged.total = amount
      if (merged.allocationType === "goal" && merged.allocationTarget) {
        merged.actual = oldGoalSpend ? 0 : amount
      } else {
        merged.actual = amount
      }
    }

    const balanceWithoutOld = calculateCashBalanceFromTransactions(postDelete.transactions)
    if (merged.type === "expense") {
      const isGoalSpendRow =
        merged.allocationType === "goal" && (merged.actual ?? 0) === 0 && merged.allocationTarget
      if (isGoalSpendRow) {
        const g = nextGoals.find((x) => x.id === merged.allocationTarget)
        if (!g || g.currentAmount < merged.amount) {
          return { success: false, error: "Not enough balance in the linked goal for this amount." }
        }
      } else if (balanceWithoutOld < merged.amount) {
        return { success: false, error: "Insufficient wallet balance for this amount." }
      }
    }

    if (merged.type === "expense" && merged.category) {
      applyBudgetDelta(merged.category, merged.amount)
    }

    if (merged.type === "expense" && merged.allocationType === "goal" && merged.allocationTarget) {
      if ((merged.actual ?? 0) === 0) {
        nextGoals = nextGoals.map((g) =>
          g.id === merged.allocationTarget
            ? { ...g, currentAmount: g.currentAmount - merged.amount, updatedAt: new Date().toISOString() }
            : g,
        )
      } else {
        nextGoals = updateGoalContributionHelper(
          nextGoals,
          merged.allocationTarget,
          merged.amount,
          new Date().toISOString(),
        )
      }
    }

    const nextTransactions = [...postDelete.transactions, merged]
    const nextBalance = calculateCashBalanceFromTransactions(nextTransactions)

    setTransactions(nextTransactions)
    setBalance(nextBalance)
    setDebtAccounts(postDelete.debtAccounts)
    setDebtCreditTransactions(postDelete.debtCreditTransactions)
    if (nextBudgets !== budgets) {
      setBudgets(nextBudgets)
      await saveDataWithIntegrity("budgets", nextBudgets)
    }
    if (nextGoals !== goals) {
      setGoals(nextGoals)
      await saveDataWithIntegrity("goals", nextGoals)
    }
    await saveDataWithIntegrity("transactions", nextTransactions)
    await saveDataWithIntegrity("debtAccounts", postDelete.debtAccounts)
    await saveDataWithIntegrity("debtCreditTransactions", postDelete.debtCreditTransactions)

    return { success: true, transaction: merged }
  }

  const deleteDebtAccount = async (id: string) => {
    const updatedDebtAccounts = debtAccounts.filter((debt) => debt.id !== id)
    setDebtAccounts(updatedDebtAccounts)
    await saveDataWithIntegrity("debtAccounts", updatedDebtAccounts)
    await recordDeletion(TOMBSTONE_KEYS.debtAccounts, [id])
  }

  const deleteCreditAccount = async (id: string) => {
    const updatedCreditAccounts = creditAccounts.filter((credit) => credit.id !== id)
    setCreditAccounts(updatedCreditAccounts)
    await saveDataWithIntegrity("creditAccounts", updatedCreditAccounts)
    await recordDeletion(TOMBSTONE_KEYS.creditAccounts, [id])
  }

  const clearAllData = async () => {
    if (pendingTransactionDeletionRef.current) {
      clearTimeout(pendingTransactionDeletionRef.current.timeoutId)
      pendingTransactionDeletionRef.current = null
    }

    // Clear data integrity records
    DataIntegrityManager.clearIntegrityRecords()

    // Clear all encryption keys
    SecureKeyManager.clearAllKeys()

    // Clear all PIN and security data comprehensively
    const { SecurePinManager } = await import("@/lib/secure-pin-manager")
    SecurePinManager.clearAllSecurityData()

    // Clear current session
    SessionManager.clearSession()

    // Clear ALL localStorage data for the site
    if (typeof window !== 'undefined') {
      localStorage.clear()

      // Also clear sessionStorage if it exists
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear()
      }

      // Clear all cookies for this domain
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(";")
        for (const cookie of cookies) {
          const eqPos = cookie.indexOf("=")
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
        }
      }
    }
    setUserProfile(null)
    userProfileRef.current = null
    setTransactions([])
    setBudgets([])
    setGoals([])
    setDebtAccounts([])
    setCreditAccounts([])
    setDebtCreditTransactions([])
    setCategories([]) // Empty categories, no defaults
    setEmergencyFund(0)
    setPortfolio([])
    setShareTransactions([])
    shareTransactionsRef.current = []
    setPortfolios([])
    setActivePortfolioId(null)
    setSectorsMap({})
    setScripNamesMap({})
    setUpcomingIPOs([])
    setTopStocks(null)
    setMarketSummary([])
    setMarketSummaryHistory([])
    setMarketStatus(null)
    setNoticesBundle(null)
    setDisclosures([])
    setExchangeMessages([])
    setBalance(0)
    setBalanceChange(null)
    setIsAuthenticated(false)
    setShowOnboarding(true)
    setIsFirstTime(true)
    setIsLoaded(false)
  }

  const exportData = () => {
    if (typeof window === 'undefined') return

    const parseLocalJson = <T,>(key: string, fallback: T): T => {
      try {
        const raw = localStorage.getItem(key)
        if (!raw) return fallback
        return JSON.parse(raw) as T
      } catch {
        return fallback
      }
    }
    const customCategoriesOnly = categories.filter((category) => !category.isDefault)

    const data = {
      userProfile,
      transactions,
      budgets,
      goals,
      debtAccounts,
      creditAccounts,
      debtCreditTransactions,
      categories: customCategoriesOnly,
      emergencyFund,
      portfolio,
      shareTransactions,
      portfolios,
      activePortfolioId,
      sectorsMap: parseLocalJson("sectorsMap", {} as Record<string, string>),
      scripNamesMap: parseLocalJson("scripNamesMap", {} as Record<string, string>),
      settings: {
        showScrollbars: localStorage.getItem("wallet_show_scrollbars") !== "false",
        biometric: {
          enabled: localStorage.getItem("wallet_biometric_enabled") === "true",
          credentialId: localStorage.getItem("wallet_biometric_credential_id"),
          userId: localStorage.getItem("wallet_biometric_user_id"),
          wrappedPin: localStorage.getItem("wallet_biometric_pin_wrapped"),
          prfSalt: localStorage.getItem("wallet_biometric_prf_salt"),
        },
      },
      meta: {
        exportedAt: new Date().toISOString(),
        app: "mywallet",
      },
      exportDate: new Date().toISOString(),
      version: "2.0",
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `mywallet-backup-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const importData = async (dataOrJson: string | any, unlockPin?: string) => {
    try {
      if (typeof window !== "undefined") {
        const requiresUnlock = SecurePinManager.hasPin() && !SecureKeyManager.isKeyCacheValid()
        if (requiresUnlock) {
          if (!unlockPin?.trim()) {
            throw new Error("Wallet PIN required to restore data")
          }

          const validation = await SecurePinManager.validatePin(unlockPin)
          if (!validation.success) {
            throw new Error("Invalid wallet PIN")
          }

          const masterKey = await SecureKeyManager.getMasterKey(unlockPin)
          if (!masterKey) {
            throw new Error("Unable to unlock wallet")
          }
          SecureKeyManager.cacheSessionPin(unlockPin)
          SessionManager.createSession()
        }
      }

      const data = typeof dataOrJson === 'string' ? JSON.parse(dataOrJson) : dataOrJson

      // Validate data structure
      const hasImportableData =
        !!data.userProfile ||
        Array.isArray(data.transactions) ||
        Array.isArray(data.budgets) ||
        Array.isArray(data.goals) ||
        Array.isArray(data.debtAccounts) ||
        Array.isArray(data.creditAccounts) ||
        Array.isArray(data.debtCreditTransactions) ||
        Array.isArray(data.categories) ||
        Array.isArray(data.portfolio) ||
        Array.isArray(data.shareTransactions) ||
        Array.isArray(data.portfolios) ||
        typeof data.activePortfolioId === "string" ||
        typeof data.activePortfolioId === "object" ||
        typeof data.emergencyFund === 'number' ||
        typeof data.emergencyFund === 'string'

      if (!hasImportableData) {
        throw new Error("Invalid backup file format - no valid data to import")
      }

      const ensureSaved = async (key: string, value: any) => {
        const saved = await saveDataWithIntegrity(key, value)
        if (!saved) {
          throw new Error("Failed to save data. Please unlock your wallet and try again.")
        }
      }

      // Import user profile (only if selected)
      if (data.userProfile) {
        const normalizedImportedProfile: UserProfile = {
          ...data.userProfile,
          notificationSettings: normalizeNotificationSettings(data.userProfile.notificationSettings),
          sipPlans: normalizeSipPlans(data.userProfile.sipPlans),
        }
        setUserProfile(normalizedImportedProfile)
        await ensureSaved("userProfile", normalizedImportedProfile)

        const hasPinData = Boolean(data.userProfile.securityEnabled && data.userProfile.pin && data.userProfile.pinSalt)
        if (hasPinData) {
          localStorage.setItem("wallet_pin_hash", data.userProfile.pin)
          localStorage.setItem("wallet_pin_salt", data.userProfile.pinSalt)
        } else {
          localStorage.removeItem("wallet_pin_hash")
          localStorage.removeItem("wallet_pin_salt")
        }
      }

      // Import transactions (only if selected)
      if (data.transactions && Array.isArray(data.transactions)) {
        setTransactions(data.transactions)
        await ensureSaved("transactions", data.transactions)
        // Calculate balance based on actual cash flow
        const actualBalance = data.transactions.reduce((sum: number, tx: Transaction) => {
          if (tx.type === "income") {
            return sum + (tx.actual ?? tx.amount)
          } else {
            return sum - (tx.actual ?? tx.amount)
          }
        }, 0)
        setBalance(actualBalance)
      }

      // Import portfolio (only if selected)
      if (data.portfolio && Array.isArray(data.portfolio)) {
        setPortfolio(data.portfolio)
        await ensureSaved("portfolio", data.portfolio)
      }

      // Import share transactions
      if (data.shareTransactions && Array.isArray(data.shareTransactions)) {
        setShareTransactions(data.shareTransactions)
        await ensureSaved("shareTransactions", data.shareTransactions)
      }

      if (data.portfolios && Array.isArray(data.portfolios)) {
        setPortfolios(data.portfolios)
        await saveToLocalStorage("portfolios", data.portfolios, true)
      }

      if (Object.prototype.hasOwnProperty.call(data, "activePortfolioId")) {
        const importedActiveId = data.activePortfolioId ?? null
        setActivePortfolioId(importedActiveId)
        await saveToLocalStorage("activePortfolioId", importedActiveId)
      }

      // Import budgets (only if selected)
      if (data.budgets && Array.isArray(data.budgets)) {
        setBudgets(data.budgets)
        await ensureSaved("budgets", data.budgets)
      }

      // Import goals (only if selected)
      if (data.goals && Array.isArray(data.goals)) {
        const normalizedGoals = normalizeGoals(data.goals)
        setGoals(normalizedGoals)
        await ensureSaved("goals", normalizedGoals)
      }

      // Import debt accounts (only if selected)
      if (data.debtAccounts && Array.isArray(data.debtAccounts)) {
        const normalizedDebtAccounts = rebuildDebtAccountsFromHistory(
          data.debtAccounts,
          Array.isArray(data.debtCreditTransactions) ? data.debtCreditTransactions : [],
        )
        setDebtAccounts(normalizedDebtAccounts)
        await ensureSaved("debtAccounts", normalizedDebtAccounts)
      }

      // Import credit accounts (only if selected)
      if (data.creditAccounts && Array.isArray(data.creditAccounts)) {
        setCreditAccounts(data.creditAccounts)
        await ensureSaved("creditAccounts", data.creditAccounts)
      }

      // Import debt/credit transactions
      if (data.debtCreditTransactions && Array.isArray(data.debtCreditTransactions)) {
        setDebtCreditTransactions(data.debtCreditTransactions)
        await ensureSaved("debtCreditTransactions", data.debtCreditTransactions)
      }

      // Import categories (only if selected)
      if (data.categories && Array.isArray(data.categories)) {
        const importedCustomCategories = data.categories.filter((category: any) => !category?.isDefault)
        setCategories(mergeDefaultAndCustomCategories(importedCustomCategories))
        await ensureSaved("categories", importedCustomCategories)
      }

      // Import emergency fund (only if selected)
      if (typeof data.emergencyFund === 'number' || typeof data.emergencyFund === 'string') {
        const emergencyFundValue = Number.parseFloat(data.emergencyFund.toString()) || 0
        setEmergencyFund(emergencyFundValue)
        await ensureSaved("emergencyFund", emergencyFundValue)
      }

      // Import scrollbar setting (only if userProfile is imported)
      if (data.settings?.showScrollbars !== undefined && data.userProfile && typeof window !== 'undefined') {
        localStorage.setItem("wallet_show_scrollbars", data.settings.showScrollbars.toString())
      }

      // Import biometric security setting (only if userProfile is imported)
      if (data.userProfile && data.settings?.biometric && typeof data.settings.biometric === "object" && typeof window !== "undefined") {
        const biometric = data.settings.biometric
        if (biometric.enabled === true) {
          localStorage.setItem("wallet_biometric_enabled", "true")
          if (typeof biometric.credentialId === "string" && biometric.credentialId) {
            localStorage.setItem("wallet_biometric_credential_id", biometric.credentialId)
          }
          if (typeof biometric.userId === "string" && biometric.userId) {
            localStorage.setItem("wallet_biometric_user_id", biometric.userId)
          }
          if (typeof biometric.wrappedPin === "string" && biometric.wrappedPin) {
            localStorage.setItem("wallet_biometric_pin_wrapped", biometric.wrappedPin)
          }
          if (typeof biometric.prfSalt === "string" && biometric.prfSalt) {
            localStorage.setItem("wallet_biometric_prf_salt", biometric.prfSalt)
          }
        } else if (biometric.enabled === false) {
          localStorage.removeItem("wallet_biometric_enabled")
          localStorage.removeItem("wallet_biometric_credential_id")
          localStorage.removeItem("wallet_biometric_user_id")
          localStorage.removeItem("wallet_biometric_pin_wrapped")
          localStorage.removeItem("wallet_biometric_prf_salt")
        }
      }

      if (data.sectorsMap && typeof data.sectorsMap === "object") {
        setSectorsMap(data.sectorsMap)
        await saveToLocalStorage("sectorsMap", data.sectorsMap)
      }

      if (data.scripNamesMap && typeof data.scripNamesMap === "object") {
        setScripNamesMap(data.scripNamesMap)
        await saveToLocalStorage("scripNamesMap", data.scripNamesMap)
      }

      return true
    } catch (_error) {
      return false
    }
  }

  const refreshData = () => {
    if (typeof window === 'undefined') return

    void (async () => {
      try {
        const latest = await loadFromLocalStorage(["budgets", "goals", "transactions", "categories"])

        if (Array.isArray(latest.budgets)) {
          setBudgets(latest.budgets)
        }

        if (Array.isArray(latest.goals)) {
          setGoals(latest.goals)
        }

        if (Array.isArray(latest.transactions)) {
          const parsedTransactions = latest.transactions
          setTransactions(parsedTransactions)
          const actualBalance = parsedTransactions.reduce((sum: number, tx: Transaction) => {
            if (tx.type === "income") {
              return sum + (tx.actual ?? tx.amount)
            } else {
              return sum - (tx.actual ?? tx.amount)
            }
          }, 0)
          setBalance(actualBalance)
        }

        if (Array.isArray(latest.categories)) {
          setCategories(mergeDefaultAndCustomCategories(latest.categories))
        }

        const savedSectors = localStorage.getItem("sectorsMap")
        const savedNames = localStorage.getItem("scripNamesMap")
        if (savedSectors) setSectorsMap(JSON.parse(savedSectors))
        if (savedNames) setScripNamesMap(JSON.parse(savedNames))
      } catch (error) { }
    })()
  }

  const spendFromGoal = async (goalId: string, amount: number, description: string, category?: string) => {
    if (amount <= 0) {
      return {
        error: "Spend amount must be greater than zero",
        success: false,
      }
    }

    const goal = goals.find((g) => g.id === goalId)
    if (!goal) {
      return {
        error: "Goal not found",
        success: false,
      }
    }

    // Use transaction-based calculation for accurate balance
    const actualGoalBalance = calculateGoalNetSavedAmount(goalId, transactions)
    if (actualGoalBalance < amount) {
      return {
        error: `Insufficient goal balance. Available: ${userProfile?.currency || "$"}${actualGoalBalance.toFixed(2)}, Requested: ${userProfile?.currency || "$"}${amount.toFixed(2)}`,
        success: false,
      }
    }

    const spendTransaction: Transaction = {
      id: generateId('tx'),
      type: "expense",
      amount: amount,
      description: `${goal.title || goal.name || "Goal"}: ${description}`,
      category: category || "Goal Spending",
      date: new Date().toISOString(),
      allocationType: "goal",
      allocationTarget: goalId,
      timeEquivalent: userProfile ? calculateTimeEquivalent(amount, userProfile) : undefined,
      total: amount,
      actual: 0,
      debtUsed: 0,
      debtAccountId: null,
      status: "normal",
    }

    const updatedGoals = goals.map((g) => {
      if (g.id === goalId) {
        return { ...g, currentAmount: g.currentAmount - amount, updatedAt: new Date().toISOString() }
      }
      return g
    })

    setGoals(updatedGoals)
    await saveDataWithIntegrity("goals", updatedGoals)

    const updatedTransactions = [...transactions, spendTransaction]
    setTransactions(updatedTransactions)
    await saveDataWithIntegrity("transactions", updatedTransactions)


    return {
      success: true,
      transaction: spendTransaction,
      remainingGoalAmount: calculateGoalNetSavedAmount(goalId, updatedTransactions),
    }
  }

  /**
   * Transfer money from a Goal to main balance as income
   * Deducts from goal and creates an income transaction
   */
  const addFromGoal = async (goalId: string, amount: number, description: string, category?: string) => {
    if (amount <= 0) {
      return {
        error: "Amount must be greater than zero",
        success: false,
      }
    }

    const goal = goals.find((g) => g.id === goalId)
    if (!goal) {
      return {
        error: "Goal not found",
        success: false,
      }
    }

    // Use transaction-based calculation for accurate balance
    const actualGoalBalance = calculateGoalNetSavedAmount(goalId, transactions)
    if (actualGoalBalance < amount) {
      return {
        error: `Insufficient goal balance. Available: ${userProfile?.currency || "$"}${actualGoalBalance.toFixed(2)}, Requested: ${userProfile?.currency || "$"}${amount.toFixed(2)}`,
        success: false,
      }
    }

    // Create transaction to record the transfer FROM goal TO main balance
    // actual: 0 marks this as "spending" from the goal perspective
    const incomeTransaction: Transaction = {
      id: generateId('tx'),
      type: "income",
      amount: amount,
      description: `${goal.title || goal.name || "Goal"}: ${description}`,
      category: category || "Goal Transfer",
      date: new Date().toISOString(),
      allocationType: "goal_transfer",
      allocationTarget: goalId,
      timeEquivalent: userProfile ? calculateTimeEquivalent(amount, userProfile) : undefined,
      total: amount,
      actual: 0, // actual: 0 means this counts as spending from the goal
      debtUsed: 0,
      debtAccountId: null,
      status: "normal",
    }

    const updatedTransactions = [...transactions, incomeTransaction]
    setTransactions(updatedTransactions)
    await saveDataWithIntegrity("transactions", updatedTransactions)

    // Update balance - add income amount to main balance
    const newBalance = balance + amount
    setBalance(newBalance)
    await saveDataWithIntegrity("balance", newBalance)

    return {
      success: true,
      transaction: incomeTransaction,
      remainingGoalAmount: calculateGoalNetSavedAmount(goalId, updatedTransactions),
    }
  }

  /**
   * Add money to main balance from a Debt account (take a loan)
   * Increases debt balance and creates an income transaction
   */
  const addFromDebt = async (debtAccountId: string, amount: number, description: string, category?: string) => {
    if (amount <= 0) {
      return {
        error: "Amount must be greater than zero",
        success: false,
      }
    }

    const debtAccount = debtAccounts.find((d) => d.id === debtAccountId)
    if (!debtAccount) {
      return {
        error: "Debt account not found",
        success: false,
      }
    }

    const incomeTransaction: Transaction = {
      id: generateId('tx'),
      type: "income",
      amount: amount,
      description: `Debt transfer from ${debtAccount.name} to main balance`,
      category: category || "Debt Loan",
      date: new Date().toISOString(),
      allocationType: "debt_loan",
      allocationTarget: debtAccountId,
      timeEquivalent: userProfile ? calculateTimeEquivalent(amount, userProfile) : undefined,
      total: amount,
      actual: amount,
      debtUsed: 0,
      debtAccountId: debtAccountId,
      status: "normal",
    }

    const updatedDebtAccounts = debtAccounts.map((d) => {
      if (d.id === debtAccountId) {
        return { ...d, balance: d.balance + amount, updatedAt: new Date().toISOString() }
      }
      return d
    })

    setDebtAccounts(updatedDebtAccounts)
    await saveDataWithIntegrity("debtAccounts", updatedDebtAccounts)

    // Create debt credit transaction entry for history
    const newDebtBalance = debtAccount.balance + amount
    const debtCharge: DebtCreditTransaction = {
      id: generateId('debt-tx'),
      accountId: debtAccountId,
      accountType: "debt",
      type: "charge",
      amount: amount,
      date: incomeTransaction.date,
      description: `Loan from ${debtAccount.name} to main balance`,
      balanceAfter: newDebtBalance,
      sourceTransactionId: incomeTransaction.id,
    }

    const updatedDebtTransactions = [...debtCreditTransactions, debtCharge]
    setDebtCreditTransactions(updatedDebtTransactions)
    await saveDataWithIntegrity("debtCreditTransactions", updatedDebtTransactions)

    const updatedTransactions = [...transactions, incomeTransaction]
    setTransactions(updatedTransactions)
    await saveDataWithIntegrity("transactions", updatedTransactions)

    // Update balance - add income amount to main balance
    const newBalance = balance + amount
    setBalance(newBalance)
    await saveDataWithIntegrity("balance", newBalance)

    return {
      success: true,
      transaction: incomeTransaction,
    }
  }

  // initializeDefaultCategories provided by lib/wallet-utils

  const addCategory = (category: Omit<Category, "id" | "createdAt" | "totalSpent" | "transactionCount">) => {
    const newCategory: Category = {
      ...category,
      id: generateId('category'),
      createdAt: new Date().toISOString(),
      totalSpent: 0,
      transactionCount: 0,
    }

    const updatedCategories = [...categories, newCategory]
    setCategories(updatedCategories)
    saveDataWithIntegrity("categories", getCustomCategoriesOnly(updatedCategories))
    return newCategory
  }

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const updatedCategories = categories.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat))
    setCategories(updatedCategories)
    await saveDataWithIntegrity("categories", getCustomCategoriesOnly(updatedCategories))
  }

  const deleteCategory = async (id: string) => {
    const updatedCategories = categories.filter((cat) => cat.id !== id)
    setCategories(updatedCategories)
    await saveDataWithIntegrity("categories", getCustomCategoriesOnly(updatedCategories))
    await recordDeletion(TOMBSTONE_KEYS.categories, [id])
  }

  const updateCategoryStats = async () => {
    const updatedCategories = categories.map((category) => {
      const categoryTransactions = transactions.filter((t) => t.category === category.name)
      const totalSpent = categoryTransactions.reduce((sum, t) => sum + t.amount, 0)

      return {
        ...category,
        totalSpent,
        transactionCount: categoryTransactions.length,
      }
    })

    setCategories(updatedCategories)
    await saveDataWithIntegrity("categories", getCustomCategoriesOnly(updatedCategories))
  }

  const addPortfolioItem = async (item: Omit<PortfolioItem, "id">) => {
    const newItem: PortfolioItem = {
      ...item,
      assetType: normalizeAssetType(item.assetType),
      cryptoId: item.cryptoId?.trim() || undefined,
      id: generateId('port'),
      lastUpdated: new Date().toISOString(),
    }
    const updatedPortfolio = [...portfolio, newItem]
    setPortfolio(updatedPortfolio)
    await saveDataWithIntegrity("portfolio", updatedPortfolio)
    return newItem
  }

  const updatePortfolioItem = async (id: string, updates: Partial<PortfolioItem>) => {
    const updatedPortfolio = portfolio.map((item) =>
      item.id === id ? { ...item, ...updates, lastUpdated: new Date().toISOString() } : item
    )
    setPortfolio(updatedPortfolio)
    await saveDataWithIntegrity("portfolio", updatedPortfolio)
  }

  const deletePortfolioItem = async (id: string) => {
    const itemToDelete = portfolio.find((item) => item.id === id)
    if (!itemToDelete) return

    const currentProfile = userProfileRef.current
    const itemSymbol = normalizeStockSymbol(itemToDelete.symbol)

    // Delete any SIP plans for this stock and unlink their transactions
    if (currentProfile) {
      const sipPlans = normalizeSipPlans(currentProfile.sipPlans)
      const plansToDelete = sipPlans.filter(
        (plan) =>
          plan.portfolioId === itemToDelete.portfolioId &&
          normalizeStockSymbol(plan.symbol) === itemSymbol
      )

      for (const plan of plansToDelete) {
        await deleteSipPlan(plan.id)
      }
    }

    const itemKey = getHoldingKey(
      itemToDelete.portfolioId,
      itemToDelete.symbol,
      itemToDelete.assetType,
      itemToDelete.cryptoId,
    )
    const removedShareIds = shareTransactions
      .filter((t) => getHoldingKey(t.portfolioId, t.symbol, t.assetType, t.cryptoId) === itemKey)
      .map((t) => t.id)
    const updatedTransactions = shareTransactions.filter((t) =>
      getHoldingKey(t.portfolioId, t.symbol, t.assetType, t.cryptoId) !== itemKey
    )
    setShareTransactions(updatedTransactions)
    await saveDataWithIntegrity("shareTransactions", updatedTransactions)
    await recordDeletion(TOMBSTONE_KEYS.shareTransactions, removedShareIds)
    await recomputePortfolio(updatedTransactions)
  }

  const toggleZeroHolding = async (itemId: string, keep: boolean) => {
    const item = portfolio.find((p) => p.id === itemId)
    if (!item) return

    // If keep is false, mark as explicitly removed (false)
    // If keep is true, mark as kept (true)
    const updatedPortfolio = portfolio.map((p) =>
      p.id === itemId ? { ...p, isKeptZeroHolding: keep } : p
    )
    setPortfolio(updatedPortfolio)
    await saveDataWithIntegrity("portfolio", updatedPortfolio)
  }

  const addPortfolio = async (name: string, description?: string, color?: string) => {
    const newPortfolio: Portfolio = {
      id: generateId('port_list'),
      name,
      description,
      color,
      includeInTotals: true,
      isDefault: portfolios.length === 0,
      createdAt: new Date().toISOString()
    }
    const updated = [...portfolios, newPortfolio]
    setPortfolios(updated)
    await saveToLocalStorage("portfolios", updated, true)
    if (updated.length === 1) {
      setActivePortfolioId(newPortfolio.id)
      saveToLocalStorage("activePortfolioId", newPortfolio.id)
    }
    return newPortfolio
  }

  const switchPortfolio = (id: string) => {
    setActivePortfolioId(id)
    saveToLocalStorage("activePortfolioId", id)
  }

  const deletePortfolio = async (id: string) => {
    const updatedPortfolios = portfolios.filter(p => p.id !== id)


    setPortfolios(updatedPortfolios)
    await saveToLocalStorage("portfolios", updatedPortfolios, true)
    await recordDeletion(TOMBSTONE_KEYS.portfolios, [id])

    // Delete all associated items and transactions
    const updatedItems = portfolio.filter(p => p.portfolioId !== id)
    setPortfolio(updatedItems)
    await saveDataWithIntegrity("portfolio", updatedItems)

    const removedShareIds = shareTransactions.filter(t => t.portfolioId === id).map((t) => t.id)
    const updatedTxs = shareTransactions.filter(t => t.portfolioId !== id)
    setShareTransactions(updatedTxs)
    await saveDataWithIntegrity("shareTransactions", updatedTxs)
    await recordDeletion(TOMBSTONE_KEYS.shareTransactions, removedShareIds)

    if (activePortfolioId === id) {
      // If there are remaining portfolios, switch to the first one
      if (updatedPortfolios.length > 0) {
        setActivePortfolioId(updatedPortfolios[0].id)
        saveToLocalStorage("activePortfolioId", updatedPortfolios[0].id)
      } else {
        // No portfolios left, clear active portfolio
        setActivePortfolioId(null)
        saveToLocalStorage("activePortfolioId", null)
      }
    }
  }

  const updatePortfolio = async (id: string, updates: Partial<Portfolio>) => {
    const updated = portfolios.map(p => p.id === id ? { ...p, ...updates } : p)
    setPortfolios(updated)
    await saveToLocalStorage("portfolios", updated, true)
  }


  async function fetchPortfolioPrices(portfolioOverride?: PortfolioItem[], forceRefresh: boolean = false) {
    const targetPortfolio = portfolioOverride || portfolio
    if (targetPortfolio.length === 0) return

    const CACHE_DURATION = 3 * 60 * 1000
    const now = Date.now()
    const nowIso = new Date().toISOString()
    const isCryptoAsset = (item: PortfolioItem) => normalizeAssetType(item.assetType) === "crypto" || Boolean(item.cryptoId?.trim())

    const mergeUpdatedPortfolio = (base: PortfolioItem[], updated: PortfolioItem[]) => {
      if (updated.length === 0) return base
      const updatedKeySet = new Set(updated.map((item) => getHoldingKey(item.portfolioId, item.symbol, item.assetType, item.cryptoId)))
      const filteredBase = base.filter((item) => !updatedKeySet.has(getHoldingKey(item.portfolioId, item.symbol, item.assetType, item.cryptoId)))
      return [...filteredBase, ...updated]
    }

    const applyLivePrices = (
      stockPriceData: any[],
      sectorData: Record<string, string[]>,
      cryptoPrices: Record<string, any>,
      resolvedCryptoIds: Record<string, string>,
    ) => {
      const symbolToSector: Record<string, string> = {}
      const symbolToName: Record<string, string> = {}
      Object.entries(sectorData).forEach(([sector, scrips]) => {
        if (Array.isArray(scrips)) {
          scrips.forEach((scrip: any) => {
            const sym = normalizeStockSymbol(typeof scrip === 'string' ? scrip : (scrip.symbol || ""))
            if (sym) {
              symbolToSector[sym] = sector
              if (scrip.name) {
                symbolToName[sym] = scrip.name.trim()
              }
            }
          })
        }
      })

      const stockLookup = new Map<string, any>()
      if (stockPriceData.length > 0) {
        stockPriceData.forEach((s: any) => {
          const key = normalizeStockSymbol(s.symbol || s.ticker || s.scrip || "")
          const quoteName = typeof s?.name === "string" ? s.name.trim() : ""
          if (key) {
            stockLookup.set(key, s)
            if (quoteName && !symbolToName[key]) {
              symbolToName[key] = quoteName
            }
          }
        })
      }

      const updatedPortfolio: PortfolioItem[] = targetPortfolio.map((item): PortfolioItem => {
        if (isCryptoAsset(item)) {
          const resolvedId = resolvedCryptoIds[item.symbol.trim().toUpperCase()]
          const cryptoId = item.cryptoId?.trim() || resolvedId
          const coin = cryptoId ? cryptoPrices[cryptoId] : null
          if (!coin) {
            return {
              ...item,
              assetType: "crypto",
              cryptoId,
              sector: "Crypto",
            }
          }

          const ltp = Number(coin.price_usd || item.currentPrice || item.buyPrice || 0)
          const percentChange = Number(coin.percent_change_24h ?? item.percentChange ?? 0)
          const computedPrev = Number.isFinite(percentChange) && percentChange > -100
            ? ltp / (1 + (percentChange / 100))
            : item.previousClose
          const previousClose = Number(computedPrev || item.previousClose || ltp)
          const change = Number(item.change ?? (ltp - previousClose))

          return {
            ...item,
            assetType: "crypto",
            cryptoId,
            assetName: coin.name || item.assetName || item.symbol,
            currentPrice: ltp,
            previousClose,
            change,
            percentChange,
            high: item.high ?? ltp,
            low: item.low ?? ltp,
            sector: "Crypto",
            lastUpdated: nowIso,
          }
        }

        const normalizedStockSymbol = normalizeStockSymbol(item.symbol)
        const matchingStock = stockLookup.get(normalizedStockSymbol)

        const sector = symbolToSector[normalizedStockSymbol] || item.sector || "Others"

        if (matchingStock) {
          const ltp = Number(matchingStock.last_traded_price || matchingStock.ltp || matchingStock.close || matchingStock.price || item.currentPrice)
          const pc = Number(matchingStock.previous_close || matchingStock.pc || matchingStock.prev_close || item.previousClose)
          const high = Number(matchingStock.high || matchingStock.high_price || item.high)
          const low = Number(matchingStock.low || matchingStock.low_price || item.low)
          const volume = Number(matchingStock.volume || matchingStock.total_volume || item.volume)
          const change = Number(matchingStock.change || (ltp - pc) || item.change)
          const percentChange = Number(matchingStock.percent_change || matchingStock.percentChange || (pc !== 0 ? (change / pc) * 100 : 0) || item.percentChange)

          return {
            ...item,
            assetType: "stock",
            assetName: symbolToName[normalizedStockSymbol] || item.assetName || item.symbol,
            currentPrice: ltp,
            previousClose: pc,
            high,
            low,
            volume,
            change,
            percentChange,
            sector: sector,
            lastUpdated: new Date().toISOString()
          }
        }

        return {
          ...item,
          assetType: "stock",
          assetName: symbolToName[normalizedStockSymbol] || item.assetName || item.symbol,
          sector: sector
        }
      })
      return { updatedPortfolio, symbolToSector, symbolToName }
    }

    try {
      const isCacheValid = globalPortfolioCache &&
        (now - globalPortfolioCache.timestamp) < CACHE_DURATION

      if (isCacheValid && !forceRefresh && globalPortfolioCache) {
        const { updatedPortfolio, symbolToSector, symbolToName } = applyLivePrices(
          globalPortfolioCache.stockPriceData,
          globalPortfolioCache.sectorData,
          globalPortfolioCache.cryptoPrices,
          {},
        )
        const mergedPortfolio = portfolioOverride ? mergeUpdatedPortfolio(portfolio, updatedPortfolio) : updatedPortfolio

        const hasSubstantialChange = JSON.stringify(mergedPortfolio.map(({ lastUpdated, ...rest }) => rest)) !==
          JSON.stringify(portfolio.map(({ lastUpdated, ...rest }) => rest))

        if (hasSubstantialChange) {
          setPortfolio(mergedPortfolio)
          await saveDataWithIntegrity("portfolio", mergedPortfolio)
        }
        if (Object.keys(symbolToSector).length > 0) {
          setSectorsMap(prev => ({ ...prev, ...symbolToSector }))
          setScripNamesMap(prev => ({ ...prev, ...symbolToName }))
        }
        return mergedPortfolio
      }

      const stockItems = targetPortfolio.filter((item) => !isCryptoAsset(item))
      const cryptoItems = targetPortfolio.filter((item) => isCryptoAsset(item))
      const resolveNeeded = cryptoItems.filter((item) => !(item.cryptoId || "").trim())

      const resolveMissingCryptoIds = async () => {
        const MAX_CRYPTO_RESOLVE = 20
        const symbols = Array.from(
          new Set(
            resolveNeeded
              .map((item) => item.symbol.trim().toUpperCase())
              .filter(Boolean)
          )
        ).slice(0, MAX_CRYPTO_RESOLVE)

        if (symbols.length === 0) return {}

        const entries = await Promise.all(
          symbols.map(async (symbol) => {
            try {
              const response = await fetch(`/api/crypto/coinlore/resolve?symbol=${encodeURIComponent(symbol)}`, {
                signal: AbortSignal.timeout(5000)
              })
              const payload = await response.json()
              if (!response.ok) return null
              const id = payload?.id ? String(payload.id) : ""
              if (!id) return null
              return [symbol, id] as const
            } catch {
              return null
            }
          })
        )

        const resolved: Record<string, string> = {}
        entries.forEach((entry) => {
          if (entry) resolved[entry[0]] = entry[1]
        })
        return resolved
      }

      const resolvedCryptoIds = await resolveMissingCryptoIds()
      const cryptoIds = Array.from(
        new Set(
          cryptoItems
            .map((item) => (item.cryptoId || resolvedCryptoIds[item.symbol.trim().toUpperCase()] || "").trim())
            .filter(Boolean)
        )
      )

      let stockPriceData: any[] = []
      let sectorData: Record<string, string[]> = {}
      let cryptoPrices: Record<string, any> = {}
      let stockError: string | null = null
      let cryptoError: string | null = null

      await Promise.all([
        (async () => {
          if (stockItems.length === 0) return
          try {
            const [priceRes, sectorRes] = await Promise.all([
              fetch("/api/nepse/today", { signal: AbortSignal.timeout(10000) }),
              fetch("/api/nepse/sectors", { signal: AbortSignal.timeout(10000) }),
            ])
            const pricePayload = await priceRes.json()
            if (!priceRes.ok) {
              throw new Error(pricePayload?.message || pricePayload?.error || "Nepal Stock APIs are currently unavailable")
            }
            if (!Array.isArray(pricePayload)) {
              throw new Error("Received invalid data format from stock exchange")
            }
            stockPriceData = pricePayload
            if (sectorRes.ok) {
              try {
                sectorData = await sectorRes.json()
              } catch {
              }
            }
          } catch (error: any) {
            stockError = error?.message || "Failed to load stock prices"
          }
        })(),
        (async () => {
          if (cryptoIds.length === 0) return
          try {
            const response = await fetch(`/api/crypto/coinlore?ids=${cryptoIds.join(",")}`, {
              signal: AbortSignal.timeout(10000)
            })
            const payload = await response.json()
            if (!response.ok) {
              throw new Error(payload?.error || "Failed to load crypto prices")
            }
            cryptoPrices = payload?.prices && typeof payload.prices === "object" ? payload.prices : {}
          } catch (error: any) {
            cryptoError = error?.message || "Failed to load crypto prices"
          }
        })(),
      ])

      const hasStockFetchFailed = stockItems.length > 0 && stockPriceData.length === 0
      const hasCryptoFetchFailed = cryptoIds.length > 0 && Object.keys(cryptoPrices).length === 0

      if ((hasStockFetchFailed || hasCryptoFetchFailed) && globalPortfolioCache) {
        console.warn("Live price fetch failed, falling back to stale cache")
        const { updatedPortfolio, symbolToSector, symbolToName } = applyLivePrices(
          globalPortfolioCache.stockPriceData,
          globalPortfolioCache.sectorData,
          globalPortfolioCache.cryptoPrices,
          {},
        )
        const mergedPortfolio = portfolioOverride ? mergeUpdatedPortfolio(portfolio, updatedPortfolio) : updatedPortfolio
        setPortfolio(mergedPortfolio)

        if (Object.keys(symbolToSector).length > 0) {
          setSectorsMap(prev => ({ ...prev, ...symbolToSector }))
          setScripNamesMap(prev => ({ ...prev, ...symbolToName }))
        }
        return mergedPortfolio
      }

      if (stockItems.length > 0 && stockPriceData.length === 0 && cryptoIds.length === 0 && !globalPortfolioCache) {
        throw new Error(stockError || "Stock prices are currently unavailable")
      }
      if (cryptoIds.length > 0 && Object.keys(cryptoPrices).length === 0 && stockItems.length === 0 && !globalPortfolioCache) {
        throw new Error(cryptoError || "Crypto prices are currently unavailable")
      }
      if (hasStockFetchFailed && hasCryptoFetchFailed && !globalPortfolioCache) {
        throw new Error(stockError || cryptoError || "Price services are currently unavailable")
      }

      globalPortfolioCache = {
        stockPriceData,
        sectorData,
        cryptoPrices,
        timestamp: now,
      }

      const { updatedPortfolio, symbolToSector, symbolToName } = applyLivePrices(
        stockPriceData,
        sectorData,
        cryptoPrices,
        resolvedCryptoIds,
      )
      const mergedPortfolio = portfolioOverride ? mergeUpdatedPortfolio(portfolio, updatedPortfolio) : updatedPortfolio

      setPortfolio(mergedPortfolio)
      if (Object.keys(symbolToSector).length > 0) {
        setSectorsMap(prev => ({ ...prev, ...symbolToSector }))
        setScripNamesMap(prev => ({ ...prev, ...symbolToName }))
        saveToLocalStorage("sectorsMap", symbolToSector)
        saveToLocalStorage("scripNamesMap", symbolToName)
      }
      await saveDataWithIntegrity("portfolio", mergedPortfolio)
      return mergedPortfolio
    } catch (error: any) {
      if (globalPortfolioCache) {
        const { updatedPortfolio } = applyLivePrices(
          globalPortfolioCache.stockPriceData,
          globalPortfolioCache.sectorData,
          globalPortfolioCache.cryptoPrices,
          {},
        )
        const mergedPortfolio = portfolioOverride ? mergeUpdatedPortfolio(portfolio, updatedPortfolio) : updatedPortfolio
        setPortfolio(mergedPortfolio)
        return mergedPortfolio
      }
      throw error
    }
  }

  const addShareTransaction = async (tx: Omit<ShareTransaction, "id">) => {
    const getFaceValue = (symbol: string) => {
      const sector = sectorsMap[normalizeStockSymbol(symbol)]
      return sector === "Mutual Fund" ? 10 : 100
    }

    const isRecognizedSipLikeBuy = (description?: string, symbol?: string) => {
      const upperDescription = (description || "").trim().toUpperCase()
      const normalizedSymbol = (symbol || "").trim().toUpperCase()
      if (!upperDescription) return false
      return (
        upperDescription.includes("CA-REARRANGEMENT") ||
        upperDescription.includes("SIP") ||
        (normalizedSymbol.length > 0 && upperDescription.includes(`BUY`) && upperDescription.includes(`UNITS OF ${normalizedSymbol}`))
      )
    }

    const parseCorporateActionPurchaseDate = (description?: string) => {
      const match = description?.match(/PUR-(\d{2})-(\d{2})-(\d{4})/i)
      if (!match) return undefined
      const [, day, month, year] = match
      return `${year}-${month}-${day}`
    }

    const getMatchingSipPlanForTransaction = (entry: Omit<ShareTransaction, "id">) => {
      if (!isRecognizedSipLikeBuy(entry.description, entry.symbol)) {
        return null
      }

      const normalizedEntrySymbol = normalizeStockSymbol(entry.symbol)
      const targetDate = parseCorporateActionPurchaseDate(entry.description) || entry.date
      const targetTime = targetDate ? new Date(targetDate).getTime() : Number.NaN

      return normalizeSipPlans(userProfile?.sipPlans)
        .filter((plan) =>
          plan.portfolioId === entry.portfolioId &&
          normalizeStockSymbol(plan.symbol) === normalizedEntrySymbol
        )
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === "active" ? -1 : 1
          const aTime = new Date(a.startDate).getTime()
          const bTime = new Date(b.startDate).getTime()
          const aDistance = Number.isFinite(targetTime) ? Math.abs(targetTime - aTime) : aTime
          const bDistance = Number.isFinite(targetTime) ? Math.abs(targetTime - bTime) : bTime
          return aDistance - bDistance
        })[0] || null
    }

    const upperDescription = (tx.description || "").trim().toUpperCase()
    let normalizedType = tx.type
    if (upperDescription.includes("CA-BONUS")) normalizedType = "bonus"
    else if (upperDescription.includes("CA-RIGHTS")) normalizedType = "bonus"
    else if (upperDescription.includes("INITIAL PUBLIC OFFERING") || upperDescription.includes(" IPO ")) normalizedType = "ipo"
    else if (isRecognizedSipLikeBuy(tx.description, tx.symbol)) normalizedType = "buy"

    const normalizedSymbol = normalizeStockSymbol(tx.symbol)
    const matchingSipPlan = normalizedType === "buy" ? getMatchingSipPlanForTransaction({ ...tx, type: normalizedType, symbol: normalizedSymbol }) : null
    const normalizedPrice =
      normalizedType === "bonus" || normalizedType === "gift"
        ? 0
        : (Number.isFinite(tx.price) && tx.price > 0
            ? tx.price
            : ((isRecognizedSipLikeBuy(tx.description, tx.symbol) || normalizedType === "ipo" || normalizedType === "merger_in")
                ? getFaceValue(normalizedSymbol)
                : 0))
    const sipDueDate = tx.sipDueDate || parseCorporateActionPurchaseDate(tx.description)
    const sipNetAmount = matchingSipPlan && normalizedPrice > 0 && tx.quantity > 0
      ? Number((normalizedPrice * tx.quantity).toFixed(2))
      : tx.sipNetAmount
    const sipDpsCharge = matchingSipPlan
      ? (tx.sipDpsCharge ?? matchingSipPlan.dpsCharge ?? 5)
      : tx.sipDpsCharge
    const sipGrossAmount = matchingSipPlan && Number.isFinite(sipNetAmount) && Number.isFinite(sipDpsCharge)
      ? Number(((sipNetAmount as number) + (sipDpsCharge as number)).toFixed(2))
      : tx.sipGrossAmount
    const currentTransactions = shareTransactionsRef.current
    const newTx: ShareTransaction = {
      ...tx,
      symbol: normalizedSymbol,
      assetType: normalizeAssetType(tx.assetType),
      cryptoId: tx.cryptoId?.trim() || undefined,
      type: normalizedType,
      price: normalizedPrice,
      sipPlanId: tx.sipPlanId || matchingSipPlan?.id,
      sipDueDate,
      sipNetAmount,
      sipDpsCharge,
      sipGrossAmount,
      id: generateId('stx'),
    }
    const updatedTransactions = [...currentTransactions, newTx]
    shareTransactionsRef.current = updatedTransactions
    setShareTransactions(updatedTransactions)
    await saveDataWithIntegrity("shareTransactions", updatedTransactions)
    const { newPortfolio: updatedPortfolio, zeroUnitHoldings } = await recomputePortfolio(updatedTransactions)
    return { newTx, updatedPortfolio, zeroUnitHoldings }
  }

  const completeSipInstallment = async (
    planId: string,
    options?: {
      dueDate?: string
      price?: number
      grossAmount?: number
      notes?: string
    },
  ) => {
    if (!userProfile) {
      throw new Error("User profile is not available")
    }

    const sipPlans = normalizeSipPlans(userProfile.sipPlans)
    const plan = sipPlans.find((entry) => entry.id === planId)
    if (!plan) {
      throw new Error("SIP plan not found")
    }

    const schedule = getSipScheduleSummary(plan, shareTransactions, new Date())
    const dueDate = options?.dueDate || schedule?.nextDate?.toISOString() || new Date().toISOString()
    const existingInstallmentTx = getSipCompletedTransactionForDueDate(plan, shareTransactions, dueDate)
    if (existingInstallmentTx) {
      throw new Error("This SIP installment is already completed")
    }

    const fallbackPrice = Number.isFinite(plan.referencePrice) && (plan.referencePrice ?? 0) > 0
      ? (plan.referencePrice ?? 0)
      : 0
    const executionPrice = Number.isFinite(options?.price) && (options?.price ?? 0) > 0
      ? Number(options?.price)
      : fallbackPrice

    if (!Number.isFinite(executionPrice) || executionPrice <= 0) {
      throw new Error("A valid execution price is required")
    }

    const grossAmount = Number.isFinite(options?.grossAmount) && (options?.grossAmount ?? 0) > 0
      ? Number(options?.grossAmount)
      : plan.installmentAmount
    const dpsCharge = plan.dpsCharge ?? 5
    const investedAmount = calculateSipNetInvestment(grossAmount, dpsCharge)
    if (investedAmount <= 0) {
      throw new Error("Installment amount must be greater than the DPS charge")
    }

    const quantity = Number((investedAmount / executionPrice).toFixed(8))
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Installment amount is too small for the selected price")
    }

    const completedAt = new Date().toISOString()
    const executionLabel = plan.sector === "Mutual Fund" ? "NAV" : "Price"
    const shareDescription = `SIP installment${options?.notes ? `: ${options.notes}` : ""} (${executionLabel} ${executionPrice.toFixed(2)}, Gross ${grossAmount.toFixed(2)}, DPS ${dpsCharge.toFixed(2)})`
    const { newTx, updatedPortfolio } = await addShareTransaction({
      portfolioId: plan.portfolioId,
      symbol: plan.symbol,
      assetType: "stock",
      type: "buy",
      quantity,
      price: executionPrice,
      date: completedAt,
      description: shareDescription,
      sipPlanId: plan.id,
      sipDueDate: dueDate,
      sipGrossAmount: grossAmount,
      sipDpsCharge: dpsCharge,
      sipNetAmount: investedAmount,
    })

    const updatedPlans = sipPlans.map((entry) =>
      entry.id === planId
        ? {
            ...entry,
            referencePrice: executionPrice,
            updatedAt: completedAt,
          }
        : entry,
    )

    updateUserProfile({ sipPlans: updatedPlans })
    return {
      installment: {
        dueDate,
        grossAmount,
        dpsCharge,
        investedAmount,
        unitsBought: quantity,
        price: executionPrice,
        completedAt,
      },
      shareTransaction: newTx,
      updatedPortfolio,
    }
  }

  const enrollShareTransactionInSipPlan = async (
    transactionId: string,
    planId: string,
    options?: {
      dueDate?: string
      grossAmount?: number
      dpsCharge?: number
    },
  ) => {
    const currentProfile = userProfileRef.current
    if (!currentProfile) {
      throw new Error("User profile is not available")
    }

    const sipPlans = normalizeSipPlans(currentProfile.sipPlans)
    const plan = sipPlans.find((entry) => entry.id === planId)
    if (!plan) {
      throw new Error("SIP plan not found")
    }

    const currentTransactions = shareTransactionsRef.current
    const transaction = currentTransactions.find((entry) => entry.id === transactionId)
    if (!transaction) {
      throw new Error("Transaction not found")
    }

    if (transaction.type !== "buy" && transaction.type !== "ipo") {
      throw new Error("Only buy or IPO transactions can be enrolled into SIP")
    }

    const executionPrice = Number.isFinite(transaction.price) ? (transaction.price ?? 0) : 0
    if (executionPrice <= 0) {
      throw new Error("Selected transaction must have a valid price")
    }

    const netAmount = Number((executionPrice * (transaction.quantity || 0)).toFixed(2))
    const dpsCharge = Number.isFinite(options?.dpsCharge) ? Number(options?.dpsCharge) : (plan.dpsCharge ?? 5)
    const grossAmount = Number.isFinite(options?.grossAmount) && (options?.grossAmount ?? 0) > 0
      ? Number(options?.grossAmount)
      : Number((netAmount + dpsCharge).toFixed(2))
    const dueDate = options?.dueDate || transaction.date

    const updatedTransactions = currentTransactions.map((entry) =>
      entry.id === transactionId
        ? {
            ...entry,
            sipPlanId: plan.id,
            sipDueDate: dueDate,
            sipGrossAmount: grossAmount,
            sipDpsCharge: dpsCharge,
            sipNetAmount: netAmount,
          }
        : entry,
    )

    const updatedTransaction = updatedTransactions.find((entry) => entry.id === transactionId)
    if (!updatedTransaction) {
      throw new Error("Could not update SIP transaction")
    }

    shareTransactionsRef.current = updatedTransactions
    setShareTransactions(updatedTransactions)
    await saveDataWithIntegrity("shareTransactions", updatedTransactions)
    const { newPortfolio: updatedPortfolio } = await recomputePortfolio(updatedTransactions)

    return { updatedTransaction, updatedPortfolio }
  }

  const enrollMultipleShareTransactionsInSipPlan = async (
    enrollments: Array<{
      transactionId: string
      planId: string
      dueDate?: string
      grossAmount?: number
      dpsCharge?: number
    }>,
  ) => {
    if (!Array.isArray(enrollments) || enrollments.length === 0) {
      return { updatedTransactions: [], updatedPortfolio: portfolio }
    }

    const currentProfile = userProfileRef.current
    if (!currentProfile) {
      throw new Error("User profile is not available")
    }

    const sipPlans = normalizeSipPlans(currentProfile.sipPlans)
    const planById = new Map(sipPlans.map((plan) => [plan.id, plan]))
    const enrollmentByTransactionId = new Map(
      enrollments.map((entry) => [entry.transactionId, entry]),
    )

    let updatedCount = 0
    const currentTransactions = shareTransactionsRef.current
    const updatedTransactions = currentTransactions.map((transaction) => {
      const enrollment = enrollmentByTransactionId.get(transaction.id)
      if (!enrollment) return transaction

      const plan = planById.get(enrollment.planId)
      if (!plan) {
        throw new Error("SIP plan not found")
      }

      if (transaction.type !== "buy" && transaction.type !== "ipo") {
        throw new Error("Only buy or IPO transactions can be enrolled into SIP")
      }

      const executionPrice = Number.isFinite(transaction.price) ? (transaction.price ?? 0) : 0
      if (executionPrice <= 0) {
        throw new Error("Selected transaction must have a valid price")
      }

      const netAmount = Number((executionPrice * (transaction.quantity || 0)).toFixed(2))
      const dpsCharge = Number.isFinite(enrollment.dpsCharge) ? Number(enrollment.dpsCharge) : (plan.dpsCharge ?? 5)
      const grossAmount = Number.isFinite(enrollment.grossAmount) && (enrollment.grossAmount ?? 0) > 0
        ? Number(enrollment.grossAmount)
        : Number((netAmount + dpsCharge).toFixed(2))

      updatedCount += 1
      return {
        ...transaction,
        sipPlanId: plan.id,
        sipDueDate: enrollment.dueDate || transaction.date,
        sipGrossAmount: grossAmount,
        sipDpsCharge: dpsCharge,
        sipNetAmount: netAmount,
      }
    })

    if (updatedCount !== enrollments.length) {
      throw new Error("Could not update all selected SIP transactions")
    }

    const updatedTransactionMap = new Map(updatedTransactions.map((transaction) => [transaction.id, transaction]))
    const orderedUpdatedTransactions = enrollments.map((enrollment) => {
      const transaction = updatedTransactionMap.get(enrollment.transactionId)
      if (!transaction) {
        throw new Error("Could not update SIP transaction")
      }
      return transaction
    })

    shareTransactionsRef.current = updatedTransactions
    setShareTransactions(updatedTransactions)
    await saveDataWithIntegrity("shareTransactions", updatedTransactions)
    const { newPortfolio: updatedPortfolio } = await recomputePortfolio(updatedTransactions)

    return { updatedTransactions: orderedUpdatedTransactions, updatedPortfolio }
  }

  const deleteShareTransaction = async (id: string) => {
    return await deleteMultipleShareTransactions([id])
  }

  const updateShareTransaction = async (id: string, updates: Partial<Omit<ShareTransaction, "id">>) => {
    const currentTransactions = shareTransactionsRef.current
    const transactionIndex = currentTransactions.findIndex((t) => t.id === id)
    if (transactionIndex === -1) {
      throw new Error("Transaction not found")
    }

    const existingTx = currentTransactions[transactionIndex]

    // Normalize updates similar to addShareTransaction
    const normalizedSymbol = updates.symbol ? normalizeStockSymbol(updates.symbol) : existingTx.symbol
    const normalizedType = updates.type || existingTx.type
    const normalizedAssetType = updates.assetType ? normalizeAssetType(updates.assetType) : existingTx.assetType
    const cryptoId = updates.cryptoId !== undefined ? updates.cryptoId?.trim() || undefined : existingTx.cryptoId

    // Handle price normalization for bonus/gift types
    let normalizedPrice = updates.price !== undefined ? updates.price : existingTx.price
    if (normalizedType === "bonus" || normalizedType === "gift") {
      normalizedPrice = 0
    }

    const updatedTransaction: ShareTransaction = {
      ...existingTx,
      ...updates,
      id, // Ensure id is preserved
      symbol: normalizedSymbol,
      type: normalizedType,
      assetType: normalizedAssetType,
      cryptoId,
      price: normalizedPrice,
    }

    const updatedTransactions = [...currentTransactions]
    updatedTransactions[transactionIndex] = updatedTransaction

    shareTransactionsRef.current = updatedTransactions
    setShareTransactions(updatedTransactions)
    await saveDataWithIntegrity("shareTransactions", updatedTransactions)

    const { newPortfolio: updatedPortfolio, zeroUnitHoldings } = await recomputePortfolio(updatedTransactions)
    return { updatedTransaction, updatedPortfolio, zeroUnitHoldings }
  }

  const recomputePortfolio = async (transactionsToUse?: ShareTransaction[]) => {
    const txs = transactionsToUse || shareTransactions
    const newPortfolio: PortfolioItem[] = []
    const zeroUnitHoldings: Array<{ symbol: string; assetType: "stock" | "crypto"; cryptoId?: string; portfolioId: string }> = []

    // Group by portfolioId + (symbol, assetType, cryptoId)
    const groupedByPortfolio = txs.reduce((acc, tx) => {
      if (!acc[tx.portfolioId]) acc[tx.portfolioId] = {}
      const holdingKey = getHoldingKey(tx.portfolioId, tx.symbol, tx.assetType, tx.cryptoId)
      if (!acc[tx.portfolioId][holdingKey]) acc[tx.portfolioId][holdingKey] = []
      acc[tx.portfolioId][holdingKey].push(tx)
      return acc
    }, {} as Record<string, Record<string, ShareTransaction[]>>)

    for (const [pId, symbolMap] of Object.entries(groupedByPortfolio)) {
      for (const [, symbolTxs] of Object.entries(symbolMap)) {
        let totalUnits = 0
        let totalCost = 0

        const sortedSymbolTxs = [...symbolTxs].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )
        const refTx = sortedSymbolTxs[0]
        const symbol = refTx?.symbol || ""
        const assetType = normalizeAssetType(refTx?.assetType)
        const cryptoId = refTx?.cryptoId?.trim() || undefined
        const key = getHoldingKey(pId, symbol, assetType, cryptoId)
        const existing = portfolio.find((p) => getHoldingKey(p.portfolioId, p.symbol, p.assetType, p.cryptoId) === key)

        sortedSymbolTxs.forEach((t) => {
          if (t.type === "buy" || t.type === "ipo" || t.type === "reinvestment" || t.type === "bonus" || t.type === "gift" || t.type === "merger_in") {
            totalUnits = normalizeUnits(totalUnits + t.quantity)
            const unitPrice = (t.type === "bonus" || t.type === "gift")
              ? 0
              : (Number.isFinite(t.price) ? t.price : 0)
            totalCost += t.quantity * unitPrice
          } else if (t.type === "sell" || t.type === "merger_out") {
            totalUnits = normalizeUnits(totalUnits - t.quantity)
          }
        })

        // Check if this holding has any transaction history
        const hasHistory = sortedSymbolTxs.length > 0
        const hasSellTx = sortedSymbolTxs.some(t => t.type === "sell")
        const hasMergerOutTx = sortedSymbolTxs.some(t => t.type === "merger_out")
        const hitZero = totalUnits <= 0 && (hasSellTx || hasMergerOutTx)

        // Keep holding if:
        // 1. Has units > 0 (active holding), OR
        // 2. Has sell transaction (not merger_out) and hasn't been explicitly removed (isKeptZeroHolding !== false)
        //    By default, keep zero holdings from sell unless user explicitly removed them
        // 3. Merger_out holdings are NEVER kept - they are removed from portfolio
        const shouldKeep = totalUnits > 0 || (hasSellTx && !hasMergerOutTx && existing?.isKeptZeroHolding !== false)

        if (shouldKeep) {
          const isZeroHolding = totalUnits <= 0 && hasSellTx && !hasMergerOutTx
          newPortfolio.push({
            id: existing?.id || generateId("port"),
            portfolioId: pId,
            symbol: symbol,
            assetType,
            cryptoId,
            units: totalUnits,
            buyPrice: totalUnits > 0 ? totalCost / totalUnits : (existing?.buyPrice ?? 0),
            currentPrice: existing?.currentPrice,
            previousClose: existing?.previousClose,
            sector: existing?.sector || (assetType === "crypto" ? "Crypto" : (sectorsMap[normalizeStockSymbol(symbol)] || "Others")),
            lastUpdated: new Date().toISOString(),
            isKeptZeroHolding: isZeroHolding ? true : undefined,
          })

          // Track if this holding just became zero (transition from >0 to 0)
          // Only show modal for NEW zero holdings from sell (not merger_out)
          if (isZeroHolding && existing && existing.units > 0) {
            zeroUnitHoldings.push({ symbol, assetType, cryptoId, portfolioId: pId })
          }
        }
      }
    }

    setPortfolio(newPortfolio)
    await saveDataWithIntegrity("portfolio", newPortfolio)
    return { newPortfolio, zeroUnitHoldings }
  }

  const deleteMultipleShareTransactions = async (ids: string[]) => {
    if (ids.length === 0) return

    const updatedTransactions = shareTransactions.filter((t) => !ids.includes(t.id))
    setShareTransactions(updatedTransactions)
    await saveDataWithIntegrity("shareTransactions", updatedTransactions)
    await recordDeletion(TOMBSTONE_KEYS.shareTransactions, ids)

    const { newPortfolio: updatedPortfolio } = await recomputePortfolio(updatedTransactions)
    return updatedPortfolio
  }

  const clearPortfolioHistory = async () => {
    if (!activePortfolioId) return
    const removedShareIds = shareTransactions.filter(t => t.portfolioId === activePortfolioId).map((t) => t.id)
    const updatedTransactions = shareTransactions.filter(t => t.portfolioId !== activePortfolioId)
    setShareTransactions(updatedTransactions)
    await saveDataWithIntegrity("shareTransactions", updatedTransactions)
    await recordDeletion(TOMBSTONE_KEYS.shareTransactions, removedShareIds)
    const updatedPortfolio = portfolio.filter(p => p.portfolioId !== activePortfolioId)
    setPortfolio(updatedPortfolio)
    await saveDataWithIntegrity("portfolio", updatedPortfolio)
  }

  const importShareData = async (type: 'portfolio' | 'history' | 'auto', csvData: string, resolvedPrices?: Record<string, number>) => {
    const rows = csvData.split('\n').map(row => row.split(',').map(cell => cell.replace(/"/g, '').trim()))
    if (rows.length < 2) return

    let detectedType = type
    if (type === 'auto') {
      const header = rows[0].join(',')
      if (header.includes('Current Balance') || header.includes('Last Closing Price')) {
        detectedType = 'portfolio'
      } else if (header.includes('Transaction Date') || header.includes('History Description')) {
        detectedType = 'history'
      } else {
        throw new Error("Could not detect CSV format. Please ensure it is a Mero Share export.")
      }
    }

    const getFaceValue = (symbol: string) => {
      const sector = sectorsMap[normalizeStockSymbol(symbol)]
      return sector === "Mutual Fund" ? 10 : 100
    }

    if (detectedType === 'portfolio') {
      // S.N, Scrip, Current Balance, Last Closing Price, Value..., Last Transaction Price (LTP), Value...
      const newItems: PortfolioItem[] = []
      rows.slice(1).forEach(row => {
        if (row.length < 7 || row[0].toLowerCase().includes('total')) return
        const symbol = row[1]
        const units = parseFloat(row[2])
        const price = parseFloat(row[5]) || parseFloat(row[3])
        if (symbol && !isNaN(units)) {
          // Use provided resolved price, otherwise fallback to LTP
          const buyPrice = resolvedPrices && resolvedPrices[symbol] !== undefined
            ? resolvedPrices[symbol]
            : price

          newItems.push({
            id: generateId('port'),
            portfolioId: activePortfolioId!,
            symbol,
            units,
            buyPrice: buyPrice,
            currentPrice: price,
            sector: sectorsMap[normalizeStockSymbol(symbol)] || "Others",
            lastUpdated: new Date().toISOString()
          })
        }
      })
      const otherPortfolioItems = portfolio.filter(p => p.portfolioId !== activePortfolioId)
      const updatedPortfolio = [...otherPortfolioItems, ...newItems]
      setPortfolio(updatedPortfolio)
      await saveDataWithIntegrity("portfolio", updatedPortfolio)
      return updatedPortfolio
    } else {
      // S.N, Scrip, Transaction Date, Credit Quantity, Debit Quantity, Balance After Transaction, History Description
      const newTxs: ShareTransaction[] = []
      const isRecognizedSipLikeBuy = (description?: string, symbol?: string) => {
        const upperDescription = (description || "").trim().toUpperCase()
        const normalizedSymbol = (symbol || "").trim().toUpperCase()
        if (!upperDescription) return false
        return (
          upperDescription.includes("CA-REARRANGEMENT") ||
          upperDescription.includes("SIP") ||
          (normalizedSymbol.length > 0 && upperDescription.includes("BUY") && upperDescription.includes(`UNITS OF ${normalizedSymbol}`))
        )
      }

      const parseCorporateActionPurchaseDate = (description?: string) => {
        const match = description?.match(/PUR-(\d{2})-(\d{2})-(\d{4})/i)
        if (!match) return undefined
        const [, day, month, year] = match
        return `${year}-${month}-${day}`
      }

      const getMatchingSipPlanId = (symbol: string, date: string, description: string) => {
        if (!isRecognizedSipLikeBuy(description, symbol)) {
          return undefined
        }

        const normalizedSymbol = normalizeStockSymbol(symbol)
        const targetDate = parseCorporateActionPurchaseDate(description) || date
        const targetTime = targetDate ? new Date(targetDate).getTime() : Number.NaN

        const match = normalizeSipPlans(userProfile?.sipPlans)
          .filter((plan) =>
            plan.portfolioId === activePortfolioId &&
            normalizeStockSymbol(plan.symbol) === normalizedSymbol
          )
          .sort((a, b) => {
            if (a.status !== b.status) return a.status === "active" ? -1 : 1
            const aTime = new Date(a.startDate).getTime()
            const bTime = new Date(b.startDate).getTime()
            const aDistance = Number.isFinite(targetTime) ? Math.abs(targetTime - aTime) : aTime
            const bDistance = Number.isFinite(targetTime) ? Math.abs(targetTime - bTime) : bTime
            return aDistance - bDistance
          })[0]

        return match?.id
      }

      rows.slice(1).forEach(row => {
        if (row.length < 7) return
        const symbol = row[1]
        const date = row[2]
        const credit = parseFloat(row[3]) || 0
        const debit = parseFloat(row[4]) || 0
        const desc = row[6] || ""

        let txType: ShareTransaction['type'] = 'buy'
        const upperDesc = desc.toUpperCase()
        if (upperDesc.includes('CA-BONUS') || upperDesc.includes('BONUS')) txType = 'bonus'
        else if (upperDesc.includes('CA-RIGHTS')) txType = 'bonus'
        else if (upperDesc.includes('IPO') || upperDesc.includes('INITIAL PUBLIC OFFERING')) txType = 'ipo'
        else if (upperDesc.includes('MERGER')) txType = credit > 0 ? 'merger_in' : 'merger_out'
        else if (isRecognizedSipLikeBuy(desc, symbol)) txType = 'buy'
        else if (debit > 0) txType = 'sell'

        let price = 0
        if (txType === 'ipo' || txType === 'buy' || txType === 'merger_in') {
          const defaultPrice = (txType === 'ipo' || txType === 'merger_in' || isRecognizedSipLikeBuy(desc, symbol)) ? getFaceValue(symbol) : 0
          price = resolvedPrices && resolvedPrices[symbol] !== undefined
            ? resolvedPrices[symbol]
            : defaultPrice
        }

        if (symbol && date) {
          const sipPlanId = txType === 'buy' ? getMatchingSipPlanId(symbol, date, desc) : undefined
          const sipDueDate = sipPlanId ? parseCorporateActionPurchaseDate(desc) : undefined
          const sipNetAmount = sipPlanId && price > 0 && (credit || debit) > 0
            ? Number((price * (credit || debit)).toFixed(2))
            : undefined
          newTxs.push({
            id: generateId('stx'),
            portfolioId: activePortfolioId!,
            symbol,
            date,
            quantity: credit || debit,
            price: price,
            type: txType,
            description: desc,
            sipPlanId,
            sipDueDate,
            sipNetAmount,
            sipDpsCharge: sipPlanId ? 5 : undefined,
            sipGrossAmount: sipPlanId && Number.isFinite(sipNetAmount) ? Number(((sipNetAmount ?? 0) + 5).toFixed(2)) : undefined,
          })
        }
      })
      const otherPortfolioTxs = shareTransactions.filter(t => t.portfolioId !== activePortfolioId)
      const updatedTxs = [...otherPortfolioTxs, ...newTxs]
      setShareTransactions(updatedTxs)
      await saveDataWithIntegrity("shareTransactions", updatedTxs)
      const { newPortfolio } = await recomputePortfolio(updatedTxs)
      return newPortfolio
    }
  }

  const syncMeroSharePortfolio = async (credentials: any, targetPortfolioId?: string) => {
    const portId = targetPortfolioId || activePortfolioId
    if (!portId) {
      throw new Error("No target portfolio selected")
    }

    try {
      const response = await fetch('/api/meroshare/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to sync portfolio")

      const meroPortfolio = data.portfolio as any[]
      let updatedCount = 0
      let addedCount = 0

      // Get current portfolio items for comparison
      const currentPortfolio = [...portfolio]
      const updatedPortfolio = [...currentPortfolio]

      for (const item of meroPortfolio) {
        const existingIdx = updatedPortfolio.findIndex(
          p => p.portfolioId === portId && normalizeStockSymbol(p.symbol) === normalizeStockSymbol(item.symbol)
        )

        if (existingIdx > -1) {
          updatedPortfolio[existingIdx] = {
            ...updatedPortfolio[existingIdx],
            units: item.units,
            currentPrice: item.currentPrice,
            lastUpdated: new Date().toISOString()
          }
          updatedCount++
        } else {
          const newItem: PortfolioItem = {
            id: generateId('port_item'),
            portfolioId: portId,
            symbol: item.symbol,
            units: item.units,
            buyPrice: 0, // Users will need to update cost manually or it stays 0
            currentPrice: item.currentPrice,
            lastUpdated: new Date().toISOString(),
            sector: "Others"
          }
          updatedPortfolio.push(newItem)
          addedCount++
        }
      }

      setPortfolio(updatedPortfolio)
      await saveDataWithIntegrity("portfolio", updatedPortfolio)

      // Trigger a price refresh to update sectors and other metadata
      await fetchPortfolioPrices(updatedPortfolio)
      return { updatedCount, addedCount }
    } catch (error: any) {
      throw error
    }
  }

  const logMeroShareApplication = async (entry: Omit<MeroShareApplicationLog, "id" | "createdAt">) => {
    if (!userProfile) return null

    const nextLog: MeroShareApplicationLog = {
      id: generateId("ipo_log"),
      createdAt: new Date().toISOString(),
      ...entry,
    }

    const existingMeroShare = userProfile.meroShare ?? {
      dpId: "",
      username: "",
      shareFeaturesEnabled: false,
      shareNotificationsEnabled: false,
      isAutomatedEnabled: false,
    }

    const updatedProfile: UserProfile = {
      ...userProfile,
      meroShare: {
        ...existingMeroShare,
        applicationLogs: [nextLog, ...(existingMeroShare.applicationLogs ?? [])].slice(0, 100),
      },
    }

    setUserProfile(updatedProfile)
    await saveDataWithIntegrity("userProfile", updatedProfile)
    return nextLog
  }

  const applyMeroShareIPO = async (
    credentials: any,
    ipoName: string,
    kitta = 10,
    source: "live-apply" | "live-auto" | "settings-test" = "live-apply",
    options?: { showBrowser?: boolean }
  ) => {
    try {
      const response = await fetch('/api/meroshare/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials, ipoName, kitta, options })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to apply")
      }

      await logMeroShareApplication({
        ipoName,
        action: "apply",
        requestedKitta: kitta,
        status: "success",
        message: data.alreadyApplied
          ? (data.message || "Already applied earlier; no new application was submitted.")
          : (data.message || "Applied successfully"),
        source,
      })

      return data
    } catch (error: any) {
      const message = error?.message || "Failed to apply"
      await logMeroShareApplication({
        ipoName,
        action: "apply",
        requestedKitta: kitta,
        status: "failed",
        message,
        source,
      })
      throw error
    }
  }

  const checkIPOAllotmentWithLog = async (
    credentials: any,
    ipoName: string,
    source: "live-check" | "settings-check" = "live-check"
  ) => {
    try {
      const response = await fetch('/api/meroshare/check-allotment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials, ipoName })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to check allotment")

      const statusMessage = data?.status
        ? `Allotment check: ${data.status}`
        : "Allotment check completed."

      await logMeroShareApplication({
        ipoName,
        action: "report-check",
        status: "success",
        message: statusMessage,
        source,
      })

      return data
    } catch (error: any) {
      const message = error?.message || "Failed to check allotment"
      await logMeroShareApplication({
        ipoName,
        action: "report-check",
        status: "failed",
        message,
        source,
      })
      throw error
    }
  }

  return {
    userProfile,
    transactions,
    budgets,
    goals,
    debtAccounts,
    creditAccounts,
    debtCreditTransactions,
    categories,
    emergencyFund,
    balance,
    isFirstTime,
    showOnboarding,
    isAuthenticated,
    isLoaded,
    balanceChange,
    portfolio,
    shareTransactions,
    portfolios,
    activePortfolioId,
    setShowOnboarding,
    handleOnboardingComplete,
    addTransaction,
    updateUserProfile,
    saveSipPlan,
    deleteSipPlan,
    enrollShareTransactionInSipPlan,
    enrollMultipleShareTransactionsInSipPlan,
    addBudget,
    updateBudget,
    deleteBudget,
    addGoal,
    updateGoal,
    deleteGoal,
    useGoalForInvestment,
    deleteTransaction,
    updateTransaction,
    addDebtAccount,
    addDebtToAccount,
    addCreditAccount,
    deleteDebtAccount,
    deleteCreditAccount,
    addToEmergencyFund,
    updateGoalContribution,
    transferToGoal,
    spendFromGoal,
    addFromGoal,
    addFromDebt,
    makeDebtPayment,
    updateCreditBalance,
    createDebtForTransaction,
    completeTransactionWithDebt,
    addPortfolioItem,
    updatePortfolioItem,
    deletePortfolioItem,
    toggleZeroHolding,
    addPortfolio,
    switchPortfolio,
    deletePortfolio,
    updatePortfolio,
    clearPortfolioHistory,
    fetchPortfolioPrices,
    refreshMarketData,
    syncMeroSharePortfolio,
    applyMeroShareIPO,
    checkIPOAllotment: checkIPOAllotmentWithLog,
    upcomingIPOs,
    topStocks,
    marketStatus,
    marketSummary,
    marketSummaryHistory,
    noticesBundle,
    disclosures,
    exchangeMessages,
    scripNamesMap,
    isIPOsLoading,
    getFaceValue: (symbol: string) => {
      const sector = sectorsMap[normalizeStockSymbol(symbol)]
      return sector === "Mutual Fund" ? 10 : 100
    },
    addShareTransaction,
    completeSipInstallment,
    deleteShareTransaction,
    deleteMultipleShareTransactions,
    updateShareTransaction,
    recomputePortfolio,
    importShareData,
    refreshData,
    clearAllData,
    exportData,
    importData,
    calculateTimeEquivalent: (amount: number) => (userProfile ? calculateTimeEquivalent(amount, userProfile) : 0),
    addCategory,
    updateCategory,
    deleteCategory,
    updateCategoryStats,
    settings: userProfile
      ? {
        currency: userProfile.currency,
        customBudgetCategories: {},
      }
      : null,
  }
}
