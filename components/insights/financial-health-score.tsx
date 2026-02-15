"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Award, TrendingUp, Target, Shield, Star, Trophy, AlertTriangle, CheckCircle, Sparkles, PlusCircle, HelpCircle, BarChart3 } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { Transaction, UserProfile, Budget, Goal, DebtAccount } from "@/types/wallet"
import { formatCurrency } from "@/lib/utils"
import { Button } from "../ui/button"

interface HealthMetric {
  id: string
  name: string
  score: number
  maxScore: number
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'setup'
  description: string
  details: string
  actionTip: string
  icon: React.ReactNode
  isOptional?: boolean
  isSetupRequired?: boolean
}

export function useFinancialHealthScore(
  transactions: Transaction[],
  userProfile: UserProfile,
  budgets: Budget[],
  goals: Goal[],
  debtAccounts: DebtAccount[],
  balance: number = 0
) {
  const healthMetrics = useMemo(() => {
    // Basic Aggregates
    const now = new Date()
    const last30Days = transactions.filter(t => {
      const d = new Date(t.date)
      return (now.getTime() - d.getTime()) <= (30 * 24 * 60 * 60 * 1000)
    })

    const monthlyIncome = last30Days.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || userProfile.monthlyEarning || 1
    const monthlyExpenses = last30Days.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)

    // 50/30/20 Classification
    const needsCategories = ["Housing", "Bills & Utilities", "Transportation", "Healthcare", "Groceries", "Education", "Insurance"]
    const wantsCategories = ["Food & Dining", "Shopping", "Entertainment", "Travel", "Other"]

    const needsSpending = last30Days.filter(t => t.type === 'expense' && needsCategories.includes(t.category)).reduce((sum, t) => sum + t.amount, 0)
    const wantsSpending = last30Days.filter(t => t.type === 'expense' && wantsCategories.includes(t.category)).reduce((sum, t) => sum + t.amount, 0)
    const savingsAndDebt = Math.max(0, monthlyIncome - monthlyExpenses)

    const needsRatio = (needsSpending / monthlyIncome) * 100
    const wantsRatio = (wantsSpending / monthlyIncome) * 100
    const savingsRatio = (savingsAndDebt / monthlyIncome) * 100

    // 1. Metric: Survival Buffer (Liquidity)
    const emergencyGoals = goals.filter(g => {
      const searchStr = `${g.title || ""} ${g.name || ""} ${g.category || ""}`.toLowerCase()
      return searchStr.includes('emergency') ||
        searchStr.includes('emanergency') ||
        searchStr.includes('safety fund') ||
        searchStr.includes('safety') ||
        searchStr.includes('buffer')
    })
    const hasEmergencyGoal = emergencyGoals.length > 0

    // We count ALL goal savings + main balance as liquid assets for the buffer, 
    // but we still require an explicit 'Emergency' goal to be defined to satisfy the metric.
    const totalLiquidAssets = goals.reduce((sum, g) => sum + g.currentAmount, 0) + balance
    const monthsOfBuffer = needsSpending > 0
      ? totalLiquidAssets / needsSpending
      : (totalLiquidAssets / (monthlyIncome * 0.5))

    const survivalScore = hasEmergencyGoal ? Math.min(100, (monthsOfBuffer / 6) * 100) : 0

    // 2. Metric: 50/30/20 Hygiene
    // Add logic to penalize if there are very few transactions (lack of data)
    const categorizedTransactions = last30Days.filter(t => t.category && t.category !== 'Other').length
    const dataDensityScore = Math.min(100, (categorizedTransactions / 15) * 100) // Target 15+ categorized tx/month

    const needsScore = needsRatio <= 50 ? 100 : Math.max(0, 100 - (needsRatio - 50) * 4)
    const wantsScore = wantsRatio <= 30 ? 100 : Math.max(0, 100 - (wantsRatio - 30) * 4)
    const savingsGoalScore = savingsRatio >= 20 ? 100 : (savingsRatio / 20) * 100

    const allocationScore = (needsScore + wantsScore + savingsGoalScore) / 3
    // Weighted: 20% Data quality, 80% Allocation quality
    const ruleScore = (dataDensityScore * 0.2) + (allocationScore * 0.8)

    // 3. Metric: Debt Health
    const totalDebt = debtAccounts.reduce((sum, d) => sum + d.balance, 0)
    const annualIncome = monthlyIncome * 12
    const dtiRatio = annualIncome > 0 ? (totalDebt / annualIncome) * 100 : 0
    // Standard DTI Rating: < 20% is excellent, 20-36% is good, 36-43% is manageable, > 43% is critical
    let debtScore = 100
    if (totalDebt > 0) {
      if (dtiRatio <= 20) debtScore = 100
      else if (dtiRatio <= 36) debtScore = 80 + (1 - (dtiRatio - 20) / 16) * 10
      else if (dtiRatio <= 43) debtScore = 50 + (1 - (dtiRatio - 36) / 7) * 30
      else debtScore = Math.max(0, 50 - (dtiRatio - 43) * 2)
    }

    // 4. Metric: Budget Discipline
    const hasBudgets = budgets.length >= 3
    const overBudgetCount = budgets.filter(b => b.spent > b.limit).length
    const adherenceRate = budgets.length > 0 ? ((budgets.length - overBudgetCount) / budgets.length) : 0

    // Logic: 20pts for having 3+ budgets, 80pts for adherence
    const budgetBaseScore = hasBudgets ? 20 : (budgets.length / 3) * 20
    const budgetPerformanceScore = adherenceRate * 80
    const budgetScore = budgets.length > 0 ? budgetBaseScore + budgetPerformanceScore : 0

    // 5. Metric: Goal Momentum
    // Logic: 20pts for setup, 40pts for consistency (last 30d funding), 40pts for progress
    const hasGoals = goals.length > 0
    const goalBaseScore = hasGoals ? 20 : 0

    // Approximate funding activity from transaction descriptions or metadata
    const recentlyFundedGoalsCount = goals.filter(g => {
      const gTitle = (g.title || g.name || "").toLowerCase()
      return transactions.some(t => {
        const isRecent = (now.getTime() - new Date(t.date).getTime()) <= (30 * 24 * 60 * 60 * 1000)
        const isForGoal = t.allocationType === 'goal' && t.allocationTarget === g.id
        const matchesName = t.description.toLowerCase().includes(gTitle) && gTitle.length > 3
        return isRecent && (isForGoal || matchesName)
      })
    }).length

    const averageProgress = goals.length > 0
      ? goals.reduce((sum, g) => {
        const target = g.targetAmount || 1
        const current = g.currentAmount || 0
        return sum + Math.min(100, (current / target) * 100)
      }, 0) / goals.length
      : 0

    const goalConsistencyScore = goals.length > 0 ? (recentlyFundedGoalsCount / goals.length) * 40 : 0
    const goalProgressScore = (averageProgress / 100) * 40

    const goalScore = hasGoals ? goalBaseScore + goalConsistencyScore + goalProgressScore : 0

    const metrics: HealthMetric[] = [
      {
        id: "liquidity",
        name: "Emergency Fund",
        score: survivalScore,
        maxScore: 100,
        status: hasEmergencyGoal ? (survivalScore >= 80 ? 'excellent' : survivalScore >= 50 ? 'good' : survivalScore >= 20 ? 'fair' : 'poor') : 'setup',
        description: hasEmergencyGoal ? `${monthsOfBuffer.toFixed(1)} months of absolute needs covered` : "Safety net not established",
        details: "Checks your ability to survive a financial shock without income. We calculate this by comparing your liquid savings (Goals) against your essential monthly expenses (Housing, Utilities, Groceries, etc.).",
        actionTip: hasEmergencyGoal ? "Target 6 months of absolute needs. Keep this in a liquid, low-risk account." : "Establish an explicit 'Emergency Fund' goal to start tracking your safety net.",
        icon: <Shield className="w-4 h-4" />,
        isSetupRequired: !hasEmergencyGoal
      },
      {
        id: "hygiene",
        name: "50/30/20 Balance",
        score: ruleScore,
        maxScore: 100,
        status: ruleScore >= 85 ? 'excellent' : ruleScore >= 70 ? 'good' : ruleScore >= 50 ? 'fair' : 'poor',
        description: `Needs: ${needsRatio.toFixed(0)}%, Wants: ${wantsRatio.toFixed(0)}%, Save: ${savingsRatio.toFixed(0)}%`,
        details: "Evaluates your income allocation (80%) and data quality (20%). The score rewards categorizing at least 15 transactions monthly using the 50% Needs, 30% Wants, and 20% Savings framework.",
        actionTip: categorizedTransactions < 15 ? "Categorize at least 15 transactions this month to improve the accuracy of this score." : "If 'Needs' are over 50%, look for ways to reduce fixed costs like rent or utilities.",
        icon: <TrendingUp className="w-4 h-4" />
      },
      {
        id: "debt",
        name: "Debt Ceiling",
        score: debtScore,
        maxScore: 100,
        status: debtScore >= 90 ? 'excellent' : debtScore >= 70 ? 'good' : debtScore >= 40 ? 'fair' : 'poor',
        description: totalDebt > 0 ? `Debt is ${dtiRatio.toFixed(1)}% of annual income` : "Debt-free",
        details: "Measures your total debt relative to your annual income. A high ratio indicates that a large portion of your future earnings is already committed elsewhere.",
        actionTip: "Focus on high-interest debt first (the Avalanche method) to increase your score.",
        icon: <AlertTriangle className="w-4 h-4" />
      },
      {
        id: "budget",
        name: "Budget Integrity",
        score: budgetScore,
        maxScore: 100,
        status: budgets.length > 0 ? (budgetScore >= 90 ? 'excellent' : budgetScore >= 70 ? 'good' : budgetScore >= 50 ? 'fair' : 'poor') : 'setup',
        description: budgets.length > 0 ? `${overBudgetCount} budgets exceeded this period` : "No active budgets set",
        details: "Analyzes how well you stick to your limits. Score is based on having at least 3 active categories (20%) and staying within those limits (80%).",
        actionTip: budgets.length >= 3 ? (overBudgetCount > 0 ? "Review your over-budget categories. Are the limits too low, or is the spending too high?" : "Perfect discipline! Consider lowering your limits to save even more.") : "Create at least 3 budget categories to fully track your financial discipline.",
        icon: <Target className="w-4 h-4" />,
        isSetupRequired: budgets.length === 0
      },
      {
        id: "momentum",
        name: "Goal Momentum",
        score: goalScore,
        maxScore: 100,
        status: goals.length > 0 ? (goalScore >= 90 ? 'excellent' : goalScore >= 70 ? 'good' : goalScore >= 40 ? 'fair' : 'poor') : 'setup',
        description: goals.length > 0 ? `${(averageProgress).toFixed(0)}% average progress across ${goals.length} goals` : "No financial goals established",
        details: "Measures progress toward your dreams. Score factors in setup (20%), consistent monthly funding (40%), and overall target completion (40%).",
        actionTip: recentlyFundedGoalsCount < goals.length ? "You have stagnant goals. Try to contribute something every month to keep the momentum alive." : "Great job! You are consistently funding all your goals.",
        icon: <Trophy className="w-4 h-4" />,
        isSetupRequired: goals.length === 0
      }
    ]

    return metrics
  }, [transactions, userProfile, budgets, goals, debtAccounts])

  const overallScore = useMemo(() => {
    const totalScore = healthMetrics.reduce((sum, metric) => sum + metric.score, 0)
    const averageScore = totalScore / healthMetrics.length

    let grade: string
    let description: string
    let color: string
    let icon: React.ReactNode

    if (averageScore >= 90) {
      grade = "A+"
      description = "Peak Financial Performance"
      color = "text-emerald-600 bg-emerald-50 border-emerald-200"
      icon = <Trophy className="w-6 h-6" />
    } else if (averageScore >= 80) {
      grade = "A"
      description = "Solid Financial Foundation"
      color = "text-emerald-600 bg-emerald-50 border-emerald-200"
      icon = <Award className="w-6 h-6" />
    } else if (averageScore >= 70) {
      grade = "B"
      description = "Health Stability - Minor Gaps"
      color = "text-blue-600 bg-blue-50 border-blue-200"
      icon = <Star className="w-6 h-6" />
    } else if (averageScore >= 55) {
      grade = "C"
      description = "Average - Vulnerable to Shocks"
      color = "text-amber-600 bg-amber-50 border-amber-200"
      icon = <Target className="w-6 h-6" />
    } else {
      grade = "D"
      description = "Critical - Needs Restructuring"
      color = "text-red-600 bg-red-50 border-red-200"
      icon = <AlertTriangle className="w-6 h-6" />
    }

    return { score: averageScore, grade, description, color, icon }
  }, [healthMetrics])

  const getStatusColor = (status: HealthMetric['status']) => {
    switch (status) {
      case 'excellent': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'fair': return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'poor': return 'text-red-600 bg-red-50 border-red-200'
      case 'setup': return 'text-slate-500 bg-slate-50 border-slate-200'
    }
  }

  const getStatusIcon = (status: HealthMetric['status']) => {
    switch (status) {
      case 'excellent': return <Trophy className="w-4 h-4" />
      case 'good': return <Star className="w-4 h-4" />
      case 'fair': return <Target className="w-4 h-4" />
      case 'poor': return <AlertTriangle className="w-4 h-4" />
      case 'setup': return <PlusCircle className="w-4 h-4" />
    }
  }

  return { healthMetrics, overallScore, getStatusColor, getStatusIcon }
}

interface FinancialHealthScoreProps {
  transactions: Transaction[]
  userProfile: UserProfile
  budgets: Budget[]
  goals: Goal[]
  debtAccounts: DebtAccount[]
  balance: number
  compact?: boolean
  onNavigate?: (tab: string) => void
}

export function FinancialHealthScore({
  transactions,
  userProfile,
  budgets,
  goals,
  debtAccounts,
  balance,
  compact = false,
  onNavigate
}: FinancialHealthScoreProps) {
  const { healthMetrics, overallScore, getStatusColor, getStatusIcon } = useFinancialHealthScore(
    transactions,
    userProfile,
    budgets,
    goals,
    debtAccounts,
    balance
  )

  const content = (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="text-center p-5 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center justify-center mb-3">
          <div className={`p-3 rounded-full ${overallScore.color.split(' ')[1]} border ${overallScore.color.split(' ')[2]}`}>
            {overallScore.icon}
          </div>
        </div>
        <div className="text-4xl font-bold text-primary mb-2">{overallScore.score.toFixed(0)}</div>
        <div className="text-2xl font-semibold mb-2">{overallScore.grade}</div>
        <p className="text-muted-foreground mb-4">{overallScore.description}</p>

        {/* Achievement Badges */}
        <TooltipProvider>
          <div className="flex justify-center gap-2 flex-wrap">
            {healthMetrics
              .filter(metric => metric.status === 'excellent')
              .map((metric) => (
                <Tooltip key={metric.name}>
                  <TooltipTrigger asChild>
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full cursor-help hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors">
                      {getStatusIcon(metric.status)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{metric.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{metric.status}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
          </div>
        </TooltipProvider>
      </div>
      {/* Smart Recommendations: Finding the Lowest Metric */}
      <div className="p-4 bg-muted/30 border-dashed border-2 rounded-2xl">
        <h4 className="font-bold flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          Personalized Action Plan
        </h4>
        <div className="space-y-4">
          {healthMetrics
            .sort((a, b) => a.score - b.score)
            .slice(0, 2)
            .map((metric) => (
              <div key={metric.name} className="flex gap-3">
                <div className="mt-1">{getStatusIcon(metric.status)}</div>
                <div className="space-y-1">
                  <p className="text-sm font-bold">Focus: {metric.name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {metric.name === "Emergency Fund" && metric.score < 80 ? "Your safety net is thin. Try to set aside 10% of every paycheck into your emergency goal until you have 6 months of expenses covered." : ""}
                    {metric.name === "50/30/20 Balance" && metric.score < 80 ? "Your ratios are off. Review your 'Wants' categories and try to redirect that spending toward debt or savings." : ""}
                    {metric.name === "Debt Ceiling" && metric.score < 70 ? "Your debt load is relatively high. Look into a 'Debt Snowball' or 'Avalanche' method to speed up repayment." : ""}
                    {metric.name === "Budget Integrity" && metric.score < 70 ? "Multiple budgets are bleeding over. Set up push notifications for category limits and check them before every purchase." : ""}
                    {metric.name === "Goal Momentum" && metric.score < 70 ? "Some goals are stagnant. It's better to fund one goal perfectly than five goals poorly. Consolidate your efforts." : ""}
                    {metric.score >= 80 ? "You're excelling here! Maintain this discipline to reach financial independence faster." : ""}
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Health Metrics Breakdown with Accordion */}
      <div className="space-y-4">
        <h4 className="font-bold flex items-center gap-2 text-sm">
          <BarChart3 className="w-4 h-4 text-primary" />
          Heuristic Breakdown
        </h4>

        <Accordion type="single" collapsible className="space-y-3">
          {healthMetrics.map((metric) => (
            <AccordionItem key={metric.id} value={metric.id} className="border border-border/50 rounded-2xl px-4 overflow-hidden bg-card/50">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center justify-between w-full pr-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${getStatusColor(metric.status)}`}>
                      {getStatusIcon(metric.status)}
                    </div>
                    <div>
                      <h5 className="font-bold text-sm leading-none mb-1">{metric.name}</h5>
                      <p className="text-[10px] text-muted-foreground uppercase font-black">{metric.isSetupRequired ? 'Action Required' : metric.status}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-lg font-black font-mono leading-none">
                      {metric.isSetupRequired ? "--" : metric.score.toFixed(0)}
                    </span>
                    {!metric.isSetupRequired && <Progress value={metric.score} className="w-16 h-1 mt-1" />}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 pt-2 border-t border-dashed">
                <div className="space-y-4">
                  <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
                    <p className="text-xs leading-relaxed font-medium">
                      <HelpCircle className="w-3 h-3 inline mr-1 text-primary" />
                      {metric.details}
                    </p>
                  </div>

                  <div className="flex items-start gap-2 text-sm">
                    <div className="p-1.5 bg-primary/10 rounded-lg shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-xs uppercase tracking-tight text-primary">Pro Tip</p>
                      <p className="text-xs text-muted-foreground leading-snug">{metric.actionTip}</p>
                      {metric.isSetupRequired && onNavigate && (
                        <Button
                          variant="link"
                          className="p-0 h-auto text-xs mt-1 text-primary font-bold"
                          onClick={() => onNavigate(metric.name.toLowerCase().includes('budget') ? 'budgets' : 'goals')}
                        >
                          Go to {metric.name.toLowerCase().includes('budget') ? 'Budgets' : 'Goals'} →
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>



    </div>
  )

  if (compact) {
    return content
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Financial Health Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  )
}