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
  notificationSettings?: NotificationSettings
  sipPlans?: SIPPlan[]
  meroShare?: {
    dpId: string
    username: string
    password?: string
    crn?: string
    pin?: string
    shareFeaturesEnabled?: boolean
    shareNotificationsEnabled?: boolean
    preferredKitta?: number
    applyMode?: "on-demand" | "automatic"
    showLiveBrowser?: boolean
    isAutomatedEnabled: boolean
    applicationLogs?: MeroShareApplicationLog[]
  }
  settings?: {
    zeroHoldingsEnabled?: boolean
  }
}

export interface NotificationSettings {
  enabled: boolean
  inAppToasts: boolean
  browserNotifications: boolean
  permissionNudges: boolean
  budgetReminders: boolean
  goalReminders: boolean
  billReminders: boolean
  ipoReminders: boolean
  sipReminders: boolean
}

export interface SIPPlan {
  id: string
  portfolioId: string
  symbol: string
  assetType: "stock"
  assetName?: string
  sector?: string
  installmentAmount: number
  dpsCharge?: number
  estimatedUnits?: number
  referencePrice?: number
  frequency: "weekly" | "monthly" | "quarterly"
  startDate: string
  reminderDays: number
  mode: "manual" | "auto"
  status: "active" | "paused"
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface MeroShareApplicationLog {
  id: string
  ipoName: string
  action: "apply" | "report-check"
  requestedKitta?: number
  status: "success" | "failed"
  message: string
  source: "live-apply" | "live-auto" | "settings-test" | "live-check" | "settings-check"
  createdAt: string
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
  allocationType?: "direct" | "goal" | "budget" | "debt" | "credit" | "fastdebt" | "goal_transfer" | "debt_loan"
  allocationTarget?: string
  subcategory?: string
  total?: number
  actual?: number
  debtUsed?: number
  debtAccountId?: string | null
  status?: "normal" | "debt" | "repayment"
}
export interface Achievement {
  id: string
  title: string
  description: string
  icon: React.ReactNode
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
  name?: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  category: string
  priority: "low" | "medium" | "high"
  createdAt: string
  updatedAt?: string
  autoContribute: boolean
  contributionAmount?: number
  contributionFrequency?: "daily" | "weekly" | "monthly"
  description?: string
  challengePlan?: GoalChallengePlan
  challengePoints?: GoalChallengePoints
  challengePenaltyHistory?: GoalChallengePenaltySnapshot[]
}

export interface GoalChallengePlan {
  type: "hard-plan"
  mode: "easy" | "hard"
  baseTargetAmount: number
  penaltyAmount: number
  graceMonths: number
  allocation: {
    nepalPercent: number
    ukPercent: number
  }
  hardModeRewardPoints: number
}

export interface GoalChallengePoints {
  total: number
  history: GoalChallengePointEntry[]
}

export interface GoalChallengePointEntry {
  id: string
  type: "investment_reward"
  points: number
  awardedAt: string
  description?: string
}

export interface GoalChallengePenaltySnapshot {
  id: string
  cycleNumber: number
  penaltyAmount: number
  previousDeadline: string
  newDeadline: string
  effectiveTargetAmount: number
  appliedAt: string
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
  sourceTransactionId?: string
}

export interface Portfolio {
  id: string
  name: string
  description?: string
  color?: string
  includeInTotals?: boolean
  isDefault: boolean
  createdAt: string
}

export interface PortfolioItem {
  id: string
  portfolioId: string
  symbol: string
  assetType?: "stock" | "crypto"
  cryptoId?: string
  assetName?: string
  units: number
  buyPrice: number
  currentPrice?: number
  previousClose?: number
  high?: number
  low?: number
  volume?: number
  change?: number
  percentChange?: number
  sector?: string
  lastUpdated?: string
  isKeptZeroHolding?: boolean
}

export interface ShareTransaction {
  id: string
  portfolioId: string
  symbol: string
  assetType?: "stock" | "crypto"
  cryptoId?: string
  type: "buy" | "sell" | "bonus" | "gift" | "ipo" | "merger_in" | "merger_out"
  quantity: number
  price: number
  date: string
  description: string
  sipPlanId?: string
  sipDueDate?: string
  sipGrossAmount?: number
  sipDpsCharge?: number
  sipNetAmount?: number
}

export interface UpcomingIPO {
  company: string
  units: string
  date_range: string
  announcement_date: string
  full_text: string
  url: string
  is_reserved_share?: boolean
  reserved_for?: string
  scraped_at: string
  status?: 'upcoming' | 'open' | 'closed'
  daysRemaining?: number
  openingDate?: string
  closingDate?: string
  openingDay?: string
  closingDay?: string
}

export interface TopStockItem {
  symbol: string
  ltp: number
  pointChange: number
  percentageChange: number
}

export interface TopStocksData {
  top_gainer: TopStockItem[]
  top_loser: TopStockItem[]
  top_turnover: TopStockItem[]
  top_trade: TopStockItem[]
  top_transaction: TopStockItem[]
  last_updated?: string
  fetched_at?: string
}

export interface MarketSummaryMetric {
  detail: string
  value: number
}

export interface MarketSummaryHistoryItem {
  businessDate: string
  totalTurnover: number
  totalTradedShares: number
  totalTransactions: number
  tradedScrips: number
}

export interface MarketStatusData {
  isOpen: boolean | null
  status?: string
  last_checked?: string
  fetched_at?: string
}

export interface NepseNoticeGeneral {
  id: number
  noticeHeading: string
}

export interface NepseDisclosure {
  id: number
  newsHeadline: string
  newsBody?: string
  addedDate?: string
  applicationDocumentDetailsList?: Array<{ filePath?: string; encryptedId?: string; fileUrl?: string }>
}

export interface NepseExchangeMessage {
  id: number
  messageTitle: string
  messageBody?: string
  expiryDate?: string
  filePath?: string | null
}

export interface NepseNoticesBundle {
  general: NepseNoticeGeneral[]
  company: NepseDisclosure[]
  exchange: NepseExchangeMessage[]
  last_updated?: string
}
