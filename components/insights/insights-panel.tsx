"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Clock, Download, PieChart, BarChart3, Target, AlertTriangle, ArrowRight, Sparkles, Shield, ChevronDown, ChevronUp } from "lucide-react"
import { useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useFinancialHealthScore, FinancialHealthScore } from "./financial-health-score"
import type { Transaction, UserProfile, Budget, Goal, DebtAccount } from "@/types/wallet"
import { formatCurrency } from "@/lib/utils"
import { getTimeEquivalentBreakdown } from "@/lib/wallet-utils"
import { SpendingTrendsAnalysis } from "./spending-trends-analysis"
import { CategoryPerformanceDashboard } from "./category-performance-dashboard"

interface InsightsPanelProps {
  transactions: Transaction[]
  userProfile: UserProfile
  budgets: Budget[]
  goals: Goal[]
  debtAccounts: DebtAccount[]
  balance: number
  onExportData: () => void
  calculateTimeEquivalent: (amount: number) => number
  onNavigate?: (tab: string) => void
  onAddGoal?: (goal: Omit<Goal, "id">) => void
  onAddBudget?: (budget: Omit<Budget, "id">) => void
}

export function InsightsPanel({
  transactions,
  userProfile,
  budgets,
  goals,
  debtAccounts,
  balance,
  onExportData,
  calculateTimeEquivalent: _calculateTimeEquivalent,
  onNavigate,
  onAddGoal,
  onAddBudget,
}: InsightsPanelProps) {
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false)

  const isTimeWalletEnabled =
    userProfile.monthlyEarning > 0 &&
    userProfile.workingDaysPerMonth > 0 &&
    userProfile.workingHoursPerDay > 0

  // Calculate insights
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)
  const netWorth = totalIncome - totalExpenses
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const lastMonthDate = new Date(currentYear, currentMonth - 1, 1)
  const lastMonth = lastMonthDate.getMonth()
  const lastMonthYear = lastMonthDate.getFullYear()

  const isSameMonth = (date: Date, month: number, year: number) =>
    date.getMonth() === month && date.getFullYear() === year

  const parseDate = (value: string) => {
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? null : parsed
  }

  const thisMonthTransactions = transactions.filter((t) => {
    const date = parseDate(t.date)
    return date ? isSameMonth(date, currentMonth, currentYear) : false
  })
  const lastMonthTransactions = transactions.filter((t) => {
    const date = parseDate(t.date)
    return date ? isSameMonth(date, lastMonth, lastMonthYear) : false
  })

  const thisMonthIncome = thisMonthTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)
  const thisMonthExpenses = thisMonthTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)
  const lastMonthExpenses = lastMonthTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)
  const expenseChangePercent = lastMonthExpenses > 0 ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : 0

  const atRiskBudgets = budgets
    .filter((b) => b.limit > 0)
    .map((b) => ({ ...b, usage: (b.spent / b.limit) * 100 }))
    .filter((b) => b.usage >= 80)
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 3)

  const topGoals = goals
    .filter((g) => g.targetAmount > 0)
    .map((g) => ({ ...g, progress: (g.currentAmount / g.targetAmount) * 100 }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3)

  // Use the same calculation method as balance card for consistency
  const calculateTimeFromAmount = (amount: number) => {
    if (!userProfile || !amount || !isTimeWalletEnabled) return 0
    const hourlyRate = userProfile.monthlyEarning / (userProfile.workingDaysPerMonth * userProfile.workingHoursPerDay)
    return (amount / hourlyRate) * 60 // Convert hours to minutes
  }

  const totalWorkTimeEarned = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + calculateTimeFromAmount(t.amount), 0)
  const totalWorkTimeSpent = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + calculateTimeFromAmount(t.amount), 0)

  // Category breakdown
  const expensesByCategory = transactions
    .filter((t) => t.type === "expense")
    .reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount
        return acc
      },
      {} as Record<string, number>,
    )

  const topCategories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const formatTime = (minutes: number) => {
    if (!minutes || minutes < 0 || !userProfile || !isTimeWalletEnabled) return "0m"

    // Calculate equivalent currency amount using the same method as balance card
    const hours = minutes / 60
    const equivalentAmount = hours * (userProfile.monthlyEarning / (userProfile.workingDaysPerMonth * userProfile.workingHoursPerDay))

    const breakdown = getTimeEquivalentBreakdown(equivalentAmount, userProfile)
    return breakdown ? breakdown.formatted.userFriendly : "0m"
  }

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

  // Financial Health Score Modal Logic
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { overallScore } = useFinancialHealthScore(transactions, userProfile, budgets, goals, debtAccounts, balance)

  // Smart Advisor Logic
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const daysRemaining = Math.max(1, daysInMonth - dayOfMonth)

  const dailySpendingThisMonth = thisMonthExpenses / (dayOfMonth || 1)
  const projectedMonthEndExpenses = dailySpendingThisMonth * daysInMonth
  const potentialSavings = Math.max(0, thisMonthIncome - projectedMonthEndExpenses)

  const incomeRemaining = thisMonthIncome - thisMonthExpenses
  const dailySafetyBudget = incomeRemaining > 0 ? (incomeRemaining / daysRemaining) : 0

  const smartInsights = useMemo(() => {
    const items = []

    // --- 1. CRITICAL: Budget & Overspending ---
    atRiskBudgets.forEach(b => {
      const remainingDays = daysRemaining
      const burnRate = b.spent / (dayOfMonth || 1)
      const projectedTotal = burnRate * daysInMonth

      if (b.usage >= 100) {
        items.push({
          id: `budget-over-${b.id}`,
          type: 'warning',
          icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
          title: `${b.category} Over Limit!`,
          description: `You've exceeded your ${b.category} budget by ${formatCurrency(b.spent - b.limit, userProfile.currency, userProfile.customCurrency)}. Pause non-essential spending here.`,
          action: 'Adjust Budget',
          tab: 'budgets'
        })
      } else {
        items.push({
          id: `budget-risk-${b.id}`,
          type: 'warning',
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
          title: `${b.category} Risk`,
          description: `At your current rate, you'll exceed the ${b.category} budget in ${Math.max(0, (b.limit - b.spent) / (burnRate || 1)).toFixed(0)} days.`,
          action: 'Slow Down',
          tab: 'budgets'
        })
      }
    })

    // --- 2. LIQUIDITY: Emergency Fund Milestones ---
    const emergencyGoals = goals.filter(g =>
      (g.title || "").toLowerCase().includes('emergency') ||
      (g.category || "").toLowerCase() === 'emergency'
    )
    const hasExplicitEfGoal = emergencyGoals.length > 0
    const emergencyBalance = emergencyGoals.reduce((sum, g) => sum + g.currentAmount, 0) + balance
    const monthlyNeeds = thisMonthExpenses || (userProfile.monthlyEarning * 0.5)
    const monthsCovered = emergencyBalance / (monthlyNeeds || 1)

    if (monthsCovered < 1) {
      items.push({
        id: 'ef-critical',
        type: 'warning',
        icon: <Shield className="w-5 h-5 text-red-500" />,
        title: 'Vulnerable Savings',
        description: "You have less than 1 month of expenses covered. Prioritize your Emergency Fund before any 'Wants' spending.",
        action: 'Create Fund',
        actionId: 'setup_ef',
        tab: 'goals'
      })
    } else if (!hasExplicitEfGoal) {
      items.push({
        id: 'ef-missing',
        type: 'info',
        icon: <Shield className="w-5 h-5 text-amber-500" />,
        title: 'Missing Safety Net',
        description: `You have ${monthsCovered.toFixed(1)} months of liquidity, but no dedicated 'Emergency Fund'. Ring-fence this money to prevent accidental spending.`,
        action: 'Create Goal',
        actionId: 'setup_ef',
        tab: 'goals'
      })
    } else if (monthsCovered >= 6) {
      items.push({
        id: 'ef-optimal',
        type: 'success',
        icon: <Shield className="w-5 h-5 text-emerald-500" />,
        title: 'Financial Fortress',
        description: `Unstoppable! You have ${monthsCovered.toFixed(1)} months of expenses covered. You can now aggressively invest or pay off debt.`,
        action: 'View Portfolio',
        tab: 'portfolio'
      })
    }

    // --- 3. GOALS: Velocity & ETAs ---
    topGoals.forEach(g => {
      // Find contributions to this goal in the last 30 days
      const recentFunding = transactions.filter(t =>
        (t.allocationType === 'goal' && t.allocationTarget === g.id) ||
        (t.description.toLowerCase().includes((g.title || "").toLowerCase()) && (g.title || "").length > 3)
      ).filter(t => (now.getTime() - new Date(t.date).getTime()) <= (30 * 24 * 60 * 60 * 1000))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

      const remainingAmount = g.targetAmount - g.currentAmount
      if (remainingAmount > 0 && recentFunding > 0) {
        const monthsToGoal = remainingAmount / recentFunding
        if (monthsToGoal < 3) {
          items.push({
            id: `goal-finish-${g.id}`,
            type: 'success',
            icon: <Target className="w-5 h-5 text-emerald-500" />,
            title: 'Victory in Sight!',
            description: `At your current velocity, "${g.title || g.name}" will be finished in ~${monthsToGoal.toFixed(1)} months. Stay focused!`,
            action: 'Add Extra',
            tab: 'goals'
          })
        }
      } else if (remainingAmount > 0 && recentFunding === 0 && g.progress > 0) {
        items.push({
          id: `goal-stagnant-${g.id}`,
          type: 'info',
          icon: <Clock className="w-5 h-5 text-slate-400" />,
          title: 'Stagnant Goal',
          description: `You haven't contributed to "${g.title || g.name}" this month. Even a small amount keeps the habit alive.`,
          action: 'Transfer Now',
          tab: 'goals'
        })
      }
    })

    // --- 4. DEBT: Avalanche/Snowball Insights ---
    const activeDebts = debtAccounts.filter(d => d.balance > 0)
    if (activeDebts.length > 0) {
      const highestInterestDebt = [...activeDebts].sort((a, b) => b.interestRate - a.interestRate)[0]
      if (highestInterestDebt.interestRate > 15) {
        items.push({
          id: 'debt-avalanche',
          type: 'warning',
          icon: <TrendingUp className="w-5 h-5 text-red-500" />,
          title: 'High Interest Debt',
          description: `"${highestInterestDebt.name}" is costing you ${highestInterestDebt.interestRate}% interest. Pay this off first (Avalanche Method).`,
          action: 'Repay Now',
          tab: 'debt-credit'
        })
      }
    }

    // --- 5. TRENDS: Lifestyle Creep Detection ---
    if (expenseChangePercent > 20 && thisMonthIncome <= totalIncome / (transactions.length > 0 ? 12 : 1)) {
      items.push({
        id: 'lifestyle-creep',
        type: 'warning',
        icon: <TrendingUp className="w-5 h-5 text-amber-500" />,
        title: 'Lifestyle Creep Detected',
        description: "Your spending is rising significantly faster than your income. Watch out for recurring costs that bleed your net worth.",
        action: 'Audit Costs',
        tab: 'categories'
      })
    }

    // --- 6. CATEGORY: Anomaly Detection ---
    topCategories.forEach(([cat, amt]) => {
      // Find average spending for this category in previous months (simple heuristic)
      const previousTotal = transactions
        .filter(t => t.type === 'expense' && t.category === cat && !isSameMonth(new Date(t.date), currentMonth, currentYear))
        .reduce((sum, t) => sum + t.amount, 0)

      const categoryMonthsCount = new Set(transactions.map(t => {
        const d = new Date(t.date)
        return `${d.getFullYear()}-${d.getMonth()}`
      })).size - 1

      const avgMonthlyForCat = categoryMonthsCount > 0 ? previousTotal / categoryMonthsCount : amt

      if (avgMonthlyForCat > 0 && amt > avgMonthlyForCat * 1.5) {
        items.push({
          id: `anomaly-${cat}`,
          type: 'info',
          icon: <BarChart3 className="w-5 h-5 text-blue-500" />,
          title: `Spike in ${cat}`,
          description: `You've spent ${((amt / avgMonthlyForCat - 1) * 100).toFixed(0)}% more on ${cat} than your usual average. Was this planned?`,
          action: 'Review Breakdown',
          tab: 'transactions'
        })
      }
    })

    // --- 7. REWARD: No-Spend Streaks ---
    const last3Days = transactions.filter(t =>
      t.type === 'expense' &&
      (now.getTime() - new Date(t.date).getTime()) <= (3 * 24 * 60 * 60 * 1000)
    ).length

    if (last3Days === 0 && dayOfMonth > 3) {
      items.push({
        id: 'no-spend-streak',
        type: 'success',
        icon: <Sparkles className="w-5 h-5 text-emerald-500" />,
        title: 'No-Spend Streak! 🔥',
        description: "3 days without an expense! You're building incredible financial discipline.",
        action: 'Keep Going',
        tab: 'transactions'
      })
    }

    // --- 8. SETUP: Missing Defaults ---
    if (budgets.length === 0) {
      items.push({
        id: 'setup-budgets',
        type: 'info',
        icon: <PieChart className="w-5 h-5 text-purple-500" />,
        title: 'Complete Setup',
        description: "You haven't set any budgets yet. Create default budgets (Needs/Wants/Savings) to start tracking.",
        action: 'Add Defaults',
        actionId: 'setup_defaults',
        tab: 'budgets'
      })
    }

    // --- 9. SETUP: No Goals ---
    if (goals.length === 0) {
      items.push({
        id: 'setup-goals-starter',
        type: 'info',
        icon: <Target className="w-5 h-5 text-blue-500" />,
        title: 'Start Dreaming',
        description: "You haven't defined any financial targets. Set up a few starter goals to give your money a purpose.",
        action: 'Add Goal Starters',
        actionId: 'setup_goals_defaults',
        tab: 'goals'
      })
    }

    return items
  }, [atRiskBudgets, expenseChangePercent, savingsRate, isTimeWalletEnabled, topGoals, dailySpendingThisMonth, dailySafetyBudget, totalWorkTimeEarned, totalWorkTimeSpent, userProfile, transactions, balance, goals, debtAccounts, daysInMonth, dayOfMonth, daysRemaining, thisMonthExpenses, thisMonthIncome, budgets])

  const handleSmartAction = (insight: any) => {
    if (insight.actionId === 'setup_ef') {
      const monthlyNeeds = thisMonthExpenses || (userProfile.monthlyEarning * 0.5)
      if (onAddGoal) {
        onAddGoal({
          title: "Emergency Fund",
          targetAmount: monthlyNeeds * 6,
          currentAmount: 0,
          category: "emergency",
          priority: "high",
          targetDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
          description: "Safety net for unexpected expenses (6 months of needs)",
          autoContribute: false,
          createdAt: new Date().toISOString()
        })
        onNavigate?.('goals')
      }
    } else if (insight.actionId === 'setup_goals_defaults') {
      if (onAddGoal) {
        // 1. Emergency Fund
        const monthlyNeeds = thisMonthExpenses || (userProfile.monthlyEarning * 0.5)
        onAddGoal({
          title: "Emergency Fund",
          targetAmount: monthlyNeeds * 6,
          currentAmount: 0,
          category: "emergency",
          priority: "high",
          targetDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
          description: "Safety net for unexpected expenses",
          autoContribute: false,
          createdAt: new Date().toISOString()
        })
        // 2. General Savings / Vacation
        onAddGoal({
          title: "Dream Vacation",
          targetAmount: userProfile.monthlyEarning * 2, // Approx 2 months salary
          currentAmount: 0,
          category: "travel",
          priority: "medium",
          targetDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
          description: "Something to look forward to!",
          autoContribute: false,
          createdAt: new Date().toISOString()
        })
        onNavigate?.('goals')
      }
    } else if (insight.actionId === 'setup_defaults') {
      const defaults = [
        { name: "Housing", category: "Housing", limit: userProfile.monthlyEarning * 0.3 },
        { name: "Food", category: "Food & Dining", limit: userProfile.monthlyEarning * 0.15 },
        { name: "Transport", category: "Transportation", limit: userProfile.monthlyEarning * 0.1 },
      ]
      if (onAddBudget) {
        defaults.forEach(d => {
          onAddBudget({
            ...d,
            period: 'monthly',
            alertThreshold: 80,
            categories: [d.category],
            emergencyUses: 0,
            allowDebt: false,
            createdAt: new Date().toISOString(),
            spent: 0
          })
        })
        onNavigate?.('budgets')
      }
    } else if (insight.tab) {
      onNavigate?.(insight.tab)
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Hero Section: Financial Health Advisor */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-primary/5 border border-primary/20 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-32 h-32 text-primary" />
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="flex-1 space-y-4 text-center md:text-left">
            <Badge variant="outline" className="px-3 py-1 bg-white/50 dark:bg-black/20 border-primary/30 text-primary font-bold tracking-wider rounded-full">
              FINANCIAL PERFORMANCE
            </Badge>
            <h2 className="text-xl sm:text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight">
              {overallScore.description}
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl">
              {thisMonthIncome > thisMonthExpenses
                ? `You're on track to save ${formatCurrency(potentialSavings, userProfile.currency, userProfile.customCurrency)} this month. Keep your daily spending below ${formatCurrency(dailySafetyBudget, userProfile.currency, userProfile.customCurrency)}.`
                : "Your expenses currently exceed your income. Let's look for ways to optimize your spending for the rest of the month."}
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Button onClick={() => setIsModalOpen(true)} className="rounded-full px-6 font-bold shadow-lg shadow-primary/20">
                View Score Breakdown
              </Button>
              <Button variant="outline" className="rounded-full px-6 font-bold bg-white/50 dark:bg-black/20" onClick={onExportData}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>

          <div
            className="w-48 h-48 md:w-56 md:h-56 rounded-full border-[12px] border-primary/10 flex items-center justify-center relative cursor-pointer group"
            onClick={() => setIsModalOpen(true)}
          >
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="text-center relative z-10">
              <span className="block text-5xl md:text-7xl font-black text-primary leading-none">{overallScore.score.toFixed(0)}</span>
              <span className="text-xl md:text-2xl font-black text-primary/60">{overallScore.grade}</span>
            </div>
            {/* Simple Animated Ring */}
            <svg className="absolute inset-0 -rotate-90 w-full h-full">
              <circle
                cx="50%"
                cy="50%"
                r="46%"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeDasharray="290"
                strokeDashoffset={290 - (290 * (Number.isNaN(overallScore.score) ? 0 : overallScore.score) / 100)}
                className="text-primary transition-all duration-1000 ease-out"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Actionable Insights: Smart Advisor Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Smart Advisor
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full">{smartInsights.length} Suggestions</Badge>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setIsAdvisorOpen(!isAdvisorOpen)}
            >
              {isAdvisorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className={`${isAdvisorOpen ? 'flex' : 'hidden'} md:flex overflow-x-auto pb-4 gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:pb-0 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0`}>
          {smartInsights.length > 0 ? (
            smartInsights.map((insight) => (
              <Card key={insight.id} className="flex-none w-[85vw] md:w-auto snap-center md:snap-align-none group border-primary/10 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-card to-background relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${insight.type === 'warning' ? 'bg-amber-500' : insight.type === 'success' ? 'bg-emerald-500' : 'bg-primary'}`} />
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 rounded-xl bg-muted/50 group-hover:bg-primary/10 transition-colors">
                      {insight.icon}
                    </div>
                    <CardTitle className="text-base font-black">{insight.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {insight.description}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground rounded-lg transition-all"
                    onClick={() => handleSmartAction(insight)}
                  >
                    {insight.action}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full border-dashed p-10 flex flex-col items-center justify-center text-center text-muted-foreground">
              <BarChart3 className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-bold">Collecting Data...</p>
              <p className="text-sm">Add more transactions to unlock AI-driven insights.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Core Metrics Grid */}
      <div className="flex overflow-x-auto pb-4 gap-4 md:grid md:grid-cols-4 md:pb-0 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        <Card className="flex-none w-[75vw] sm:w-[45vw] md:w-auto snap-center bg-emerald-500/10 dark:bg-emerald-500/5 border-emerald-500/20 overflow-hidden group">
          <CardContent className="p-4 md:p-5 relative">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Safe Daily Spend</p>
            </div>
            <p className="text-xl md:text-2xl font-black font-mono truncate" title={formatCurrency(dailySafetyBudget, userProfile.currency, userProfile.customCurrency)}>
              {formatCurrency(dailySafetyBudget, userProfile.currency, userProfile.customCurrency)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 truncate">To stay within income</p>
          </CardContent>
        </Card>

        <Card className="flex-none w-[75vw] sm:w-[45vw] md:w-auto snap-center bg-blue-500/10 dark:bg-blue-500/5 border-blue-500/20 overflow-hidden group">
          <CardContent className="p-4 md:p-5 relative">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Savings Prowess</p>
            </div>
            <p className="text-xl md:text-2xl font-black font-mono">{savingsRate.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground mt-1">Rate of net income saved</p>
          </CardContent>
        </Card>

        <Card className="flex-none w-[75vw] sm:w-[45vw] md:w-auto snap-center bg-purple-500/10 dark:bg-purple-500/5 border-purple-500/20 overflow-hidden group">
          <CardContent className="p-4 md:p-5 relative">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Time Buffer</p>
            </div>
            <p className="text-xl md:text-2xl font-black font-mono truncate">{formatTime(Math.max(0, totalWorkTimeEarned - totalWorkTimeSpent))}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Total 'Life Hours' banked</p>
          </CardContent>
        </Card>

        <Card className="flex-none w-[75vw] sm:w-[45vw] md:w-auto snap-center bg-primary/10 border-primary/20 overflow-hidden group">
          <CardContent className="p-4 md:p-5 relative">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Projected Win</p>
            </div>
            <p className="text-xl md:text-2xl font-black font-mono truncate" title={formatCurrency(potentialSavings, userProfile.currency, userProfile.customCurrency)}>
              {formatCurrency(potentialSavings, userProfile.currency, userProfile.customCurrency)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 truncate">Est. month-end surplus</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        <div className="lg:col-span-2 space-y-8">
          {/* Spending Trends Analysis */}
          <SpendingTrendsAnalysis
            transactions={transactions}
            userProfile={userProfile}
          />

          {/* Category Performance Dashboard */}
          <CategoryPerformanceDashboard
            transactions={transactions}
            userProfile={userProfile}
          />
        </div>

        <div className="space-y-8">
          {/* Top Spending Categories: Compact & Visual */}
          <Card className="border-primary/10 h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-black flex items-center justify-between">
                <span>Top Categories</span>
                <PieChart className="w-4 h-4 text-primary opacity-50" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topCategories.length > 0 ? (
                <div className="space-y-5">
                  {topCategories.slice(0, 5).map(([category, amount]) => {
                    const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
                    return (
                      <div key={category} className="space-y-1.5 group">
                        <div className="flex justify-between items-end">
                          <span className="text-xs font-bold uppercase tracking-wide truncate max-w-[120px]">{category}</span>
                          <span className="text-xs font-black font-mono">{formatCurrency(amount, userProfile.currency, userProfile.customCurrency)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary group-hover:bg-primary/80 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                          <span>{percentage.toFixed(0)}% of total</span>
                          {isTimeWalletEnabled && <span>{formatTime(calculateTimeFromAmount(amount))} work</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-10 opacity-30">
                  <PieChart className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-xs font-bold uppercase">No Expenses Yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
    </div>
  )
}
