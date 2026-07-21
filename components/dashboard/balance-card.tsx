"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Clock,
  Wallet,
  AlertTriangle,
  Eye,
  EyeOff
} from "lucide-react"
import { useWalletData } from "@/contexts/wallet-data-context"
import { TimeTooltip } from "@/components/ui/time-tooltip"
import React, { useMemo, useState, useRef, useEffect } from "react"
import { getTimeEquivalentBreakdown } from "@/lib/wallet-utils"
import { useCalendarSystem } from "@/hooks/use-calendar-system"
import { useCurrencySymbol } from "@/hooks/use-currency-symbol"
import type { Transaction } from "@/types/wallet"
import { formatAppMonthKey, getCalendarMonthRange, isWithinDateRange } from "@/lib/app-calendar"

interface BalanceChange {
  type: "income" | "expense"
  amount: number
}
interface TimeEquivalentBreakdown {
  formatted: {
    userFriendly: string
  }
}
interface BalanceCardProps {
  balanceChange?: BalanceChange | null
  balance: number
  showBalance: boolean
  setShowBalance: React.Dispatch<React.SetStateAction<boolean>>
  absoluteBalance: number
  isPositive: boolean
  timeEquivalentBreakdown: TimeEquivalentBreakdown | null
  emergencyFund: number
  formatCurrency: (amount: number) => string
  getThemeBasedBackground: () => string
  isMobile?: boolean
}

function RhododendronFlower({ className, strokeColor = "white" }: { className?: string; strokeColor?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Five petals radiating from center */}
      <path d="M100 100 C100 60, 60 30, 55 55 C50 80, 80 100, 100 100Z" fill={strokeColor} />
      <path d="M100 100 C140 100, 170 60, 145 55 C120 50, 100 80, 100 100Z" fill={strokeColor} />
      <path d="M100 100 C100 140, 140 170, 145 145 C150 120, 120 100, 100 100Z" fill={strokeColor} />
      <path d="M100 100 C60 100, 30 140, 55 145 C80 150, 100 120, 100 100Z" fill={strokeColor} />
      <path d="M100 100 C130 70, 170 30, 170 60 C170 90, 130 100, 100 100Z" fill={strokeColor} />
      {/* Center pistil */}
      <circle cx="100" cy="100" r="8" fill={strokeColor} opacity="0.4" />
      <circle cx="100" cy="100" r="4" fill={strokeColor} opacity="0.6" />
    </svg>
  )
}

function RhododendronEmblem({ isPositive }: { isPositive: boolean }) {
  const color = isPositive ? "white" : "white"
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <RhododendronFlower strokeColor={color} className="absolute -top-8 -right-8 w-36 h-36 opacity-[0.07]" />
      <RhododendronFlower strokeColor={color} className="absolute -bottom-6 -left-6 w-24 h-24 opacity-[0.05] scale-x-[-1]" />
      <RhododendronFlower strokeColor={color} className="absolute top-1/3 right-2 w-10 h-10 opacity-[0.04]" />
    </div>
  )
}

function BalanceCard({
  balanceChange,
  balance,
  showBalance,
  setShowBalance,
  absoluteBalance,
  isPositive,
  timeEquivalentBreakdown,
  formatCurrency,
  getThemeBasedBackground,
  isMobile = false
}: BalanceCardProps) {
  const compactClass = isMobile ? "p-4" : "p-6"
  const headerMargin = isMobile ? "mb-3" : "mb-4"
  const balanceSize = isMobile ? "text-3xl" : "text-4xl"
  const timeEquivalentSize = isMobile ? "text-xs" : "text-sm"
  const timeEquivalentPadding = isMobile ? "px-2 py-1" : "px-3 py-2"
  const timeEquivalentGap = isMobile ? "gap-1" : "gap-2"
  const timeEquivalentIconSize = isMobile ? "w-6 h-6" : "w-8 h-8"
  const timeEquivalentClockSize = isMobile ? "w-3 h-3" : "w-4 h-4"

  return (
    <Card className="relative border-0 shadow-lg h-full md:min-h-[170px]">
      <div className="absolute inset-0 rounded-xl overflow-hidden">
        <div className={`absolute inset-0 ${getThemeBasedBackground()} opacity-90`} />
        <div className="absolute inset-0 bg-black/10" />
        <RhododendronEmblem isPositive={isPositive} />
      </div>

      <CardContent className={`relative ${compactClass} text-white`}>
        {balanceChange && (
          <div className="absolute top-4 right-4 animate-bounce">
            <div className={`px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm ${
              balanceChange.type === "income"
                ? "bg-green-500/30 text-green-100 border border-green-400/50"
                : "bg-red-500/30 text-red-100 border border-red-400/50"
            }`}>
              {balanceChange.type === "income" ? "+" : "-"}
              {formatCurrency(balanceChange.amount)}
            </div>
          </div>
        )}

        <div className={`flex items-center justify-between ${headerMargin}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-sm font-medium opacity-90">Current Balance</span>
              {balance < 0 && (
                <Badge variant="destructive" className="ml-2 bg-red-500/30 text-red-100 border-red-400/50">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Negative
                </Badge>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-200"
            aria-label={showBalance ? "Hide balance" : "Show balance"}
          >
            {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>

        {showBalance ? (
          <TimeTooltip amount={absoluteBalance}>
            <div
              className={`transition-all duration-500 ${balanceChange ? "animate-pulse scale-105" : ""}`}
              aria-live="polite"
              aria-atomic="true"
            >
              <div className={`${balanceSize} font-bold mb-1 tracking-tight`}>
                {isPositive ? "" : "-"}
                {formatCurrency(absoluteBalance)}
              </div>
            </div>
          </TimeTooltip>
        ) : (
          <div className="transition-all duration-500">
            <div className={`${balanceSize} font-bold mb-1 tracking-tight`}>••••••</div>
          </div>
        )}

        {showBalance && timeEquivalentBreakdown && (
          <div className={`flex items-center ${timeEquivalentGap} ${timeEquivalentSize} bg-white/10 backdrop-blur-sm rounded-lg ${timeEquivalentPadding} mt-3`}>
            <div className={`${timeEquivalentIconSize} rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg`}>
              <Clock className={`${timeEquivalentClockSize} text-white`} />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-white">
                {timeEquivalentBreakdown.formatted.userFriendly}
              </span>
              <span className="text-xs text-amber-100/80">
                of work time
              </span>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  )
}

export function CombinedBalanceCard() {
  const { balance, userProfile, transactions, debtAccounts, creditAccounts, emergencyFund, balanceChange, portfolio } =
    useWalletData()

  const [showBalance, setShowBalance] = useState(true)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [incomeExpenseRange, setIncomeExpenseRange] = useState<"monthly" | "all-time">("monthly")
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const calendarSystem = useCalendarSystem()
  const activeMonthLabel = formatAppMonthKey(getCalendarMonthRange(new Date(), calendarSystem).key, calendarSystem)

  // Optimize calculations with useMemo and better logic
  const { monthlyIncome, monthlyExpenses, allTimeIncome, allTimeExpenses } = useMemo(() => {
    const currentMonthRange = getCalendarMonthRange(new Date(), calendarSystem)

    const initialAcc = { monthlyIncome: 0, monthlyExpenses: 0, allTimeIncome: 0, allTimeExpenses: 0 }
    const txResult = (transactions || []).reduce(
      (acc: typeof initialAcc, transaction: Transaction) => {
        const fullAmount = transaction.amount
        if (!transaction || typeof fullAmount !== "number" || fullAmount < 0) {
          return acc
        }
        const txDate = new Date(transaction.date)
        if (Number.isNaN(txDate.getTime())) {
          return acc
        }
        const isGoalContribution =
          transaction.allocationType === "goal" &&
          transaction.category === "Goal Contribution"
        const isTrueExpense = transaction.type === "expense" && !isGoalContribution

        if (transaction.type === "income") {
          acc.allTimeIncome += fullAmount
          if (isWithinDateRange(txDate, currentMonthRange.start, currentMonthRange.end)) {
            acc.monthlyIncome += fullAmount
          }
        } else if (isTrueExpense) {
          acc.allTimeExpenses += fullAmount
          if (isWithinDateRange(txDate, currentMonthRange.start, currentMonthRange.end)) {
            acc.monthlyExpenses += fullAmount
          }
        }

        return acc
      },
      { ...initialAcc },
    )
    return txResult
  }, [transactions, calendarSystem])

  const totalIncome = incomeExpenseRange === "monthly" ? monthlyIncome : allTimeIncome
  const totalExpenses = incomeExpenseRange === "monthly" ? monthlyExpenses : allTimeExpenses

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

  // Calculate total share valuation from portfolio
  const totalShareValuation = useMemo(() => {
    return portfolio?.reduce((sum, item) => {
      const price = item.currentPrice || item.buyPrice || 0
      return sum + (item.units * price)
    }, 0) || 0
  }, [portfolio])
  const hasShareHoldings = totalShareValuation > 0
  const creditUtilization = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0
  const currencySymbol = useCurrencySymbol()

  const isPositive = balance >= 0
  const absoluteBalance = Math.abs(balance)
  const timeEquivalentBreakdown = useMemo(() => {
    if (!userProfile || balance <= 0) return null
    return getTimeEquivalentBreakdown(balance, userProfile)
  }, [balance, userProfile])
  const formatCurrency = (amount: number) => {
    const numberFormat = typeof window !== 'undefined' ? (localStorage.getItem("wallet_number_format") || "us") : "us"
    const locale = numberFormat === 'us' ? 'en-US' : numberFormat === 'eu' ? 'de-DE' : 'en-IN'
    return `${currencySymbol}${amount.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }

  const getThemeBasedBackground = () => {
    const savedColorTheme = (typeof window !== 'undefined' ? localStorage.getItem("wallet_color_theme") : null) || "emerald"
    const useGradient = (typeof window !== 'undefined' ? localStorage.getItem("wallet_use_gradient") : null) !== "false" // Default to true
    const themeColors = {
      emerald: { gradient: "bg-gradient-to-br from-emerald-600 via-emerald-500 to-green-400", solid: "bg-emerald-600" },
      blue: { gradient: "bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-400", solid: "bg-blue-600" },
      purple: { gradient: "bg-gradient-to-br from-purple-600 via-purple-500 to-pink-400", solid: "bg-purple-600" },
      orange: { gradient: "bg-gradient-to-br from-orange-600 via-orange-500 to-red-400", solid: "bg-orange-600" },
      rose: { gradient: "bg-gradient-to-br from-rose-600 via-rose-500 to-pink-400", solid: "bg-rose-600" }
    }

    const themeColor = themeColors[savedColorTheme as keyof typeof themeColors] || themeColors.emerald

    // For negative balance, always use red regardless of theme
    if (!isPositive) {
      return useGradient ? "bg-gradient-to-br from-red-600 via-red-500 to-red-400" : "bg-red-600"
    }

    // Return gradient or solid based on user preference
    return useGradient ? themeColor.gradient : themeColor.solid
  }

  const getCreditUtilizationColor = () => {
    if (creditUtilization >= 90) return "text-red-600 dark:text-red-400"
    if (creditUtilization >= 70) return "text-amber-600 dark:text-amber-400"
    if (creditUtilization >= 30) return "text-blue-600 dark:text-blue-400"
    return "text-emerald-600 dark:text-emerald-400"
  }

  const netWorthEnabled = totalDebt > 0 || totalCreditUsed > 0

  // Enhanced touch and scroll handling
  useEffect(() => {
    const container = scrollContainerRef.current
    if (container && netWorthEnabled) {
      let touchStartX = 0
      let touchStartY = 0
      let isScrolling = false

      const handleTouchStart = (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX
        touchStartY = e.touches[0].clientY
        isScrolling = false
      }

      const handleTouchMove = (e: TouchEvent) => {
        if (!touchStartX || !touchStartY) return

        const touchEndX = e.touches[0].clientX
        const touchEndY = e.touches[0].clientY
        const diffX = touchStartX - touchEndX
        const diffY = touchStartY - touchEndY

        // Determine if this is a horizontal scroll
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
          isScrolling = true
        }
      }

      const handleTouchEnd = () => {
        touchStartX = 0
        touchStartY = 0
        if (isScrolling) {
          // Add a small delay to let momentum scrolling finish
          setTimeout(() => {
            isScrolling = false
          }, 150)
        }
      }

      // Add touch event listeners for better touch handling
      container.addEventListener('touchstart', handleTouchStart, { passive: true })
      container.addEventListener('touchmove', handleTouchMove, { passive: true })
      container.addEventListener('touchend', handleTouchEnd, { passive: true })

      // Simple scroll handler - update indicator based on scroll position
      const scrollHandler = () => {
        if (!container) return
        const scrollLeft = container.scrollLeft
        const containerWidth = container.clientWidth
        const threshold = containerWidth * 0.5
        const newIndex = scrollLeft > threshold ? 1 : 0
        setCurrentCardIndex(prev => prev !== newIndex ? newIndex : prev)
      }

      container.addEventListener('scroll', scrollHandler, { passive: true })

      return () => {
        container.removeEventListener('touchstart', handleTouchStart)
        container.removeEventListener('touchmove', handleTouchMove)
        container.removeEventListener('touchend', handleTouchEnd)
        container.removeEventListener('scroll', scrollHandler)
      }
    }
  }, [netWorthEnabled])

  const mainBalance = netWorthEnabled ? (
    <div className="w-full">
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto px-2 pb-4 hide-scrollbars w-full"
        style={{
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x mandatory'
        }}
      >
        <div className="flex" style={{ width: 'calc(200% + 16px)' }}>
          <div data-carousel-card="0" className="flex-shrink-0 md:min-h-[150px]" style={{ width: 'calc(50% - 8px)', scrollSnapAlign: 'start' }}>
            <BalanceCard
              balanceChange={balanceChange}
              balance={balance}
              showBalance={showBalance}
              setShowBalance={setShowBalance}
              absoluteBalance={absoluteBalance}
              isPositive={isPositive}
              timeEquivalentBreakdown={timeEquivalentBreakdown}
              emergencyFund={emergencyFund}
              formatCurrency={formatCurrency}
              getThemeBasedBackground={getThemeBasedBackground}
              isMobile={true}
            />
          </div>

          {/* Net Worth Card */}
          <div data-carousel-card="1" className="flex-shrink-0 md:min-h-[150px] ml-4" style={{ width: 'calc(50% - 8px)', scrollSnapAlign: 'start' }}>
            <Card className={`relative border-2 transition-all duration-200 h-full md:min-h-[150px] ${netWorth >= 0
              ? "border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20"
              : "border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20"
              }`}>
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl" aria-hidden="true">
                <RhododendronFlower strokeColor={netWorth >= 0 ? "#059669" : "#dc2626"} className="absolute -top-5 -right-5 w-28 h-28 opacity-[0.07]" />
                <RhododendronFlower strokeColor={netWorth >= 0 ? "#059669" : "#dc2626"} className="absolute -bottom-4 -left-4 w-16 h-16 opacity-[0.05] scale-x-[-1]" />
              </div>
              <CardContent className="relative p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <PiggyBank className={`w-5 h-5 ${netWorth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} />
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Net Worth</p>
                </div>
                <p className={`text-3xl font-bold mb-2 text-center ${netWorth >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
                  }`}>
                  {netWorth < 0 && "-"}
                  {showBalance ? formatCurrency(Math.abs(netWorth)) : "••••••"}
                </p>
                {/* Total Share Valuation */}
                {showBalance && hasShareHoldings && (
                  <div className="flex items-center justify-center gap-1 text-xs bg-blue-50/80 dark:bg-blue-950/50 backdrop-blur-sm rounded-lg px-2 py-1 mt-2">
                    <TrendingUp className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-blue-700 dark:text-blue-300">
                      Shares: {formatCurrency(totalShareValuation)}
                    </span>
                  </div>
                )}

                {/* Time Equivalent for Net Worth */}
                {showBalance && netWorth > 0 && timeEquivalentBreakdown && (
                  <div className="flex items-center justify-center gap-1 text-xs bg-emerald-50/80 dark:bg-emerald-950/50 backdrop-blur-sm rounded-lg px-2 py-1 mt-2">
                    <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      {(() => {
                        // Calculate time equivalent for net worth
                        const netWorthTimeBreakdown = userProfile ? getTimeEquivalentBreakdown(netWorth, userProfile) : null
                        return netWorthTimeBreakdown?.formatted?.userFriendly || timeEquivalentBreakdown.formatted.userFriendly
                      })()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Enhanced Scroll Indicators */}
      <div className="flex justify-center gap-3 mt-3 relative z-10">
        {[0, 1].map((index) => (
          <button
            key={index}
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const container = scrollContainerRef.current
              if (container) {
                // Get the card elements
                const cards = container.querySelectorAll('[data-carousel-card]')
                if (cards[index]) {
                  // Temporarily disable scroll-snap for smooth animation
                  container.style.scrollSnapType = 'none'
                  cards[index].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
                  // Re-enable scroll-snap after animation
                  setTimeout(() => {
                    container.style.scrollSnapType = 'x mandatory'
                  }, 400)
                }
                setCurrentCardIndex(index)
              }
            }}
            className={`relative transition-all duration-300 ease-out cursor-pointer ${currentCardIndex === index
              ? 'w-6 h-2 bg-primary scale-110'
              : 'w-2 h-2 bg-muted-foreground/40 hover:bg-muted-foreground/60 hover:scale-105'
              } rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2`}
            aria-label={`Go to ${index === 0 ? 'balance' : 'net worth'} card`}
          >
            {/* Active indicator glow effect */}
            {currentCardIndex === index && (
              <div className="absolute inset-0 bg-primary/30 rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </div>
    </div>
  ) : (
    <BalanceCard
      balanceChange={balanceChange}
      balance={balance}
      showBalance={showBalance}
      setShowBalance={setShowBalance}
      absoluteBalance={absoluteBalance}
      isPositive={isPositive}
      timeEquivalentBreakdown={timeEquivalentBreakdown}
      emergencyFund={emergencyFund}
      formatCurrency={formatCurrency}
      getThemeBasedBackground={getThemeBasedBackground}
    />
  )

  return (
    <div className="space-y-6">
      {mainBalance}

      {/* Income & Expenses Row */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
          {incomeExpenseRange === "monthly" ? `${activeMonthLabel} Summary` : "All Time Summary"}
        </p>
        <div className="inline-flex items-center rounded-lg border bg-muted/30 p-1">
          <Button
            variant={incomeExpenseRange === "monthly" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setIncomeExpenseRange("monthly")}
          >
            Monthly
          </Button>
          <Button
            variant={incomeExpenseRange === "all-time" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setIncomeExpenseRange("all-time")}
          >
            All Time
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <Card className="relative group hover:shadow-md transition-all duration-200 border-green-200/50 dark:border-green-800/50">
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl" aria-hidden="true">
            <RhododendronFlower strokeColor="#059669" className="absolute -top-3 -right-3 w-16 h-16 opacity-[0.06]" />
          </div>
          <CardContent className="relative p-3 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Income</p>
                <TimeTooltip amount={totalIncome}>
                  <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400 truncate">
                    {showBalance ? formatCurrency(totalIncome) : "••••••"}
                  </p>
                </TimeTooltip>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {incomeExpenseRange === "monthly" ? activeMonthLabel : "All time"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative group hover:shadow-md transition-all duration-200 border-red-200/50 dark:border-red-800/50">
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl" aria-hidden="true">
            <RhododendronFlower strokeColor="#dc2626" className="absolute -top-3 -right-3 w-16 h-16 opacity-[0.06]" />
          </div>
          <CardContent className="relative p-3 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg">
                <TrendingDown className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expenses</p>
                <TimeTooltip amount={totalExpenses}>
                  <p className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400 truncate">
                    {showBalance ? formatCurrency(totalExpenses) : "••••••"}
                  </p>
                </TimeTooltip>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {incomeExpenseRange === "monthly" ? activeMonthLabel : "All time"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
