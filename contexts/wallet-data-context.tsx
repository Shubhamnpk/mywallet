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
  Portfolio,
  PortfolioItem,
  ShareTransaction,
  UpcomingIPO,
} from "@/types/wallet"
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
  portfolio: PortfolioItem[]
  shareTransactions: ShareTransaction[]
  upcomingIPOs: UpcomingIPO[]
  scripNamesMap: Record<string, string>
  isIPOsLoading: boolean
  portfolios: Portfolio[]
  activePortfolioId: string | null
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
  deleteDebtAccount: (id: string) => void
  deleteCreditAccount: (id: string) => void
  addToEmergencyFund: (amount: number) => void
  updateGoalContribution: (goalId: string, amount: number) => void
  transferToGoal: (goalId: string, amount: number) => Promise<any>
  spendFromGoal: (goalId: string, amount: number, description: string) => Promise<any>
  makeDebtPayment: (debtId: string, paymentAmount: number) => Promise<any>
  updateCreditBalance: (creditId: string, newBalance: number) => void
  createDebtForTransaction: (debtAmount: number, transactionDescription: string) => Promise<any>
  completeTransactionWithDebt: (pendingTransaction: any, debtAccountName: string, debtAccountId: string, availableBalance: number, debtAmount: number) => Promise<any>
  addDebtToAccount: (debtId: string, amount: number, description?: string) => Promise<any>
  addPortfolioItem: (item: Omit<PortfolioItem, "id">) => Promise<PortfolioItem>
  updatePortfolioItem: (id: string, updates: Partial<PortfolioItem>) => Promise<void>
  deletePortfolioItem: (id: string) => Promise<void>
  addPortfolio: (name: string, description?: string, color?: string) => Promise<Portfolio>
  switchPortfolio: (id: string) => void
  deletePortfolio: (id: string) => Promise<void>
  updatePortfolio: (id: string, updates: Partial<Portfolio>) => Promise<void>
  clearPortfolioHistory: () => Promise<void>
  fetchPortfolioPrices: (portfolioOverride?: PortfolioItem[], forceRefresh?: boolean) => Promise<PortfolioItem[] | undefined>
  getFaceValue: (symbol: string) => number
  addShareTransaction: (tx: Omit<ShareTransaction, "id">) => Promise<{ newTx: ShareTransaction, updatedPortfolio: PortfolioItem[] }>
  deleteShareTransaction: (id: string) => Promise<PortfolioItem[] | undefined>
  deleteMultipleShareTransactions: (ids: string[]) => Promise<PortfolioItem[] | undefined>
  recomputePortfolio: (transactionsToUse?: ShareTransaction[]) => Promise<PortfolioItem[]>
  importShareData: (type: 'portfolio' | 'history' | 'auto', csvData: string, resolvedPrices?: Record<string, number>) => Promise<PortfolioItem[] | undefined>
  refreshData: () => void
  clearAllData: () => void
  exportData: () => void
  importData: (dataOrJson: string | any) => Promise<boolean>
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
