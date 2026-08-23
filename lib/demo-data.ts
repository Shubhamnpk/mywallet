import { generateId } from "@/lib/utils"
import type {
  Transaction, Budget, Goal, Category, UserProfile,
  DebtAccount, CreditAccount, DebtCreditTransaction,
  PortfolioItem, ShareTransaction,
} from "@/types/wallet"

interface DemoDataOptions {
  transactionCount: number
  monthsBack: number
  includeBudgets: boolean
  includeGoals: boolean
  includeDebtCredit: boolean
  startingBalance?: number
}

const NOW = new Date()
function monthsAgo(n: number) {
  const d = new Date(NOW)
  d.setMonth(d.getMonth() - n)
  return d
}
function randomInRange(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min))
}
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function randomDateBetween(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString()
}
function randomDate(monthsBack: number) {
  return randomDateBetween(monthsAgo(monthsBack), NOW)
}
function futureDate(daysMin: number, daysMax: number) {
  return new Date(NOW.getTime() + randomInRange(daysMin, daysMax) * 86400000).toISOString()
}

// ── Categories ──────────────────────────────────────────
const INCOME_CATEGORIES = [
  { name: "Salary", range: [80000, 150000] as [number, number] },
  { name: "Freelance", range: [10000, 50000] as [number, number] },
  { name: "Investments", range: [2000, 15000] as [number, number] },
  { name: "Rental Income", range: [15000, 35000] as [number, number] },
  { name: "Side Hustle", range: [5000, 20000] as [number, number] },
]

const EXPENSE_CATEGORIES = [
  { name: "Food & Groceries", items: ["Grocery shopping at Superstore", "Weekly groceries", "Fresh produce market", "Bulk buying at Costco"], range: [500, 5000] as [number, number] },
  { name: "Rent", items: ["Monthly rent payment", "Apartment rent"], range: [25000, 60000] as [number, number] },
  { name: "Utilities", items: ["Electricity bill", "Water bill", "Internet bill", "Mobile recharge"], range: [500, 5000] as [number, number] },
  { name: "Transportation", items: ["Fuel for car", "Uber ride", "Bus pass", "Vehicle maintenance"], range: [200, 3000] as [number, number] },
  { name: "Entertainment", items: ["Movie tickets", "Concert tickets", "Streaming subscription", "Gaming"], range: [300, 3000] as [number, number] },
  { name: "Shopping", items: ["Clothing store", "Online shopping", "Electronics", "Home decor"], range: [1000, 10000] as [number, number] },
  { name: "Healthcare", items: ["Doctor visit", "Pharmacy", "Health insurance", "Gym membership"], range: [500, 5000] as [number, number] },
  { name: "Dining Out", items: ["Restaurant dinner", "Cafe lunch", "Brunch with friends", "Takeout"], range: [300, 3000] as [number, number] },
  { name: "Education", items: ["Online course", "Books", "Tuition fee", "Workshop"], range: [500, 10000] as [number, number] },
  { name: "Subscriptions", items: ["Netflix", "Spotify", "Cloud storage", "Domain renewal"], range: [200, 2000] as [number, number] },
  { name: "Insurance", items: ["Life insurance premium", "Car insurance", "Home insurance"], range: [2000, 10000] as [number, number] },
  { name: "Miscellaneous", items: ["Gift", "Charity donation", "ATM fee", "Bank charges"], range: [100, 3000] as [number, number] },
]

const CATEGORY_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e",
  "#a855f7", "#64748b", "#0ea5e9", "#84cc16", "#d946ef", "#10b981", "#f59e0b",
]
const CATEGORY_ICONS = [
  "Utensils", "Home", "Zap", "Car", "Film", "ShoppingBag", "Heart",
  "UtensilsCrossed", "BookOpen", "Radio", "Shield", "MoreHorizontal", "Cloud",
  "Leaf", "Sparkles", "TrendingUp", "Sun",
]

function generateCategories(monthsBack: number): Category[] {
  const categories: Category[] = []
  let idx = 0
  for (const cat of EXPENSE_CATEGORIES) {
    categories.push({
      id: generateId("cat"),
      name: cat.name,
      type: "expense",
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      icon: CATEGORY_ICONS[idx % CATEGORY_ICONS.length],
      isDefault: false,
      createdAt: randomDate(monthsBack),
      totalSpent: 0,
      transactionCount: 0,
    })
    idx++
  }
  for (const cat of INCOME_CATEGORIES) {
    categories.push({
      id: generateId("cat"),
      name: cat.name,
      type: "income",
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      icon: CATEGORY_ICONS[idx % CATEGORY_ICONS.length],
      isDefault: false,
      createdAt: randomDate(monthsBack),
      totalSpent: 0,
      transactionCount: 0,
    })
    idx++
  }
  return categories
}

// ── User Profile ────────────────────────────────────────
function generateUserProfile(monthsBack: number): UserProfile {
  return {
    name: "Demo User",
    hourlyRate: 500,
    monthlyEarning: 120000,
    currency: "NPR",
    calendarSystem: "AD",
    workingHoursPerDay: 8,
    workingDaysPerMonth: 22,
    securityEnabled: false,
    createdAt: monthsAgo(monthsBack).toISOString(),
    notificationSettings: {
      enabled: true,
      inAppToasts: true,
      browserNotifications: false,
      permissionNudges: true,
      budgetReminders: true,
      goalReminders: true,
      billReminders: true,
      ipoReminders: false,
      sipReminders: false,
    },
    settings: { zeroHoldingsEnabled: false },
  }
}

// ── Transactions ────────────────────────────────────────
function generateTransactions(count: number, monthsBack: number): Transaction[] {
  const transactions: Transaction[] = []

  // Salary - one per month on a fixed day
  const salaryDay = Math.min(28, Math.max(1, randomInRange(25, 28)))
  for (let m = monthsBack - 1; m >= 0; m--) {
    const d = new Date(NOW.getFullYear(), NOW.getMonth() - m, salaryDay)
    if (d > NOW) continue
    const salary = randomInRange(80000, 150000)
    transactions.push({
      id: generateId("tx"),
      type: "income",
      amount: salary,
      description: `Monthly Salary - ${d.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
      category: "Salary",
      date: d.toISOString(),
      actual: salary,
      status: "normal",
    })
  }

  // Expense transactions spread across the range
  for (let i = 0; i < count; i++) {
    const cat = pickRandom(EXPENSE_CATEGORIES)
    const amount = randomInRange(cat.range[0], cat.range[1])
    transactions.push({
      id: generateId("tx"),
      type: "expense",
      amount,
      description: pickRandom(cat.items),
      category: cat.name,
      date: randomDate(monthsBack),
      actual: amount,
      status: "normal",
    })
  }

  // Occasional extra income (freelance / investments / side hustle)
  const extras = Math.max(1, Math.floor(count * 0.08))
  for (let i = 0; i < extras; i++) {
    const cat = pickRandom(INCOME_CATEGORIES.filter((c) => c.name !== "Salary"))
    const amount = randomInRange(cat.range[0], cat.range[1])
    transactions.push({
      id: generateId("tx"),
      type: "income",
      amount,
      description: `${cat.name} - ${new Date(randomDate(monthsBack)).toLocaleDateString("en-US", { month: "short" })}`,
      category: cat.name,
      date: randomDate(monthsBack),
      actual: amount,
      status: "normal",
    })
  }

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

// ── Budgets ─────────────────────────────────────────────
function generateBudgets(monthsBack: number): Budget[] {
  return EXPENSE_CATEGORIES.slice(0, 6).map((cat, i) => ({
    id: generateId("budget"),
    name: `${cat.name} Budget`,
    category: cat.name,
    limit: cat.range[1] * randomInRange(4, 10),
    spent: cat.range[1] * randomInRange(2, 6),
    period: "monthly" as const,
    alertThreshold: 0.8,
    createdAt: randomDate(monthsBack),
    categories: [cat.name],
    emergencyUses: 0,
    allowDebt: false,
  }))
}

// ── Goals ───────────────────────────────────────────────
const GOAL_TEMPLATES = [
  { title: "Emergency Fund", targetAmount: 500000, category: "Savings", priority: "high" as const },
  { title: "Dream Vacation", targetAmount: 200000, category: "Travel", priority: "medium" as const },
  { title: "New Laptop", targetAmount: 150000, category: "Electronics", priority: "medium" as const },
  { title: "Down Payment", targetAmount: 2000000, category: "Housing", priority: "high" as const },
  { title: "Wedding Fund", targetAmount: 500000, category: "Personal", priority: "low" as const },
  { title: "Startup Capital", targetAmount: 1000000, category: "Business", priority: "medium" as const },
  { title: "Rainy Day Fund", targetAmount: 100000, category: "Savings", priority: "low" as const },
]

function generateGoals(monthsBack: number): Goal[] {
  return GOAL_TEMPLATES.slice(0, randomInRange(3, 6)).map((t) => {
    const created = randomDate(monthsBack)
    const progress = Math.random()
    return {
      id: generateId("goal"),
      title: t.title,
      targetAmount: t.targetAmount,
      currentAmount: Math.round(t.targetAmount * progress),
      targetDate: futureDate(90, 730),
      category: t.category,
      priority: t.priority,
      createdAt: created,
      updatedAt: futureDate(0, 14),
      autoContribute: Math.random() > 0.5,
      contributionAmount: Math.random() > 0.5 ? randomInRange(1000, 15000) : undefined,
      contributionFrequency: Math.random() > 0.5 ? "monthly" : "weekly",
      description: `Auto-generated demo goal: ${t.title}`,
    }
  })
}

// ── Credit Accounts ─────────────────────────────────────
function generateCreditAccounts(monthsBack: number): CreditAccount[] {
  return [
    {
      id: generateId("credit"),
      name: "Standard Credit Card",
      creditLimit: 100000,
      balance: randomInRange(5000, 45000),
      interestRate: 18.5,
      minimumPayment: randomInRange(2000, 5000),
      dueDate: futureDate(5, 25),
      createdAt: monthsAgo(monthsBack).toISOString(),
      availableCredit: randomInRange(55000, 95000),
      utilizationRate: randomInRange(5, 45),
      lastPaymentDate: randomDate(1),
      lastPaymentAmount: randomInRange(2000, 10000),
    },
    {
      id: generateId("credit"),
      name: "Gold Credit Card",
      creditLimit: 250000,
      balance: randomInRange(10000, 80000),
      interestRate: 15.0,
      minimumPayment: randomInRange(3000, 8000),
      dueDate: futureDate(10, 30),
      createdAt: monthsAgo(Math.floor(monthsBack / 2)).toISOString(),
      availableCredit: randomInRange(170000, 240000),
      utilizationRate: randomInRange(4, 32),
      lastPaymentDate: randomDate(1),
      lastPaymentAmount: randomInRange(5000, 20000),
    },
  ]
}

// ── Debt Accounts ───────────────────────────────────────
function generateDebtAccounts(monthsBack: number): DebtAccount[] {
  const studentLoanBalance = randomInRange(200000, 500000)
  const carLoanBalance = randomInRange(500000, 1500000)
  return [
    {
      id: generateId("debt"),
      name: "Student Loan",
      balance: studentLoanBalance,
      interestRate: 8.5,
      minimumPayment: randomInRange(5000, 15000),
      dueDate: futureDate(3, 15),
      createdAt: monthsAgo(monthsBack * 2).toISOString(),
      originalBalance: Math.round(studentLoanBalance * 1.4),
      monthlyPayment: randomInRange(8000, 15000),
      payoffDate: futureDate(365, 1095),
      totalInterestPaid: randomInRange(50000, 150000),
    },
    {
      id: generateId("debt"),
      name: "Car Loan",
      balance: carLoanBalance,
      interestRate: 11.0,
      minimumPayment: randomInRange(15000, 35000),
      dueDate: futureDate(1, 10),
      createdAt: monthsAgo(monthsBack).toISOString(),
      originalBalance: Math.round(carLoanBalance * 1.25),
      monthlyPayment: randomInRange(18000, 35000),
      payoffDate: futureDate(365, 730),
      totalInterestPaid: randomInRange(100000, 300000),
    },
  ]
}

// ── Debt / Credit Transaction History ───────────────────
function generateDebtCreditTransactions(
  monthsBack: number,
  debtAccounts: DebtAccount[],
  creditAccounts: CreditAccount[],
): DebtCreditTransaction[] {
  const txns: DebtCreditTransaction[] = []

  for (const debt of debtAccounts) {
    const paymentCount = randomInRange(2, 6)
    for (let i = 0; i < paymentCount; i++) {
      const date = randomDate(Math.min(monthsBack, 6))
      const payment = Math.round(debt.minimumPayment * (0.8 + Math.random() * 0.4))
      txns.push({
        id: generateId("dctx"),
        accountId: debt.id,
        accountType: "debt",
        type: "payment",
        amount: payment,
        description: `Monthly payment to ${debt.name}`,
        date,
        balanceAfter: debt.balance - payment * (paymentCount - i - 1),
      })
    }
    txns.push({
      id: generateId("dctx"),
      accountId: debt.id,
      accountType: "debt",
      type: "interest",
      amount: Math.round(debt.balance * (debt.interestRate / 100 / 12)),
      description: `Interest charged on ${debt.name}`,
      date: randomDate(Math.min(monthsBack, 3)),
      balanceAfter: debt.balance,
    })
  }

  for (const credit of creditAccounts) {
    const paymentCount = randomInRange(2, 5)
    for (let i = 0; i < paymentCount; i++) {
      const date = randomDate(Math.min(monthsBack, 6))
      const payment = Math.round(credit.minimumPayment * (0.8 + Math.random() * 0.4))
      txns.push({
        id: generateId("dctx"),
        accountId: credit.id,
        accountType: "credit",
        type: "payment",
        amount: payment,
        description: `Payment to ${credit.name}`,
        date,
        balanceAfter: credit.balance - payment * (paymentCount - i - 1),
      })
    }
    txns.push({
      id: generateId("dctx"),
      accountId: credit.id,
      accountType: "credit",
      type: "charge",
      amount: randomInRange(2000, 15000),
      description: `Purchase on ${credit.name}`,
      date: randomDate(Math.min(monthsBack, 2)),
      balanceAfter: credit.balance,
    })
  }

  return txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

// ── Portfolio & Share Transactions ──────────────────────
const STOCK_SYMBOLS = [
  { symbol: "NABIL", name: "Nabil Bank Limited", sector: "Banking" },
  { symbol: "NICA", name: "NIC Asia Bank", sector: "Banking" },
  { symbol: "EBL", name: "Everest Bank Limited", sector: "Banking" },
  { symbol: "SBL", name: "Sunrise Bank Limited", sector: "Banking" },
  { symbol: "CHCL", name: "Chilime Hydropower", sector: "HydroPower" },
  { symbol: "RHPL", name: "Rastriya Hetroda", sector: "HydroPower" },
  { symbol: "UPPER", name: "Upper Tamakoshi", sector: "HydroPower" },
  { symbol: "NTC", name: "Nepal Telecom", sector: "Telecom" },
  { symbol: "CIT", name: "Citizen Investment Trust", sector: "Investment" },
  { symbol: "NIFRA", name: "Nepal Infrastructure Bank", sector: "Infrastructure" },
]

const PORTFOLIO_NAMES = ["Main Portfolio", "Trading Account", "Long Term Holdings"]

function generatePortfolio(monthsBack: number): {
  portfolios: { id: string; name: string; isDefault: boolean; createdAt: string; description?: string; color?: string; includeInTotals?: boolean }[]
  activePortfolioId: string
  portfolioItems: PortfolioItem[]
  shareTransactions: ShareTransaction[]
} {
  const portfolios = PORTFOLIO_NAMES.map((name, i) => ({
    id: generateId("pf"),
    name,
    description: i === 0 ? "Primary investment portfolio" : i === 1 ? "Short-term trading" : "Long-term holdings",
    color: ["#3b82f6", "#8b5cf6", "#10b981"][i],
    includeInTotals: true,
    isDefault: i === 0,
    createdAt: monthsAgo(monthsBack - i).toISOString(),
  }))
  const activePortfolioId = portfolios[0].id

  const items: PortfolioItem[] = []
  const shareTxns: ShareTransaction[] = []

  // Pick 4-7 random stocks for the active portfolio
  const numHoldings = randomInRange(4, 7)
  const selected = STOCK_SYMBOLS.sort(() => Math.random() - 0.5).slice(0, numHoldings)

  for (const stock of selected) {
    const buyDate = randomDate(monthsBack)
    const quantity = randomInRange(10, 200)
    const buyPrice = randomInRange(200, 800)
    const currentPrice = Math.round(buyPrice * (0.7 + Math.random() * 0.8))

    items.push({
      id: generateId("pfx"),
      portfolioId: portfolios[0].id,
      symbol: stock.symbol,
      assetType: "stock",
      assetName: stock.name,
      units: quantity,
      buyPrice,
      currentPrice,
      sector: stock.sector,
      lastUpdated: new Date().toISOString(),
    })

    // Buy transaction
    shareTxns.push({
      id: generateId("stx"),
      portfolioId: portfolios[0].id,
      symbol: stock.symbol,
      assetType: "stock",
      type: "buy",
      quantity,
      price: buyPrice,
      date: buyDate,
      description: `Bought ${quantity} units of ${stock.symbol} @ ${buyPrice}`,
    })

    // Occasional bonus or reinvestment
    if (Math.random() > 0.6) {
      const bonusQty = Math.floor(quantity * 0.1)
      shareTxns.push({
        id: generateId("stx"),
        portfolioId: portfolios[0].id,
        symbol: stock.symbol,
        assetType: "stock",
        type: "bonus",
        quantity: bonusQty,
        price: 0,
        date: randomDate(Math.min(monthsBack, 3)),
        description: `${bonusQty} units bonus shares of ${stock.symbol}`,
      })
    }
  }

  return { portfolios, activePortfolioId, portfolioItems: items, shareTransactions: shareTxns }
}

// ── Main ────────────────────────────────────────────────
export interface DemoDataResult {
  userProfile: UserProfile
  transactions: Transaction[]
  budgets: Budget[]
  goals: Goal[]
  categories: Category[]
  debtAccounts: DebtAccount[]
  creditAccounts: CreditAccount[]
  debtCreditTransactions: DebtCreditTransaction[]
  portfolio: PortfolioItem[]
  shareTransactions: ShareTransaction[]
  portfolios: { id: string; name: string; isDefault: boolean; createdAt: string; description?: string; color?: string; includeInTotals?: boolean }[]
  activePortfolioId: string
  emergencyFund: number
}

export function generateDemoData(options: DemoDataOptions): DemoDataResult {
  const monthsBack = options.monthsBack

  const userProfile = generateUserProfile(monthsBack)
  const categories = generateCategories(monthsBack)
  const transactions = generateTransactions(options.transactionCount, monthsBack)
  const budgets = options.includeBudgets ? generateBudgets(monthsBack) : []
  const goals = options.includeGoals ? generateGoals(monthsBack) : []
  const creditAccounts = options.includeDebtCredit ? generateCreditAccounts(monthsBack) : []
  const debtAccounts = options.includeDebtCredit ? generateDebtAccounts(monthsBack) : []
  const debtCreditTransactions = options.includeDebtCredit
    ? generateDebtCreditTransactions(monthsBack, debtAccounts, creditAccounts)
    : []
  const { portfolios, activePortfolioId, portfolioItems, shareTransactions } = generatePortfolio(monthsBack)

  const balance = options.startingBalance ?? transactions.reduce((sum, tx) => {
    return sum + (tx.type === "income" ? (tx.actual ?? tx.amount) : -(tx.actual ?? tx.amount))
  }, 0)

  return {
    userProfile,
    transactions,
    budgets,
    goals,
    categories,
    debtAccounts,
    creditAccounts,
    debtCreditTransactions,
    portfolio: portfolioItems,
    shareTransactions,
    portfolios,
    activePortfolioId,
    emergencyFund: Math.max(0, Math.round(balance * 0.15)),
  }
}
