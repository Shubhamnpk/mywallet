export interface UserProfile {
  hourlyRate: number
  name: string
  monthlyEarning: number
  currency: string
  workingHoursPerDay: number
  workingDaysPerMonth: number
  pin?: string
  pinSalt?: string 
  securityEnabled: boolean
  createdAt: string
  customCurrency?: {
    code: string
    symbol: string
    name: string
  }
  avatar?: string 
}

export interface Transaction {
  id: string
  type: "income" | "expense"
  amount: number 
  description: string
  category: string
  date: string
  timeEquivalent?: number
  tags?: string[]
  location?: string
  recurring?: boolean
  recurringFrequency?: "daily" | "weekly" | "monthly" | "yearly"
  // New allocation fields
  allocationType?: "direct" | "goal" | "budget" | "debt" | "credit" | "fastdebt"
  allocationTarget?: string
  subcategory?: string 
  // Enhanced debt transaction fields
  total: number 
  actual: number 
  debtUsed: number 
  debtAccountId?: string | null 
  status: "normal" | "debt" | "repayment" 
}

export interface Budget {
  name: any
  id: string
  category: string
  limit: number
  spent: number
  period: "monthly" | "weekly" | "yearly"
  alertThreshold: number
  createdAt: string
  categories: string[]
  emergencyUses: number
  allowDebt: boolean
  debtLimit?: number
  interestRate?: number
  // New subcategory support
  subcategories?: BudgetSubcategory[]
}

export interface BudgetSubcategory {
  id: string
  name: string
  limit: number
  spent: number
  parentBudgetId: string
}

export interface Goal {
  id: string
  title: string
  // Backwards-compatible alias: some components use `name` instead of `title`
  name?: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  category: string
  priority: "low" | "medium" | "high"
  createdAt: string
  autoContribute: boolean
  contributionAmount?: number
  contributionFrequency?: "daily" | "weekly" | "monthly"
  description?: string
}

export interface WalletSettings {
  currency: string
  theme: "light" | "dark" | "system"
  notifications: boolean
  backupEnabled: boolean
  categories: string[]
  securityPin?: string
  customBudgetCategories: Record<string, string[]>
  customCategories: {
    income: string[]
    expense: string[]
  }
}

export interface Category {
  id: string
  name: string
  type: "income" | "expense"
  color?: string
  icon?: string
  isDefault: boolean
  createdAt: string
  totalSpent?: number
  transactionCount?: number
}

export interface DebtAccount {
   id: string
   name: string
   balance: number
   interestRate: number
   minimumPayment: number
   dueDate: string
   createdAt: string
   originalBalance?: number
   monthlyPayment?: number
   payoffDate?: string
   totalInterestPaid?: number
   isFastDebt?: boolean
 }

export interface CreditAccount {
  id: string
  name: string
  balance: number
  creditLimit: number
  interestRate: number
  minimumPayment: number
  dueDate: string
  createdAt: string
  availableCredit?: number
  utilizationRate?: number
  lastPaymentDate?: string
  lastPaymentAmount?: number
}

export interface DebtCreditTransaction {
  id: string
  accountId: string
  accountType: "debt" | "credit"
  type: "payment" | "charge" | "interest" | "closed"
  amount: number
  description: string
  date: string
  balanceAfter: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  unlocked: boolean
  unlockedAt?: Date
  goalId?: string
  progress: number
  maxProgress: number
  category: string
  rarity: "common" | "rare" | "epic" | "legendary"
}
