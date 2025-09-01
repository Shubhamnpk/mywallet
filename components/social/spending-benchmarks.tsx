"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  BarChart3
} from "lucide-react"
import type { Transaction, UserProfile } from "@/types/wallet"
import { formatCurrency } from "@/lib/utils"

interface SpendingBenchmarksProps {
  transactions: Transaction[]
  userProfile: UserProfile
}

interface BenchmarkData {
  category: string
  userAverage: number
  peerAverage: number
  percentile: number
  status: 'above' | 'below' | 'average'
}

// Mock peer data - in real app this would come from API
const mockPeerData = {
  'Food & Dining': 450,
  'Transportation': 320,
  'Entertainment': 180,
  'Shopping': 280,
  'Bills & Utilities': 380,
  'Healthcare': 150,
  'Other': 200
}

export function SpendingBenchmarks({ transactions, userProfile }: SpendingBenchmarksProps) {
  const benchmarkData = useMemo(() => {
    const userSpending: Record<string, number> = {}

    // Calculate user's monthly spending by category
    transactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const monthKey = new Date(transaction.date).toISOString().slice(0, 7) // YYYY-MM
        const categoryKey = `${transaction.category}_${monthKey}`

        if (!userSpending[transaction.category]) {
          userSpending[transaction.category] = 0
        }
        userSpending[transaction.category] += transaction.amount
      })

    // Calculate monthly averages
    const monthsCount = new Set(
      transactions.map(t => new Date(t.date).toISOString().slice(0, 7))
    ).size || 1

    const benchmarks: BenchmarkData[] = Object.entries(userSpending).map(([category, total]) => {
      const userAverage = total / monthsCount
      const peerAverage = mockPeerData[category as keyof typeof mockPeerData] || 250

      let percentile: number
      let status: 'above' | 'below' | 'average'

      if (userAverage < peerAverage * 0.8) {
        percentile = Math.max(10, 50 - ((peerAverage - userAverage) / peerAverage) * 30)
        status = 'below'
      } else if (userAverage > peerAverage * 1.2) {
        percentile = Math.min(90, 50 + ((userAverage - peerAverage) / peerAverage) * 30)
        status = 'above'
      } else {
        percentile = 50
        status = 'average'
      }

      return {
        category,
        userAverage,
        peerAverage,
        percentile,
        status
      }
    })

    return benchmarks.sort((a, b) => b.userAverage - a.userAverage).slice(0, 6)
  }, [transactions])

  const overallPercentile = useMemo(() => {
    if (benchmarkData.length === 0) return 50
    return Math.round(
      benchmarkData.reduce((sum, b) => sum + b.percentile, 0) / benchmarkData.length
    )
  }, [benchmarkData])

  const getStatusColor = (status: BenchmarkData['status']) => {
    switch (status) {
      case 'above': return 'text-red-600 bg-red-50'
      case 'below': return 'text-green-600 bg-green-50'
      case 'average': return 'text-blue-600 bg-blue-50'
    }
  }

  const getStatusIcon = (status: BenchmarkData['status']) => {
    switch (status) {
      case 'above': return <TrendingUp className="w-4 h-4" />
      case 'below': return <TrendingDown className="w-4 h-4" />
      case 'average': return <Target className="w-4 h-4" />
    }
  }

  if (benchmarkData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Spending Benchmarks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No benchmark data available</p>
            <p className="text-sm">Add more transactions to see how you compare</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Spending Benchmarks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Performance */}
        <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Award className="w-5 h-5 text-blue-600" />
            <span className="font-semibold">Your Overall Performance</span>
          </div>
          <div className="text-3xl font-bold text-primary mb-1">{overallPercentile}th</div>
          <p className="text-sm text-muted-foreground">percentile vs peers</p>
          <Badge variant="outline" className="mt-2">
            {overallPercentile >= 75 ? 'Top Performer' :
             overallPercentile >= 50 ? 'Above Average' :
             overallPercentile >= 25 ? 'Average' : 'Room for Improvement'}
          </Badge>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Category Comparison
          </h4>

          <div className="space-y-3">
            {benchmarkData.map((benchmark) => (
              <div key={benchmark.category} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{benchmark.category}</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(benchmark.status)}
                    <Badge className={getStatusColor(benchmark.status)}>
                      {Math.round(benchmark.percentile)}th %
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                  <div>
                    <p className="text-muted-foreground">Your Average</p>
                    <p className="font-semibold">
                      {formatCurrency(benchmark.userAverage, userProfile.currency, userProfile.customCurrency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Peer Average</p>
                    <p className="font-semibold">
                      {formatCurrency(benchmark.peerAverage, userProfile.currency, userProfile.customCurrency)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Peer Average</span>
                    <span>Your Spending</span>
                  </div>
                  <div className="relative">
                    <Progress
                      value={Math.min(100, (benchmark.userAverage / benchmark.peerAverage) * 50)}
                      className="h-2"
                    />
                    <div className="absolute top-0 left-1/2 w-0.5 h-2 bg-muted-foreground/50" />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  {benchmark.status === 'below' && `You're spending ${Math.round((1 - benchmark.userAverage / benchmark.peerAverage) * 100)}% less than peers`}
                  {benchmark.status === 'above' && `You're spending ${Math.round((benchmark.userAverage / benchmark.peerAverage - 1) * 100)}% more than peers`}
                  {benchmark.status === 'average' && 'Your spending is about average for this category'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div className="p-4 bg-muted/50 border rounded-lg">
          <h4 className="font-semibold mb-3">💡 Insights</h4>
          <div className="space-y-2 text-sm">
            {benchmarkData.filter(b => b.status === 'below').length > benchmarkData.length / 2 && (
              <p className="text-green-700 dark:text-green-300">
                🎉 You're spending less than most peers in multiple categories - great job being mindful!
              </p>
            )}
            {benchmarkData.filter(b => b.status === 'above').length > benchmarkData.length / 2 && (
              <p className="text-amber-700 dark:text-amber-300">
                💭 You're spending more than peers in several areas. Consider reviewing your budget allocations.
              </p>
            )}
            <p className="text-blue-700 dark:text-blue-300">
                📊 Benchmarks are based on anonymous data from similar users. Use this as a guide, not a strict rule.
              </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}