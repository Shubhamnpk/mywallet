"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useWalletData as useWalletDataHook } from "@/hooks/use-wallet-data"
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

// Define the context type based on the return type of useWalletData
type WalletDataContextType = {
  userProfile: UserProfile | null
  transactions: Transaction[]
  budgets: Budget[]
  goals: Goal[]
  debtAccounts: DebtAccount[]
  creditAccounts: CreditAccount[]
  debtCreditTransactions: DebtCreditTransaction[]
  categories: Category[]
  emergencyFund: number
  balance: number
  isFirstTime: boolean
  showOnboarding: boolean
  isAuthenticated: boolean
  isLoaded: boolean
  balanceChange: { amount: number; type: "income" | "expense" } | null
  setShowOnboarding: (show: boolean) => void
  handleOnboardingComplete: (profileData: UserProfile) => void
  addTransaction: (transaction: Omit<Transaction, "id" | "timeEquivalent">) => Promise<any>
  updateUserProfile: (updates: Partial<UserProfile>) => void
  addBudget: (budget: Omit<Budget, "id">) => void
  updateBudget: (id: string, updates: Partial<Budget>) => void
  deleteBudget: (id: string) => void
  addGoal: (goal: Omit<Goal, "id" | "currentAmount">) => Goal
  updateGoal: (id: string, updates: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  deleteTransaction: (id: string) => void
  addDebtAccount: (debt: Omit<DebtAccount, "id">) => DebtAccount
  addCreditAccount: (credit: Omit<CreditAccount, "id">) => CreditAccount
  addToEmergencyFund: (amount: number) => void
  updateGoalContribution: (goalId: string, amount: number) => void
  transferToGoal: (goalId: string, amount: number) => any
  spendFromGoal: (goalId: string, amount: number, description: string) => any
  makeDebtPayment: (debtId: string, paymentAmount: number) => any
  updateCreditBalance: (creditId: string, newBalance: number) => void
  refreshData: () => void
  clearAllData: () => void
  exportData: () => void
  importData: (jsonData: string) => boolean
  calculateTimeEquivalent: (amount: number) => number
  addCategory: (category: Omit<Category, "id" | "createdAt" | "totalSpent" | "transactionCount">) => Category
  updateCategory: (id: string, updates: Partial<Category>) => void
  deleteCategory: (id: string) => void
  updateCategoryStats: () => void
  settings: any
}

const WalletDataContext = createContext<WalletDataContextType | undefined>(undefined)

interface WalletDataProviderProps {
  children: ReactNode
}

export function WalletDataProvider({ children }: WalletDataProviderProps) {
  const walletData = useWalletDataHook()

  if (!walletData.isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <WalletDataContext.Provider value={walletData}>{children}</WalletDataContext.Provider>
}

export function useWalletData() {
  const context = useContext(WalletDataContext)
  if (context === undefined) {
    throw new Error("useWalletData must be used within a WalletDataProvider")
  }
  return context
}
