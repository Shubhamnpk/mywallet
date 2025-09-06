"use client"

import { useState, useEffect } from "react"
import { DataIntegrityManager } from "@/lib/data-integrity"
import { SecureKeyManager } from "@/lib/key-manager"
import type {
  UserProfile,
  Transaction,
  Budget,
  Goal,
  DebtAccount,
  CreditAccount,
  DebtCreditTransaction,
  Category,
} from "@/types/wallet"

import { calculateBalance, initializeDefaultCategories, calculateTimeEquivalent, generateId } from "@/lib/wallet-utils"
import { loadFromLocalStorage, saveToLocalStorage } from "@/lib/storage"
import { updateBudgetSpendingHelper, updateGoalContributionHelper, updateCategoryStatsHelper } from "@/lib/wallet-ops"
import { SessionManager } from "@/lib/session-manager"

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
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (isLoaded) return

    console.log('[HYDRATION] Starting to load wallet data from localStorage')
    loadDataWithIntegrityCheck()
  }, [isLoaded])

  // Hoisted function so it can be used during initial load before
  // other const declarations are evaluated.
  async function saveDataWithIntegrity(key: string, data: any) {
    try {
      await saveToLocalStorage(key, data)

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
        [key]: data,
      }

      await DataIntegrityManager.updateIntegrityRecord(allData)
    } catch (error) {
      try {
        await saveToLocalStorage(key, data)
      } catch (e) {
      }
    }
  }

  const loadDataWithIntegrityCheck = async () => {
    try {
      const savedProfile = localStorage.getItem("userProfile")
      const savedTransactions = localStorage.getItem("transactions")
      const savedBudgets = localStorage.getItem("budgets")
      const savedGoals = localStorage.getItem("goals")
      const savedDebtAccounts = localStorage.getItem("debtAccounts")
      const savedCreditAccounts = localStorage.getItem("creditAccounts")
      const savedEmergencyFund = localStorage.getItem("emergencyFund")
      const savedDebtCreditTransactions = localStorage.getItem("debtCreditTransactions")
      const savedCategories = localStorage.getItem("categories")

      const parsedData = {
        userProfile: savedProfile ? JSON.parse(savedProfile) : null,
        transactions: savedTransactions ? JSON.parse(savedTransactions) : [],
        budgets: savedBudgets ? JSON.parse(savedBudgets) : [],
        goals: savedGoals ? JSON.parse(savedGoals) : [],
        debtAccounts: savedDebtAccounts ? JSON.parse(savedDebtAccounts) : [],
        creditAccounts: savedCreditAccounts ? JSON.parse(savedCreditAccounts) : [],
        debtCreditTransactions: savedDebtCreditTransactions ? JSON.parse(savedDebtCreditTransactions) : [],
        categories: savedCategories ? JSON.parse(savedCategories) : [],
        emergencyFund: savedEmergencyFund ? Number.parseFloat(savedEmergencyFund) : 0,
      }

      if (parsedData.userProfile || parsedData.transactions.length > 0) {
        const validation = await DataIntegrityManager.validateAllData(parsedData)

        if (!validation.isValid) {
        } else {
        }
      }

      if (parsedData.userProfile) {
        setUserProfile(parsedData.userProfile)
        setIsFirstTime(false)

        if (parsedData.userProfile.securityEnabled && parsedData.userProfile.pin) {
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(true)
        }
      } else {
        setShowOnboarding(true)
        setIsAuthenticated(true)
      }

      if (parsedData.transactions.length > 0) {
        setTransactions(parsedData.transactions)
        // Calculate balance based on actual cash flow (not including debt amounts)
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
    } catch (error) {
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
      createdAt: new Date().toISOString(),
    }

    setUserProfile(completeProfile)
    saveDataWithIntegrity("userProfile", completeProfile)
    setShowOnboarding(false)
    setIsFirstTime(false)
    setIsAuthenticated(true)
  }

  const addTransaction = async (transaction: Omit<Transaction, "id" | "timeEquivalent">) => {
    // Only handle expense transactions for now - income transactions are always normal
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

    // Check if balance is sufficient
    if (balance >= transactionAmount) {
      // Normal transaction - fully paid from balance
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
      // Insufficient balance - don't record transaction yet
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
    saveToLocalStorage("budgets", updatedBudgets)
    return warnings
  }

  const updateGoalContribution = (goalId: string, amount: number) => {
    const updatedGoals = updateGoalContributionHelper(goals, goalId, amount)
    setGoals(updatedGoals)
    saveToLocalStorage("goals", updatedGoals)
  }

  const addToEmergencyFund = (amount: number) => {
    const newEmergencyFund = emergencyFund + amount
    setEmergencyFund(newEmergencyFund)
  saveToLocalStorage("emergencyFund", newEmergencyFund.toString())
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

    const updatedProfile = { ...userProfile, ...updates }
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
    saveToLocalStorage("debtAccounts", updatedDebts)
    return newDebt
  }

  const createDebtForTransaction = async (debtAmount: number, transactionDescription: string) => {
    // This will be called from the UI after user provides debt details
    // For now, return the debt amount so the UI can handle the dialog
    return { debtAmount, transactionDescription }
  }

  const completeTransactionWithDebt = async (
    pendingTransaction: Omit<Transaction, "id" | "timeEquivalent">,
    debtAccountName: string,
    debtAccountId: string,
    availableBalance: number,
    debtAmount: number
  ) => {
    // Deduct available balance to 0
    const newBalance = balance - availableBalance
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
  saveToLocalStorage("creditAccounts", updatedCredits)
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
  saveToLocalStorage("creditAccounts", updatedCredits)
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

    setDebtAccounts(updatedDebts)
  saveToLocalStorage("debtAccounts", updatedDebts)

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
  saveToLocalStorage("debtCreditTransactions", updatedDebtTransactions)

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
    saveToLocalStorage("goals", updatedGoals)
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

    // Reset all state to completely empty (no default data)
    setUserProfile(null)
    setTransactions([])
    setBudgets([])
    setGoals([])
    setDebtAccounts([])
    setCreditAccounts([])
    setDebtCreditTransactions([])
    setCategories([]) // Empty categories, no defaults
    setEmergencyFund(0)
    setBalance(0)
    setIsAuthenticated(false)
    setShowOnboarding(true)
    setIsFirstTime(true)

  }

  const exportData = () => {
    const data = {
      userProfile,
      transactions,
      budgets,
      goals,
      debtAccounts,
      creditAccounts,
      debtCreditTransactions,
      categories,
      emergencyFund,
      exportDate: new Date().toISOString(),
      version: "1.0",
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
      console.log("[v0] Starting data import...")
      const data = typeof dataOrJson === 'string' ? JSON.parse(dataOrJson) : dataOrJson

      // Validate data structure
      if (!data.userProfile && !Array.isArray(data.transactions)) {
        throw new Error("Invalid backup file format - missing required data")
      }

      // Import user profile
      if (data.userProfile) {
        console.log("[v0] Importing user profile...")
        setUserProfile(data.userProfile)
        await saveDataWithIntegrity("userProfile", data.userProfile)
      }

      // Import transactions
      if (data.transactions && Array.isArray(data.transactions)) {
        console.log(`[v0] Importing ${data.transactions.length} transactions...`)
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

      // Import other data
      if (data.budgets && Array.isArray(data.budgets)) {
        console.log(`[v0] Importing ${data.budgets.length} budgets...`)
        setBudgets(data.budgets)
        await saveDataWithIntegrity("budgets", data.budgets)
      }

      if (data.goals && Array.isArray(data.goals)) {
        console.log(`[v0] Importing ${data.goals.length} goals...`)
        setGoals(data.goals)
        await saveDataWithIntegrity("goals", data.goals)
      }

      if (data.debtAccounts && Array.isArray(data.debtAccounts)) {
        console.log(`[v0] Importing ${data.debtAccounts.length} debt accounts...`)
        setDebtAccounts(data.debtAccounts)
        await saveDataWithIntegrity("debtAccounts", data.debtAccounts)
      }

      if (data.creditAccounts && Array.isArray(data.creditAccounts)) {
        console.log(`[v0] Importing ${data.creditAccounts.length} credit accounts...`)
        setCreditAccounts(data.creditAccounts)
        await saveDataWithIntegrity("creditAccounts", data.creditAccounts)
      }

      if (data.debtCreditTransactions && Array.isArray(data.debtCreditTransactions)) {
        console.log(`[v0] Importing ${data.debtCreditTransactions.length} debt/credit transactions...`)
        setDebtCreditTransactions(data.debtCreditTransactions)
        await saveDataWithIntegrity("debtCreditTransactions", data.debtCreditTransactions)
      }

      if (data.categories && Array.isArray(data.categories)) {
        console.log(`[v0] Importing ${data.categories.length} categories...`)
        setCategories(data.categories)
        await saveDataWithIntegrity("categories", data.categories)
      }

      // Import emergency fund
      if (typeof data.emergencyFund === 'number' || typeof data.emergencyFund === 'string') {
        const emergencyFundValue = Number.parseFloat(data.emergencyFund.toString()) || 0
        console.log(`[v0] Importing emergency fund: ${emergencyFundValue}`)
        setEmergencyFund(emergencyFundValue)
        await saveDataWithIntegrity("emergencyFund", emergencyFundValue.toString())
      }

      // Import scrollbar setting
      if (data.settings?.showScrollbars !== undefined) {
        console.log(`[v0] Importing scrollbar setting: ${data.settings.showScrollbars}`)
        localStorage.setItem("wallet_show_scrollbars", data.settings.showScrollbars.toString())
      }

      console.log("[v0] Data import completed successfully")
      return true
    } catch (error) {
      console.error("[v0] Error importing data:", error)
      return false
    }
  }

  const refreshData = () => {
    try {
      const savedBudgets = localStorage.getItem("budgets")
      const savedGoals = localStorage.getItem("goals")
      const savedTransactions = localStorage.getItem("transactions")
      const savedCategories = localStorage.getItem("categories")

      if (savedBudgets) {
        const parsedBudgets = JSON.parse(savedBudgets)
        setBudgets(parsedBudgets)
      }

      if (savedGoals) {
        const parsedGoals = JSON.parse(savedGoals)
        setGoals(parsedGoals)
      }

      if (savedTransactions) {
        const parsedTransactions = JSON.parse(savedTransactions)
        setTransactions(parsedTransactions)
        // Calculate balance based on actual cash flow
        const actualBalance = parsedTransactions.reduce((sum: number, tx: Transaction) => {
          if (tx.type === "income") {
            return sum + (tx.actual ?? tx.amount)
          } else {
            return sum - (tx.actual ?? tx.amount)
          }
        }, 0)
        setBalance(actualBalance)
      }

      if (savedCategories) {
        const parsedCategories = JSON.parse(savedCategories)
        setCategories(parsedCategories)
      }
    } catch (error) {}
  }

  const spendFromGoal = async (goalId: string, amount: number, description: string) => {
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
      category: "Goal Spending",
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

    console.log("[v0] Goal spending completed successfully")

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
    const category = categories.find((cat) => cat.id === id)
    if (category?.isDefault) {
      throw new Error("Cannot delete default categories")
    }

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
