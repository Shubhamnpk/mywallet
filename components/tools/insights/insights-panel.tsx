"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  TrendingUp,
  Clock,
  Download,
  BarChart3,
  Target,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Shield,
  ChevronDown,
  ChevronUp,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  Receipt,
  PieChart,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useFinancialHealthScore, FinancialHealthScore } from "./financial-health-score"
import type { Transaction } from "@/types/wallet"
import { formatCurrency, cn } from "@/lib/utils"
import { isTimeWalletEnabled, getTimeEquivalentBreakdown } from "@/lib/wallet-utils"
import {
  formatAppDate,
  formatAppMonthKey,
  getCalendarMonthKey,
  getCalendarMonthRange,
  isWithinDateRange,
  parseAdDate,
  type CalendarSystem,
} from "@/lib/app-calendar"
import { useCalendarSystem } from "@/hooks/use-calendar-system"
import { useTransactions } from "@/contexts/transactions-context"
import { useUser } from "@/contexts/user-context"
import { useBudgets } from "@/contexts/budgets-context"
import { useGoals } from "@/contexts/goals-context"
import { useWalletData } from "@/contexts/wallet-data-context"
import { AppDateInput } from "@/components/ui/app-date-input"
import { SpendingTrendsAnalysis } from "./spending-trends-analysis"
import { CategoryPerformanceDashboard } from "./category-performance-dashboard"

interface InsightsPanelProps {
  onNavigate?: (tab: string) => void
}

type PeriodMode = "this-month" | "last-month" | "last-3-months" | "all-time" | "custom"

const DAY_MS = 24 * 60 * 60 * 1000
const NECESSITY_CATEGORIES = new Set(["Housing", "Bills & Utilities", "Transportation", "Healthcare", "Groceries", "Education", "Insurance"])

const PERIOD_OPTIONS: { value: PeriodMode; label: string; description: string }[] = [
  { value: "this-month", label: "This Month", description: "Current calendar month" },
  { value: "last-month", label: "Last Month", description: "Previous calendar month" },
  { value: "last-3-months", label: "Last 3 Months", description: "Rolling quarter" },
  { value: "all-time", label: "All Time", description: "Full transaction history" },
  { value: "custom", label: "Custom", description: "Pick your own range" },
]

function isTrueExpense(t: Transaction): boolean {
  return t.type === "expense" && t.status !== "repayment" && t.allocationType !== "goal"
}

function parseDate(value: string): Date | null {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / DAY_MS))
}

interface PeriodRange {
  start: Date
  end: Date
  label: string
  days: number
}

function buildPeriodRange(mode: PeriodMode, calendarSystem: CalendarSystem, customFrom?: string, customTo?: string): PeriodRange {
  const now = new Date()

  if (mode === "this-month" || mode === "last-month") {
    const r = getCalendarMonthRange(now, calendarSystem, mode === "this-month" ? 0 : -1)
    return { start: r.start, end: r.end, label: formatAppMonthKey(r.key, calendarSystem), days: daysBetween(r.start, r.end) }
  }
  if (mode === "last-3-months") {
    const a = getCalendarMonthRange(now, calendarSystem, -2)
    const b = getCalendarMonthRange(now, calendarSystem, 0)
    return {
      start: a.start,
      end: b.end,
      label: `${formatAppMonthKey(a.key, calendarSystem)} – ${formatAppMonthKey(b.key, calendarSystem)}`,
      days: daysBetween(a.start, b.end),
    }
  }
  if (mode === "custom") {
    const from = customFrom ? parseAdDate(customFrom) : null
    const to = customTo ? parseAdDate(customTo) : null
    const start = from ?? new Date(now.getFullYear() - 1, now.getMonth(), 1)
    const rawEnd = to ?? now
    const end = new Date(rawEnd.getTime() + DAY_MS)
    const label = from ? `${formatAppDate(from, calendarSystem)}${to ? ` – ${formatAppDate(to, calendarSystem)}` : " – present"}` : "Custom range"
    return { start, end, label, days: daysBetween(start, end) }
  }

  const start = new Date(now.getFullYear() - 5, 0, 1)
  return { start, end: now, label: "All time", days: daysBetween(start, now) }
}

function previousRange(period: PeriodRange): { start: Date; end: Date } {
  const len = period.end.getTime() - period.start.getTime()
  return { start: new Date(period.start.getTime() - len), end: new Date(period.start.getTime()) }
}

interface CategoryItem {
  id: string
  type: "warning" | "info" | "success"
  icon: React.ReactNode
  title: string
  description: string
  action: string
  actionId?: string
  tab?: string
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  subtitle?: string
  accent: "success" | "danger" | "primary" | "info" | "warning"
}

function MetricCard({ icon, label, value, subtitle, accent }: MetricCardProps) {
  const styles: Record<MetricCardProps["accent"], { text: string; border: string; bg: string }> = {
    success: { text: "text-emerald-500", border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
    danger: { text: "text-red-500", border: "border-red-500/20", bg: "bg-red-500/5" },
    primary: { text: "text-primary", border: "border-primary/20", bg: "bg-primary/5" },
    info: { text: "text-blue-500", border: "border-blue-500/20", bg: "bg-blue-500/5" },
    warning: { text: "text-amber-500", border: "border-amber-500/20", bg: "bg-amber-500/5" },
  }
  const s = styles[accent]
  return (
    <Card className={cn("border overflow-hidden", s.border, s.bg)}>
      <CardContent className="p-4">
        <p className={cn("text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1", s.text)}>
          {icon}
          {label}
        </p>
        <p className="text-xl font-black font-mono truncate" title={value}>
          {value}
        </p>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-1 truncate">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

export function InsightsPanel({ onNavigate }: InsightsPanelProps) {
  const { transactions } = useTransactions()
  const { userProfile } = useUser()
  const { budgets, addBudget } = useBudgets()
  const { goals, addGoal } = useGoals()
  const { debtAccounts, balance } = useWalletData()
  const calendarSystem = useCalendarSystem()

  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [experience, setExperience] = useState<"new" | "classic">("new")
  const [periodMode, setPeriodMode] = useState<PeriodMode>("this-month")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")

  if (!userProfile) return null
  const timeWalletActive = isTimeWalletEnabled(userProfile)
  const now = new Date()
  const fmt = (value: number) => formatCurrency(value, userProfile.currency, userProfile.customCurrency)

  const period = useMemo<PeriodRange>(
    () => buildPeriodRange(periodMode, calendarSystem, customFrom, customTo),
    [periodMode, calendarSystem, customFrom, customTo],
  )

  const scopedTransactions = useMemo(
    () =>
      transactions.filter((t) => {
        const date = parseDate(t.date)
        return date ? isWithinDateRange(date, period.start, period.end) : false
      }),
    [transactions, period.start, period.end],
  )

  const scopedIncome = useMemo(() => scopedTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), [scopedTransactions])
  const scopedExpenses = useMemo(() => scopedTransactions.filter(isTrueExpense).reduce((s, t) => s + t.amount, 0), [scopedTransactions])
  const net = scopedIncome - scopedExpenses
  const savingsRate = scopedIncome > 0 ? (net / scopedIncome) * 100 : 0
  const avgDailySpend = scopedExpenses / period.days

  const prevRange = useMemo(() => previousRange(period), [period.start, period.end])
  const prevExpenses = useMemo(
    () =>
      transactions
        .filter((t) => {
          const date = parseDate(t.date)
          return date ? isWithinDateRange(date, prevRange.start, prevRange.end) && isTrueExpense(t) : false
        })
        .reduce((s, t) => s + t.amount, 0),
    [transactions, prevRange.start, prevRange.end],
  )
  const expenseChangePercent = prevExpenses > 0 ? ((scopedExpenses - prevExpenses) / prevExpenses) * 100 : scopedExpenses > 0 ? 100 : 0

  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { monthKey: string; label: string; anchor: Date; income: number; expenses: number }>()
    scopedTransactions.forEach((t) => {
      const date = parseDate(t.date)
      if (!date) return
      const monthKey = getCalendarMonthKey(date, calendarSystem)
      let entry = map.get(monthKey)
      if (!entry) {
        const anchor = getCalendarMonthRange(date, calendarSystem).start
        entry = { monthKey, label: formatAppDate(anchor, calendarSystem, { month: "short", year: "numeric" }), anchor, income: 0, expenses: 0 }
        map.set(monthKey, entry)
      }
      if (t.type === "income") entry.income += t.amount
      else if (isTrueExpense(t)) entry.expenses += t.amount
    })
    const arr = Array.from(map.values()).sort((a, b) => a.anchor.getTime() - b.anchor.getTime())
    return arr.map((entry, index) => {
      const prev = index > 0 ? arr[index - 1] : null
      const prevNet = prev ? prev.income - prev.expenses : null
      const curNet = entry.income - entry.expenses
      const pctChange = prevNet !== null && prevNet !== 0 ? ((curNet - prevNet) / Math.abs(prevNet)) * 100 : null
      return { ...entry, net: curNet, pctChange }
    })
  }, [scopedTransactions, calendarSystem])

  const categoryStats = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>()
    scopedTransactions.filter(isTrueExpense).forEach((t) => {
      const name = t.category || "Uncategorized"
      const entry = map.get(name) || { name, total: 0, count: 0 }
      entry.total += t.amount
      entry.count += 1
      map.set(name, entry)
    })
    const totalExpenses = Array.from(map.values()).reduce((s, c) => s + c.total, 0)
    const hourlyRate = userProfile.monthlyEarning / (userProfile.workingDaysPerMonth * userProfile.workingHoursPerDay)
    const rows = Array.from(map.values())
      .map((c) => ({
        ...c,
        share: totalExpenses > 0 ? (c.total / totalExpenses) * 100 : 0,
        average: c.count > 0 ? c.total / c.count : 0,
        timeValue: hourlyRate > 0 ? c.total / hourlyRate : 0,
        isNecessity: NECESSITY_CATEGORIES.has(c.name),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
    return { rows, totalExpenses }
  }, [scopedTransactions, userProfile])

  const luxuryRatio = useMemo(() => {
    const luxury = categoryStats.rows.filter((c) => !c.isNecessity).reduce((s, c) => s + c.total, 0)
    return categoryStats.totalExpenses > 0 ? (luxury / categoryStats.totalExpenses) * 100 : 0
  }, [categoryStats])

  const microSpendCount = categoryStats.rows.filter((c) => c.count > 5).length

  function calculateTimeFromAmount(amount: number): number {
    if (!userProfile || !amount || !timeWalletActive) return 0
    const hourlyRate = userProfile.monthlyEarning / (userProfile.workingDaysPerMonth * userProfile.workingHoursPerDay)
    return (amount / hourlyRate) * 60
  }

  function formatTime(minutes: number): string {
    if (!minutes || minutes < 0 || !userProfile || !timeWalletActive) return "0m"
    const hours = minutes / 60
    const equivalentAmount = hours * (userProfile.monthlyEarning / (userProfile.workingDaysPerMonth * userProfile.workingHoursPerDay))
    const breakdown = getTimeEquivalentBreakdown(equivalentAmount, userProfile)
    return breakdown ? breakdown.formatted.userFriendly : "0m"
  }

  const exportInsightsReport = () => {
    const report = {
      exportedAt: new Date().toISOString(),
      period: { mode: periodMode, label: period.label, from: period.start.toISOString(), to: period.end.toISOString() },
      summary: { income: scopedIncome, expenses: scopedExpenses, net, savingsRate, avgDailySpend },
      transactionsScoped: scopedTransactions.length,
      transactionsTotal: transactions.length,
      budgets: budgets.length,
      goals: goals.length,
      debtAccounts: debtAccounts.length,
      userProfile: { currency: userProfile.currency, monthlyEarning: userProfile.monthlyEarning },
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `mywallet-insights-report-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const { overallScore } = useFinancialHealthScore(transactions, userProfile, budgets, goals, debtAccounts, balance)

  const dayOfScope = Math.min(period.days, Math.max(1, Math.floor((now.getTime() - period.start.getTime()) / DAY_MS) + 1))
  const daysRemaining = Math.max(1, period.days - dayOfScope)
  const projectedEndSpend = (scopedExpenses / dayOfScope) * period.days
  const potentialSavings = Math.max(0, scopedIncome - projectedEndSpend)
  const incomeRemaining = scopedIncome - scopedExpenses
  const dailySafetyBudget = incomeRemaining > 0 ? incomeRemaining / daysRemaining : 0

  const atRiskBudgets = budgets
    .filter((b) => b.limit > 0)
    .map((b) => {
      const categorySet = new Set([b.category, ...(b.categories || [])].filter(Boolean).map((c) => c.toLowerCase()))
      const spent = scopedTransactions.filter((t) => isTrueExpense(t) && categorySet.has((t.category || "").toLowerCase())).reduce((s, t) => s + t.amount, 0)
      return { ...b, spent, usage: (spent / b.limit) * 100 }
    })
    .filter((b) => b.usage >= 80)
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 3)

  const topGoals = goals
    .filter((g) => g.targetAmount > 0)
    .map((g) => ({ ...g, progress: (g.currentAmount / g.targetAmount) * 100 }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3)

  const smartInsights = useMemo<CategoryItem[]>(() => {
    const items: CategoryItem[] = []

    atRiskBudgets.forEach((b) => {
      const burnRate = b.spent / (dayOfScope || 1)
      if (b.usage >= 100) {
        items.push({
          id: `budget-over-${b.id}`,
          type: "warning",
          icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
          title: `${b.category} Over Limit!`,
          description: `You've exceeded your ${b.category} budget by ${fmt(b.spent - b.limit)} in ${period.label}. Pause non-essential spending here.`,
          action: "Adjust Budget",
          tab: "budgets",
        })
      } else {
        items.push({
          id: `budget-risk-${b.id}`,
          type: "warning",
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
          title: `${b.category} Risk`,
          description: `At your current rate, you'll exceed the ${b.category} budget in ~${Math.max(0, (b.limit - b.spent) / (burnRate || 1)).toFixed(0)} days.`,
          action: "Slow Down",
          tab: "budgets",
        })
      }
    })

    const emergencyGoals = goals.filter((g) => (g.title || "").toLowerCase().includes("emergency") || (g.category || "").toLowerCase() === "emergency")
    const hasExplicitEfGoal = emergencyGoals.length > 0
    const emergencyBalance = emergencyGoals.reduce((s, g) => s + g.currentAmount, 0) + balance
    const monthlyNeeds = scopedExpenses || userProfile.monthlyEarning * 0.5
    const monthsCovered = emergencyBalance / (monthlyNeeds || 1)

    if (monthsCovered < 1) {
      items.push({
        id: "ef-critical",
        type: "warning",
        icon: <Shield className="w-5 h-5 text-red-500" />,
        title: "Vulnerable Savings",
        description: "You have less than 1 month of expenses covered. Prioritize your Emergency Fund before any 'Wants' spending.",
        action: "Create Fund",
        actionId: "setup_ef",
        tab: "goals",
      })
    } else if (!hasExplicitEfGoal) {
      items.push({
        id: "ef-missing",
        type: "info",
        icon: <Shield className="w-5 h-5 text-amber-500" />,
        title: "Missing Safety Net",
        description: `You have ${monthsCovered.toFixed(1)} months of liquidity, but no dedicated 'Emergency Fund'. Ring-fence this money to prevent accidental spending.`,
        action: "Create Goal",
        actionId: "setup_ef",
        tab: "goals",
      })
    } else if (monthsCovered >= 6) {
      items.push({
        id: "ef-optimal",
        type: "success",
        icon: <Shield className="w-5 h-5 text-emerald-500" />,
        title: "Financial Fortress",
        description: `Unstoppable! You have ${monthsCovered.toFixed(1)} months of expenses covered. You can now aggressively invest or pay off debt.`,
        action: "View Portfolio",
        tab: "portfolio",
      })
    }

    topGoals.forEach((g) => {
      const recentFunding = transactions
        .filter(
          (t) =>
            (t.allocationType === "goal" && t.allocationTarget === g.id) ||
            (t.description.toLowerCase().includes((g.title || "").toLowerCase()) && (g.title || "").length > 3),
        )
        .filter((t) => now.getTime() - new Date(t.date).getTime() <= 30 * DAY_MS)
        .reduce((s, t) => s + Math.abs(t.amount), 0)
      const remainingAmount = g.targetAmount - g.currentAmount
      if (remainingAmount > 0 && recentFunding > 0 && remainingAmount / recentFunding < 3) {
        items.push({
          id: `goal-finish-${g.id}`,
          type: "success",
          icon: <Target className="w-5 h-5 text-emerald-500" />,
          title: "Victory in Sight!",
          description: `"${g.title || g.name}" will be finished in ~${(remainingAmount / recentFunding).toFixed(1)} months at your current pace.`,
          action: "Add Extra",
          tab: "goals",
        })
      } else if (remainingAmount > 0 && recentFunding === 0 && g.progress > 0) {
        items.push({
          id: `goal-stagnant-${g.id}`,
          type: "info",
          icon: <Clock className="w-5 h-5 text-slate-400" />,
          title: "Stagnant Goal",
          description: `You haven't contributed to "${g.title || g.name}" recently. Even a small amount keeps the habit alive.`,
          action: "Transfer Now",
          tab: "goals",
        })
      }
    })

    const activeDebts = debtAccounts.filter((d) => d.balance > 0)
    const highestInterestDebt = activeDebts.length > 0 ? [...activeDebts].sort((a, b) => b.interestRate - a.interestRate)[0] : null
    if (highestInterestDebt && highestInterestDebt.interestRate > 15) {
      items.push({
        id: "debt-avalanche",
        type: "warning",
        icon: <TrendingUp className="w-5 h-5 text-red-500" />,
        title: "High Interest Debt",
        description: `"${highestInterestDebt.name}" is costing you ${highestInterestDebt.interestRate}% interest. Pay this off first (Avalanche Method).`,
        action: "Repay Now",
        tab: "debt-credit",
      })
    }

    if (expenseChangePercent > 20) {
      items.push({
        id: "lifestyle-creep",
        type: "warning",
        icon: <BarChart3 className="w-5 h-5 text-amber-500" />,
        title: "Spending Momentum Up",
        description: `Spending in ${period.label} rose ${expenseChangePercent.toFixed(0)}% vs the previous period. Watch for recurring costs.`,
        action: "Audit Costs",
        tab: "categories",
      })
    }

    items.push({
      id: "daily-budget",
      type: dailySafetyBudget > 0 ? "success" : "warning",
      icon: <Wallet className="w-5 h-5 text-primary" />,
      title: dailySafetyBudget > 0 ? "Daily Safety Budget" : "Overspend Risk",
      description:
        dailySafetyBudget > 0
          ? `Spend at most ${formatCurrency(dailySafetyBudget, userProfile.currency, userProfile.customCurrency)}/day to finish ${period.label} within your income.`
          : `Your expenses already exceed your income for ${period.label}. Review discretionary categories to recover.`,
      action: "Review Breakdown",
      tab: "transactions",
    })

    if (budgets.length === 0) {
      items.push({
        id: "setup-budgets",
        type: "info",
        icon: <PieChart className="w-5 h-5 text-purple-500" />,
        title: "Complete Setup",
        description: "You haven't set any budgets yet. Create default budgets (Needs/Wants/Savings) to start tracking.",
        action: "Add Defaults",
        actionId: "setup_defaults",
        tab: "budgets",
      })
    }

    if (goals.length === 0) {
      items.push({
        id: "setup-goals-starter",
        type: "info",
        icon: <Target className="w-5 h-5 text-blue-500" />,
        title: "Start Dreaming",
        description: "You haven't defined any financial targets. Set up a few starter goals to give your money a purpose.",
        action: "Add Goal Starters",
        actionId: "setup_goals_defaults",
        tab: "goals",
      })
    }

    return items.slice(0, 6)
  }, [
    atRiskBudgets,
    scopedExpenses,
    period.label,
    transactions,
    topGoals,
    debtAccounts,
    balance,
    budgets,
    goals,
    now,
    dayOfScope,
    dailySafetyBudget,
    expenseChangePercent,
    userProfile,
    fmt,
  ])

  const handleSmartAction = (action: CategoryItem) => {
    if (action.actionId === "setup_ef") {
      const monthlyNeeds = scopedExpenses || userProfile.monthlyEarning * 0.5
      if (addGoal) {
        addGoal({
          title: "Emergency Fund",
          targetAmount: monthlyNeeds * 6,
          category: "emergency",
          priority: "high",
          targetDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
          description: "Safety net for unexpected expenses (6 months of needs)",
          autoContribute: false,
          createdAt: new Date().toISOString(),
        })
        onNavigate?.("goals")
      }
    } else if (action.actionId === "setup_goals_defaults") {
      const monthlyNeeds = scopedExpenses || userProfile.monthlyEarning * 0.5
      if (addGoal) {
        addGoal({
          title: "Emergency Fund",
          targetAmount: monthlyNeeds * 6,
          category: "emergency",
          priority: "high",
          targetDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
          description: "Safety net for unexpected expenses",
          autoContribute: false,
          createdAt: new Date().toISOString(),
        })
        addGoal({
          title: "Dream Vacation",
          targetAmount: userProfile.monthlyEarning * 2,
          category: "travel",
          priority: "medium",
          targetDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
          description: "Something to look forward to!",
          autoContribute: false,
          createdAt: new Date().toISOString(),
        })
        onNavigate?.("goals")
      }
    } else if (action.actionId === "setup_defaults") {
      const defaults = [
        { name: "Housing", category: "Housing", limit: userProfile.monthlyEarning * 0.3 },
        { name: "Food", category: "Food & Dining", limit: userProfile.monthlyEarning * 0.15 },
        { name: "Transport", category: "Transportation", limit: userProfile.monthlyEarning * 0.1 },
      ]
      if (addBudget) {
        defaults.forEach((d) => {
          addBudget({
            ...d,
            period: "monthly",
            alertThreshold: 80,
            categories: [d.category],
            emergencyUses: 0,
            allowDebt: false,
            createdAt: new Date().toISOString(),
            spent: 0,
          })
        })
        onNavigate?.("budgets")
      }
    } else if (action.tab) {
      onNavigate?.(action.tab)
    }
  }

  const isEmpty = scopedTransactions.length === 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Experience toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/30 text-primary rounded-full text-[11px]">
            {experience === "new" ? "New Experience" : "Classic Experience"}
          </Badge>
          {experience === "classic" && (
            <span className="text-xs text-muted-foreground">Preserved legacy insights dashboard.</span>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-full border border-primary/20 bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setExperience("new")}
            className={cn("rounded-full px-4 py-1.5 text-xs font-bold transition-colors", experience === "new" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground")}
          >
            New
          </button>
          <button
            type="button"
            onClick={() => setExperience("classic")}
            className={cn("rounded-full px-4 py-1.5 text-xs font-bold transition-colors", experience === "classic" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground")}
          >
            Classic
          </button>
        </div>
      </div>

      {experience === "classic" ? (
        <div className="space-y-6">
          <SpendingTrendsAnalysis transactions={transactions} userProfile={userProfile} />
          <CategoryPerformanceDashboard transactions={transactions} userProfile={userProfile} />
        </div>
      ) : (
        <>
      {/* Hero + score */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/10 via-background to-primary/5 border border-primary/20 p-4 sm:p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-20 h-20 sm:w-32 sm:h-32 text-primary" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-4 sm:gap-6 md:gap-8 relative z-10">
          <div className="flex-1 space-y-3 sm:space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
                <Badge variant="outline" className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-white/50 dark:bg-black/20 border-primary/30 text-primary font-bold tracking-wider rounded-full text-[10px] sm:text-xs w-fit">
                  FINANCIAL PERFORMANCE · {period.label.toUpperCase()}
                </Badge>
                <h2 className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-black tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight">
                  {overallScore.description}
                </h2>
              </div>
              <div className="md:hidden w-14 h-14 rounded-full flex items-center justify-center relative cursor-pointer group shrink-0" onClick={() => setIsModalOpen(true)}>
                <div className="absolute inset-0 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors"></div>
                <div className="text-center relative z-10">
                  <span className="block text-base font-black text-primary leading-none">{overallScore.score.toFixed(0)}</span>
                  <span className="text-[7px] font-black text-primary/50 leading-none">{overallScore.grade}</span>
                </div>
                <svg className="absolute inset-0 -rotate-90 w-full h-full">
                  <circle cx="50%" cy="50%" r="44%" fill="none" stroke="oklch(var(--primary)/0.12)" strokeWidth="6" />
                  <circle cx="50%" cy="50%" r="44%" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={276} strokeDashoffset={Math.max(0, 276 - (276 * (Number.isNaN(overallScore.score) ? 0 : overallScore.score)) / 100)} className="text-primary transition-all duration-1000 ease-out" />
                </svg>
              </div>
            </div>

            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl">
              {net >= 0
                ? `You're on track to save ${fmt(potentialSavings)} in ${period.label}. Keep your daily spending below ${fmt(dailySafetyBudget)}.`
                : `Your expenses exceed your income by ${fmt(Math.abs(net))} in ${period.label}. Let's find ways to optimize spending.`}
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Button onClick={() => setIsModalOpen(true)} className="rounded-full px-4 sm:px-6 text-xs sm:text-sm font-bold shadow-lg shadow-primary/20 h-9 sm:h-10">
                View Score Breakdown
              </Button>
              <Button variant="outline" className="rounded-full px-4 sm:px-6 text-xs sm:text-sm font-bold bg-white/50 dark:bg-black/20 h-9 sm:h-10" onClick={exportInsightsReport}>
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Export Report
              </Button>
            </div>
          </div>

          <div className="hidden md:flex w-40 h-40 lg:w-48 lg:h-48 rounded-full border-[10px] lg:border-[12px] border-primary/10 items-center justify-center relative cursor-pointer group shrink-0" onClick={() => setIsModalOpen(true)}>
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="text-center relative z-10">
              <span className="block text-5xl lg:text-7xl font-black text-primary leading-none">{overallScore.score.toFixed(0)}</span>
              <span className="text-xl lg:text-2xl font-black text-primary/60">{overallScore.grade}</span>
            </div>
            <svg className="absolute inset-0 -rotate-90 w-full h-full">
              <circle cx="50%" cy="50%" r="46%" fill="none" stroke="currentColor" strokeWidth="12" strokeDasharray="290" strokeDashoffset={Math.max(0, 290 - (290 * (Number.isNaN(overallScore.score) ? 0 : overallScore.score)) / 100)} className="text-primary transition-all duration-1000 ease-out" />
            </svg>
          </div>
        </div>
      </div>

      {/* Period selector */}
      <Card className="border-primary/10">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">Analysis Period</span>
              <Badge variant="secondary" className="rounded-full text-[11px]">{period.label}</Badge>
            </div>
            {scopedExpenses > 0 && (
              <Badge variant="outline" className={cn("rounded-full text-[11px] font-mono", expenseChangePercent > 0 ? "text-red-500 border-red-500/30" : "text-emerald-500 border-emerald-500/30")}>
                {expenseChangePercent > 0 ? "+" : ""}{expenseChangePercent.toFixed(0)}% spend vs prev period
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                title={opt.description}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                  periodMode === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30",
                )}
                onClick={() => setPeriodMode(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {periodMode === "custom" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80">From</Label>
                <AppDateInput value={customFrom} onChange={setCustomFrom} calendarSystem={calendarSystem} className="h-10" showPreview={false} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80">To</Label>
                <AppDateInput value={customTo} onChange={setCustomTo} calendarSystem={calendarSystem} className="h-10" showPreview={false} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Core metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <MetricCard icon={<ArrowUpCircle className="w-4 h-4" />} label="Income" value={fmt(scopedIncome)} accent="success" />
        <MetricCard icon={<ArrowDownCircle className="w-4 h-4" />} label="Expenses" value={fmt(scopedExpenses)} accent="danger" />
        <MetricCard icon={<Wallet className="w-4 h-4" />} label="Net" value={fmt(net)} accent={net >= 0 ? "primary" : "danger"} />
        <MetricCard icon={<Target className="w-4 h-4" />} label="Savings Rate" value={`${savingsRate.toFixed(0)}%`} subtitle="of income kept" accent={savingsRate >= 0 ? "info" : "warning"} />
        <MetricCard icon={<Clock className="w-4 h-4" />} label="Avg / Day" value={fmt(avgDailySpend)} accent="warning" />
        <MetricCard icon={<Receipt className="w-4 h-4" />} label="Transactions" value={`${scopedTransactions.length}`} accent="primary" />
      </div>

      {/* Smart Advisor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Smart Advisor
            <Badge variant="secondary" className="rounded-full">{smartInsights.length}</Badge>
          </h3>
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setIsAdvisorOpen(!isAdvisorOpen)}>
            {isAdvisorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
        <div className={cn(isAdvisorOpen ? "flex" : "hidden", "md:flex flex-wrap gap-4")}>
          {smartInsights.map((insight) => (
            <Card key={insight.id} className="w-full md:w-[calc(33.333%-1rem)] min-w-[260px] flex-1 border-primary/10 hover:border-primary/30 hover:shadow-lg transition-all relative overflow-hidden">
              <div className={cn("absolute top-0 left-0 w-1 h-full rounded-l", insight.type === "warning" ? "bg-amber-500" : insight.type === "success" ? "bg-emerald-500" : "bg-primary")} />
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-muted/50">{insight.icon}</div>
                  <CardTitle className="text-base font-bold">{insight.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">{insight.description}</p>
                <Button variant="ghost" size="sm" className="w-full justify-between font-bold text-primary hover:bg-primary hover:text-primary-foreground rounded-lg" onClick={() => handleSmartAction(insight)}>
                  {insight.action}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {smartInsights.length === 0 && (
            <Card className="w-full border-dashed p-10 text-center text-muted-foreground">
              <BarChart3 className="w-12 h-12 mb-4 opacity-20 mx-auto" />
              <p className="text-lg font-bold">Collecting Data...</p>
              <p className="text-sm">Add more transactions to unlock AI-driven insights.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Monthly trend + Top categories */}
      {!isEmpty && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">Monthly Trend</h3>
                  <p className="text-xs text-muted-foreground">Income, expenses &amp; net across {period.label}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {monthlyTrend.length > 0 ? (
                monthlyTrend.map((m) => (
                  <div key={m.monthKey} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-primary/10 bg-muted/20">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm w-24 sm:w-28">{m.label}</span>
                      {m.pctChange !== null && (
                        <Badge className={cn("rounded-full text-[10px] font-mono", m.pctChange >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600")}>
                          {m.pctChange > 0 ? "+" : ""}{m.pctChange.toFixed(0)}% net
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6 text-right">
                      <div>
                        <p className="font-bold text-emerald-600 text-sm">{fmt(m.income)}</p>
                        <p className="text-[10px] text-muted-foreground">Income</p>
                      </div>
                      <div>
                        <p className="font-bold text-red-600 text-sm">{fmt(m.expenses)}</p>
                        <p className="text-[10px] text-muted-foreground">Expenses</p>
                      </div>
                      <div>
                        <p className={cn("font-bold text-sm", m.net >= 0 ? "text-emerald-600" : "text-red-600")}>{m.net >= 0 ? "+" : ""}{fmt(m.net)}</p>
                        <p className="text-[10px] text-muted-foreground">Net</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-10 text-center text-muted-foreground">No monthly activity in this period.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <PieChart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">Top Categories</h3>
                  <p className="text-xs text-muted-foreground">Where your money went in {period.label}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {categoryStats.rows.length > 0 ? (
                categoryStats.rows.slice(0, 5).map((c, i) => (
                  <div key={c.name} className="space-y-1.5">
                    <div className="flex justify-between items-end gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide truncate flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground w-4 shrink-0">{i + 1}</span>
                        {c.name}
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{c.isNecessity ? "Need" : "Want"}</Badge>
                      </span>
                      <span className="text-xs font-black font-mono">{fmt(c.total)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-500" style={{ width: `${c.share}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                      <span>{c.share.toFixed(1)}% · {c.count} tx</span>
                      {timeWalletActive && <span>{formatTime(calculateTimeFromAmount(c.total))} work</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 opacity-40">
                  <PieChart className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-xs font-bold uppercase">No Expenses Yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Full category breakdown */}
      {!isEmpty && categoryStats.rows.length > 0 && (
        <Card className="border-primary/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold">Category Breakdown</h3>
                <p className="text-xs text-muted-foreground">Full spending analysis · {categoryStats.rows.length} categories</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryStats.rows.map((c, index) => (
              <div key={c.name} className="p-3 rounded-xl border border-primary/10 bg-muted/20 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">
                      {index + 1}. {c.name}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">{c.isNecessity ? "Necessity" : "Lifestyle"}</Badge>
                  </div>
                  <Badge variant="outline" className="text-[11px]">{fmt(c.total)}</Badge>
                </div>
                <Progress value={c.share} className="h-1 w-full mb-1" />
                <div className="flex justify-between text-[10px] text-muted-foreground font-medium flex-wrap gap-2">
                  <span>{c.share.toFixed(1)}% of expenses</span>
                  <span>{c.average.toFixed(2)} avg</span>
                  {timeWalletActive && <span>{formatTime(calculateTimeFromAmount(c.total))} work</span>}
                  <span>{c.count} tx</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Category insight cards */}
      {!isEmpty && categoryStats.rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {luxuryRatio > 40 && (
            <Card className="border-purple-500/20 bg-purple-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-1">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <h4 className="font-bold text-purple-600">Lifestyle Bloat</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your "Lifestyle" spending is {luxuryRatio.toFixed(0)}% of expenses in {period.label}. Consider whether these add proportional value.
                </p>
              </CardContent>
            </Card>
          )}
          {microSpendCount > 0 && (
            <Card className="border-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h4 className="font-bold">Micro-leak Detection</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {microSpendCount} categor{ microSpendCount === 1 ? "y" : "ies"} had frequent small payments in {period.label}. These "micro-leaks" add up quickly.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Financial Health Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0 border-primary/20 bg-background/95 backdrop-blur-xl">
          <DialogHeader className="p-6 border-b border-primary/10">
            <DialogTitle className="text-2xl font-black tracking-tight">Financial Health Analysis</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            <FinancialHealthScore
              transactions={transactions}
              userProfile={userProfile}
              budgets={budgets}
              goals={goals}
              debtAccounts={debtAccounts}
              balance={balance}
              onNavigate={onNavigate}
              compact
            />
          </div>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  )
}