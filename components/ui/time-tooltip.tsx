"use client"

import type React from "react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Clock, HelpCircle, Calendar, Briefcase } from "lucide-react"
import { useWalletData } from "@/contexts/wallet-data-context"
import { formatCurrency } from "@/lib/utils"
import { getTimeEquivalentBreakdown, getTimeEquivalentTooltip } from "@/lib/wallet-utils"

interface TimeTooltipProps {
  amount: number
  children: React.ReactNode
}

export function TimeTooltip({ amount, children }: TimeTooltipProps) {
  const { userProfile } = useWalletData()

  if (!userProfile || !userProfile.monthlyEarning) {
    return <div>{children}</div>
  }

  const breakdown = getTimeEquivalentBreakdown(Math.abs(amount), userProfile)
  const tooltipText = getTimeEquivalentTooltip(Math.abs(amount), userProfile)

  if (!breakdown) {
    return <div>{children}</div>
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-help">
            {children}
            <HelpCircle className="w-3 h-3 text-white" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-medium">Time Equivalent</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{breakdown.formatted.short}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{breakdown.days.toFixed(1)} days</span>
              </div>
              <div className="flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                <span>{breakdown.weeks.toFixed(1)} weeks</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{breakdown.months.toFixed(1)} months</span>
              </div>
            </div>

            <div className="text-xs opacity-80 border-t pt-2">
              <div className="whitespace-pre-wrap font-mono text-xs">{tooltipText}</div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
