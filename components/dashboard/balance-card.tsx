"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, TrendingUp, TrendingDown, Clock, Sparkles, AlertTriangle } from "lucide-react"
import { useWalletData } from "@/contexts/wallet-data-context"
import { TimeTooltip } from "@/components/ui/time-tooltip"
import { useMemo } from "react"

export function CombinedBalanceCard() {
  const { balance, userProfile, transactions, debtAccounts, creditAccounts, emergencyFund, balanceChange } =
    useWalletData()

  console.log("[v0] BalanceCard render - balance:", balance, "transactions:", transactions?.length)

  // Optimize calculations with useMemo and better logic
  const { totalIncome, totalExpenses } = useMemo(() => {
    if (!transactions?.length) {
      return { totalIncome: 0, totalExpenses: 0 }
    }

    const result = transactions.reduce(
      (acc, transaction) => {
        // Ensure transaction has required properties and valid amount
        if (!transaction || typeof transaction.amount !== "number" || transaction.amount < 0) {
          return acc
        }

        if (transaction.type === "income") {
          acc.totalIncome += transaction.amount
        } else if (transaction.type === "expense") {
          acc.totalExpenses += transaction.amount
        }

        return acc
      },
      { totalIncome: 0, totalExpenses: 0 },
    )
    return result
  }, [transactions])

  const totalDebt = useMemo(() => {
    return debtAccounts?.reduce((sum, debt) => sum + debt.balance, 0) || 0
  }, [debtAccounts])

  const totalCreditUsed = useMemo(() => {
    return creditAccounts?.reduce((sum, credit) => sum + credit.balance, 0) || 0
  }, [creditAccounts])

  const totalCreditLimit = useMemo(() => {
    return creditAccounts?.reduce((sum, credit) => sum + credit.creditLimit, 0) || 0
  }, [creditAccounts])

  const availableCredit = totalCreditLimit - totalCreditUsed
  const netWorth = balance + availableCredit - totalDebt

  // Memoize currency symbol and balance calculations
  const currencySymbol = useMemo(() => {
    if (!userProfile) return "$"
    const custom = (userProfile as any).customCurrency
    if (custom && custom.symbol) return custom.symbol
    const map: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥", CAD: "C$", AUD: "A$", INR: "₹" }
    return map[(userProfile.currency as string) || "USD"] || "$"
  }, [userProfile?.currency, (userProfile as any)?.customCurrency])
  const isPositive = balance >= 0
  const absoluteBalance = Math.abs(balance)

  // Memoize work hours calculation
  const workHoursEquivalent = useMemo(() => {
    if (!userProfile || balance <= 0) return null

    const { monthlyEarning, workingDaysPerMonth, workingHoursPerDay } = userProfile

    if (!monthlyEarning || !workingDaysPerMonth || !workingHoursPerDay) return null

    const hourlyRate = monthlyEarning / (workingDaysPerMonth * workingHoursPerDay)
    return hourlyRate > 0 ? (balance / hourlyRate).toFixed(1) : null
  }, [balance, userProfile])

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden bg-primary text-primary-foreground">
        <CardContent className="p-6">
          {balanceChange && (
            <div
              className={`absolute top-2 right-2 animate-bounce ${
                balanceChange.type === "income" ? "text-green-300" : "text-red-300"
              }`}
            >
              <div className="text-sm font-bold">
                {balanceChange.type === "income" ? "+" : "-"}
                {formatCurrency(balanceChange.amount)}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Current Balance</span>
            </div>
            {balance < 0 && (
              <Badge
                variant="destructive"
                className="bg-destructive/20 text-destructive-foreground border-destructive/30"
              >
                Negative Balance
              </Badge>
            )}
          </div>

          <TimeTooltip amount={absoluteBalance}>
            <div
              className={`text-3xl font-bold mb-1 transition-all duration-300 ${
                balanceChange ? "animate-pulse scale-105" : ""
              }`}
            >
              {isPositive ? "" : "-"}
              {formatCurrency(absoluteBalance)}
            </div>
          </TimeTooltip>

          {workHoursEquivalent && (
            <div className="flex items-center gap-1 text-xs opacity-80">
              <Clock className="w-3 h-3" />
              <span>{workHoursEquivalent}h of work</span>
            </div>
          )}

          {emergencyFund > 0 && (
            <div className="flex items-center gap-1 text-xs opacity-80 mt-1">
              <Sparkles className="w-3 h-3" />
              <span>Emergency Fund: {formatCurrency(emergencyFund)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Income</p>
                <TimeTooltip amount={totalIncome}>
                  <p className="text-lg font-semibold text-green-600">{formatCurrency(totalIncome)}</p>
                </TimeTooltip>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 dark:bg-destructive/90 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-destructive dark:text-destructive-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Expenses</p>
                <TimeTooltip amount={totalExpenses}>
                  <p className="text-lg font-semibold text-destructive dark:text-destructive-foreground">
                    {formatCurrency(totalExpenses)}
                  </p>
                </TimeTooltip>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(totalDebt > 0 || totalCreditUsed > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {totalDebt > 0 && (
            <Card className="bg-card border-destructive/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 dark:bg-destructive/90 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-destructive dark:text-destructive-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Total Debt</p>
                    <p className="text-lg font-semibold text-destructive dark:text-destructive-foreground">
                      {formatCurrency(totalDebt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {totalCreditUsed > 0 && (
            <Card className="bg-card border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Credit Used</p>
                    <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(totalCreditUsed)}
                    </p>
                    <p className="text-xs text-muted-foreground">Available: {formatCurrency(availableCredit)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {(totalDebt > 0 || totalCreditUsed > 0) && (
        <Card
          className={`border-2 ${netWorth >= 0 ? "border-success/20 dark:border-success/80 bg-success/5 dark:bg-success/950/20" : "border-destructive/20 bg-destructive/5"}`}
        >
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Net Worth</p>
            <p
              className={`text-2xl font-bold ${netWorth >= 0 ? "text-success dark:text-success-foreground" : "text-destructive dark:text-destructive-foreground"}`}
            >
              {formatCurrency(Math.abs(netWorth))}
            </p>
            <p className="text-xs text-muted-foreground">Balance + Available Credit - Total Debt</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
