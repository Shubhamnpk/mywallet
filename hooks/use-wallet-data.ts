"use client"

import { useState, useEffect } from "react"
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
} from "@/types/wallet"

import { calculateBalance, initializeDefaultCategories, calculateTimeEquivalent, generateId } from "@/lib/wallet-utils"
import { loadFromLocalStorage, saveToLocalStorage } from "@/lib/storage"
import { updateBudgetSpendingHelper, updateGoalContributionHelper, updateCategoryStatsHelper } from "@/lib/wallet-ops"
import { SessionManager } from "@/lib/session-manager"
import { parseNepaliDateRange, getIPOStatus } from "@/lib/nepali-date-utils"
import {
  getDefaultNotificationSettings,
  normalizeNotificationSettings,
  requestBrowserNotificationPermission,
  REMINDER_CACHE_KEY,
  showAppNotification,
} from "@/lib/notifications"
import { toast } from "sonner"

const HOUR_MS = 60 * 60 * 1000
const REMINDER_SCAN_INTERVAL_MS = 30 * 60 * 1000

const readReminderCache = (): Record<string, number> => {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(REMINDER_CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

const saveReminderCache = (cache: Record<string, number>) => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(REMINDER_CACHE_KEY, JSON.stringify(cache))
  } catch {
  }
}

const shouldSendReminder = (cache: Record<string, number>, key: string, cooldownMs: number) => {
  const lastSentAt = cache[key] ?? 0
  return Date.now() - lastSentAt >= cooldownMs
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
  const [isLoaded, setIsLoaded] = useState(false)

  // Reminder engine: budgets, goals, and IPO windows.
  useEffect(() => {
    if (!isLoaded || typeof window === "undefined") return

    const notificationSettings = normalizeNotificationSettings(userProfile?.notificationSettings)

    if (!notificationSettings.enabled) {
      return
    }

    const runReminderScan = () => {
      const cache = readReminderCache()
      const now = new Date()
      let emittedCount = 0
      const maxPerScan = 3

      const emitReminder = (
        key: string,
        title: string,
        description: string,
        cooldownMs: number,
      ) => {
        if (emittedCount >= maxPerScan) return
        if (!shouldSendReminder(cache, key, cooldownMs)) return

        if (notificationSettings.inAppToasts) {
          toast(title, { description, duration: 9000 })
        }

        if (
          notificationSettings.browserNotifications &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          void showAppNotification({
            title,
            body: description,
            tag: key,
          })
        }

        cache[key] = Date.now()
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
            description: "Get alerts for budgets, goals, and IPO opening/closing windows.",
            action: {
              label: "Enable",
              onClick: () => {
                void requestBrowserNotificationPermission()
              },
            },
            duration: 10000,
          })
          cache[permissionNudgeKey] = Date.now()
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

            if (usage >= 100) {
              emitReminder(
                `budget-over-${budget.id}`,
                `${budgetLabel} is over budget`,
                `Spent ${usage.toFixed(0)}% of limit. Review this budget to prevent further overspending.`,
                12 * HOUR_MS,
              )
            } else if (usage >= 90) {
              emitReminder(
                `budget-critical-${budget.id}`,
                `${budgetLabel} is near limit`,
                `You've used ${usage.toFixed(0)}% of this budget. Slow spending to stay on track.`,
                24 * HOUR_MS,
              )
            } else if (usage >= 80) {
              emitReminder(
                `budget-warning-${budget.id}`,
                `${budgetLabel} crossed 80%`,
                `You've used ${usage.toFixed(0)}% of this budget.`,
                24 * HOUR_MS,
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
              )
            } else if (daysRemaining <= 3) {
              emitReminder(
                `goal-due-soon-${goal.id}`,
                `Goal due soon: ${goalLabel}`,
                `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left. Progress: ${progress.toFixed(0)}%.`,
                12 * HOUR_MS,
              )
            } else if (daysRemaining <= 7) {
              emitReminder(
                `goal-week-left-${goal.id}`,
                `Goal deadline in ${daysRemaining} days`,
                `${goalLabel} is ${progress.toFixed(0)}% complete.`,
                24 * HOUR_MS,
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
        upcomingIPOs.forEach((ipo) => {
          const company = ipo.company || "IPO"
          const daysRemaining =
            ipo.daysRemaining ??
            (ipo.closingDate
              ? Math.ceil((new Date(ipo.closingDate).getTime() - now.getTime()) / (24 * HOUR_MS))
              : undefined)

          if (ipo.status === "open") {
            if (typeof daysRemaining === "number" && daysRemaining <= 1) {
              emitReminder(
                `ipo-closing-soon-${company}`,
                `IPO closing soon: ${company}`,
                `Application window is closing ${daysRemaining <= 0 ? "today" : "tomorrow"}.`,
                6 * HOUR_MS,
              )
            } else {
              emitReminder(
                `ipo-open-${company}`,
                `IPO is open: ${company}`,
                "You can apply from the Portfolio section.",
                24 * HOUR_MS,
              )
            }
          } else if (ipo.status === "upcoming" && typeof daysRemaining === "number" && daysRemaining <= 1) {
            emitReminder(
              `ipo-opening-soon-${company}`,
              `IPO opening soon: ${company}`,
              `Subscription starts ${daysRemaining <= 0 ? "today" : "tomorrow"}.`,
              24 * HOUR_MS,
            )
          }
        })
      }

      saveReminderCache(cache)
    }

    runReminderScan()
    const intervalId = window.setInterval(runReminderScan, REMINDER_SCAN_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [
    isLoaded,
    budgets,
    goals,
    upcomingIPOs,
    userProfile?.notificationSettings,
    userProfile?.meroShare?.shareFeaturesEnabled,
    userProfile?.meroShare?.shareNotificationsEnabled,
  ])

  useEffect(() => {
    if (isLoaded) return

    loadDataWithIntegrityCheck()
  }, [isLoaded])
  // Fetch sectors and upcoming IPOs once on load
  useEffect(() => {
    if (isLoaded) {
      // Fetch sectors and names from remote API
      fetch("/api/nepse/sectors")
        .then(res => res.json())
        .then(data => {
          const sMap: Record<string, string> = {}
          const nMap: Record<string, string> = {}
          Object.entries(data).forEach(([sector, scrips]) => {
            if (Array.isArray(scrips)) {
              scrips.forEach((scrip: any) => {
                const symbol = (typeof scrip === 'string' ? scrip : (scrip.symbol || "")).trim().toUpperCase()
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
        .catch(err => console.error("Error pre-fetching sectors:", err))

      // Fetch specific company names from local name.json
      fetch("/name.json")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const nMap: Record<string, string> = {}
            data.forEach((item: any) => {
              if (item.symbol && item.name) {
                nMap[item.symbol.trim().toUpperCase()] = item.name.trim()
              }
            })
            setScripNamesMap(prev => ({ ...prev, ...nMap }))
            saveToLocalStorage("scripNamesMap", nMap)
          }
        })
        .catch(err => console.error("Error fetching name.json:", err))

      // Fetch upcoming IPOs
      setIsIPOsLoading(true)
      fetch("/api/nepse/upcoming")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const processedIPOs: UpcomingIPO[] = data.map(ipo => {
              const dates = parseNepaliDateRange(ipo.date_range)
              if (dates) {
                const statusInfo = getIPOStatus(dates.start, dates.end)
                return {
                  ...ipo,
                  ...statusInfo,
                  openingDate: dates.start.toISOString(),
                  closingDate: dates.end.toISOString()
                }
              }
              return ipo
            })
            setUpcomingIPOs(processedIPOs)

          }
        })
        .catch(err => console.error("Error fetching upcoming IPOs:", err))
        .finally(() => setIsIPOsLoading(false))
    }
  }, [isLoaded])

  // Automatically update portfolio if sectors are missing but map is available
  useEffect(() => {
    if (isLoaded && sectorsMap && portfolio.length > 0) {
      const needsUpdate = portfolio.some(p => !p.sector && sectorsMap[p.symbol.trim().toUpperCase()])
      if (needsUpdate) {
        setPortfolio(prev => prev.map(p => ({
          ...p,
          sector: p.sector || sectorsMap[p.symbol.trim().toUpperCase()] || "Others"
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
            } catch {
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
  async function saveDataWithIntegrity(key: string, data: any) {
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
    } catch {
      try {
        await saveToLocalStorage(key, data, shouldEncrypt)
      } catch (e) {
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
        goals: Array.isArray(storedData.goals) ? storedData.goals : [],
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
      setDebtAccounts(parsedData.debtAccounts)
      setCreditAccounts(parsedData.creditAccounts)
      setDebtCreditTransactions(parsedData.debtCreditTransactions)
      setEmergencyFund(parsedData.emergencyFund)
      setPortfolio(parsedData.portfolio)
      setShareTransactions(parsedData.shareTransactions)

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

      if (parsedData.categories.length > 0) {
        setCategories(parsedData.categories)
      } else {
        // Only create default categories if this is NOT a fresh start after clearing
        const hasAnyData = parsedData.userProfile || parsedData.transactions.length > 0 ||
          parsedData.budgets.length > 0 || parsedData.goals.length > 0
        if (hasAnyData) {
          const defaultCategories = initializeDefaultCategories()
          setCategories(defaultCategories)
          await saveDataWithIntegrity("categories", defaultCategories)
        } else {
          setCategories([])
        }
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
    const updatedGoals = updateGoalContributionHelper(goals, goalId, amount)
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
      newGoalAmount: goal.currentAmount + amount,
    }
  }

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    if (!userProfile) return

    const updatedProfile = {
      ...userProfile,
      ...updates,
      notificationSettings: normalizeNotificationSettings({
        ...userProfile.notificationSettings,
        ...(updates.notificationSettings || {}),
      }),
    }
    setUserProfile(updatedProfile)
    saveDataWithIntegrity("userProfile", updatedProfile)
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

    const updatedDebts = debtAccounts.map((d) => {
      if (d.id === debtId) {
        return { ...d, balance: d.balance + amount }
      }
      return d
    })

    setDebtAccounts(updatedDebts)
    saveToLocalStorage('debtAccounts', updatedDebts, true)

    const debtCharge: DebtCreditTransaction = {
      id: generateId('debt_tx'),
      accountId: debtId,
      accountType: 'debt',
      type: 'charge',
      amount,
      description: description || `Added to ${debt?.name || 'debt'}`,
      date: new Date().toISOString(),
      balanceAfter: (debt ? debt.balance : 0) + amount,
    }

    const updatedDebtTransactions = [...debtCreditTransactions, debtCharge]
    setDebtCreditTransactions(updatedDebtTransactions)
    saveToLocalStorage('debtCreditTransactions', updatedDebtTransactions, true)

    // Also create a regular transaction for main transactions list
    const debtAdditionTransaction: Transaction = {
      id: generateId('tx'),
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

    const paymentTransaction: Transaction = {
      id: generateId('tx'),
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

    const updatedDebts = debtAccounts.map((d) => {
      if (d.id === debtId) {
        return {
          ...d,
          balance: Math.max(0, d.balance - paymentAmount),
        }
      }
      return d
    })

    // If any debt reaches zero balance, remove it and add a congratulatory record
    const debtsAfterCleanup = updatedDebts.filter((d) => d.balance > 0)

    setDebtAccounts(debtsAfterCleanup)
    saveToLocalStorage("debtAccounts", debtsAfterCleanup, true)

    const debtTransaction: DebtCreditTransaction = {
      id: generateId('debt_tx'),
      accountId: debtId,
      accountType: "debt",
      type: "payment",
      amount: paymentAmount,
      description: `Payment towards ${debt.name}`,
      date: new Date().toISOString(),
      balanceAfter: Math.max(0, debt.balance - paymentAmount),
    }

    const updatedDebtTransactions = [...debtCreditTransactions, debtTransaction]
    setDebtCreditTransactions(updatedDebtTransactions)
    saveToLocalStorage("debtCreditTransactions", updatedDebtTransactions, true)

    // If balanceAfter is zero, add a congratulatory transaction note and remove account already handled above
    if (debtTransaction.balanceAfter === 0) {
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

      const withCongrats = [...updatedDebtTransactions, congrats]
      setDebtCreditTransactions(withCongrats)
      saveToLocalStorage('debtCreditTransactions', withCongrats, true)
    }

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
  }

  // Accept goal payload from UI
  const addGoal = (
    goal: Omit<Goal, "id" | "currentAmount">
  ) => {
    const newGoal: Goal = {
      id: generateId('goal'),
      title: goal.title,
      name: goal.name || goal.title,
      targetAmount: goal.targetAmount,
      currentAmount: 0,
      targetDate: goal.targetDate,
      category: goal.category,
      priority: goal.priority,
      createdAt: new Date().toISOString(),
      autoContribute: goal.autoContribute,
      contributionAmount: goal.contributionAmount,
      contributionFrequency: goal.contributionFrequency,
      description: goal.description || "",
    }

    const updatedGoals = [...goals, newGoal]
    setGoals(updatedGoals)
    saveToLocalStorage("goals", updatedGoals, true)
    return newGoal
  }

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    const updatedGoals = goals.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal))
    setGoals(updatedGoals)
    await saveDataWithIntegrity("goals", updatedGoals)
  }

  const deleteGoal = async (id: string) => {
    const updatedGoals = goals.filter((goal) => goal.id !== id)
    setGoals(updatedGoals)
    await saveDataWithIntegrity("goals", updatedGoals)
  }

  const deleteTransaction = async (id: string) => {
    const updatedTransactions = transactions.filter((transaction) => transaction.id !== id)
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
  }

  const deleteDebtAccount = async (id: string) => {
    const updatedDebtAccounts = debtAccounts.filter((debt) => debt.id !== id)
    setDebtAccounts(updatedDebtAccounts)
    await saveDataWithIntegrity("debtAccounts", updatedDebtAccounts)
  }

  const deleteCreditAccount = async (id: string) => {
    const updatedCreditAccounts = creditAccounts.filter((credit) => credit.id !== id)
    setCreditAccounts(updatedCreditAccounts)
    await saveDataWithIntegrity("creditAccounts", updatedCreditAccounts)
  }

  const clearAllData = async () => {
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
        for (let cookie of cookies) {
          const eqPos = cookie.indexOf("=")
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
        }
      }
    }
    setUserProfile(null)
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
    setBalance(0)
    setIsAuthenticated(false)
    setShowOnboarding(true)
    setIsFirstTime(true)
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

  const importData = async (dataOrJson: string | any) => {
    try {
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

      // Import user profile (only if selected)
      if (data.userProfile) {
        setUserProfile(data.userProfile)
        await saveDataWithIntegrity("userProfile", data.userProfile)
      }

      // Import transactions (only if selected)
      if (data.transactions && Array.isArray(data.transactions)) {
        setTransactions(data.transactions)
        await saveDataWithIntegrity("transactions", data.transactions)
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
        await saveDataWithIntegrity("portfolio", data.portfolio)
      }

      // Import share transactions
      if (data.shareTransactions && Array.isArray(data.shareTransactions)) {
        setShareTransactions(data.shareTransactions)
        await saveDataWithIntegrity("shareTransactions", data.shareTransactions)
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
        await saveDataWithIntegrity("budgets", data.budgets)
      }

      // Import goals (only if selected)
      if (data.goals && Array.isArray(data.goals)) {
        setGoals(data.goals)
        await saveDataWithIntegrity("goals", data.goals)
      }

      // Import debt accounts (only if selected)
      if (data.debtAccounts && Array.isArray(data.debtAccounts)) {
        setDebtAccounts(data.debtAccounts)
        await saveDataWithIntegrity("debtAccounts", data.debtAccounts)
      }

      // Import credit accounts (only if selected)
      if (data.creditAccounts && Array.isArray(data.creditAccounts)) {
        setCreditAccounts(data.creditAccounts)
        await saveDataWithIntegrity("creditAccounts", data.creditAccounts)
      }

      // Import debt/credit transactions
      if (data.debtCreditTransactions && Array.isArray(data.debtCreditTransactions)) {
        setDebtCreditTransactions(data.debtCreditTransactions)
        await saveDataWithIntegrity("debtCreditTransactions", data.debtCreditTransactions)
      }

      // Import categories (only if selected)
      if (data.categories && Array.isArray(data.categories)) {
        const importedCustomCategories = data.categories.filter((category: any) => !category?.isDefault)
        setCategories(importedCustomCategories)
        await saveDataWithIntegrity("categories", importedCustomCategories)
      }

      // Import emergency fund (only if selected)
      if (typeof data.emergencyFund === 'number' || typeof data.emergencyFund === 'string') {
        const emergencyFundValue = Number.parseFloat(data.emergencyFund.toString()) || 0
        setEmergencyFund(emergencyFundValue)
        await saveDataWithIntegrity("emergencyFund", emergencyFundValue)
      }

      // Import scrollbar setting (only if userProfile is imported)
      if (data.settings?.showScrollbars !== undefined && data.userProfile && typeof window !== 'undefined') {
        localStorage.setItem("wallet_show_scrollbars", data.settings.showScrollbars.toString())
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
    } catch (error) {
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
          setCategories(latest.categories)
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

    if (goal.currentAmount < amount) {
      return {
        error: `Insufficient goal balance. Available: ${userProfile?.currency || "$"}${goal.currentAmount.toFixed(2)}, Requested: ${userProfile?.currency || "$"}${amount.toFixed(2)}`,
        success: false,
      }
    }

    const spendTransaction: Transaction = {
      id: generateId('tx'),
      type: "expense",
      amount: amount,
      description: `Goal spending: ${goal.title} - ${description}`,
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
        return { ...g, currentAmount: g.currentAmount - amount }
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
      remainingGoalAmount: goal.currentAmount - amount,
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
    saveDataWithIntegrity("categories", updatedCategories)
    return newCategory
  }

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const updatedCategories = categories.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat))
    setCategories(updatedCategories)
    await saveDataWithIntegrity("categories", updatedCategories)
  }

  const deleteCategory = async (id: string) => {
    const updatedCategories = categories.filter((cat) => cat.id !== id)
    setCategories(updatedCategories)
    await saveDataWithIntegrity("categories", updatedCategories)
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
    await saveDataWithIntegrity("categories", updatedCategories)
  }

  const addPortfolioItem = async (item: Omit<PortfolioItem, "id">) => {
    const newItem: PortfolioItem = {
      ...item,
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
    if (itemToDelete) {
      // Also delete all transactions associated with this symbol
      const symbolToDelete = itemToDelete.symbol
      const updatedTransactions = shareTransactions.filter((t) => t.symbol !== symbolToDelete)
      setShareTransactions(updatedTransactions)
      await saveDataWithIntegrity("shareTransactions", updatedTransactions)
    }

    const updatedPortfolio = portfolio.filter((item) => item.id !== id)
    setPortfolio(updatedPortfolio)
    await saveDataWithIntegrity("portfolio", updatedPortfolio)
  }

  const addPortfolio = async (name: string, description?: string, color?: string) => {
    const newPortfolio: Portfolio = {
      id: generateId('port_list'),
      name,
      description,
      color,
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

    // Delete all associated items and transactions
    const updatedItems = portfolio.filter(p => p.portfolioId !== id)
    setPortfolio(updatedItems)
    await saveDataWithIntegrity("portfolio", updatedItems)

    const updatedTxs = shareTransactions.filter(t => t.portfolioId !== id)
    setShareTransactions(updatedTxs)
    await saveDataWithIntegrity("shareTransactions", updatedTxs)

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

  // Module-level cache (resets on browser reload)
  let globalPortfolioCache: {
    priceData: any[],
    sectorData: Record<string, string[]>,
    timestamp: number
  } | null = null

  const fetchPortfolioPrices = async (portfolioOverride?: PortfolioItem[], forceRefresh: boolean = false) => {
    const targetPortfolio = portfolioOverride || portfolio
    if (targetPortfolio.length === 0) return

    try {
      // Check cache validity (2 minutes = 120000 milliseconds)
      const CACHE_DURATION = 2 * 60 * 1000
      const now = Date.now()

      const isCacheValid = globalPortfolioCache &&
        (now - globalPortfolioCache.timestamp) < CACHE_DURATION

      // If cache is valid and not forcing refresh, use cached data
      if (isCacheValid && !forceRefresh && globalPortfolioCache) {
        const { priceData, sectorData } = globalPortfolioCache

        // Process cached data same way as fresh data
        const symbolToSector: Record<string, string> = {}
        const symbolToName: Record<string, string> = {}
        Object.entries(sectorData).forEach(([sector, scrips]) => {
          if (Array.isArray(scrips)) {
            scrips.forEach((scrip: any) => {
              const sym = (typeof scrip === 'string' ? scrip : (scrip.symbol || "")).trim().toUpperCase()
              if (sym) {
                symbolToSector[sym] = sector
                if (scrip.name) {
                  symbolToName[sym] = scrip.name.trim()
                }
              }
            })
          }
        })

        const updatedPortfolio = targetPortfolio.map(item => {
          const matchingStock = priceData.find((s: any) =>
            (s.symbol || s.ticker || s.scrip || "").trim().toUpperCase() === item.symbol.trim().toUpperCase()
          )

          const sector = symbolToSector[item.symbol.trim().toUpperCase()] || item.sector || "Others"

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
            sector: sector
          }
        })

        // Optimized state updates
        if (JSON.stringify(updatedPortfolio) !== JSON.stringify(targetPortfolio)) {
          setPortfolio(updatedPortfolio)
          await saveDataWithIntegrity("portfolio", updatedPortfolio)
        }
        return updatedPortfolio
      }

      // Fetch fresh data from API
      const [priceRes, sectorRes] = await Promise.all([
        fetch("/api/nepse/today"),
        fetch("/api/nepse/sectors")
      ])

      const priceData = await priceRes.json()
      let sectorData: Record<string, string[]> = {}

      try {
        if (sectorRes.ok) {
          sectorData = await sectorRes.json()
        }
      } catch (e) {
      }

      if (!priceRes.ok) {
        throw new Error(priceData.message || priceData.error || "Nepal Stock APIs are currently unavailable")
      }

      if (!Array.isArray(priceData)) {
        throw new Error("Received invalid data format from stock exchange")
      }

      // Update memory cache
      globalPortfolioCache = {
        priceData,
        sectorData,
        timestamp: now
      }

      // Create maps for sectors and names
      const symbolToSector: Record<string, string> = {}
      const symbolToName: Record<string, string> = {}
      Object.entries(sectorData).forEach(([sector, scrips]) => {
        if (Array.isArray(scrips)) {
          scrips.forEach((scrip: any) => {
            const sym = (typeof scrip === 'string' ? scrip : (scrip.symbol || "")).trim().toUpperCase()
            if (sym) {
              symbolToSector[sym] = sector
              if (scrip.name) {
                symbolToName[sym] = scrip.name.trim()
              }
            }
          })
        }
      })

      const updatedPortfolio = targetPortfolio.map(item => {
        const matchingStock = priceData.find((s: any) =>
          (s.symbol || s.ticker || s.scrip || "").trim().toUpperCase() === item.symbol.trim().toUpperCase()
        )

        // Try to get sector from map, or keep existing, or fallback to "Others"
        const sector = symbolToSector[item.symbol.trim().toUpperCase()] || item.sector || "Others"

        if (matchingStock) {
          // Normalize price field names from various community APIs
          const ltp = Number(matchingStock.last_traded_price || matchingStock.ltp || matchingStock.close || matchingStock.price || item.currentPrice)
          const pc = Number(matchingStock.previous_close || matchingStock.pc || matchingStock.prev_close || item.previousClose)
          const high = Number(matchingStock.high || matchingStock.high_price || item.high)
          const low = Number(matchingStock.low || matchingStock.low_price || item.low)
          const volume = Number(matchingStock.volume || matchingStock.total_volume || item.volume)
          const change = Number(matchingStock.change || (ltp - pc) || item.change)
          const percentChange = Number(matchingStock.percent_change || matchingStock.percentChange || (pc !== 0 ? (change / pc) * 100 : 0) || item.percentChange)

          return {
            ...item,
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

        // Even if price not found, update sector if we found it
        return {
          ...item,
          sector: sector
        }
      })

      setPortfolio(updatedPortfolio)
      setSectorsMap(prev => ({ ...prev, ...symbolToSector }))
      setScripNamesMap(prev => ({ ...prev, ...symbolToName }))
      saveToLocalStorage("sectorsMap", symbolToSector)
      saveToLocalStorage("scripNamesMap", symbolToName)
      await saveDataWithIntegrity("portfolio", updatedPortfolio)
      return updatedPortfolio
    } catch (error: any) {
      throw error // Propagate specialized error
    }
  }

  const addShareTransaction = async (tx: Omit<ShareTransaction, "id">) => {
    const newTx: ShareTransaction = {
      ...tx,
      id: generateId('stx'),
    }
    const updatedTransactions = [...shareTransactions, newTx]
    setShareTransactions(updatedTransactions)
    await saveDataWithIntegrity("shareTransactions", updatedTransactions)

    // Update Portfolio based on transaction
    const existingItem = portfolio.find(p => p.symbol === tx.symbol && p.portfolioId === tx.portfolioId)
    let updatedPortfolio = [...portfolio]

    if (tx.type === 'buy' || tx.type === 'ipo' || tx.type === 'bonus' || tx.type === 'merger_in') {
      if (existingItem) {
        const totalUnits = existingItem.units + tx.quantity
        const totalCost = (existingItem.units * existingItem.buyPrice) + (tx.quantity * tx.price)
        const avgPrice = totalUnits > 0 ? totalCost / totalUnits : 0

        updatedPortfolio = portfolio.map(p =>
          p.symbol === tx.symbol ? { ...p, units: totalUnits, buyPrice: avgPrice, lastUpdated: new Date().toISOString() } : p
        )
      } else {
        updatedPortfolio.push({
          id: generateId('port'),
          portfolioId: activePortfolioId!,
          symbol: tx.symbol,
          units: tx.quantity,
          buyPrice: tx.price,
          sector: sectorsMap[tx.symbol.toUpperCase()] || "Others",
          lastUpdated: new Date().toISOString()
        })
      }
    } else if (tx.type === 'sell' || tx.type === 'merger_out') {
      if (existingItem) {
        const remainingUnits = Math.max(0, existingItem.units - tx.quantity)
        if (remainingUnits <= 0) {
          updatedPortfolio = portfolio.filter(p => !(p.symbol === tx.symbol && p.portfolioId === tx.portfolioId))
        } else {
          updatedPortfolio = portfolio.map(p =>
            (p.symbol === tx.symbol && p.portfolioId === tx.portfolioId) ? { ...p, units: remainingUnits, lastUpdated: new Date().toISOString() } : p
          )
        }
      }
    }

    setPortfolio(updatedPortfolio)
    await saveDataWithIntegrity("portfolio", updatedPortfolio)
    return { newTx, updatedPortfolio }
  }

  const deleteShareTransaction = async (id: string) => {
    return await deleteMultipleShareTransactions([id])
  }

  const recomputePortfolio = async (transactionsToUse?: ShareTransaction[]) => {
    const txs = transactionsToUse || shareTransactions
    const newPortfolio: PortfolioItem[] = []

    // Group by portfolioId first, then by symbol
    const groupedByPortfolio = txs.reduce((acc, tx) => {
      if (!acc[tx.portfolioId]) acc[tx.portfolioId] = {}
      if (!acc[tx.portfolioId][tx.symbol]) acc[tx.portfolioId][tx.symbol] = []
      acc[tx.portfolioId][tx.symbol].push(tx)
      return acc
    }, {} as Record<string, Record<string, ShareTransaction[]>>)

    for (const [pId, symbolMap] of Object.entries(groupedByPortfolio)) {
      for (const [symbol, symbolTxs] of Object.entries(symbolMap)) {
        let totalUnits = 0
        let totalCost = 0

        const sortedSymbolTxs = [...symbolTxs].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )

        sortedSymbolTxs.forEach((t) => {
          if (t.type === "buy" || t.type === "ipo" || t.type === "bonus" || t.type === "merger_in") {
            totalUnits += t.quantity
            totalCost += t.quantity * t.price
          } else if (t.type === "sell" || t.type === "merger_out") {
            totalUnits = Math.max(0, totalUnits - t.quantity)
          }
        })

        if (totalUnits > 0) {
          const existing = portfolio.find(p => p.symbol === symbol && p.portfolioId === pId)
          newPortfolio.push({
            id: existing?.id || generateId("port"),
            portfolioId: pId,
            symbol: symbol,
            units: totalUnits,
            buyPrice: totalUnits > 0 ? totalCost / totalUnits : 0,
            currentPrice: existing?.currentPrice,
            previousClose: existing?.previousClose,
            sector: existing?.sector || sectorsMap[symbol.toUpperCase()] || "Others",
            lastUpdated: new Date().toISOString(),
          })
        }
      }
    }

    setPortfolio(newPortfolio)
    await saveDataWithIntegrity("portfolio", newPortfolio)
    return newPortfolio
  }

  const deleteMultipleShareTransactions = async (ids: string[]) => {
    if (ids.length === 0) return

    const txsToDelete = shareTransactions.filter((t) => ids.includes(t.id))
    // Group affected (portfolioId, symbol) pairs
    const affectedPairs = txsToDelete.reduce((acc, tx) => {
      const key = `${tx.portfolioId}:${tx.symbol}`
      acc.add(key)
      return acc
    }, new Set<string>())

    const updatedTransactions = shareTransactions.filter((t) => !ids.includes(t.id))
    setShareTransactions(updatedTransactions)
    await saveDataWithIntegrity("shareTransactions", updatedTransactions)
    let updatedPortfolio = [...portfolio]

    for (const pair of affectedPairs) {
      const [pId, symbol] = pair.split(':')
      const symbolTransactions = updatedTransactions.filter((t) => t.symbol === symbol && t.portfolioId === pId)

      if (symbolTransactions.length === 0) {
        updatedPortfolio = updatedPortfolio.filter((p) => !(p.symbol === symbol && p.portfolioId === pId))
      } else {
        let totalUnits = 0
        let totalCost = 0

        const sortedSymbolTxs = [...symbolTransactions].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )

        sortedSymbolTxs.forEach((t) => {
          if (t.type === "buy" || t.type === "ipo" || t.type === "bonus" || t.type === "merger_in") {
            totalUnits += t.quantity
            totalCost += t.quantity * t.price
          } else if (t.type === "sell" || t.type === "merger_out") {
            totalUnits = Math.max(0, totalUnits - t.quantity)
          }
        })

        const avgPrice = totalUnits > 0 ? totalCost / (totalCost > 0 ? totalUnits : 1) : 0
        const exists = updatedPortfolio.find((p) => p.symbol === symbol && p.portfolioId === pId)

        if (exists) {
          if (totalUnits <= 0) {
            updatedPortfolio = updatedPortfolio.filter((p) => !(p.symbol === symbol && p.portfolioId === pId))
          } else {
            updatedPortfolio = updatedPortfolio.map((p) =>
              p.symbol === symbol && p.portfolioId === pId
                ? { ...p, units: totalUnits, buyPrice: avgPrice, lastUpdated: new Date().toISOString() }
                : p
            )
          }
        } else if (totalUnits > 0) {
          updatedPortfolio.push({
            id: generateId('port'),
            portfolioId: pId,
            symbol: symbol,
            units: totalUnits,
            buyPrice: avgPrice,
            sector: sectorsMap[symbol.toUpperCase()] || "Others",
            lastUpdated: new Date().toISOString()
          })
        }
      }
    }

    setPortfolio(updatedPortfolio)
    await saveDataWithIntegrity("portfolio", updatedPortfolio)
    return updatedPortfolio
  }

  const clearPortfolioHistory = async () => {
    if (!activePortfolioId) return
    const updatedTransactions = shareTransactions.filter(t => t.portfolioId !== activePortfolioId)
    setShareTransactions(updatedTransactions)
    await saveDataWithIntegrity("shareTransactions", updatedTransactions)
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
      const sector = sectorsMap[symbol.toUpperCase()]
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
            sector: sectorsMap[symbol.toUpperCase()] || "Others",
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
      rows.slice(1).forEach(row => {
        if (row.length < 7) return
        const symbol = row[1]
        const date = row[2]
        const credit = parseFloat(row[3]) || 0
        const debit = parseFloat(row[4]) || 0
        const desc = row[6]

        let txType: ShareTransaction['type'] = 'buy'
        if (desc.includes('BONUS') || desc.includes('Bonus')) txType = 'bonus'
        else if (desc.includes('IPO') || desc.includes('INITIAL PUBLIC OFFERING')) txType = 'ipo'
        else if (desc.includes('Merger')) txType = credit > 0 ? 'merger_in' : 'merger_out'
        else if (debit > 0) txType = 'sell'

        let price = 0
        if (txType === 'ipo' || txType === 'buy' || txType === 'merger_in') {
          const defaultPrice = (txType === 'ipo' || txType === 'merger_in') ? getFaceValue(symbol) : 0
          price = resolvedPrices && resolvedPrices[symbol] !== undefined
            ? resolvedPrices[symbol]
            : defaultPrice
        }

        if (symbol && date) {
          newTxs.push({
            id: generateId('stx'),
            portfolioId: activePortfolioId!,
            symbol,
            date,
            quantity: credit || debit,
            price: price,
            type: txType,
            description: desc
          })
        }
      })
      const otherPortfolioTxs = shareTransactions.filter(t => t.portfolioId !== activePortfolioId)
      const updatedTxs = [...otherPortfolioTxs, ...newTxs]
      setShareTransactions(updatedTxs)
      await saveDataWithIntegrity("shareTransactions", updatedTxs)
      return await recomputePortfolio(updatedTxs)
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
          p => p.portfolioId === portId && p.symbol.trim().toUpperCase() === item.symbol.trim().toUpperCase()
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
    addBudget,
    updateBudget,
    deleteBudget,
    addGoal,
    updateGoal,
    deleteGoal,
    deleteTransaction,
    addDebtAccount,
    addDebtToAccount,
    addCreditAccount,
    deleteDebtAccount,
    deleteCreditAccount,
    addToEmergencyFund,
    updateGoalContribution,
    transferToGoal,
    spendFromGoal,
    makeDebtPayment,
    updateCreditBalance,
    createDebtForTransaction,
    completeTransactionWithDebt,
    addPortfolioItem,
    updatePortfolioItem,
    deletePortfolioItem,
    addPortfolio,
    switchPortfolio,
    deletePortfolio,
    updatePortfolio,
    clearPortfolioHistory,
    fetchPortfolioPrices,
    syncMeroSharePortfolio,
    applyMeroShareIPO,
    checkIPOAllotment: checkIPOAllotmentWithLog,
    upcomingIPOs,
    scripNamesMap,
    isIPOsLoading,
    getFaceValue: (symbol: string) => {
      const sector = sectorsMap[symbol.toUpperCase()]
      return sector === "Mutual Fund" ? 10 : 100
    },
    addShareTransaction,
    deleteShareTransaction,
    deleteMultipleShareTransactions,
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
