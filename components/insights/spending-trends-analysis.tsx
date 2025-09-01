
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
    if (trendData.length < 2) return { direction: 'stable', averageChange: 0 }

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
