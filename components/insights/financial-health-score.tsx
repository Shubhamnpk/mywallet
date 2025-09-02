"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Award, TrendingUp, Target, Shield, Star, Trophy, AlertTriangle, CheckCircle } from "lucide-react"
import type { Transaction, UserProfile, Budget, Goal, DebtAccount } from "@/types/wallet"
import { formatCurrency } from "@/lib/utils"

interface HealthMetric {
  name: string
  score: number
  maxScore: number
  status: 'excellent' | 'good' | 'fair' | 'poor'
  description: string
  icon: React.ReactNode
}

export function useFinancialHealthScore(
  transactions: Transaction[],
  userProfile: UserProfile,
  budgets: Budget[],
  goals: Goal[],
  debtAccounts: DebtAccount[]
) {
  const healthMetrics = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
    const netIncome = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0

    const totalDebt = debtAccounts.reduce((sum, debt) => sum + debt.balance, 0)
    const totalGoalSavings = goals.reduce((sum, goal) => sum + goal.currentAmount, 0)
    const totalGoalTargets = goals.reduce((sum, goal) => sum + goal.targetAmount, 0)
    const goalProgress = totalGoalTargets > 0 ? (totalGoalSavings / totalGoalTargets) * 100 : 0

    // Budget adherence calculation
    const budgetAdherence = budgets.length > 0
      ? budgets.reduce((sum, budget) => {
          const spent = transactions
            .filter(t => t.type === 'expense' && t.category === budget.category)
            .reduce((s, t) => s + t.amount, 0)
          const adherence = Math.max(0, Math.min(100, 100 - ((spent - budget.limit) / budget.limit) * 100))
          return sum + adherence
        }, 0) / budgets.length
      : 100

    const metrics: HealthMetric[] = [
      {
        name: "Savings Rate",
        score: Math.min(100, savingsRate * 2), // Scale to 0-100
        maxScore: 100,
        status: savingsRate >= 20 ? 'excellent' : savingsRate >= 15 ? 'good' : savingsRate >= 10 ? 'fair' : 'poor',
        description: `${savingsRate.toFixed(1)}% of income saved`,
        icon: <TrendingUp className="w-4 h-4" />
      },
      {
        name: "Goal Progress",
        score: goalProgress,
        maxScore: 100,
        status: goalProgress >= 75 ? 'excellent' : goalProgress >= 50 ? 'good' : goalProgress >= 25 ? 'fair' : 'poor',
        description: `${goalProgress.toFixed(1)}% towards financial goals`,
        icon: <Target className="w-4 h-4" />
      },
      {
        name: "Budget Adherence",
        score: budgetAdherence,
        maxScore: 100,
        status: budgetAdherence >= 90 ? 'excellent' : budgetAdherence >= 75 ? 'good' : budgetAdherence >= 60 ? 'fair' : 'poor',
        description: `${budgetAdherence.toFixed(1)}% budget compliance`,
        icon: <Shield className="w-4 h-4" />
      },
      {
        name: "Debt Management",
        score: Math.max(0, 100 - (totalDebt / (totalIncome * 12)) * 100), // Lower debt = higher score
        maxScore: 100,
        status: totalDebt === 0 ? 'excellent' : (totalDebt / totalIncome) < 1 ? 'good' : (totalDebt / totalIncome) < 3 ? 'fair' : 'poor',
        description: totalDebt > 0 ? `${formatCurrency(totalDebt, userProfile.currency, userProfile.customCurrency)} total debt` : 'Debt-free!',
        icon: <AlertTriangle className="w-4 h-4" />
      },
      {
        name: "Expense Control",
        score: Math.max(0, 100 - (totalExpenses / (totalIncome || 1)) * 50), // Lower expense ratio = higher score
        maxScore: 100,
        status: (totalExpenses / (totalIncome || 1)) < 0.8 ? 'excellent' : (totalExpenses / (totalIncome || 1)) < 0.9 ? 'good' : (totalExpenses / (totalIncome || 1)) < 1.0 ? 'fair' : 'poor',
        description: `${((totalExpenses / (totalIncome || 1)) * 100).toFixed(1)}% expense ratio`,
        icon: <CheckCircle className="w-4 h-4" />
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
      description = "Excellent financial health!"
      color = "text-emerald-600 bg-emerald-50 border-emerald-200"
      icon = <Trophy className="w-6 h-6" />
    } else if (averageScore >= 80) {
      grade = "A"
      description = "Very good financial standing"
      color = "text-emerald-600 bg-emerald-50 border-emerald-200"
      icon = <Award className="w-6 h-6" />
    } else if (averageScore >= 70) {
      grade = "B"
      description = "Good financial health with room for improvement"
      color = "text-blue-600 bg-blue-50 border-blue-200"
      icon = <Star className="w-6 h-6" />
    } else if (averageScore >= 60) {
      grade = "C"
      description = "Fair financial health - focus on key areas"
      color = "text-amber-600 bg-amber-50 border-amber-200"
      icon = <Target className="w-6 h-6" />
    } else {
      grade = "D"
      description = "Needs attention - review spending and savings"
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
    }
  }

  const getStatusIcon = (status: HealthMetric['status']) => {
    switch (status) {
      case 'excellent': return <Trophy className="w-4 h-4" />
      case 'good': return <Star className="w-4 h-4" />
      case 'fair': return <Target className="w-4 h-4" />
      case 'poor': return <AlertTriangle className="w-4 h-4" />
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
  compact?: boolean
}

export function FinancialHealthScore({
  transactions,
  userProfile,
  budgets,
  goals,
  debtAccounts,
  compact = false
}: FinancialHealthScoreProps) {
  const { healthMetrics, overallScore, getStatusColor, getStatusIcon } = useFinancialHealthScore(
    transactions,
    userProfile,
    budgets,
    goals,
    debtAccounts
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
      {/* Recommendations */}
      <div className="p-4 bg-muted/50 border rounded-lg">
        <h4 className="font-semibold mb-3">💡 Recommendations</h4>
        <div className="space-y-2 text-sm">
          {overallScore.score >= 80 && (
            <p className="text-emerald-700 dark:text-emerald-300">
              🎉 Excellent work! Consider advanced strategies like investment planning or debt payoff acceleration.
            </p>
          )}
          {overallScore.score >= 60 && overallScore.score < 80 && (
            <p className="text-blue-700 dark:text-blue-300">
              📈 Good progress! Focus on increasing your savings rate and building an emergency fund.
            </p>
          )}
          {overallScore.score >= 40 && overallScore.score < 60 && (
            <p className="text-amber-700 dark:text-amber-300">
              🎯 Making progress! Review your budget categories and look for areas to reduce discretionary spending.
            </p>
          )}
          {overallScore.score < 40 && (
            <p className="text-red-700 dark:text-red-300">
              🚨 Time to take action! Create a strict budget, cut unnecessary expenses, and focus on building savings.
            </p>
          )}
        </div>
      </div>

      {/* Health Metrics */}
      <div className="space-y-2">
        <h4 className="font-semibold">Health Metrics Breakdown</h4>

        {healthMetrics.map((metric, index) => (
          <div key={metric.name} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getStatusColor(metric.status)}`}>
                  {getStatusIcon(metric.status)}
                </div>
                <div>
                  <h5 className="font-medium">{metric.name}</h5>
                  <p className="text-sm text-muted-foreground">{metric.description}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {metric.score.toFixed(0)}/{metric.maxScore}
                </div>
                <Badge variant="outline" className={getStatusColor(metric.status)}>
                  {metric.status}
                </Badge>
              </div>
            </div>

            <Progress value={metric.score} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {metric.score.toFixed(1)}% score
            </p>
          </div>
        ))}
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