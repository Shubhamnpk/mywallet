"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Wallet,
  AlertTriangle,
  Eye,
  EyeOff,
  X
} from "lucide-react"
import { useWalletData } from "@/contexts/wallet-data-context"
import { TimeTooltip } from "@/components/ui/time-tooltip"
import React, { useMemo, useState, useRef, useEffect } from "react"
import { getTimeEquivalentBreakdown } from "@/lib/wallet-utils"
import { useCalendarSystem } from "@/hooks/use-calendar-system"
import { useCurrencySymbol } from "@/hooks/use-currency-symbol"
import type { Transaction } from "@/types/wallet"
import { formatAppMonthKey, getCalendarMonthRange, isWithinDateRange } from "@/lib/app-calendar"
import Image from "next/image"

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
      <path d="M100 100 C100 60, 60 30, 55 55 C50 80, 80 100, 100 100Z" fill={strokeColor} />
      <path d="M100 100 C140 100, 170 60, 145 55 C120 50, 100 80, 100 100Z" fill={strokeColor} />
      <path d="M100 100 C100 140, 140 170, 145 145 C150 120, 120 100, 100 100Z" fill={strokeColor} />
      <path d="M100 100 C60 100, 30 140, 55 145 C80 150, 100 120, 100 100Z" fill={strokeColor} />
      <path d="M100 100 C130 70, 170 30, 170 60 C170 90, 130 100, 100 100Z" fill={strokeColor} />
      <circle cx="100" cy="100" r="8" fill={strokeColor} opacity="0.4" />
      <circle cx="100" cy="100" r="4" fill={strokeColor} opacity="0.6" />
    </svg>
  )
}

function RhododendronEmblem({ isPositive }: { isPositive: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="absolute -top-8 -right-8 w-40 h-40 opacity-[0.22]">
        <Image
          src="/embed/tok.png"
          alt=""
          fill
          className="object-contain"
          sizes="160px"
          priority={false}
        />
      </div>
      <div className="absolute -bottom-8 -left-8 w-32 h-32 opacity-[0.15] scale-x-[-1]">
        <Image
          src="/embed/tok.png"
          alt=""
          fill
          className="object-contain"
          sizes="128px"
          priority={false}
        />
      </div>
      <RhododendronFlower strokeColor="white" className="absolute top-1/3 right-3 w-14 h-14 opacity-[0.08]" />
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
  const [netWorthDialogOpen, setNetWorthDialogOpen] = useState(false)
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

  // Calculate total share valuation from portfolio
  const totalShareValuation = useMemo(() => {
    return portfolio?.reduce((sum, item) => {
      const price = item.currentPrice || item.buyPrice || 0
      return sum + (item.units * price)
    }, 0) || 0
  }, [portfolio])
  const hasShareHoldings = totalShareValuation > 0
  const netWorth = balance + availableCredit + totalShareValuation - totalDebt
  const creditUtilization = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0
  const currencySymbol = useCurrencySymbol()

  const portfolioGain = useMemo(() => {
    return portfolio?.reduce((sum, item) => {
      const current = item.currentPrice || item.buyPrice || 0
      return sum + (item.units * (current - item.buyPrice))
    }, 0) || 0
  }, [portfolio])

  const dailyPortfolioChange = useMemo(() => {
    return portfolio?.reduce((sum, item) => {
      if (item.currentPrice != null && item.previousClose != null) {
        return sum + (item.units * (item.currentPrice - item.previousClose))
      }
      return sum
    }, 0) || 0
  }, [portfolio])

  const formatAbbreviated = (amount: number) => {
    const abs = Math.abs(amount)
    const sign = amount < 0 ? "-" : ""
    const numberFormat = typeof window !== 'undefined' ? (localStorage.getItem("wallet_number_format") || "us") : "us"
    if (numberFormat === "in") {
      if (abs >= 10000000) return `${sign}${(abs / 10000000).toFixed(1)} cr`
      if (abs >= 100000) return `${sign}${(abs / 100000).toFixed(1)} lac`
      if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`
      return `${sign}${abs.toFixed(0)}`
    }
    if (abs >= 1000000000) return `${sign}${(abs / 1000000000).toFixed(1)}B`
    if (abs >= 10000000) return `${sign}${(abs / 10000000).toFixed(1)}Cr`
    if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(1)}M`
    if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`
    return `${sign}${abs.toFixed(0)}`
  }

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

          {/* Net Worth Card — Credit Card Style */}
          <div data-carousel-card="1" className="flex-shrink-0 ml-4" style={{ width: 'calc(50% - 8px)', scrollSnapAlign: 'start' }}>
            <div className={`relative rounded-xl overflow-hidden h-full md:min-h-[170px] shadow-lg hover:shadow-xl transition-all duration-300 select-none ${
              netWorth >= 0
                ? "bg-gradient-to-br from-zinc-900 via-slate-800 to-zinc-800 text-white"
                : "bg-gradient-to-br from-rose-950 via-red-900 to-rose-900 text-white"
            }`}>
              {/* Subtle grid pattern */}
              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px)`,
                backgroundSize: '32px 32px'
              }} />

              {/* tok.png watermark + geometric accents */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
                {/* Geometric halo */}
                <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full border border-white/[0.04]" />
                <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full border border-white/[0.025]" />

                <div className="absolute -top-8 -right-8 w-40 h-40 opacity-[0.18]">
                  <Image src="/embed/tok.png" alt="" fill className="object-contain" sizes="160px" priority={false} />
                </div>
                <div className="absolute -bottom-6 -left-6 w-24 h-24 opacity-[0.12] scale-x-[-1]">
                  <Image src="/embed/tok.png" alt="" fill className="object-contain" sizes="96px" priority={false} />
                </div>
                <RhododendronFlower strokeColor="white" className="absolute top-1/3 right-3 w-14 h-14 opacity-[0.08]" />
              </div>

              <div className="relative p-4 sm:p-5 flex flex-col justify-between h-full min-h-[170px]">
                {/* Top row: chip + NET WORTH label */}
                <div className="flex items-start justify-between">
                  <svg className="w-10 h-8 shrink-0" viewBox="0 0 50 36" fill="none">
                    <rect x="1" y="1" width="48" height="34" rx="5" fill="url(#chipGrad)" stroke="#c9a84c" strokeWidth="1.5" />
                    <rect x="6" y="6" width="38" height="24" rx="2" fill="none" stroke="#c9a84c" strokeWidth="0.6" opacity="0.5" />
                    <path d="M25 7 L25 29" stroke="#c9a84c" strokeWidth="0.8" opacity="0.5" />
                    <path d="M7 14 L43 14" stroke="#c9a84c" strokeWidth="0.8" opacity="0.5" />
                    <path d="M7 22 L43 22" stroke="#c9a84c" strokeWidth="0.8" opacity="0.5" />
                    <rect x="16" y="11" width="18" height="14" rx="1.5" fill="none" stroke="#c9a84c" strokeWidth="0.5" opacity="0.3" />
                    <defs>
                      <linearGradient id="chipGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#e8c84a" />
                        <stop offset="40%" stopColor="#f5e58a" />
                        <stop offset="60%" stopColor="#d4a830" />
                        <stop offset="100%" stopColor="#b8922a" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="text-right">
                    <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/50">Net Worth</p>
                    <button
                      onClick={() => setNetWorthDialogOpen(true)}
                      className={`text-lg sm:text-xl font-bold tracking-tight cursor-pointer hover:brightness-110 transition-all ${netWorth >= 0 ? "text-white" : "text-red-200"}`}
                    >
                      {netWorth < 0 && "-"}
                      {showBalance ? formatAbbreviated(Math.abs(netWorth)) : "••••••"}
                    </button>
                  </div>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Share valuation + daily change */}
                {showBalance && (hasShareHoldings || portfolioGain !== 0) && (
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {hasShareHoldings && (
                      <span className="flex items-center gap-1 text-[10px] text-white/50">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                        <span className="text-white/40 mr-0.5">Shares</span>
                        {formatAbbreviated(totalShareValuation)}
                        {dailyPortfolioChange !== 0 && (
                          <span className={`ml-1 ${dailyPortfolioChange >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                            {dailyPortfolioChange >= 0 ? "+" : ""}{formatAbbreviated(dailyPortfolioChange)} today
                          </span>
                        )}
                      </span>
                    )}
                    {!hasShareHoldings && portfolioGain !== 0 && (
                      <span className={`flex items-center gap-0.5 text-[10px] font-medium ${
                        portfolioGain >= 0 ? "text-emerald-300" : "text-red-300"
                      }`}>
                        {portfolioGain >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {portfolioGain >= 0 ? "+" : ""}{formatAbbreviated(portfolioGain)}
                      </span>
                    )}

                    {netWorth > 0 && timeEquivalentBreakdown && (
                      <span className="flex items-center gap-0.5 text-[10px] text-white/40">
                        <Clock className="w-2.5 h-2.5" />
                        {(() => {
                          const nw = userProfile ? getTimeEquivalentBreakdown(netWorth, userProfile) : null
                          return nw?.formatted?.userFriendly || timeEquivalentBreakdown.formatted.userFriendly
                        })()}
                      </span>
                    )}
                  </div>
                )}

                {/* Bottom row: cardholder + mywallet branding */}
                <div className="flex items-end justify-between border-t border-white/10 pt-2">
                  <div className="min-w-0 max-w-[60%]">
                    <p className="text-[9px] uppercase tracking-[0.1em] text-white/35 font-medium">Card Holder</p>
                    <p className="text-xs sm:text-sm font-medium text-white/80 truncate tracking-wide">
                      {showBalance ? (userProfile?.name || "Card Holder").toUpperCase() : "••••••"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">mywallet</span>
                    <svg className="w-4 h-4 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="1" y="4" width="22" height="16" rx="2" />
                      <path d="M1 10h22" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
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
        <Card className="group hover:shadow-md transition-all duration-200 border-green-200/50 dark:border-green-800/50 relative">
          <CardContent className="p-3 sm:p-5">
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

        <Card className="group hover:shadow-md transition-all duration-200 border-red-200/50 dark:border-red-800/50 relative">
          <CardContent className="p-3 sm:p-5">
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

      {/* Net Worth Breakdown Dialog */}
      <Dialog open={netWorthDialogOpen} onOpenChange={setNetWorthDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Net Worth Breakdown</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Cash Balance</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {showBalance ? formatCurrency(balance) : "••••••"}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Available Credit</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {showBalance ? formatCurrency(availableCredit) : "••••••"}
              </span>
            </div>
            {hasShareHoldings && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/50">
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Share Portfolio</span>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {showBalance ? formatCurrency(totalShareValuation) : "••••••"}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/50">
              <span className="text-sm font-medium text-red-700 dark:text-red-300">Total Debt</span>
              <span className="text-sm font-bold text-red-600 dark:text-red-400">
                {showBalance ? formatCurrency(totalDebt) : "••••••"}
              </span>
            </div>
            <div className="border-t pt-3 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">Net Worth</span>
                <span className={`text-base font-extrabold ${netWorth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {showBalance ? formatCurrency(netWorth) : "••••••"}
                </span>
              </div>
              {showBalance && netWorth > 0 && timeEquivalentBreakdown && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{timeEquivalentBreakdown.formatted.userFriendly} of work time</span>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
