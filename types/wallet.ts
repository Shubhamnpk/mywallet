export interface UserProfile {
  hourlyRate: number
  name: string
  monthlyEarning: number
  currency: string
  calendarSystem?: "AD" | "BS"
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
    accounts?: MeroShareAccount[]
    shareFeaturesEnabled?: boolean
    shareNotificationsEnabled?: boolean
    preferredKitta?: number
    applyMode?: "on-demand" | "automatic"
    showLiveBrowser?: boolean
    browserProvider?: "api" | "rest" | "auto" | "browserless" | "local"
    isAutomatedEnabled: boolean
    applicationLogs?: MeroShareApplicationLog[]
    /** How share (portfolio) amounts are displayed. "npr" always shows NPR (default); "auto" shows them in the profile currency. */
    shareCurrencyMode?: "npr" | "auto"
  }
  settings?: {
    zeroHoldingsEnabled?: boolean
    documentVaultEnabled?: boolean
  }
  /** IDs of achievements whose celebration modal has been seen */
  celebratedAchievements?: string[]
  /** Whether biometric was enabled on ANY device (for cross-device prompts) */
  biometricEnabledOnAnyDevice?: boolean
}

export interface MeroShareAccount {
  id: string
  label: string
  role: "primary" | "secondary"
  dpId: string
  username: string
  password?: string
  crn?: string
  pin?: string
  /** Per-account preferred IPO application kitta. 0 = auto-detect from the IPO. */
  preferredKitta?: number
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
  lastRemainder?: number
  lastInstallmentDate?: string
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
  icon?: string
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
  direction?: "borrow" | "lend"
  source?: "wallet" | "external"
  contactName?: string
  contactPhone?: string
  notes?: string
  closedAt?: string
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
  detailContext?: "portfolio" | "market-search"
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
  type: "buy" | "sell" | "bonus" | "gift" | "ipo" | "reinvestment" | "merger_in" | "merger_out"
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

export interface NepseIndexItem {
  id: number
  index: string
  close: number
  high: number
  low: number
  previousClose: number
  change: number
  perChange: number
  currentValue: number
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
  generatedTime: string
}

export type NepseIndexGraphPoint = [timestamp: number, value: number]

export interface NepseIndexDetail {
  id: number
  index: string
  change: number
  perChange: number
  currentValue: number
  previousClose?: number
  high?: number
  low?: number
  close?: number
}

export interface NepseNoticeGeneral {
  id: number
  noticeHeading: string
}

export interface NepseDisclosure {
  id: number
  symbol?: string
  title?: string
  body?: string
  source?: string
  publishedAt?: string
  newsHeadline?: string
  newsBody?: string
  addedDate?: string
  documents?: Array<{ id?: number; submittedDate?: string; fileUrl?: string; filePath?: string; encryptedId?: string }>
  applicationDocumentDetailsList?: Array<{ filePath?: string; encryptedId?: string; fileUrl?: string }>
}

export interface NepseExchangeMessage {
  id: number
  symbol?: string
  title?: string
  body?: string
  publishedAt?: string
  expiresAt?: string
  messageTitle?: string
  messageBody?: string
  expiryDate?: string
  filePath?: string | null
  fileUrl?: string | null
}

export interface NepseNoticesBundle {
  general: NepseNoticeGeneral[]
  company: NepseDisclosure[]
  exchange: NepseExchangeMessage[]
  last_updated?: string
}
