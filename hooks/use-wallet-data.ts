"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useConvexAuth } from "@/hooks/use-convex-auth"
import { DataIntegrityManager } from "@/lib/data-integrity"
import { SecureKeyManager } from "@/lib/key-manager"
import { SecurePinManager } from "@/lib/secure-pin-manager"
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
import { WalletDataEncryption } from "@/lib/encryption"

// Security and validation utilities
const SECURITY_CONSTANTS = {
  MAX_TRANSACTION_AMOUNT: 999999999.99,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_CATEGORY_NAME_LENGTH: 100,
  MIN_TRANSACTION_AMOUNT: 0.01,
  MAX_ARRAY_SIZE: 10000,
} as const

// Input validation helpers
const validateTransactionAmount = (amount: number): boolean => {
  return typeof amount === 'number' &&
         !isNaN(amount) &&
         isFinite(amount) &&
         amount >= SECURITY_CONSTANTS.MIN_TRANSACTION_AMOUNT &&
         amount <= SECURITY_CONSTANTS.MAX_TRANSACTION_AMOUNT
}

const validateDescription = (description: string): boolean => {
  return typeof description === 'string' &&
         description.length <= SECURITY_CONSTANTS.MAX_DESCRIPTION_LENGTH &&
         !/<script/i.test(description) // Basic XSS prevention
}

const validateCategoryName = (name: string): boolean => {
  return typeof name === 'string' &&
         name.length > 0 &&
         name.length <= SECURITY_CONSTANTS.MAX_CATEGORY_NAME_LENGTH &&
         !/<script/i.test(name)
}

const validateArraySize = (arr: any[]): boolean => {
  return Array.isArray(arr) && arr.length <= SECURITY_CONSTANTS.MAX_ARRAY_SIZE
}

const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') return ''
  return str.replace(/[<>'"&]/g, '').trim()
}

// Secure random ID generation with fallback
const generateSecureId = (prefix: string): string => {
  try {
    const array = new Uint8Array(16)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array)
    } else {
      // Fallback for environments without crypto API
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
    }
    const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    return `${prefix}_${Date.now()}_${hex}`
  } catch (error) {
    // Ultimate fallback
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Memoized calculation functions for performance
const useMemoizedCalculations = () => {
  const calculateBalanceMemo = useMemo(() =>
    (transactions: Transaction[]): number => {
      if (!validateArraySize(transactions)) return 0

      return transactions.reduce((sum: number, tx: Transaction) => {
        if (!tx || typeof tx.amount !== 'number') return sum

        const amount = tx.actual ?? tx.amount
        if (tx.type === "income") {
          return sum + amount
        } else {
          return sum - amount
        }
      }, 0)
    }, []
  )

  return { calculateBalanceMemo }
}

export function useWalletData() {
  const { user } = useConvexAuth()

  // Get device info consistent with sync system
  const getDeviceInfo = () => {
    let deviceId = localStorage.getItem("convex_device_id")

    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem("convex_device_id", deviceId)
    }

    return deviceId
  }

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
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    if (isLoaded) return
    if (typeof window === 'undefined') {
      setIsLoaded(true)
      return
    }

    // For new users, immediately show onboarding without loading data
    const hasAnyStoredData = !!(
      localStorage.getItem("userProfile") ||
      localStorage.getItem("transactions") ||
      localStorage.getItem("budgets") ||
      localStorage.getItem("goals") ||
      localStorage.getItem("debtAccounts") ||
      localStorage.getItem("creditAccounts") ||
      localStorage.getItem("categories")
    )

    if (!hasAnyStoredData) {
      // New user - show onboarding immediately
      setShowOnboarding(true)
      setIsAuthenticated(true)
      setIsLoaded(true)
      return
    }

    // Existing user - load their data
    loadDataWithIntegrityCheck()
  }, [isLoaded])

  // Hoisted function so it can be used during initial load before
  async function saveDataWithIntegrity(key: string, data: any) {
    try {
      if (typeof window === 'undefined') {
        await saveToLocalStorage(key, data)
        return
      }

      // Check if user has security enabled (PIN set up)
      const hasSecurity = SecurePinManager.hasPin()
      const hasConvexAuth = !!user // Check if user is authenticated with Convex

      if (hasSecurity && !hasConvexAuth) {
        // Use PIN-based encryption for non-convex users with security enabled
        if (!WalletDataEncryption.isInitialized()) {
          // Try to get cached master key from SecureKeyManager
          const masterKey = await SecureKeyManager.getMasterKey("")
          if (masterKey) {
            // Initialize WalletDataEncryption with the existing CryptoKey
            await WalletDataEncryption.initializeWithKey(masterKey)
          } else {
            // For now, fall back to unencrypted storage
            await saveToLocalStorage(key, data)
            return
          }
        }

        const encryptedData = await WalletDataEncryption.encryptData(data)
        await saveToLocalStorage(key, encryptedData)
      } else if (hasConvexAuth) {
        // Use existing Convex encryption system
        if (!WalletDataEncryption.isInitialized()) {
          const initialized = await WalletDataEncryption.initializeWithStoredKey()
          if (!initialized) {
            await WalletDataEncryption.generateNewKey()
          }
        }

        const encryptedData = await WalletDataEncryption.encryptData(data)
        await saveToLocalStorage(key, encryptedData)
      } else {
        // No security enabled - store as plain text
        await saveToLocalStorage(key, data)
      }

      // Update integrity record for all data types (skip during onboarding to avoid conflicts)
      if (key !== 'userProfile' || data?.securityEnabled !== false) {
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
      }
    } catch (error) {
      try {
        // Fallback to unencrypted storage if encryption fails
        await saveToLocalStorage(key, data)
      } catch (e) {
        // Fallback storage also failed
      }
    }
  }

  const loadDataWithIntegrityCheck = async () => {
    try {
      // Skip localStorage access during SSR
      if (typeof window === 'undefined') {
        setShowOnboarding(true)
        setIsAuthenticated(true)
        setIsLoaded(true)
        return
      }

      const savedProfile = localStorage.getItem("userProfile")
      const savedTransactions = localStorage.getItem("transactions")
      const savedBudgets = localStorage.getItem("budgets")
      const savedGoals = localStorage.getItem("goals")
      const savedDebtAccounts = localStorage.getItem("debtAccounts")
      const savedCreditAccounts = localStorage.getItem("creditAccounts")
      const savedEmergencyFund = localStorage.getItem("emergencyFund")
      const savedDebtCreditTransactions = localStorage.getItem("debtCreditTransactions")
      const savedCategories = localStorage.getItem("categories")

      // Check user authentication and security status
      const hasConvexAuth = !!user
      const hasSecurity = SecurePinManager.hasPin()

      // Initialize encryption based on user type
      if (!WalletDataEncryption.isInitialized()) {
        if (hasConvexAuth) {
          // Convex user - use existing encryption system
          const hasEncryptedData = !!(savedProfile || savedTransactions || savedBudgets || savedGoals ||
                                     savedDebtAccounts || savedCreditAccounts || savedCategories)

          if (hasEncryptedData) {
            const initialized = await WalletDataEncryption.initializeWithStoredKey()
            if (!initialized) {
              console.warn('Encrypted data exists but no decryption key found - data may be corrupted or from another device')
              console.log('Starting fresh with new encryption key')
              // For Convex users, don't clear existing data - try to load as plain JSON
              if (!hasConvexAuth) {
                // Clear potentially corrupted data and start fresh for non-Convex users
                localStorage.removeItem('userProfile')
                localStorage.removeItem('transactions')
                localStorage.removeItem('budgets')
                localStorage.removeItem('goals')
                localStorage.removeItem('debtAccounts')
                localStorage.removeItem('creditAccounts')
                localStorage.removeItem('categories')
                localStorage.removeItem('emergencyFund')
                localStorage.removeItem('debtCreditTransactions')
              }
              // Generate new key for fresh start
              await WalletDataEncryption.generateNewKey()
            }
          } else {
            // No existing data, generate new key
            await WalletDataEncryption.generateNewKey()
          }
        } else if (hasSecurity) {
          // Non-convex user with PIN security - initialize with PIN-derived key
          // We'll handle this during decryption since we need the PIN
        } else {
          // No security - no encryption needed
        }
      }

      // Decrypt data if it exists
      const decryptData = async (encryptedData: string | null, key: string) => {
        if (!encryptedData) {
          return key === "userProfile" ? null : []
        }

        // Try decryption based on user type
        try {
          if (hasConvexAuth) {
            // Convex user - try decryption first
            const result = await WalletDataEncryption.decryptData(encryptedData)
            if (result) return result

            // If decryption fails, try plain JSON for backward compatibility
            try {
              const parsed = JSON.parse(encryptedData)
              return parsed
            } catch (parseError) {
              return key === "userProfile" ? null : []
            }
          } else if (hasSecurity) {
            // Non-convex user with PIN - initialize encryption with PIN if needed
            if (!WalletDataEncryption.isInitialized()) {
              // Get the PIN from SecureKeyManager
              const masterKey = await SecureKeyManager.getMasterKey("")
              if (masterKey) {
                // Initialize with the existing CryptoKey
                await WalletDataEncryption.initializeWithKey(masterKey)
                const result = await WalletDataEncryption.decryptData(encryptedData)
                return result || (key === "userProfile" ? null : [])
              } else {
                return key === "userProfile" ? null : []
              }
            } else {
              const result = await WalletDataEncryption.decryptData(encryptedData)
              return result || (key === "userProfile" ? null : [])
            }
          } else {
            // No security - try plain JSON first
            try {
              const parsed = JSON.parse(encryptedData)
              return parsed
            } catch (parseError) {
              // Not plain JSON, perhaps old encrypted data
              return key === "userProfile" ? null : []
            }
          }
        } catch (error) {
          // If decryption fails
          if (!hasConvexAuth) {
            // For non-Convex users, clear corrupted data
            if (encryptedData.length > 100 && /^[A-Za-z0-9+/=]*={0,2}$/.test(encryptedData)) {
              localStorage.removeItem(key)
            } else {
              localStorage.removeItem(key)
            }
          } else {
            // For Convex users, try plain JSON before clearing
            try {
              const parsed = JSON.parse(encryptedData)
              return parsed
            } catch (parseError) {
              localStorage.removeItem(key)
            }
          }

          return key === "userProfile" ? null : []
        }
      }

      const parsedData = {
        userProfile: savedProfile ? await decryptData(savedProfile, "userProfile") : null,
        transactions: savedTransactions ? await decryptData(savedTransactions, "transactions") : [],
        budgets: savedBudgets ? await decryptData(savedBudgets, "budgets") : [],
        goals: savedGoals ? await decryptData(savedGoals, "goals") : [],
        debtAccounts: savedDebtAccounts ? await decryptData(savedDebtAccounts, "debtAccounts") : [],
        creditAccounts: savedCreditAccounts ? await decryptData(savedCreditAccounts, "creditAccounts") : [],
        debtCreditTransactions: savedDebtCreditTransactions ? await decryptData(savedDebtCreditTransactions, "debtCreditTransactions") : [],
        categories: savedCategories ? await decryptData(savedCategories, "categories") : [],
        emergencyFund: savedEmergencyFund ? Number.parseFloat(savedEmergencyFund) : 0,
      }

      if (parsedData.userProfile || parsedData.transactions.length > 0) {
        const validation = await DataIntegrityManager.validateAllData(parsedData)

        if (!validation.isValid) {
          // Data integrity check failed, but continuing with loaded data
        }
      }

      if (parsedData.userProfile) {
        setUserProfile(parsedData.userProfile)
        setIsFirstTime(false)
        setShowOnboarding(false) // Ensure onboarding is not shown when profile exists

        // Always allow access when user profile exists - authentication is handled separately
        setIsAuthenticated(true)
      } else {
        // All users (including Convex users) should complete onboarding
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
         parsedData.budgets.length > 0 || parsedData.goals.length > 0 ||
         parsedData.debtAccounts.length > 0 || parsedData.creditAccounts.length > 0
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

    // Set authentication state based on security settings
    if (profileData.securityEnabled) {
      // If security is enabled, authentication will be handled by PIN validation
      setIsAuthenticated(false)
    } else {
      // If security is disabled, allow immediate access
      setIsAuthenticated(true)
    }

    // Dispatch event to notify other components of onboarding completion
    window.dispatchEvent(new CustomEvent('wallet-onboarding-complete'))
  }

  // Optimized and secure transaction addition with comprehensive validation
  const addTransaction = useCallback(async (transaction: Omit<Transaction, "id" | "timeEquivalent">) => {
    try {
      // Comprehensive input validation
      if (!transaction || typeof transaction !== 'object') {
        throw new Error('Invalid transaction data provided')
      }

      if (!['income', 'expense'].includes(transaction.type)) {
        throw new Error('Invalid transaction type')
      }

      if (!validateTransactionAmount(transaction.amount)) {
        throw new Error(`Invalid transaction amount: ${transaction.amount}`)
      }

      if (!validateDescription(transaction.description)) {
        throw new Error('Invalid transaction description')
      }

      if (transaction.category && !validateCategoryName(transaction.category)) {
        throw new Error('Invalid transaction category')
      }

      // Check array size limits
      if (!validateArraySize(transactions)) {
        throw new Error('Transaction limit exceeded')
      }

      const transactionAmount = transaction.amount
      const sanitizedDescription = sanitizeString(transaction.description)
      const sanitizedCategory = transaction.category ? sanitizeString(transaction.category) : ""

      if (transaction.type === "income") {
        const newTransaction: Transaction = {
          ...transaction,
          id: generateSecureId('tx'),
          description: sanitizedDescription,
          category: sanitizedCategory,
          timeEquivalent: userProfile ? calculateTimeEquivalent(transactionAmount, userProfile) : undefined,
          total: transactionAmount,
          actual: transactionAmount,
          debtUsed: 0,
          debtAccountId: null,
          status: "normal",
        }

        const updatedTransactions = [...transactions, newTransaction]
        setTransactions(updatedTransactions)
        setBalance(prevBalance => prevBalance + transactionAmount)

        try {
          await saveDataWithIntegrity("transactions", updatedTransactions)
        } catch (saveError) {
          // Rollback on save failure
          setTransactions(transactions)
          setBalance(prevBalance => prevBalance - transactionAmount)
          throw new Error('Failed to save transaction securely')
        }

        return {
          transaction: newTransaction,
          budgetWarnings: [],
          needsDebtCreation: false,
          debtAmount: 0
        }
      }

      // Handle expense transactions with enhanced validation
      const currentBalance = balance

      // Check if balance is sufficient
      if (currentBalance >= transactionAmount) {
        const newTransaction: Transaction = {
          ...transaction,
          id: generateSecureId('tx'),
          description: sanitizedDescription,
          category: sanitizedCategory,
          timeEquivalent: userProfile ? calculateTimeEquivalent(transactionAmount, userProfile) : undefined,
          total: transactionAmount,
          actual: transactionAmount,
          debtUsed: 0,
          debtAccountId: null,
          status: "normal",
        }

        const updatedTransactions = [...transactions, newTransaction]
        setTransactions(updatedTransactions)
        setBalance(prevBalance => prevBalance - transactionAmount)

        try {
          await saveDataWithIntegrity("transactions", updatedTransactions)

          // Handle budget spending with error handling
          if (newTransaction.category) {
            try {
              const budgetResults = updateBudgetSpending(newTransaction.category, newTransaction.amount)
              // Could return budget warnings here if needed
            } catch (budgetError) {
              console.warn('Budget update failed:', budgetError)
              // Don't fail the transaction for budget errors
            }
          }

          // Handle goal contributions with error handling
          if (newTransaction.allocationType === "goal" && newTransaction.allocationTarget) {
            try {
              updateGoalContribution(newTransaction.allocationTarget, newTransaction.amount)
            } catch (goalError) {
              // Don't fail the transaction for goal errors
            }
          }

          return {
            transaction: newTransaction,
            budgetWarnings: [],
            needsDebtCreation: false,
            debtAmount: 0
          }
        } catch (saveError) {
          // Rollback on save failure
          setTransactions(transactions)
          setBalance(currentBalance)
          throw new Error('Failed to save expense transaction securely')
        }
      } else {
        const availableBalance = currentBalance
        const debtNeeded = transactionAmount - availableBalance

        // Validate debt amount
        if (!validateTransactionAmount(debtNeeded)) {
          throw new Error('Calculated debt amount is invalid')
        }

        return {
          transaction: null,
          budgetWarnings: [],
          needsDebtCreation: true,
          debtAmount: debtNeeded,
          availableBalance,
          pendingTransaction: { ...transaction, description: sanitizedDescription, category: sanitizedCategory }
        }
      }
    } catch (error) {
      throw error // Re-throw to allow caller to handle
    }
  }, [transactions, balance, userProfile, saveDataWithIntegrity])

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
    return { debtAmount, transactionDescription }
  }

  const addDebtToAccount = (debtId: string, amount: number, description?: string) => {
    const debt = debtAccounts.find((d) => d.id === debtId)
    if (!debt) return { success: false, error: 'Debt account not found' }

    const updatedDebts = debtAccounts.map((d) => {
      if (d.id === debtId) {
        return { ...d, balance: d.balance + amount }
      }
      return d
    })

    setDebtAccounts(updatedDebts)
    saveToLocalStorage('debtAccounts', updatedDebts)

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
    saveToLocalStorage('debtCreditTransactions', updatedDebtTransactions)

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

    // If any debt reaches zero balance, remove it and add a congratulatory record
    const debtsAfterCleanup = updatedDebts.filter((d) => d.balance > 0)

    setDebtAccounts(debtsAfterCleanup)
    saveToLocalStorage("debtAccounts", debtsAfterCleanup)

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
      saveToLocalStorage('debtCreditTransactions', withCongrats)
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

    // Recalculate balance
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
    // Starting comprehensive data clearing

    try {
      // Clear data integrity records
      DataIntegrityManager.clearIntegrityRecords()
      // Data integrity records cleared

      // Clear all encryption keys
      SecureKeyManager.clearAllKeys()
      // Encryption keys cleared

      // Clear wallet encryption keys
      WalletDataEncryption.clear()
      // Wallet encryption cleared

      // Clear all PIN and security data comprehensively
      const { SecurePinManager } = await import("@/lib/secure-pin-manager")
      SecurePinManager.clearAllSecurityData()
      // PIN and security data cleared

      // Clear current session
      SessionManager.clearSession()
      // Session cleared

      // Clear ALL localStorage data for the site - multiple passes for thoroughness
      if (typeof window !== 'undefined') {
        // First pass: clear all localStorage
        localStorage.clear()
        // localStorage cleared (pass 1)

        // Second pass: verify and clear any remaining keys
        const remainingKeys = Object.keys(localStorage)
        if (remainingKeys.length > 0) {
          // Found remaining localStorage keys
          remainingKeys.forEach(key => {
            try {
              localStorage.removeItem(key)
            } catch (e) {
              // Failed to remove localStorage key
            }
          })
        }

        // Also clear sessionStorage if it exists
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear()
          // sessionStorage cleared
        }

        // Clear all cookies for this domain - comprehensive approach
        if (typeof document !== 'undefined') {
          const cookies = document.cookie.split(";")
          for (let cookie of cookies) {
            const eqPos = cookie.indexOf("=")
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
            // Clear cookie with all possible path and domain variations
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + window.location.hostname
          }
          // Cookies cleared
        }

        // Clear IndexedDB databases if they exist
        if (typeof indexedDB !== 'undefined') {
          try {
            // List all databases and delete them
            const databases = await indexedDB.databases()
            for (const db of databases) {
              if (db.name) {
                indexedDB.deleteDatabase(db.name)
                // IndexedDB database deleted
              }
            }
          } catch (e) {
            // Error clearing IndexedDB
          }
        }

        // Clear Cache Storage (Service Worker caches)
        if (typeof caches !== 'undefined') {
          try {
            const cacheNames = await caches.keys()
            for (const cacheName of cacheNames) {
              await caches.delete(cacheName)
              // Cache deleted
            }
          } catch (e) {
            // Error clearing caches
          }
        }

        // Force reload to clear any in-memory state
        // Forcing page reload to ensure complete cleanup
        setTimeout(() => {
          window.location.reload()
        }, 100)
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

      // State reset to empty
      // Comprehensive data clearing completed successfully

    } catch (error) {
      // Error during data clearing
      // Even if clearing fails, reset state
      setUserProfile(null)
      setTransactions([])
      setBudgets([])
      setGoals([])
      setDebtAccounts([])
      setCreditAccounts([])
      setDebtCreditTransactions([])
      setCategories([])
      setEmergencyFund(0)
      setBalance(0)
      setIsAuthenticated(false)
      setShowOnboarding(true)
      setIsFirstTime(true)
      throw error
    }
  }

  const exportData = () => {
    if (typeof window === 'undefined') return

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

  // Recalculate all client-side data after import/sync
  const recalculateClientData = async (importedData: any) => {
    // Starting client-side recalculations

    try {
      // 1. Recalculate budget spending from transactions
      if (importedData.budgets && importedData.transactions) {
        // Recalculating budget spending
        const recalculatedBudgets = importedData.budgets.map((budget: Budget) => {
          const budgetTransactions = importedData.transactions.filter((tx: Transaction) =>
            tx.category && (budget.categories?.includes(tx.category) || budget.category === tx.category)
          )
          const totalSpent = budgetTransactions.reduce((sum: number, tx: Transaction) => sum + (tx.amount || 0), 0)
          return { ...budget, spent: totalSpent }
        })

        // Recalculated spending for budgets
        setBudgets(recalculatedBudgets)
        await saveDataWithIntegrity("budgets", recalculatedBudgets)
      }

      // 2. Recalculate goal contributions from transactions
      if (importedData.goals && importedData.transactions) {
        // Recalculating goal contributions
        const recalculatedGoals = importedData.goals.map((goal: Goal) => {
          const goalTransactions = importedData.transactions.filter((tx: Transaction) =>
            tx.allocationType === "goal" && tx.allocationTarget === goal.id
          )
          const totalContributed = goalTransactions.reduce((sum: number, tx: Transaction) => sum + tx.amount, 0)
          return { ...goal, currentAmount: totalContributed }
        })

        // Recalculated contributions for goals
        setGoals(recalculatedGoals)
        await saveDataWithIntegrity("goals", recalculatedGoals)
      }

      // 3. Recalculate category statistics
      if (importedData.categories && importedData.transactions) {
        // Recalculating category statistics
        const recalculatedCategories = importedData.categories.map((category: Category) => {
          const categoryTransactions = importedData.transactions.filter((tx: Transaction) =>
            tx.category === category.name
          )
          const totalSpent = categoryTransactions.reduce((sum: number, tx: Transaction) => sum + tx.amount, 0)
          return {
            ...category,
            totalSpent,
            transactionCount: categoryTransactions.length
          }
        })

        // Recalculated stats for categories
        setCategories(recalculatedCategories)
        await saveDataWithIntegrity("categories", recalculatedCategories)
      }

      // 4. Recalculate debt account balances from transactions
      if (importedData.debtAccounts && importedData.transactions) {
        // Recalculating debt balances
        const recalculatedDebts = importedData.debtAccounts.map((debt: DebtAccount) => {
          // Find all debt-related transactions for this account
          const debtTransactions = importedData.transactions.filter((tx: Transaction) =>
            tx.debtAccountId === debt.id
          )

          // Calculate payments made (reduce balance)
          const payments = debtTransactions
            .filter((tx: Transaction) => tx.status === "repayment")
            .reduce((sum: number, tx: Transaction) => sum + tx.amount, 0)

          // Calculate new debt added (increase balance)
          const newDebt = debtTransactions
            .filter((tx: Transaction) => tx.status === "debt")
            .reduce((sum: number, tx: Transaction) => sum + tx.debtUsed, 0)

          const currentBalance = Math.max(0, debt.originalBalance + newDebt - payments)
          return { ...debt, balance: currentBalance }
        })

        // Recalculated balances for debt accounts
        setDebtAccounts(recalculatedDebts)
        await saveDataWithIntegrity("debtAccounts", recalculatedDebts)
      }

      // 5. Recalculate credit account balances
      if (importedData.creditAccounts && importedData.transactions) {
        // Recalculating credit balances
        // Credit calculations are more complex - for now, keep imported values
        // This can be enhanced later if needed
        // Credit accounts preserved
      }

      // All client-side recalculations completed
    } catch (error) {
      // Error during recalculations
      // Don't fail the entire import for recalculation errors
    }
  }

  const importData = async (dataOrJson: string | any) => {
    try {
      // Starting data import
      const data = typeof dataOrJson === 'string' ? JSON.parse(dataOrJson) : dataOrJson

      // Validate data structure
      if (!data.userProfile && !Array.isArray(data.transactions)) {
        throw new Error("Invalid backup file format - missing required data")
      }

      // Import user profile
      if (data.userProfile) {
        setUserProfile(data.userProfile)
        await saveDataWithIntegrity("userProfile", data.userProfile)
      }

      // Import transactions
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

      // Import other data
      if (data.budgets && Array.isArray(data.budgets)) {
        setBudgets(data.budgets)
        await saveDataWithIntegrity("budgets", data.budgets)
      }

      if (data.goals && Array.isArray(data.goals)) {
        setGoals(data.goals)
        await saveDataWithIntegrity("goals", data.goals)
      }

      if (data.debtAccounts && Array.isArray(data.debtAccounts)) {
        setDebtAccounts(data.debtAccounts)
        await saveDataWithIntegrity("debtAccounts", data.debtAccounts)
      }

      if (data.creditAccounts && Array.isArray(data.creditAccounts)) {
        setCreditAccounts(data.creditAccounts)
        await saveDataWithIntegrity("creditAccounts", data.creditAccounts)
      }

      if (data.debtCreditTransactions && Array.isArray(data.debtCreditTransactions)) {
        setDebtCreditTransactions(data.debtCreditTransactions)
        await saveDataWithIntegrity("debtCreditTransactions", data.debtCreditTransactions)
      }

      if (data.categories && Array.isArray(data.categories)) {
        setCategories(data.categories)
        await saveDataWithIntegrity("categories", data.categories)
      }

      // Import emergency fund
      if (typeof data.emergencyFund === 'number' || typeof data.emergencyFund === 'string') {
        const emergencyFundValue = Number.parseFloat(data.emergencyFund.toString()) || 0
        setEmergencyFund(emergencyFundValue)
        await saveDataWithIntegrity("emergencyFund", emergencyFundValue.toString())
      }

      // Import scrollbar setting
      if (data.settings?.showScrollbars !== undefined && typeof window !== 'undefined') {
        localStorage.setItem("wallet_show_scrollbars", data.settings.showScrollbars.toString())
      }

      // CRITICAL: Recalculate all client-side data after import
      await recalculateClientData(data)

      return true
    } catch (error) {
      console.error("[v0] Error importing data:", error)
      return false
    }
  }

  const refreshData = async () => {
    try {
      if (typeof window === 'undefined') return

      // Helper function to safely parse localStorage data (handles both encrypted and plain JSON)
      const parseLocalStorageData = async (key: string): Promise<any> => {
        const storedValue = localStorage.getItem(key)
        if (!storedValue) return null

        try {
          // Check if data is encrypted (starts with encrypted marker)
          if (storedValue.startsWith("encrypted:")) {
            const encryptedData = storedValue.substring(10) // Remove "encrypted:" prefix
            const { SecureKeyManager } = await import("@/lib/key-manager")
            const { SecureWallet } = await import("@/lib/security")

            const masterKey = await SecureKeyManager.getMasterKey("")
            if (!masterKey) {
              console.warn(`No master key available for decrypting ${key}`)
              return null
            }

            const decryptedString = await SecureWallet.decryptData(encryptedData, masterKey)
            return JSON.parse(decryptedString)
          } else {
            // Plain JSON data
            return JSON.parse(storedValue)
          }
        } catch (error) {
          console.warn(`Failed to parse ${key} from localStorage:`, error)
          return null
        }
      }

      const savedBudgets = await parseLocalStorageData("budgets")
      const savedGoals = await parseLocalStorageData("goals")
      const savedTransactions = await parseLocalStorageData("transactions")
      const savedCategories = await parseLocalStorageData("categories")
      const savedDebtAccounts = await parseLocalStorageData("debtAccounts")
      const savedCreditAccounts = await parseLocalStorageData("creditAccounts")

      if (savedBudgets) {
        setBudgets(savedBudgets)
      }

      if (savedGoals) {
        setGoals(savedGoals)
      }

      if (savedTransactions) {
        setTransactions(savedTransactions)
        // Calculate balance based on actual cash flow
        const actualBalance = savedTransactions.reduce((sum: number, tx: Transaction) => {
          if (tx.type === "income") {
            return sum + (tx.actual ?? tx.amount)
          } else {
            return sum - (tx.actual ?? tx.amount)
          }
        }, 0)
        setBalance(actualBalance)
      }

      if (savedCategories) {
        setCategories(savedCategories)
      }

      if (savedDebtAccounts) {
        setDebtAccounts(savedDebtAccounts)
      }

      if (savedCreditAccounts) {
        setCreditAccounts(savedCreditAccounts)
      }

      // Trigger a refresh of the context
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Error refreshing data:', error)
    }
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
      const categoryTransactions = transactions.filter((t: Transaction) => t.category === category.name)
      const totalSpent = categoryTransactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0)

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

