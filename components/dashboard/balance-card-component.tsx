"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TimeTooltip } from "@/components/ui/time-tooltip"
import {
  Wallet,
  Clock,
  Sparkles,
  AlertTriangle,
  Eye,
  EyeOff
} from "lucide-react"

export interface BalanceChange {
  type: "income" | "expense"
  amount: number
}

export interface TimeEquivalentBreakdown {
  formatted: {
    userFriendly: string
  }
}

export interface BalanceCardProps {
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

export default function BalanceCard({
  balanceChange,
  balance,
  showBalance,
  setShowBalance,
  absoluteBalance,
  isPositive,
  timeEquivalentBreakdown,
  emergencyFund,
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
  const emergencyMargin = isMobile ? "mt-1" : "mt-2"

  return (
    <Card className="relative overflow-hidden border-0 shadow-lg">
      <div className={`absolute inset-0 ${getThemeBasedBackground()} opacity-90`} />
      <div className="absolute inset-0 bg-black/10" />

      <CardContent className={`relative ${compactClass} text-white`}>
        {/* Balance Change Animation */}
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

        {/* Header */}
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

          {/* Privacy Toggle */}
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-200"
            aria-label={showBalance ? "Hide balance" : "Show balance"}
          >
            {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>

        {/* Balance Display */}
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

        {/* Time Equivalent */}
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
