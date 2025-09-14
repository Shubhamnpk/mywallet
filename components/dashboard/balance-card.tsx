"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Clock} from "lucide-react"
import { useWalletData } from "@/contexts/wallet-data-context"
import { TimeTooltip } from "@/components/ui/time-tooltip"
import BalanceCard from "@/components/dashboard/balance-card-component"
import { useMemo, useState, useRef, useEffect } from "react"
import { getTimeEquivalentBreakdown } from "@/lib/wallet-utils"
import { getCurrencySymbol } from "@/lib/currency"
import { useIsMobile } from "@/hooks/use-mobile"

export function CombinedBalanceCard() {
  const { balance, userProfile, transactions, debtAccounts, creditAccounts, emergencyFund, balanceChange } =
    useWalletData()

  const [showBalance, setShowBalance] = useState(true)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const isMobile = useIsMobile()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Scroll state management
  const scrollStateRef = useRef({
    scrollTimeout: null as NodeJS.Timeout | null,
    lastScrollLeft: 0,
    scrollVelocity: 0,
    lastScrollTime: Date.now()
  })

  // Optimize calculations with useMemo and better logic
  const { totalIncome, totalExpenses } = useMemo(() => {
    if (!transactions?.length) {
      return { totalIncome: 0, totalExpenses: 0 }
    }

    const result = transactions.reduce(
      (acc, transaction) => {
  // Use actual amount (what was actually paid from balance) instead of total
  const actualAmount = transaction.actual ?? transaction.amount

        // Ensure transaction has required properties and valid amount
        if (!transaction || typeof actualAmount !== "number" || actualAmount < 0) {
          return acc
        }

        if (transaction.type === "income") {
          acc.totalIncome += actualAmount
        } else if (transaction.type === "expense") {
          acc.totalExpenses += actualAmount
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
  const creditUtilization = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0

  // Memoize currency symbol and balance calculations
  const currencySymbol = useMemo(() => {
    return getCurrencySymbol(userProfile?.currency || "USD", (userProfile as any)?.customCurrency)
  }, [userProfile?.currency, (userProfile as any)?.customCurrency])

  const isPositive = balance >= 0
  const absoluteBalance = Math.abs(balance)

  // Memoize comprehensive time equivalent breakdown
  const timeEquivalentBreakdown = useMemo(() => {
    if (!userProfile || balance <= 0) return null
    return getTimeEquivalentBreakdown(balance, userProfile)
  }, [balance, userProfile])

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
  }

  const getThemeBasedBackground = () => {
    // Get user's theme preferences
    const savedColorTheme = (typeof window !== 'undefined' ? localStorage.getItem("wallet_color_theme") : null) || "emerald"
    const useGradient = (typeof window !== 'undefined' ? localStorage.getItem("wallet_use_gradient") : null) !== "false" // Default to true

    // Theme color mappings
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
    if (container && isMobile && netWorthEnabled) {
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

      // Scroll handler using shared state
      const scrollHandler = () => {
        const state = scrollStateRef.current

        // Clear existing timeout
        if (state.scrollTimeout) {
          clearTimeout(state.scrollTimeout)
        }

        if (!container) return

        const now = Date.now()
        const scrollLeft = container.scrollLeft
        const timeDelta = now - state.lastScrollTime

        // Calculate scroll velocity for momentum
        if (timeDelta > 0) {
          state.scrollVelocity = (scrollLeft - state.lastScrollLeft) / timeDelta
        }

        state.lastScrollLeft = scrollLeft
        state.lastScrollTime = now

        // Update indicator with smooth interpolation
        state.scrollTimeout = setTimeout(() => {
          if (!container) return

          const cardWidth = 336 // w-80 (320px) + gap-4 (16px)
          const currentScroll = container.scrollLeft

          // Calculate which card is most visible
          const progress = currentScroll / cardWidth
          const currentIndex = Math.round(progress)
          const clampedIndex = Math.min(Math.max(currentIndex, 0), 1)

          // Smooth transition for indicator
          if (Math.abs(currentCardIndex - clampedIndex) > 0.1) {
            setCurrentCardIndex(clampedIndex)
          }

          // Enhanced momentum-based snapping
          const shouldSnap = Math.abs(state.scrollVelocity) < 0.5 // Low velocity threshold
          if (shouldSnap) {
            const nearestCard = Math.round(currentScroll / cardWidth)
            const targetPosition = Math.min(Math.max(nearestCard, 0), 1) * cardWidth

            // Only snap if we're not already very close to the target
            if (Math.abs(currentScroll - targetPosition) > 10) {
              container.scrollTo({
                left: targetPosition,
                behavior: 'smooth'
              })
            }
          }
        }, 100) // Reduced frequency for better performance
      }

      container.addEventListener('scroll', scrollHandler, { passive: true })

      return () => {
        container.removeEventListener('touchstart', handleTouchStart)
        container.removeEventListener('touchmove', handleTouchMove)
        container.removeEventListener('touchend', handleTouchEnd)
        container.removeEventListener('scroll', scrollHandler)
      }
    }
  }, [isMobile, netWorthEnabled, currentCardIndex])

  const mainBalance = isMobile && netWorthEnabled ? (
    <div>
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto pb-2 hide-scrollbars"
        style={{
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch', // Better iOS scrolling
          scrollSnapType: 'x mandatory',
          scrollPadding: '0 16px'
        }}
      >
        <div className="flex gap-4 min-w-max pl-2 pr-4">
          <div className="w-88 flex-shrink-0" style={{ scrollSnapAlign: 'start' }}>
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
          <div className="w-88 flex-shrink-0" style={{ scrollSnapAlign: 'start' }}>
            <Card className={`border-2 transition-all duration-200 ${
              netWorth >= 0
                ? "border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20"
                : "border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20"
            }`}>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <PiggyBank className={`w-5 h-5 ${netWorth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} />
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Net Worth</p>
                </div>
                <p className={`text-3xl font-bold mb-2 text-center ${
                  netWorth >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}>
                  {netWorth < 0 && "-"}
                  {showBalance ? formatCurrency(Math.abs(netWorth)) : "••••••"}
                </p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Balance + Available Credit - Total Debt
                </p>

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
      <div className="flex justify-center gap-3 mt-3">
        {[0, 1].map((index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentCardIndex(index)
              if (scrollContainerRef.current) {
                const cardWidth = 336 // Updated to match the new calculation
                scrollContainerRef.current.scrollTo({
                  left: index * cardWidth,
                  behavior: 'smooth'
                })
              }
            }}
            className={`relative transition-all duration-300 ease-out ${
              currentCardIndex === index
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
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <Card className="group hover:shadow-md transition-all duration-200 border-green-200/50 dark:border-green-800/50">
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
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md transition-all duration-200 border-red-200/50 dark:border-red-800/50">
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
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net Worth Summary - Only show on desktop or when not in mobile row */}
      {(totalDebt > 0 || totalCreditUsed > 0) && !(isMobile && netWorthEnabled) && (
        <Card className={`border-2 transition-all duration-200 ${
          netWorth >= 0
            ? "border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20"
            : "border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20"
        }`}>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <PiggyBank className={`w-5 h-5 ${netWorth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} />
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Net Worth</p>
            </div>
            <p className={`text-3xl font-bold mb-2 text-center ${
              netWorth >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}>
              {netWorth < 0 && "-"}
              {showBalance ? formatCurrency(Math.abs(netWorth)) : "••••••"}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Balance + Available Credit - Total Debt
            </p>


          </CardContent>
        </Card>
      )}
    </div>
  )
}
