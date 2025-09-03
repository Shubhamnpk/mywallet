"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, BarChart3, Calendar, AlertTriangle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { Transaction, UserProfile } from "@/types/wallet"
import { formatCurrency } from "@/lib/utils"

interface SpendingTrendsAnalysisProps {
  transactions: Transaction[]
  userProfile: UserProfile
}

interface TrendData {
  period: string
  income: number
  expenses: number
  net: number
  trend: 'up' | 'down' | 'stable'
  percentageChange: number
}

interface TrendCardProps {
  title: string
  value: string
  subtitle: string
  bgColor: string
  titleColor: string
  valueColor: string
}

function TrendCard({ title, value, subtitle, bgColor, titleColor, valueColor }: TrendCardProps) {
  return (
    <div className={`p-4 ${bgColor} border rounded-lg`}>
      <h5 className={`font-semibold ${titleColor} mb-2`}>{title}</h5>
      <p className={`text-2xl font-bold ${valueColor} truncate`}>{value}</p>
      <p className={`text-sm ${valueColor}`}>{subtitle}</p>
    </div>
  )
}

export function SpendingTrendsAnalysis({ transactions, userProfile }: SpendingTrendsAnalysisProps) {
  const trendData = useMemo(() => {
    const now = new Date()
    const monthlyData: Record<string, { income: number; expenses: number; count: number }> = {}

    // Group transactions by month
    transactions.forEach((transaction) => {
      const date = new Date(transaction.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0, count: 0 }
      }

      if (transaction.type === 'income') {
        monthlyData[monthKey].income += transaction.amount
      } else {
        monthlyData[monthKey].expenses += transaction.amount
      }
      monthlyData[monthKey].count += 1
    })

    // Convert to array and sort by date
    const sortedMonths = Object.keys(monthlyData)
      .sort()
      .slice(-12) // Last 12 months

    const trends: TrendData[] = sortedMonths.map((monthKey, index) => {
      const [year, month] = monthKey.split('-')
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      })

      const current = monthlyData[monthKey]
      const previous = index > 0 ? monthlyData[sortedMonths[index - 1]] : null

      const net = current.income - current.expenses
      let trend: 'up' | 'down' | 'stable' = 'stable'
      let percentageChange = 0

      if (previous) {
        const prevNet = previous.income - previous.expenses
        if (prevNet !== 0) {
          percentageChange = ((net - prevNet) / Math.abs(prevNet)) * 100
          if (percentageChange > 5) trend = 'up'
          else if (percentageChange < -5) trend = 'down'
        }
      }

      return {
        period: monthName,
        income: current.income,
        expenses: current.expenses,
        net,
        trend,
        percentageChange
      }
    })

    // Precompute summary data
    const totalIncome = trends.reduce((sum, d) => sum + d.income, 0)
    const totalExpenses = trends.reduce((sum, d) => sum + d.expenses, 0)
    const averageMonthlyNet = trends.length > 0 ? trends.reduce((sum, d) => sum + d.net, 0) / trends.length : 0
    const bestMonth = trends.length > 0 ? trends.reduce((best, current) => current.net > best.net ? current : best, trends[0]) : null
    const worstMonth = trends.length > 0 ? trends.reduce((worst, current) => current.net < worst.net ? current : worst, trends[0]) : null
    const averageExpenses = trends.length > 0 ? totalExpenses / trends.length : 0
    const highExpenseMonths = trends.filter(d => d.expenses > averageExpenses * 1.1)

    const summary = {
      totalIncome,
      totalExpenses,
      averageMonthlyNet,
      bestMonth,
      worstMonth,
      highExpenseMonths
    }

    return { trends, summary }
  }, [transactions])

  const { trends, summary } = trendData

  const overallTrend = useMemo(() => {
    if (trends.length < 2) return { direction: 'stable' as const, averageChange: 0 }

    const changes = trends.slice(1).map(d => d.percentageChange)
    const averageChange = changes.reduce((sum, change) => sum + change, 0) / changes.length

    let direction: 'up' | 'down' | 'stable' = 'stable'
    if (averageChange > 2) direction = 'up'
    else if (averageChange < -2) direction = 'down'

    return { direction, averageChange }
  }, [trends])

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      default:
        return <Minus className="w-4 h-4 text-gray-600" />
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'down':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (trends.length === 0) {
    return (
      <TooltipProvider>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="spending-trends" className="border border-border/50 rounded-lg bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 shadow-sm">
            <AccordionTrigger className="text-left px-6 py-4 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 rounded-t-lg transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-blue-900 dark:text-blue-100">Spending Trends Analysis</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Track your financial patterns</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <div className="text-center text-muted-foreground py-8 bg-gray-50/50 dark:bg-gray-900/50 rounded-lg">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-4">
                  <BarChart3 className="w-12 h-12 opacity-50" />
                </div>
                <p className="text-lg font-medium">No trend data available</p>
                <p className="text-sm">Add more transactions to see spending trends</p>
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
        <AccordionItem value="spending-trends" className="border border-border/50 rounded-lg bg-gradient-to-br from-blue-50/30 via-white to-indigo-50/30 dark:from-blue-950/20 dark:via-gray-900/20 dark:to-indigo-950/20 shadow-lg backdrop-blur-sm">
          <AccordionTrigger className="text-left px-3 sm:px-6 py-3 sm:py-5 hover:bg-gradient-to-r hover:from-blue-50/70 hover:to-indigo-50/70 dark:hover:from-blue-950/30 dark:hover:to-indigo-950/30 rounded-t-lg transition-all duration-300 group">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                <BarChart3 className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg sm:text-xl text-blue-900 dark:text-blue-100 group-hover:text-blue-800 dark:group-hover:text-blue-200 transition-colors">Spending Trends Analysis</h3>
                <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium hidden sm:block">Comprehensive financial insights & patterns</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 sm:px-6 pb-4 sm:pb-6">
            <div className="space-y-4 sm:space-y-6 bg-white/50 dark:bg-gray-900/50 rounded-lg p-3 sm:p-6 backdrop-blur-sm">
              {/* Summary */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 rounded-lg sm:rounded-xl"></div>
                <div className="relative p-3 sm:p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 rounded-lg sm:rounded-xl shadow-sm">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <div className="p-1.5 sm:p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-md sm:rounded-lg">
                      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">Financial Summary</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 text-center">
                    <div className="p-3 sm:p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50">
                      <p className="text-xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                        +{formatCurrency(summary.totalIncome, userProfile.currency, userProfile.customCurrency)}
                      </p>
                      <p className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300">Total Income</p>
                    </div>
                    <div className="p-3 sm:p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg border border-red-200/50 dark:border-red-800/50">
                      <p className="text-xl sm:text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                        -{formatCurrency(summary.totalExpenses, userProfile.currency, userProfile.customCurrency)}
                      </p>
                      <p className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-300">Total Expenses</p>
                    </div>
                    <div className={`p-3 sm:p-4 bg-gradient-to-br rounded-lg border ${summary.totalIncome - summary.totalExpenses >= 0 ? 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200/50 dark:border-blue-800/50' : 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200/50 dark:border-orange-800/50'}`}>
                      <p className={`text-xl sm:text-3xl font-bold mb-1 ${summary.totalIncome - summary.totalExpenses >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        {summary.totalIncome - summary.totalExpenses >= 0 ? '+' : ''}{formatCurrency(summary.totalIncome - summary.totalExpenses, userProfile.currency, userProfile.customCurrency)}
                      </p>
                      <p className={`text-xs sm:text-sm font-medium ${summary.totalIncome - summary.totalExpenses >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>Net Total</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overall Trend Summary */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-lg sm:rounded-xl"></div>
                <div className="relative p-3 sm:p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 rounded-lg sm:rounded-xl shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2 sm:p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl shadow-md">
                        {getTrendIcon(overallTrend.direction)}
                      </div>
                      <div>
                        <h4 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100">Overall Trend</h4>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {overallTrend.direction === 'up' && '📈 Spending is trending upward'}
                          {overallTrend.direction === 'down' && '📉 Spending is trending downward'}
                          {overallTrend.direction === 'stable' && '⚖️ Spending is relatively stable'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-1 sm:gap-2">
                      <Badge variant="outline" className={`${getTrendColor(overallTrend.direction)} px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold shadow-sm`}>
                        {overallTrend.averageChange > 0 ? '+' : ''}{overallTrend.averageChange.toFixed(1)}% avg change
                      </Badge>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Last 12 months
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Trends Chart */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-teal-500/10 to-green-500/10 rounded-lg sm:rounded-xl"></div>
                <div className="relative p-3 sm:p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 rounded-lg sm:rounded-xl shadow-sm">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className="p-1.5 sm:p-2 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-md sm:rounded-lg shadow-md">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100">Monthly Comparison</h4>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Last 12 months analysis</p>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    {trends.map((data, index) => (
                      <div key={data.period} className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-3 sm:p-4 bg-gradient-to-r from-gray-50/50 to-white/50 dark:from-gray-800/50 dark:to-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-lg hover:shadow-md transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500">
                        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
                          <div className="w-16 sm:w-20">
                            <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100">{data.period}</span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="p-1 bg-white dark:bg-gray-700 rounded-md shadow-sm">
                              {getTrendIcon(data.trend)}
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="px-1.5 sm:px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded-md cursor-help">
                                  <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {data.percentageChange > 0 ? '+' : ''}{data.percentageChange.toFixed(1)}%
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Change from previous month</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 text-xs sm:text-sm">
                          <div className="text-center sm:text-right">
                            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm sm:text-lg">
                              +{formatCurrency(data.income, userProfile.currency, userProfile.customCurrency)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Income</p>
                          </div>
                          <div className="text-center sm:text-right">
                            <p className="text-red-600 dark:text-red-400 font-bold text-sm sm:text-lg">
                              -{formatCurrency(data.expenses, userProfile.currency, userProfile.customCurrency)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Expenses</p>
                          </div>
                          <div className="text-center sm:text-right">
                            <p className={`font-bold text-sm sm:text-lg ${data.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {data.net >= 0 ? '+' : ''}{formatCurrency(data.net, userProfile.currency, userProfile.customCurrency)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Net</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trend Insights */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-purple-500/10 rounded-lg sm:rounded-xl"></div>
                <div className="relative p-3 sm:p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 rounded-lg sm:rounded-xl shadow-sm">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className="p-1.5 sm:p-2 bg-gradient-to-br from-rose-500 to-pink-600 rounded-md sm:rounded-lg shadow-md">
                      <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100">Trend Insights</h4>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Key performance indicators</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
                    <div className="group p-3 sm:p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="p-1.5 sm:p-2 bg-blue-500 rounded-md sm:rounded-lg">
                          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </div>
                        <h5 className="font-bold text-sm sm:text-base text-blue-700 dark:text-blue-300">Best Month</h5>
                      </div>
                      <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                        {summary.bestMonth?.period || 'None'}
                      </p>
                      <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium">Highest net savings</p>
                    </div>

                    <div className="group p-3 sm:p-5 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border border-amber-200/50 dark:border-amber-800/50 rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="p-1.5 sm:p-2 bg-amber-500 rounded-md sm:rounded-lg">
                          <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </div>
                        <h5 className="font-bold text-sm sm:text-base text-amber-700 dark:text-amber-300">Average Monthly</h5>
                      </div>
                      <p className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mb-1">
                        {formatCurrency(
                          summary.averageMonthlyNet,
                          userProfile.currency,
                          userProfile.customCurrency
                        )}
                      </p>
                      <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-medium">Net savings per month</p>
                    </div>

                    <div className="group p-3 sm:p-5 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200/50 dark:border-purple-800/50 rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="p-1.5 sm:p-2 bg-purple-500 rounded-md sm:rounded-lg">
                          <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </div>
                        <h5 className="font-bold text-sm sm:text-base text-purple-700 dark:text-purple-300">Trend Direction</h5>
                      </div>
                      <p className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                        {overallTrend.direction === 'up' ? '↗️ Improving' :
                         overallTrend.direction === 'down' ? '↘️ Declining' : '➡️ Stable'}
                      </p>
                      <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-medium">Financial trajectory</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Insights and Recommendations */}
              {summary.highExpenseMonths.length > 0 && (
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 rounded-lg sm:rounded-xl"></div>
                  <div className="relative p-3 sm:p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 rounded-lg sm:rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="p-2 sm:p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg sm:rounded-xl shadow-md animate-pulse">
                        <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg sm:text-xl text-yellow-700 dark:text-yellow-300">⚠️ Spending Alert</h4>
                        <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400 font-medium">Action required</p>
                      </div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4">
                      <p className="text-yellow-800 dark:text-yellow-200 text-xs sm:text-sm font-medium mb-2">
                        High expense months: <span className="font-bold">{summary.highExpenseMonths.map(m => m.period).join(', ')}</span>
                      </p>
                      <p className="text-yellow-700 dark:text-yellow-300 text-xs sm:text-sm">
                        💡 Consider reviewing expenses in these months to optimize your spending patterns.
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