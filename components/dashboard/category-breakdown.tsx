"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { PieChart, TrendingDown } from "lucide-react"
import { useWalletData } from "@/contexts/wallet-data-context"
import { getCurrencySymbol } from "@/lib/currency"

export function CategoryBreakdown() {
  const { transactions, userProfile } = useWalletData()


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
  const currencySymbol = getCurrencySymbol(userProfile?.currency || "USD", userProfile?.customCurrency)

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
      <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6">
        {categoryData.map((item) => (
          <div key={item.category} className="space-y-1 md:space-y-2">
            <div className="flex items-center justify-between text-xs md:text-sm">
              <span className="font-medium truncate">{item.category}</span>
              <span className="text-muted-foreground truncate ml-2">
                {currencySymbol}
                {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={item.percentage} className="flex-1 h-1 md:h-2" />
              <span className="text-xs text-muted-foreground w-10 md:w-12 text-right">{item.percentage.toFixed(1)}%</span>
            </div>
          </div>
        ))}

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs md:text-sm font-medium">
            <span className="flex items-center gap-1 md:gap-2">
              <TrendingDown className="w-3 h-3 md:w-4 md:h-4 text-red-500" />
              <span className="truncate">Total Expenses</span>
            </span>
            <span className="text-red-600 truncate">
              {currencySymbol}
              {totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
