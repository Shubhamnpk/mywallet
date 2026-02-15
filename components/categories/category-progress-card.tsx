"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { TrendingUp, TrendingDown, Clock, Target, Calendar, BarChart3, Trash2, Edit, ChevronDown, Eye, EyeOff } from "lucide-react"
import { formatCurrency, getCurrencySymbol } from "@/lib/utils"
import type { Category, UserProfile } from "@/types/wallet"
import { cn } from "@/lib/utils"

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
  onEdit?: () => void
  onDelete?: () => void
  showActions?: boolean

  // New props for enhanced list management
  selectionMode?: boolean
  isSelected?: boolean
  onSelect?: () => void
  isDisabled?: boolean
  onToggleVisibility?: () => void
}

export function CategoryProgressCard({
  category,
  userProfile,
  onViewDetails,
  onEdit,
  onDelete,
  showActions = false,
  selectionMode = false,
  isSelected = false,
  onSelect,
  isDisabled = false,
  onToggleVisibility
}: CategoryProgressCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Calculate time equivalent
  const { getTimeEquivalentBreakdown } = require("@/lib/wallet-utils")
  const timeBreakdown = getTimeEquivalentBreakdown(category.totalSpent, userProfile)
  const timeEquivalent = timeBreakdown ? timeBreakdown.formatted.userFriendly : "0m"

  const categoryColor = category.color || "#3b82f6"

  const getProgressColor = () => {
    if (category.percentage > 100) return "bg-destructive"
    if (category.percentage > 85) return "bg-red-500"
    if (category.percentage > 50) return "bg-amber-500"
    return "bg-primary"
  }

  const getTrendIcon = () => {
    if (category.weeklyTrend > 0) return <TrendingUp className="w-3.5 h-3.5 text-red-500" />
    if (category.weeklyTrend < 0) return <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
    return <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(
        "group rounded-2xl border transition-all duration-300 overflow-hidden",
        isOpen ? "shadow-lg border-primary/20 bg-card/60 backdrop-blur-md" : "hover:bg-muted/10 hover:shadow-md border-muted/50 bg-card/40 backdrop-blur-sm",
        isSelected && "border-primary bg-primary/5 hover:bg-primary/10",
        isDisabled && "opacity-60 grayscale-[0.5]"
      )}
    >
      <div className="flex items-center p-3 sm:p-4 gap-3 sm:gap-4">
        {selectionMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect && onSelect()}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          />
        )}

        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between cursor-pointer gap-2 sm:gap-4 w-full select-none">
            <div className="flex gap-3 sm:gap-4 items-center min-w-0 flex-1">
              {/* Icon Container */}
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-sm border shrink-0 transition-transform group-hover:scale-105 relative overflow-hidden"
                style={{
                  backgroundColor: `${categoryColor}15`,
                  borderColor: `${categoryColor}30`,
                  color: categoryColor
                }}
              >
                {category.icon ? (
                  <span className="relative z-10">{category.icon}</span>
                ) : (
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: categoryColor }} />
                )}
              </div>

              <div className="flex flex-col min-w-0 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-sm sm:text-base tracking-tight truncate flex items-center gap-2">
                    {category.name}
                    {isDisabled && (
                      <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-bold uppercase tracking-widest border-muted-foreground/30 text-muted-foreground">Disabled</Badge>
                    )}
                  </h4>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] h-4 px-1.5 font-bold uppercase tracking-widest border-muted-foreground/20",
                      category.type === 'income'
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-red-500/10 text-red-600 border-red-500/20"
                    )}
                  >
                    {category.type}
                  </Badge>
                  {!isDisabled && category.isDefault && (
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-bold uppercase tracking-widest opacity-60">
                      Default
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground font-medium">
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3" /> {category.transactionCount} txns
                  </span>
                  {!isDisabled && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {getTrendIcon()}
                        <span className={cn(
                          category.weeklyTrend > 0 ? "text-red-500" : category.weeklyTrend < 0 ? "text-emerald-500" : ""
                        )}>
                          {Math.abs(category.weeklyTrend).toFixed(1)}%
                        </span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-6 shrink-0">
              <div className="text-right">
                <div className="font-black text-sm sm:text-lg tracking-tighter font-mono leading-tight">
                  {formatCurrency(category.totalSpent, userProfile.currency, userProfile.customCurrency)}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground font-bold flex items-center justify-end gap-1">
                  <Clock className="w-3 h-3" />
                  {timeEquivalent}
                </div>
              </div>

              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center bg-muted/50 transition-transform duration-300",
                isOpen && "rotate-180 bg-primary/10 text-primary"
              )}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="px-4 pb-4 pt-0 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <div className="pt-4 border-t border-dashed border-muted-foreground/20">
            {/* Progress Section */}
            <div className="space-y-2 mb-4">
              <div className="flex items-end justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Budget Usage</span>
                <span className={cn("font-black", category.percentage > 100 ? "text-destructive" : "")}>
                  {category.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="relative h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                <div
                  className={cn("absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out", getProgressColor())}
                  style={{ width: `${Math.min(category.percentage, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-muted/30">
                <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Monthly Avg
                </div>
                <div className="font-black text-sm sm:text-base font-mono">
                  {formatCurrency(category.monthlyAverage, userProfile.currency, userProfile.customCurrency)}
                </div>
              </div>

              <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-muted/30">
                <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Last Txn
                </div>
                <div className="font-black text-sm sm:text-base">
                  {category.lastTransactionDate
                    ? new Date(category.lastTransactionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : "Never"
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            {showActions ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit && onEdit();
                  }}
                  className="flex-1 h-9 font-bold hover:bg-background hover:text-primary hover:border-primary/50 transition-all"
                >
                  <Edit className="w-3.5 h-3.5 mr-2" />
                  Edit
                </Button>

                {onToggleVisibility && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility();
                    }}
                    className={cn(
                      "flex-1 h-9 font-bold transition-all",
                      isDisabled ? "bg-muted text-muted-foreground" : "hover:bg-background hover:text-primary hover:border-primary/50"
                    )}
                  >
                    {isDisabled ? (
                      <>
                        <Eye className="w-3.5 h-3.5 mr-2" /> Enable
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 mr-2" /> Disable
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete && onDelete();
                  }}
                  className="flex-1 h-9 font-bold text-destructive/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all border-destructive/20"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={onViewDetails}
                className="w-full h-9 font-bold bg-muted/50 hover:bg-primary hover:text-primary-foreground transition-all"
              >
                View Full Analysis
              </Button>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
