"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Clock, Target, Calendar, BarChart3 } from "lucide-react"
import { formatCurrency, getCurrencySymbol } from "@/lib/utils"
import type { Category, UserProfile } from "@/types/wallet"

interface CategoryProgressCardProps {
  category: Category & {
    totalSpent: number
    transactionCount: number
    percentage: number
    monthlyAverage: number
    weeklyTrend: number
    lastTransactionDate?: string
  }
  userProfile: UserProfile
  onViewDetails?: () => void
}

export function CategoryProgressCard({ category, userProfile, onViewDetails }: CategoryProgressCardProps) {
  const currencySymbol = getCurrencySymbol(userProfile?.currency, (userProfile as any)?.customCurrency)

  // Calculate time equivalent (guard against division by zero)
  const hourlyRate =
    userProfile.workingDaysPerMonth && userProfile.workingHoursPerDay
      ? userProfile.monthlyEarning / (userProfile.workingDaysPerMonth * userProfile.workingHoursPerDay)
      : 0
  const timeEquivalent = hourlyRate > 0 ? category.totalSpent / hourlyRate : 0

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const getProgressColor = () => {
    if (category.percentage > 30) return "bg-red-500"
    if (category.percentage > 20) return "bg-amber-500"
    return "bg-accent"
  }

  const getTrendIcon = () => {
    if (category.weeklyTrend > 0) return <TrendingUp className="w-3 h-3 text-red-500" />
    if (category.weeklyTrend < 0) return <TrendingDown className="w-3 h-3 text-accent" />
    return <BarChart3 className="w-3 h-3 text-muted-foreground" />
  }

  const getTrendText = () => {
    if (category.weeklyTrend > 0) return `+${category.weeklyTrend.toFixed(1)}% this week`
    if (category.weeklyTrend < 0) return `${category.weeklyTrend.toFixed(1)}% this week`
    return "No change this week"
  }

  return (
    <Card className="hover:shadow-md transition-all duration-200 group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: category.color || "#3b82f6" }}
            />
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{category.name}</CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {category.type === "income" ? (
                  <TrendingUp className="w-3 h-3 text-accent" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-600" />
                )}
                <span className="capitalize">{category.type}</span>
                {category.isDefault && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    Default
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-lg font-bold">{formatCurrency(category.totalSpent, userProfile.currency, userProfile.customCurrency)}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(timeEquivalent)}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Usage of total spending</span>
            <span className="font-medium">{category.percentage.toFixed(1)}%</span>
          </div>
          <div className="relative">
            <Progress value={Math.min(category.percentage, 100)} className="h-2" />
            <div
              className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${Math.min(category.percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Target className="w-3 h-3" />
              <span>Transactions</span>
            </div>
            <div className="font-medium">{category.transactionCount}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>Monthly Avg</span>
            </div>
            <div className="font-medium">{formatCurrency(category.monthlyAverage, userProfile.currency, userProfile.customCurrency)}</div>
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            {getTrendIcon()}
            <span className="text-muted-foreground">Weekly trend</span>
          </div>
          <span
            className={`text-sm font-medium ${
              category.weeklyTrend > 0
                ? "text-red-600"
                : category.weeklyTrend < 0
                  ? "text-accent"
                  : "text-muted-foreground"
            }`}
          >
            {getTrendText()}
          </span>
        </div>

        {/* Last Transaction */}
        {category.lastTransactionDate && (
          <div className="text-xs text-muted-foreground">
            Last transaction: {new Date(category.lastTransactionDate).toLocaleDateString()}
          </div>
        )}

        {/* Action Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onViewDetails}
          className="w-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-transparent"
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  )
}
