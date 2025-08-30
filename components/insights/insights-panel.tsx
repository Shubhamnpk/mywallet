"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Clock, Download, PieChart, BarChart3, Target } from "lucide-react"
import type { Transaction, UserProfile } from "@/types/wallet"
import { formatCurrency } from "@/lib/utils"

interface InsightsPanelProps {
  transactions: Transaction[]
  userProfile: UserProfile
  onExportData: () => void
  calculateTimeEquivalent: (amount: number) => number
}

export function InsightsPanel({
  transactions,
  userProfile,
  onExportData,
  calculateTimeEquivalent,
}: InsightsPanelProps) {
  // Calculate insights
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)
  const netWorth = totalIncome - totalExpenses

  const totalWorkTimeEarned = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + (t.timeEquivalent || 0), 0)
  const totalWorkTimeSpent = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + (t.timeEquivalent || 0), 0)

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
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-accent/20 dark:border-accent/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Work Time Earned</p>
                <p className="text-2xl font-bold text-accent">
                  {formatTime(totalWorkTimeEarned)}
                </p>
                <p className="text-xs text-accent/80 mt-1">{formatCurrency(totalIncome, userProfile.currency, userProfile.customCurrency)}</p>
              </div>
              <div className="h-12 w-12 bg-accent/10 dark:bg-accent/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Work Time Spent</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatTime(totalWorkTimeSpent)}
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">{formatCurrency(totalExpenses, userProfile.currency, userProfile.customCurrency)}</p>
              </div>
              <div className="h-12 w-12 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${netWorth >= 0 ? 'border-emerald-200 dark:border-emerald-800' : 'border-red-200 dark:border-red-800'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Worth</p>
                <p className={`text-2xl font-bold ${netWorth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {formatCurrency(Math.abs(netWorth), userProfile.currency, userProfile.customCurrency)}
                </p>
                <p className={`text-xs mt-1 ${netWorth >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
                  {formatTime(Math.abs(totalWorkTimeEarned - totalWorkTimeSpent))} time difference
                </p>
              </div>
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${netWorth >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                {netWorth >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Savings Rate</p>
                <p className={`text-2xl font-bold ${savingsRate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {savingsRate.toFixed(1)}%
                </p>
                <p className={`text-xs mt-1 ${savingsRate >= 20 ? "text-emerald-700 dark:text-emerald-300" : savingsRate >= 10 ? "text-blue-700 dark:text-blue-300" : "text-amber-700 dark:text-amber-300"}`}>
                  {savingsRate >= 20 ? "Excellent" : savingsRate >= 10 ? "Good" : savingsRate >= 0 ? "Fair" : "Needs attention"}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spending by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Top Spending Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topCategories.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <PieChart className="w-8 h-8" />
              </div>
              <p className="text-lg font-medium">No expense data available</p>
              <p className="text-sm">Start adding transactions to see insights</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topCategories.map(([category, amount]) => {
                const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
                const timeEquivalent = calculateTimeEquivalent(amount)

                return (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{category}</span>
                      <div className="text-right">
                        <span className="font-semibold">{formatCurrency(amount, userProfile.currency, userProfile.customCurrency)}</span>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(timeEquivalent)}
                        </div>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% of total expenses</p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Investment Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Time Investment Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-accent/5 dark:bg-accent/10 border border-accent/20 dark:border-accent/30 p-4 rounded-lg">
              <h4 className="font-semibold text-accent mb-2">Time Balance</h4>
              <p className="text-sm text-accent/80">
                You've earned {formatTime(totalWorkTimeEarned)} and spent {formatTime(totalWorkTimeSpent)} worth of work time.
                {totalWorkTimeEarned > totalWorkTimeSpent
                  ? ` You're saving ${formatTime(totalWorkTimeEarned - totalWorkTimeSpent)} of work time!`
                  : ` You're spending ${formatTime(totalWorkTimeSpent - totalWorkTimeEarned)} more than you earn.`}
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Hourly Rate Impact</h4>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                At {formatCurrency(userProfile.hourlyRate, userProfile.currency, userProfile.customCurrency)}/hour, every {formatCurrency(1, userProfile.currency, userProfile.customCurrency)} you spend equals {Math.round(60 / userProfile.hourlyRate)} minutes of work.
              </p>
            </div>
          </div>

          {/* Financial Health Summary */}
          <div className="bg-muted/50 border p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Financial Health Summary</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Income vs Expenses</p>
                <p className={`font-semibold ${netWorth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {netWorth >= 0 ? "Positive" : "Negative"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Time Efficiency</p>
                <p className={`font-semibold ${totalWorkTimeEarned >= totalWorkTimeSpent ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {totalWorkTimeEarned >= totalWorkTimeSpent ? "Efficient" : "Overspending"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Savings Goal</p>
                <p className={`font-semibold ${savingsRate >= 20 ? "text-emerald-600 dark:text-emerald-400" : savingsRate >= 10 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {savingsRate >= 20 ? "Excellent" : savingsRate >= 10 ? "On Track" : "Needs Work"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-muted-foreground mb-2">
                Download your financial data for backup or analysis in other tools.
              </p>
              <p className="text-xs text-muted-foreground">
                Includes all transactions, time calculations, and category breakdowns.
              </p>
            </div>
            <Button onClick={onExportData} className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Export All Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
