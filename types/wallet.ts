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
  meroShare?: {
    dpId: string
    username: string
    password?: string
    crn?: string
    pin?: string
    preferredKitta?: number
    isAutomatedEnabled: boolean
  }
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

export interface Achievement {
  id: string
  title: string
  description: string
  icon: any
  color?: string
  unlocked: boolean
  unlockedAt?: Date | string
  goalId?: string
  progress: number
  maxProgress: number
  category: string
  rarity: "common" | "rare" | "epic" | "legendary"
}

export interface Budget {
  name: string
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

export interface Portfolio {
  id: string
  name: string
  description?: string
  color?: string
  isDefault: boolean
  createdAt: string
}

export interface PortfolioItem {
  id: string
  portfolioId: string
  symbol: string
  units: number
  buyPrice: number // This will be the average cost price
  currentPrice?: number
  previousClose?: number
  high?: number
  low?: number
  volume?: number
  change?: number
  percentChange?: number
  sector?: string
  lastUpdated?: string
}

export interface ShareTransaction {
  id: string
  portfolioId: string
  symbol: string
  type: "buy" | "sell" | "bonus" | "ipo" | "merger_in" | "merger_out"
  quantity: number
  price: number
  date: string
  description: string
}

export interface UpcomingIPO {
  company: string
  units: string
  date_range: string
  announcement_date: string
  full_text: string
  url: string
  scraped_at: string
  status?: 'upcoming' | 'open' | 'closed'
  daysRemaining?: number
  openingDate?: string
  closingDate?: string
  openingDay?: string
  closingDay?: string
}
