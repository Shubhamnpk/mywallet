"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, BarChart3, Calendar } from "lucide-react"
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

    return trends
  }, [transactions])

  const overallTrend = useMemo(() => {
    if (trendData.length < 2) return { direction: 'stable' as const, averageChange: 0 }

    const changes = trendData.slice(1).map(d => d.percentageChange)
    const averageChange = changes.reduce((sum, change) => sum + change, 0) / changes.length

    let direction: 'up' | 'down' | 'stable' = 'stable'
    if (averageChange > 2) direction = 'up'
    else if (averageChange < -2) direction = 'down'

    return { direction, averageChange }
  }, [trendData])

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

  if (trendData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Spending Trends Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No trend data available</p>
            <p className="text-sm">Add more transactions to see spending trends</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Spending Trends Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Trend Summary */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            {getTrendIcon(overallTrend.direction)}
            <div>
              <p className="font-semibold">Overall Trend</p>
              <p className="text-sm text-muted-foreground">
                {overallTrend.direction === 'up' && 'Spending is trending upward'}
                {overallTrend.direction === 'down' && 'Spending is trending downward'}
                {overallTrend.direction === 'stable' && 'Spending is relatively stable'}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={getTrendColor(overallTrend.direction)}>
            {overallTrend.averageChange > 0 ? '+' : ''}{overallTrend.averageChange.toFixed(1)}% avg change
          </Badge>
        </div>

        {/* Monthly Trends Chart */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Monthly Comparison (Last 12 Months)
          </h4>

          <div className="space-y-3">
            {trendData.map((data, index) => (
              <div key={data.period} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-medium w-20">{data.period}</span>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(data.trend)}
                    <span className="text-sm text-muted-foreground">
                      {data.percentageChange > 0 ? '+' : ''}{data.percentageChange.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <p className="text-emerald-600 font-medium">
                      +{formatCurrency(data.income, userProfile.currency, userProfile.customCurrency)}
                    </p>
                    <p className="text-muted-foreground">Income</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-600 font-medium">
                      -{formatCurrency(data.expenses, userProfile.currency, userProfile.customCurrency)}
                    </p>
                    <p className="text-muted-foreground">Expenses</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${data.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {data.net >= 0 ? '+' : ''}{formatCurrency(data.net, userProfile.currency, userProfile.customCurrency)}
                    </p>
                    <p className="text-muted-foreground">Net</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trend Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h5 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Best Month</h5>
            <p className="text-2xl font-bold text-blue-600">
              {trendData.reduce((best, current) =>
                current.net > best.net ? current : best, trendData[0]
              ).period}
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Highest net savings
            </p>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <h5 className="font-semibold text-amber-700 dark:text-amber-300 mb-2">Average Monthly</h5>
            <p className="text-2xl font-bold text-amber-600">
              {formatCurrency(
                trendData.reduce((sum, d) => sum + d.net, 0) / trendData.length,
                userProfile.currency,
                userProfile.customCurrency
              )}
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Net savings per month
            </p>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <h5 className="font-semibold text-purple-700 dark:text-purple-300 mb-2">Trend Direction</h5>
            <p className="text-2xl font-bold text-purple-600">
              {overallTrend.direction === 'up' ? '↗️ Improving' :
               overallTrend.direction === 'down' ? '↘️ Declining' : '➡️ Stable'}
            </p>
            <p className="text-sm text-purple-600 dark:text-purple-400">
              Financial trajectory
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}