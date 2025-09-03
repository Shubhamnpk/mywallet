"use client"

import { useMemo } from "react"
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
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
      <div className="border border-border/50 rounded-lg bg-card shadow-sm">
        <div className="text-left px-3 sm:px-6 py-3 sm:py-5">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-primary">Spending Benchmarks</h3>
              <p className="text-sm text-muted-foreground">Compare with peers</p>
            </div>
          </div>
        </div>
        <div className="px-3 sm:px-6 pb-4">
          <div className="text-center text-muted-foreground py-8 bg-muted/50 rounded-lg">
            <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
              <Users className="w-12 h-12 opacity-50" />
            </div>
            <p className="text-lg font-medium">No benchmark data available</p>
            <p className="text-sm">Add more transactions to see how you compare</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="spending-benchmarks" className="border border-border/50 rounded-lg bg-card shadow-lg">
        <AccordionTrigger className="text-left px-3 sm:px-6 py-3 sm:py-5 hover:bg-primary/40 rounded-t-lg transition-all duration-300 group">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-primary to-primary/80 rounded-lg sm:rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
              <Users className="w-4 h-4 sm:w-6 sm:h-6 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-lg sm:text-xl text-primary group-hover:text-primary/90 transition-colors">Spending Benchmarks</h3>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Compare your spending with peers</p>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-3 sm:px-6 pb-4 sm:pb-6">
          <div className="space-y-4 sm:space-y-6 bg-card/50 rounded-lg p-3 sm:p-6">
            {/* Overall Performance */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 rounded-lg sm:rounded-xl"></div>
              <div className="relative p-3 sm:p-6 bg-card/80 backdrop-blur-sm border border-border/20 rounded-lg sm:rounded-xl shadow-sm">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-md">
                      <Award className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span className="font-bold text-base sm:text-lg text-primary">Your Overall Performance</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">{overallPercentile}th</div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3">percentile vs peers</p>
                  <Badge variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-1">
                    {overallPercentile >= 75 ? '🏆 Top Performer' :
                     overallPercentile >= 50 ? '📈 Above Average' :
                     overallPercentile >= 25 ? '⚖️ Average' : '🎯 Room for Improvement'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-teal-500/10 to-cyan-500/10 rounded-lg sm:rounded-xl"></div>
              <div className="relative p-3 sm:p-6 bg-card/80 backdrop-blur-sm border border-border/20 rounded-lg sm:rounded-xl shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <div className="p-1.5 sm:p-2 bg-gradient-to-br from-green-500 to-teal-600 rounded-md sm:rounded-lg shadow-md">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base sm:text-lg text-primary">Category Comparison</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">How you compare to peers</p>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {benchmarkData.map((benchmark) => (
                    <div key={benchmark.category} className="group p-3 sm:p-4 bg-card/60 border border-border/30 rounded-lg hover:shadow-md transition-all duration-200 hover:border-border/50">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                        <span className="font-bold text-sm sm:text-base text-primary">{benchmark.category}</span>
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-card rounded-md shadow-sm">
                            {getStatusIcon(benchmark.status)}
                          </div>
                          <Badge className={`${getStatusColor(benchmark.status)} text-xs sm:text-sm px-2 py-1`}>
                            {Math.round(benchmark.percentile)}th %
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm mb-3 sm:mb-4">
                        <div className="p-2 bg-muted/50 rounded-md">
                          <p className="text-muted-foreground font-medium">Your Average</p>
                          <p className="font-bold text-primary text-sm sm:text-base">
                            {formatCurrency(benchmark.userAverage, userProfile.currency, userProfile.customCurrency)}
                          </p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded-md">
                          <p className="text-muted-foreground font-medium">Peer Average</p>
                          <p className="font-bold text-primary text-sm sm:text-base">
                            {formatCurrency(benchmark.peerAverage, userProfile.currency, userProfile.customCurrency)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
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

                      <p className="text-xs text-muted-foreground mt-2 font-medium">
                        {benchmark.status === 'below' && `📉 You're spending ${Math.round((1 - benchmark.userAverage / benchmark.peerAverage) * 100)}% less than peers`}
                        {benchmark.status === 'above' && `📈 You're spending ${Math.round((benchmark.userAverage / benchmark.peerAverage - 1) * 100)}% more than peers`}
                        {benchmark.status === 'average' && '⚖️ Your spending is about average for this category'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Insights */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10 rounded-lg sm:rounded-xl"></div>
              <div className="relative p-3 sm:p-6 bg-card/80 backdrop-blur-sm border border-border/20 rounded-lg sm:rounded-xl shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="p-1.5 sm:p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-md sm:rounded-lg shadow-md">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <h4 className="font-bold text-base sm:text-lg text-primary">💡 Insights</h4>
                </div>
                <div className="space-y-3 text-xs sm:text-sm">
                  {benchmarkData.filter(b => b.status === 'below').length > benchmarkData.length / 2 && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-green-700 dark:text-green-300 font-medium">
                        🎉 You're spending less than most peers in multiple categories - great job being mindful!
                      </p>
                    </div>
                  )}
                  {benchmarkData.filter(b => b.status === 'above').length > benchmarkData.length / 2 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-amber-700 dark:text-amber-300 font-medium">
                        💭 You're spending more than peers in several areas. Consider reviewing your budget allocations.
                      </p>
                    </div>
                  )}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-blue-700 dark:text-blue-300 font-medium">
                      📊 Benchmarks are based on anonymous data from similar users. Use this as a guide, not a strict rule.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}