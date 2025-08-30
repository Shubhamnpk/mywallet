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

    loadDataWithIntegrityCheck()
  }, [isLoaded])

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
        console.log("[v0] Verifying data integrity...")
        const validation = await DataIntegrityManager.validateAllData(parsedData)

        if (!validation.isValid) {
          console.warn("[v0] Data integrity issues found:", validation.issues)
          console.warn("[v0] Integrity check:", validation.integrityCheck)
        } else {
          console.log("[v0] Data integrity verification passed")
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
        setBalance(calculateBalance(parsedData.transactions))
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
        const defaultCategories = initializeDefaultCategories()
        setCategories(defaultCategories)
        await saveDataWithIntegrity("categories", defaultCategories)
      }

      setIsLoaded(true)
    } catch (error) {
      console.error("[v0] Error loading wallet data:", error)
      setShowOnboarding(true)
      setIsAuthenticated(true)
      setIsLoaded(true)
    }
  }

  const saveDataWithIntegrity = async (key: string, data: any) => {
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
      console.log("[v0] Data saved with integrity verification")
    } catch (error) {
      console.error("[v0] Failed to save data with integrity:", error)
      try {
        await saveToLocalStorage(key, data)
      } catch (e) {
        console.error("[v0] Fallback localStorage write failed:", e)
      }
    }
  }

  const handleOnboardingComplete = async (profileData: UserProfile) => {
    const completeProfile = {
      ...profileData,
      securityEnabled: false,
      createdAt: new Date().toISOString(),
    }

    setUserProfile(completeProfile)
    await saveDataWithIntegrity("userProfile", completeProfile)
    setShowOnboarding(false)
    setIsFirstTime(false)
    setIsAuthenticated(true)
  }

  const addTransaction = async (transaction: Omit<Transaction, "id" | "timeEquivalent">) => {
    console.log("[v0] Calling addTransaction with:", transaction)

    const newTransactionAmount = transaction.type === "income" ? transaction.amount : -transaction.amount
    const newBalance = balance + newTransactionAmount

    setBalanceChange({
      amount: transaction.amount,
      type: transaction.type,
    })

    setTimeout(() => {
      setBalanceChange(null)
    }, 2000)

    const relevantBudgets = budgets.filter((budget) => budget.categories.includes(transaction.category))

    let budgetWarnings: any[] = []
    let debtAmount = 0
    let useCredit = false

    if (transaction.type === "expense") {
      if (newBalance < 0) {
        const deficit = Math.abs(newBalance)
        const hasDebtAllowedBudget = relevantBudgets.some((budget) => budget.allowDebt)
        const availableCredit = creditAccounts.reduce(
          (total, account) => total + (account.creditLimit - account.balance),
          0,
        )

        const totalAvailable = emergencyFund + availableCredit

        if (!hasDebtAllowedBudget && totalAvailable < deficit) {
    const errorMessage = `Insufficient funds. Need ${userProfile?.currency || "$"}${deficit.toFixed(2)} but only have ${userProfile?.currency || "$"}${totalAvailable.toFixed(2)} available (Emergency: ${userProfile?.currency || "$"}${emergencyFund.toFixed(2)}, Credit: ${userProfile?.currency || "$"}${availableCredit.toFixed(2)})`
          console.log("[v0] Transaction failed:", errorMessage)
          throw new Error(errorMessage)
        }

        debtAmount = deficit

        if (emergencyFund >= deficit) {
        } else if (emergencyFund > 0) {
          useCredit = true
        } else {
          useCredit = true
        }
      }

      for (const budget of relevantBudgets) {
        const newSpent = budget.spent + transaction.amount
        if (newSpent > budget.limit) {
          const excess = newSpent - budget.limit
          if (budget.emergencyUses > 0) {
            budgetWarnings.push({
              budget: budget.category,
              message: `Budget exceeded by ${userProfile?.currency || "$"}${excess.toFixed(2)}. Using emergency override.`,
              type: "emergency",
            })
          } else if (budget.allowDebt && budget.debtLimit && excess <= budget.debtLimit) {
            const existingDebt = debtAccounts.find((d) => d.name.includes(budget.category))
            if (!existingDebt) {
              const newDebtAccount = addDebtAccount({
                name: `${budget.category} Debt`,
                balance: excess,
                interestRate: 18.0,
                minimumPayment: Math.max(25, excess * 0.02),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: new Date().toISOString(),
              })
              budgetWarnings.push({
                budget: budget.category,
                message: `Created debt account for ${userProfile?.currency || "$"}${excess.toFixed(2)} excess spending.`,
                type: "debt_created",
              })
            }
            budgetWarnings.push({
              budget: budget.category,
              message: `Budget exceeded. Adding ${userProfile?.currency || "$"}${excess.toFixed(2)} to debt.`,
              type: "debt",
            })
          } else {
            const errorMessage = `Transaction exceeds budget limit for ${budget.category} and no emergency uses or debt allowance available.`
            console.log("[v0] Transaction failed:", errorMessage)
            throw new Error(errorMessage)
          }
        }
      }
    }

    const newTransaction: Transaction = {
      ...transaction,
      id: generateId('tx'),
      timeEquivalent:
        transaction.type === "expense" && userProfile
          ? calculateTimeEquivalent(transaction.amount, userProfile)
          : undefined,
    }

    const updatedTransactions = [...transactions, newTransaction]

    setTransactions(updatedTransactions)
    setBalance(newBalance)
    await saveDataWithIntegrity("transactions", updatedTransactions)

    console.log("[v0] Updated balance immediately to:", newBalance)

    if (debtAmount > 0) {
      if (useCredit) {
        let remainingDebt = debtAmount
        if (emergencyFund > 0) {
          const emergencyUse = Math.min(emergencyFund, remainingDebt)
          const newEmergencyFund = emergencyFund - emergencyUse
          setEmergencyFund(newEmergencyFund)
          saveToLocalStorage("emergencyFund", newEmergencyFund.toString())
          remainingDebt -= emergencyUse

            if (emergencyUse > 0) {
            budgetWarnings.push({
              message: `Used ${userProfile?.currency || "$"}${emergencyUse.toFixed(2)} from emergency fund.`,
              type: "emergency_fund",
            })
          }
        }
        if (remainingDebt > 0) {
          const availableCredit = creditAccounts.find(
            (account) => account.creditLimit - account.balance >= remainingDebt,
          )
          if (availableCredit) {
            updateCreditBalance(availableCredit.id, availableCredit.balance + remainingDebt)
            budgetWarnings.push({
              message: `Used ${userProfile?.currency || "$"}${remainingDebt.toFixed(2)} from credit account: ${availableCredit.name}`,
              type: "credit_used",
            })
          }
        }
      } else if (emergencyFund >= debtAmount) {
  const newEmergencyFund = emergencyFund - debtAmount
  setEmergencyFund(newEmergencyFund)
  saveToLocalStorage("emergencyFund", newEmergencyFund.toString())
        budgetWarnings.push({
          message: `Used ${userProfile?.currency || "$"}${debtAmount.toFixed(2)} from emergency fund.`,
          type: "emergency_fund",
        })
      }
    }

    if (newTransaction.type === "expense" && newTransaction.category) {
      const budgetResults = updateBudgetSpending(newTransaction.category, newTransaction.amount)
      budgetWarnings = [...budgetWarnings, ...budgetResults]
    }

    if (newTransaction.allocationType === "goal" && newTransaction.allocationTarget) {
      updateGoalContribution(newTransaction.allocationTarget, newTransaction.amount)
    }

    return { transaction: newTransaction, budgetWarnings }
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
    }

    const updatedTransactions = [...transactions, transferTransaction]
    setTransactions(updatedTransactions)
    await saveDataWithIntegrity("transactions", updatedTransactions)
    setBalance(calculateBalance(updatedTransactions))

    updateGoalContribution(goalId, amount)

    console.log("[v0] Goal transfer completed successfully")

    return {
      success: true,
      transaction: transferTransaction,
      newGoalAmount: goal.currentAmount + amount,
    }
  }

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!userProfile) return

    const updatedProfile = { ...userProfile, ...updates }
    setUserProfile(updatedProfile)
    await saveDataWithIntegrity("userProfile", updatedProfile)
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
    }

    const updatedTransactions = [...transactions, paymentTransaction]
    setTransactions(updatedTransactions)
    await saveDataWithIntegrity("transactions", updatedTransactions)
    setBalance(calculateBalance(updatedTransactions))

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
    return newBudget
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

  const addGoal = async (goal: Omit<Goal, "id" | "currentAmount">) => {
    const newGoal: Goal = {
      ...goal,
      id: generateId('goal'),
      currentAmount: 0,
      priority: goal.priority || "medium",
      autoContribute: goal.autoContribute || false,
      createdAt: new Date().toISOString(),
    }

    const updatedGoals = [...goals, newGoal]
    setGoals(updatedGoals)
    await saveDataWithIntegrity("goals", updatedGoals)
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
    setBalance(calculateBalance(updatedTransactions))
  }

  const clearAllData = async () => {
    DataIntegrityManager.clearIntegrityRecords()
    SecureKeyManager.clearAllKeys()

    localStorage.removeItem("userProfile")
    localStorage.removeItem("transactions")
    localStorage.removeItem("budgets")
    localStorage.removeItem("goals")
    localStorage.removeItem("debtAccounts")
    localStorage.removeItem("creditAccounts")
    localStorage.removeItem("emergencyFund")
    localStorage.removeItem("debtCreditTransactions")
    localStorage.removeItem("categories")

    setUserProfile(null)
    setTransactions([])
    setBudgets([])
    setGoals([])
    setDebtAccounts([])
    setCreditAccounts([])
    setDebtCreditTransactions([])
    const defaultCategories = initializeDefaultCategories()
    setCategories(defaultCategories)
    await saveDataWithIntegrity("categories", defaultCategories)
    setEmergencyFund(0)
    setBalance(0)
    setShowOnboarding(true)
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

  const importData = async (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData)

      const validation = await DataIntegrityManager.validateAllData(data)
      if (!validation.isValid) {
        console.warn("[v0] Imported data has integrity issues:", validation.issues)
      }

      if (data.userProfile) {
        setUserProfile(data.userProfile)
        await saveDataWithIntegrity("userProfile", data.userProfile)
      }

      if (data.transactions) {
        setTransactions(data.transactions)
        await saveDataWithIntegrity("transactions", data.transactions)
        setBalance(calculateBalance(data.transactions))
      }

      setBudgets(data.budgets)
      setGoals(data.goals)
      setDebtAccounts(data.debtAccounts)
      setCreditAccounts(data.creditAccounts)
      setDebtCreditTransactions(data.debtCreditTransactions)
      setEmergencyFund(Number.parseFloat(data.emergencyFund))

      return true
    } catch (error) {
      console.error("Error importing data:", error)
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
        setBalance(calculateBalance(parsedTransactions))
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

  const addCategory = async (category: Omit<Category, "id" | "createdAt" | "totalSpent" | "transactionCount">) => {
    const newCategory: Category = {
      ...category,
      id: generateId('category'),
      createdAt: new Date().toISOString(),
      totalSpent: 0,
      transactionCount: 0,
    }

    const updatedCategories = [...categories, newCategory]
    setCategories(updatedCategories)
    await saveDataWithIntegrity("categories", updatedCategories)
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
    addToEmergencyFund,
    updateGoalContribution,
    transferToGoal,
    spendFromGoal,
    makeDebtPayment,
    updateCreditBalance,
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
