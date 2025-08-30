"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { PieChart, TrendingDown } from "lucide-react"
import { useWalletData } from "@/contexts/wallet-data-context"

export function CategoryBreakdown() {
  const { transactions, userProfile } = useWalletData()

  console.log("[v0] CategoryBreakdown render - transactions:", transactions?.length)

  // Calculate expense breakdown by category
  const expensesByCategory = transactions
    .filter((t) => t.type === "expense")
    .reduce(
      (acc, transaction) => {
        acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount
        return acc
      },
      {} as Record<string, number>,
    )

  const totalExpenses = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0)
  const currencySymbol = userProfile?.currency?.symbol || "$"

  const categoryData = Object.entries(expensesByCategory)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5) // Top 5 categories

  if (categoryData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Spending Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No expenses yet</p>
            <p className="text-sm">Start tracking your spending to see insights!</p>
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
          Top Spending Categories
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categoryData.map((item) => (
          <div key={item.category} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{item.category}</span>
              <span className="text-muted-foreground">
                {currencySymbol}
                {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={item.percentage} className="flex-1" />
              <span className="text-xs text-muted-foreground w-12 text-right">{item.percentage.toFixed(1)}%</span>
            </div>
          </div>
        ))}

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              Total Expenses
            </span>
            <span className="text-red-600">
              {currencySymbol}
              {totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
