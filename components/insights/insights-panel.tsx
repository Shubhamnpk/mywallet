"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Clock, Download, PieChart, BarChart3, Target } from "lucide-react"
import type { Transaction, UserProfile, Budget, Goal, DebtAccount } from "@/types/wallet"
import { formatCurrency } from "@/lib/utils"
import { getTimeEquivalentBreakdown } from "@/lib/wallet-utils"
import { SpendingTrendsAnalysis } from "./spending-trends-analysis"
import { CategoryPerformanceDashboard } from "./category-performance-dashboard"
import { FinancialHealthScore } from "./financial-health-score"
import { BillReminderSystem } from "../productivity/bill-reminder-system"
import { SpendingBenchmarks } from "../social/spending-benchmarks"

interface InsightsPanelProps {
  transactions: Transaction[]
  userProfile: UserProfile
  budgets: Budget[]
  goals: Goal[]
  debtAccounts: DebtAccount[]
  onExportData: () => void
  calculateTimeEquivalent: (amount: number) => number
}

export function InsightsPanel({
  transactions,
  userProfile,
  budgets,
  goals,
  debtAccounts,
  onExportData,
  calculateTimeEquivalent,
}: InsightsPanelProps) {
  // Calculate insights
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)
  const netWorth = totalIncome - totalExpenses

  // Use the same calculation method as balance card for consistency
  const calculateTimeFromAmount = (amount: number) => {
    if (!userProfile || !amount) return 0
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
    if (!minutes || minutes < 0 || !userProfile) return "0m"

    // Calculate equivalent currency amount using the same method as balance card
    const hours = minutes / 60
    const equivalentAmount = hours * (userProfile.monthlyEarning / (userProfile.workingDaysPerMonth * userProfile.workingHoursPerDay))

    const breakdown = getTimeEquivalentBreakdown(equivalentAmount, userProfile)
    return breakdown ? breakdown.formatted.userFriendly : "0m"
  }

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Insights
        </h3>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <Card className="border-accent/20 dark:border-accent/30">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Work Time Earned</p>
                <p className="text-lg md:text-2xl font-bold text-accent truncate">
                  {formatTime(totalWorkTimeEarned)}
                </p>
                <p className="text-xs text-accent/80 mt-1 truncate">{formatCurrency(totalIncome, userProfile.currency, userProfile.customCurrency)}</p>
              </div>
              <div className="h-8 w-8 md:h-12 md:w-12 bg-accent/10 dark:bg-accent/20 rounded-lg flex items-center justify-center ml-2">
                <Clock className="w-4 h-4 md:w-6 md:h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Work Time Spent</p>
                <p className="text-lg md:text-2xl font-bold text-red-600 dark:text-red-400 truncate">
                  {formatTime(totalWorkTimeSpent)}
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1 truncate">{formatCurrency(totalExpenses, userProfile.currency, userProfile.customCurrency)}</p>
              </div>
              <div className="h-8 w-8 md:h-12 md:w-12 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center ml-2">
                <Clock className="w-4 h-4 md:w-6 md:h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${netWorth >= 0 ? 'border-emerald-200 dark:border-emerald-800' : 'border-red-200 dark:border-red-800'}`}>
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Net Worth</p>
                <p className={`text-lg md:text-2xl font-bold ${netWorth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"} truncate`}>
                  {formatCurrency(Math.abs(netWorth), userProfile.currency, userProfile.customCurrency)}
                </p>
                <p className={`text-xs mt-1 ${netWorth >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"} truncate`}>
                  {formatTime(Math.abs(totalWorkTimeEarned - totalWorkTimeSpent))} time difference
                </p>
              </div>
              <div className={`h-8 w-8 md:h-12 md:w-12 rounded-lg flex items-center justify-center ml-2 ${netWorth >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                {netWorth >= 0 ? (
                  <TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 md:w-6 md:h-6 text-red-600 dark:text-red-400" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Savings Rate</p>
                <p className={`text-lg md:text-2xl font-bold ${savingsRate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"} truncate`}>
                  {savingsRate.toFixed(1)}%
                </p>
                <p className={`text-xs mt-1 ${savingsRate >= 20 ? "text-emerald-700 dark:text-emerald-300" : savingsRate >= 10 ? "text-blue-700 dark:text-blue-300" : "text-amber-700 dark:text-amber-300"} truncate`}>
                  {savingsRate >= 20 ? "Excellent" : savingsRate >= 10 ? "Good" : savingsRate >= 0 ? "Fair" : "Needs attention"}
                </p>
              </div>
              <div className="h-8 w-8 md:h-12 md:w-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center ml-2">
                <Target className="w-4 h-4 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
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
                const timeEquivalent = calculateTimeFromAmount(amount)

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
          <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4">
            <div className="bg-accent/5 dark:bg-accent/10 border border-accent/20 dark:border-accent/30 p-4 rounded-lg">
              <h4 className="font-semibold text-accent mb-2">Time Balance</h4>
              <p className="text-sm text-accent/80">
                You've earned {formatTime(totalWorkTimeEarned)} and spent {formatTime(totalWorkTimeSpent)} worth of work time.
                {totalWorkTimeEarned > totalWorkTimeSpent
                  ? ` You're saving ${formatTime(totalWorkTimeEarned - totalWorkTimeSpent)} of work time!`
                  : totalWorkTimeEarned < totalWorkTimeSpent
                  ? ` You're spending ${formatTime(totalWorkTimeSpent - totalWorkTimeEarned)} more than you earn.`
                  : ` Your time investment is perfectly balanced.`}
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Hourly Rate Impact</h4>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                At {formatCurrency(userProfile.hourlyRate || 0, userProfile.currency, userProfile.customCurrency)}/hour, every {formatCurrency(1, userProfile.currency, userProfile.customCurrency)} you spend equals {userProfile.hourlyRate ? Math.round(60 / userProfile.hourlyRate) : 0} minutes of work.
              </p>
            </div>
          </div>

          {/* Enhanced Financial Health Summary */}
          <div className="bg-muted/50 border p-4 rounded-lg">
            <h4 className="font-semibold mb-3">Financial Health Summary</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Income vs Expenses</p>
                <p className={`font-semibold ${netWorth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {netWorth >= 0 ? "Positive" : "Negative"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(Math.abs(netWorth), userProfile.currency, userProfile.customCurrency)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Time Efficiency</p>
                <p className={`font-semibold ${totalWorkTimeEarned >= totalWorkTimeSpent ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {totalWorkTimeEarned >= totalWorkTimeSpent ? "Efficient" : "Overspending"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalWorkTimeEarned > 0 ? `${((totalWorkTimeEarned - totalWorkTimeSpent) / totalWorkTimeEarned * 100).toFixed(1)}%` : "0%"} efficiency
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Savings Goal</p>
                <p className={`font-semibold ${savingsRate >= 20 ? "text-emerald-600 dark:text-emerald-400" : savingsRate >= 10 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {savingsRate >= 20 ? "Excellent" : savingsRate >= 10 ? "On Track" : "Needs Work"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {savingsRate.toFixed(1)}% rate
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Time Value</p>
                <p className="font-semibold text-blue-600 dark:text-blue-400">
                  {formatCurrency(userProfile.monthlyEarning / (userProfile.workingDaysPerMonth * userProfile.workingHoursPerDay), userProfile.currency, userProfile.customCurrency)}/hr
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your hourly rate
                </p>
              </div>
            </div>
          </div>

          {/* Time Investment Analysis */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">Time Investment Analysis</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-600 dark:text-blue-400 mb-1">Daily Time Investment</p>
                <p className="font-semibold text-lg">
                  {formatTime(totalWorkTimeSpent / Math.max(1, Math.ceil((new Date().getTime() - new Date(userProfile.createdAt).getTime()) / (1000 * 60 * 60 * 24))))}
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-400">Average per day</p>
              </div>
              <div>
                <p className="text-blue-600 dark:text-blue-400 mb-1">Most Time-Intensive Category</p>
                <p className="font-semibold text-lg">
                  {topCategories.length > 0 ? topCategories[0][0] : "None"}
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-400">
                  {topCategories.length > 0 ? formatTime(calculateTimeFromAmount(topCategories[0][1])) : "No data"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Creative Financial Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Time-Money Efficiency Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Time-Money Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">
                  {totalWorkTimeEarned > 0 ? ((totalWorkTimeEarned - totalWorkTimeSpent) / totalWorkTimeEarned * 100).toFixed(1) : 0}%
                </div>
                <p className="text-sm text-muted-foreground">Efficiency Score</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Time Earned</span>
                  <span className="font-medium text-green-600">{formatTime(totalWorkTimeEarned)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Time Spent</span>
                  <span className="font-medium text-red-600">{formatTime(totalWorkTimeSpent)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>Net Time Value</span>
                  <span className={totalWorkTimeEarned - totalWorkTimeSpent >= 0 ? "text-green-600" : "text-red-600"}>
                    {formatTime(Math.abs(totalWorkTimeEarned - totalWorkTimeSpent))}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Future Value Projection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Future Value Projection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {formatCurrency(netWorth * 1.05, userProfile.currency, userProfile.customCurrency)}
                </div>
                <p className="text-sm text-muted-foreground">Projected in 1 year (5% growth)</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Current Net Worth</span>
                  <span className="font-medium">{formatCurrency(netWorth, userProfile.currency, userProfile.customCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Savings</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(totalIncome * (savingsRate / 100), userProfile.currency, userProfile.customCurrency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Time Saved Monthly</span>
                  <span className="font-medium text-blue-600">
                    {formatTime((totalIncome - totalExpenses) / (userProfile.monthlyEarning / (userProfile.workingDaysPerMonth * userProfile.workingHoursPerDay)) * 60)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Time-Value Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Category Time-Value Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topCategories.length > 0 ? (
            <div className="space-y-4">
              {topCategories.slice(0, 5).map(([category, amount], index) => {
                const timeValue = calculateTimeFromAmount(amount)
                const hourlyRate = userProfile.monthlyEarning / (userProfile.workingDaysPerMonth * userProfile.workingHoursPerDay)
                const timeCostPerHour = (amount / (timeValue / 60)) // Cost per hour of time spent

                return (
                  <div key={category} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{category}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(amount, userProfile.currency, userProfile.customCurrency)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-lg">{formatTime(timeValue)}</div>
                        <div className="text-muted-foreground">Work Time</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-lg text-blue-600">
                          {formatCurrency(timeCostPerHour, userProfile.currency, userProfile.customCurrency)}
                        </div>
                        <div className="text-muted-foreground">Cost/Hour</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-semibold text-lg ${
                          timeCostPerHour > hourlyRate ? "text-red-600" :
                          timeCostPerHour > hourlyRate * 0.8 ? "text-amber-600" :
                          "text-green-600"
                        }`}>
                          {timeCostPerHour > hourlyRate ? "High" :
                           timeCostPerHour > hourlyRate * 0.8 ? "Fair" :
                           "Good"}
                        </div>
                        <div className="text-muted-foreground">Value</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No category data available</p>
              <p className="text-sm">Add expenses to see time-value analysis</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Analytics Section */}
      <div className="space-y-6">
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Enhanced Analytics
          </h3>

          {/* Spending Trends Analysis */}
          <SpendingTrendsAnalysis
            transactions={transactions}
            userProfile={userProfile}
          />

          {/* Category Performance Dashboard */}
          <div className="mt-6">
            <CategoryPerformanceDashboard
              transactions={transactions}
              userProfile={userProfile}
            />
          </div>

          {/* Financial Health Score */}
          <div className="mt-6">
            <FinancialHealthScore
              transactions={transactions}
              userProfile={userProfile}
              budgets={budgets}
              goals={goals}
              debtAccounts={debtAccounts}
            />
          </div>

          {/* Spending Benchmarks */}
          <div className="mt-6">
            <SpendingBenchmarks
              transactions={transactions}
              userProfile={userProfile}
            />
          </div>
        </div>
      </div>

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
