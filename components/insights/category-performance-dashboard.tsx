"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { PieChart, BarChart3, TrendingUp, TrendingDown, Calendar, Target } from "lucide-react"
import type { Transaction, UserProfile } from "@/types/wallet"
import { formatCurrency } from "@/lib/utils"

interface CategoryPerformanceDashboardProps {
  transactions: Transaction[]
  userProfile: UserProfile
}

interface CategoryData {
  name: string
  totalSpent: number
  transactionCount: number
  percentage: number
  monthlyTrend: number
  averageTransaction: number
  timeValue: number
}

export function CategoryPerformanceDashboard({ transactions, userProfile }: CategoryPerformanceDashboardProps) {
  const categoryData = useMemo(() => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1)
    const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`

    const categoryStats: Record<string, {
      currentMonth: number
      lastMonth: number
      transactionCount: number
      totalAmount: number
    }> = {}

    // Calculate category statistics
    transactions.forEach((transaction) => {
      if (transaction.type !== 'expense') return

      const date = new Date(transaction.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!categoryStats[transaction.category]) {
        categoryStats[transaction.category] = {
          currentMonth: 0,
          lastMonth: 0,
          transactionCount: 0,
          totalAmount: 0
        }
      }

      categoryStats[transaction.category].totalAmount += transaction.amount
      categoryStats[transaction.category].transactionCount += 1

      if (monthKey === currentMonth) {
        categoryStats[transaction.category].currentMonth += transaction.amount
      } else if (monthKey === lastMonthKey) {
        categoryStats[transaction.category].lastMonth += transaction.amount
      }
    })

    const totalExpenses = Object.values(categoryStats).reduce((sum, cat) => sum + cat.totalAmount, 0)

    // Convert to array with additional metrics
    const categories: CategoryData[] = Object.entries(categoryStats)
      .map(([name, stats]) => {
        const percentage = totalExpenses > 0 ? (stats.totalAmount / totalExpenses) * 100 : 0
        const monthlyTrend = stats.lastMonth > 0
          ? ((stats.currentMonth - stats.lastMonth) / stats.lastMonth) * 100
          : stats.currentMonth > 0 ? 100 : 0

        const averageTransaction = stats.transactionCount > 0 ? stats.totalAmount / stats.transactionCount : 0

        // Calculate time value (hours spent working to afford this category)
        const hourlyRate = userProfile.monthlyEarning / (userProfile.workingDaysPerMonth * userProfile.workingHoursPerDay)
        const timeValue = hourlyRate > 0 ? (stats.totalAmount / hourlyRate) : 0

        return {
          name,
          totalSpent: stats.totalAmount,
          transactionCount: stats.transactionCount,
          percentage,
          monthlyTrend,
          averageTransaction,
          timeValue
        }
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 8) // Top 8 categories

    return categories
  }, [transactions, userProfile])

  const formatTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`
    if (hours < 24) return `${hours.toFixed(1)}h`
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return `${days}d ${remainingHours.toFixed(0)}h`
  }

  const getTrendIcon = (trend: number) => {
    if (trend > 10) return <TrendingUp className="w-4 h-4 text-emerald-600" />
    if (trend < -10) return <TrendingDown className="w-4 h-4 text-red-600" />
    return <div className="w-4 h-4 rounded-full bg-gray-400" />
  }

  const getTrendColor = (trend: number) => {
    if (trend > 10) return 'text-emerald-600'
    if (trend < -10) return 'text-red-600'
    return 'text-gray-600'
  }

  if (categoryData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Category Performance Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <PieChart className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No category data available</p>
            <p className="text-sm">Add expense transactions to see category performance</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="w-5 h-5" />
          Category Performance Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h5 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Top Category</h5>
            <p className="text-2xl font-bold text-blue-600 truncate">{categoryData[0]?.name || 'None'}</p>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              {formatCurrency(categoryData[0]?.totalSpent || 0, userProfile.currency, userProfile.customCurrency)}
            </p>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <h5 className="font-semibold text-purple-700 dark:text-purple-300 mb-2">Most Frequent</h5>
            <p className="text-2xl font-bold text-purple-600 truncate">
              {categoryData.reduce((max, cat) =>
                cat.transactionCount > max.transactionCount ? cat : max, categoryData[0]
              )?.name || 'None'}
            </p>
            <p className="text-sm text-purple-600 dark:text-purple-400">
              {categoryData.reduce((max, cat) =>
                cat.transactionCount > max.transactionCount ? cat : max, categoryData[0]
              )?.transactionCount || 0} transactions
            </p>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <h5 className="font-semibold text-amber-700 dark:text-amber-300 mb-2">Highest Avg Transaction</h5>
            <p className="text-2xl font-bold text-amber-600 truncate">
              {categoryData.reduce((max, cat) =>
                cat.averageTransaction > max.averageTransaction ? cat : max, categoryData[0]
              )?.name || 'None'}
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {formatCurrency(categoryData.reduce((max, cat) =>
                cat.averageTransaction > max.averageTransaction ? cat : max, categoryData[0]
              )?.averageTransaction || 0, userProfile.currency, userProfile.customCurrency)}
            </p>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Category Breakdown & Trends
          </h4>

          <div className="space-y-3">
            {categoryData.map((category, index) => (
              <div key={category.name} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                      {index + 1}
                    </Badge>
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(category.monthlyTrend)}
                    <span className={`text-sm font-medium ${getTrendColor(category.monthlyTrend)}`}>
                      {category.monthlyTrend > 0 ? '+' : ''}{category.monthlyTrend.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(category.totalSpent, userProfile.currency, userProfile.customCurrency)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Spent</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{category.transactionCount}</p>
                    <p className="text-xs text-muted-foreground">Transactions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(category.averageTransaction, userProfile.currency, userProfile.customCurrency)}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Transaction</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">{formatTime(category.timeValue)}</p>
                    <p className="text-xs text-muted-foreground">Work Time</p>
                  </div>
                </div>

                <Progress value={category.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {category.percentage.toFixed(1)}% of total expenses
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Time Investment Analysis */}
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <h4 className="font-semibold text-indigo-700 dark:text-indigo-300 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Time Investment by Category
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-indigo-600 dark:text-indigo-400 mb-1">Most Time-Intensive Category</p>
              <p className="font-semibold text-lg text-indigo-700 dark:text-indigo-300">
                {categoryData.reduce((max, cat) => cat.timeValue > max.timeValue ? cat : max, categoryData[0])?.name}
              </p>
              <p className="text-indigo-600 dark:text-indigo-400">
                {formatTime(categoryData.reduce((max, cat) => cat.timeValue > max.timeValue ? cat : max, categoryData[0])?.timeValue || 0)}
              </p>
            </div>
            <div>
              <p className="text-indigo-600 dark:text-indigo-400 mb-1">Total Work Time Invested</p>
              <p className="font-semibold text-lg text-indigo-700 dark:text-indigo-300">
                {formatTime(categoryData.reduce((sum, cat) => sum + cat.timeValue, 0))}
              </p>
              <p className="text-indigo-600 dark:text-indigo-400">
                Across all categories this month
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}