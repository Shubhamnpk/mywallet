"use client"

import { useMemo } from "react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { PieChart, BarChart3, TrendingUp, TrendingDown, Calendar, Target, AlertTriangle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
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

interface OverviewCardProps {
  title: string
  value: string
  subtitle: string
  bgColor: string
  titleColor: string
  valueColor: string
}

function OverviewCard({ title, value, subtitle, bgColor, titleColor, valueColor }: OverviewCardProps) {
  return (
    <div className={`p-4 ${bgColor} border rounded-lg`}>
      <h5 className={`font-semibold ${titleColor} mb-2`}>{title}</h5>
      <p className={`text-2xl font-bold ${valueColor} truncate`}>{value}</p>
      <p className={`text-sm ${valueColor}`}>{subtitle}</p>
    </div>
  )
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

    // Precompute summary data
    const topCategory = categories[0]
    const mostFrequent = categories.reduce((max, cat) => cat.transactionCount > max.transactionCount ? cat : max, categories[0] || { transactionCount: 0 })
    const highestAvg = categories.reduce((max, cat) => cat.averageTransaction > max.averageTransaction ? cat : max, categories[0] || { averageTransaction: 0 })
    const totalTimeValue = categories.reduce((sum, cat) => sum + cat.timeValue, 0)
    const mostTimeIntensive = categories.reduce((max, cat) => cat.timeValue > max.timeValue ? cat : max, categories[0] || { timeValue: 0, name: 'None' })
    const highTrendCategories = categories.filter(cat => cat.monthlyTrend > 20)

    const summary = {
      totalExpenses,
      topCategory,
      mostFrequent,
      highestAvg,
      totalTimeValue,
      mostTimeIntensive,
      highTrendCategories
    }

    return { categories, summary }
  }, [transactions, userProfile])

  const { categories, summary } = categoryData

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

  if (categories.length === 0) {
    return (
      <TooltipProvider>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="category-performance" className="border border-border/50 rounded-lg bg-card dark: shadow-sm">
            <AccordionTrigger className="text-left px-3 sm:px-6 py-3 sm:py-5 hover:bg-primary-50/70 dark:hover:bg-primary-950/30 rounded-t-lg transition-colors">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-lg">
                  <PieChart className="w-5 h-5 text-primary-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-blue-900 dark:text-blue-100">Category Performance Dashboard</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Track your spending patterns</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 sm:px-6 pb-4">
              <div className="text-center text-muted-foreground py-8 bg-gray-50/50 dark:bg-gray-900/50 rounded-lg">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-4">
                  <PieChart className="w-12 h-12 opacity-50" />
                </div>
                <p className="text-lg font-medium">No category data available</p>
                <p className="text-sm">Add expense transactions to see category performance</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="category-performance" className="border border-border/50 rounded-lg bg-gradient-to-br from-blue-50/30 via-white to-indigo-50/30 dark:from-blue-950/20 dark:via-gray-900/20 dark:to-indigo-950/20 shadow-lg backdrop-blur-sm">
          <AccordionTrigger className="text-left px-3 sm:px-6 py-3 sm:py-5 hover:bg-gradient-to-r hover:from-blue-50/70 hover:to-indigo-50/70 dark:hover:from-blue-950/30 dark:hover:to-indigo-950/30 rounded-t-lg transition-all duration-300 group">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                <PieChart className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg sm:text-xl text-blue-900 dark:text-blue-100 group-hover:text-blue-800 dark:group-hover:text-blue-200 transition-colors">Category Performance Dashboard</h3>
                <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium hidden sm:block">Analyze your spending by category</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 sm:px-6 pb-4 sm:pb-6">
            <div className="space-y-4 sm:space-y-6 bg-white/50 dark:bg-gray-900/50 rounded-lg p-3 sm:p-6 backdrop-blur-sm">
              {/* Summary */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-500/10 via-slate-500/10 to-zinc-500/10 rounded-lg sm:rounded-xl"></div>
                <div className="relative p-3 sm:p-6 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/20 rounded-lg sm:rounded-xl shadow-sm">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <div className="p-1.5 sm:p-2 bg-gray-100 dark:bg-gray-900/50 rounded-md sm:rounded-lg">
                      <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">Category Summary</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 text-center">
                    <div className="p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 rounded-lg border border-gray-200/50 dark:border-gray-800/50">
                      <p className="text-xl sm:text-2xl font-bold text-primary dark:text-primary mb-1">
                        {formatCurrency(summary.totalExpenses, userProfile.currency, userProfile.customCurrency)}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Total Expenses</p>
                    </div>
                    <div className="p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 rounded-lg border border-gray-200/50 dark:border-gray-800/50">
                      <p className="text-xl sm:text-2xl font-bold text-primary dark:text-primary mb-1">{categories.length}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Categories</p>
                    </div>
                    <div className="p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 rounded-lg border border-gray-200/50 dark:border-gray-800/50">
                      <p className="text-xl sm:text-2xl font-bold text-primary dark:text-primary mb-1">{formatTime(summary.totalTimeValue)}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Work Time</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Overview */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-amber-500/10 rounded-lg sm:rounded-xl"></div>
                <div className="relative p-3 sm:p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 rounded-lg sm:rounded-xl shadow-sm">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md sm:rounded-lg shadow-md">
                      <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100">Category Overview</h4>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Key spending insights</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
                    <div className="group p-3 sm:p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="p-1.5 sm:p-2 bg-blue-500 rounded-md sm:rounded-lg">
                          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </div>
                        <h5 className="font-bold text-sm sm:text-base text-blue-700 dark:text-blue-300">Top Category</h5>
                      </div>
                      <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                        {summary.topCategory?.name || 'None'}
                      </p>
                      <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium">
                        {formatCurrency(summary.topCategory?.totalSpent || 0, userProfile.currency, userProfile.customCurrency)}
                      </p>
                    </div>

                    <div className="group p-3 sm:p-5 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200/50 dark:border-purple-800/50 rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="p-1.5 sm:p-2 bg-purple-500 rounded-md sm:rounded-lg">
                          <Target className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </div>
                        <h5 className="font-bold text-sm sm:text-base text-purple-700 dark:text-purple-300">Most Frequent</h5>
                      </div>
                      <p className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                        {summary.mostFrequent?.name || 'None'}
                      </p>
                      <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-medium">
                        {summary.mostFrequent?.transactionCount || 0} transactions
                      </p>
                    </div>

                    <div className="group p-3 sm:p-5 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border border-amber-200/50 dark:border-amber-800/50 rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="p-1.5 sm:p-2 bg-amber-500 rounded-md sm:rounded-lg">
                          <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </div>
                        <h5 className="font-bold text-sm sm:text-base text-amber-700 dark:text-amber-300">Highest Avg</h5>
                      </div>
                      <p className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mb-1">
                        {summary.highestAvg?.name || 'None'}
                      </p>
                      <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-medium">
                        {formatCurrency(summary.highestAvg?.averageTransaction || 0, userProfile.currency, userProfile.customCurrency)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-teal-500/10 to-cyan-500/10 rounded-lg sm:rounded-xl"></div>
                <div className="relative p-3 sm:p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 rounded-lg sm:rounded-xl shadow-sm">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className="p-1.5 sm:p-2 bg-gradient-to-br from-green-500 to-teal-600 rounded-md sm:rounded-lg shadow-md">
                      <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100">Category Breakdown</h4>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Detailed spending analysis</p>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    {categories.map((category, index) => (
                      <div key={category.name} className="group p-3 sm:p-4 bg-gradient-to-r from-gray-50/50 to-white/50 dark:from-gray-800/50 dark:to-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-lg hover:shadow-md transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Badge variant="outline" className="w-5 h-5 sm:w-6 sm:h-6 p-0 flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </Badge>
                            <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100">{category.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-white dark:bg-gray-700 rounded-md shadow-sm">
                              {getTrendIcon(category.monthlyTrend)}
                            </div>
                            <span className={`text-xs sm:text-sm font-bold ${getTrendColor(category.monthlyTrend)}`}>
                              {category.monthlyTrend > 0 ? '+' : ''}{category.monthlyTrend.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
                          <div className="text-center p-2 sm:p-3 bg-white/50 dark:bg-gray-700/50 rounded-md">
                            <p className="text-lg sm:text-2xl font-bold text-primary dark:text-primary mb-1">
                              {formatCurrency(category.totalSpent, userProfile.currency, userProfile.customCurrency)}
                            </p>
                            <p className="text-xs text-muted-foreground font-medium">Total Spent</p>
                          </div>
                          <div className="text-center p-2 sm:p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-md">
                            <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">{category.transactionCount}</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Transactions</p>
                          </div>
                          <div className="text-center p-2 sm:p-3 bg-purple-50/50 dark:bg-purple-900/20 rounded-md">
                            <p className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                              {formatCurrency(category.averageTransaction, userProfile.currency, userProfile.customCurrency)}
                            </p>
                            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Avg Transaction</p>
                          </div>
                          <div className="text-center p-2 sm:p-3 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-md">
                            <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">{formatTime(category.timeValue)}</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium cursor-help">Work Time</p>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Hours of work needed to afford this category</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <Progress value={category.percentage} className="h-2 flex-1 mr-3" />
                          <p className="text-xs text-muted-foreground font-medium">
                            {category.percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Time Investment Analysis */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-lg sm:rounded-xl"></div>
                <div className="relative p-3 sm:p-6 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/20 dark:to-purple-950/20 backdrop-blur-sm border border-indigo-200/50 dark:border-indigo-800/50 rounded-lg sm:rounded-xl shadow-sm">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-md">
                      <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base sm:text-lg text-indigo-700 dark:text-indigo-300">Time Investment Analysis</h4>
                      <p className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400">Work time required for spending</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-sm">
                    <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-indigo-200/30 dark:border-indigo-800/30">
                      <p className="text-indigo-600 dark:text-indigo-400 mb-2 font-medium">Most Time-Intensive Category</p>
                      <p className="font-bold text-lg sm:text-xl text-indigo-700 dark:text-indigo-300 mb-1">
                        {summary.mostTimeIntensive?.name}
                      </p>
                      <p className="text-indigo-600 dark:text-indigo-400 text-sm">
                        {formatTime(summary.mostTimeIntensive?.timeValue || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-purple-200/30 dark:border-purple-800/30">
                      <p className="text-purple-600 dark:text-purple-400 mb-2 font-medium">Total Work Time Invested</p>
                      <p className="font-bold text-lg sm:text-xl text-purple-700 dark:text-purple-300 mb-1">
                        {formatTime(summary.totalTimeValue)}
                      </p>
                      <p className="text-purple-600 dark:text-purple-400 text-sm">
                        Across all categories this month
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Insights and Recommendations */}
              {summary.highTrendCategories.length > 0 && (
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 rounded-lg sm:rounded-xl"></div>
                  <div className="relative p-3 sm:p-6 bg-yellow-50/80 dark:bg-yellow-950/20 backdrop-blur-sm border border-yellow-200/50 dark:border-yellow-800/50 rounded-lg sm:rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="p-2 sm:p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg sm:rounded-xl shadow-md animate-pulse">
                        <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg sm:text-xl text-yellow-700 dark:text-yellow-300">⚠️ Spending Insights</h4>
                        <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400 font-medium">Action required</p>
                      </div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4">
                      <p className="text-yellow-800 dark:text-yellow-200 text-xs sm:text-sm font-medium mb-2">
                        Categories with significant spending increase: <span className="font-bold">{summary.highTrendCategories.map(c => c.name).join(', ')}</span>
                      </p>
                      <p className="text-yellow-700 dark:text-yellow-300 text-xs sm:text-sm">
                        💡 Consider reviewing your budget for these categories to optimize your spending patterns.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </TooltipProvider>
  )
}