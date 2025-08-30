"use client"

import type React from "react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Clock, HelpCircle } from "lucide-react"
import { useWalletData } from "@/hooks/use-wallet-data"

interface TimeTooltipProps {
  amount: number
  children: React.ReactNode
}

export function TimeTooltip({ amount, children }: TimeTooltipProps) {
  const { userProfile } = useWalletData()

  if (!userProfile || !userProfile.monthlyEarning) {
    return <div>{children}</div>
  }

  const hourlyRate = userProfile.monthlyEarning / (userProfile.workingHoursPerDay * userProfile.workingDaysPerMonth)
  const minuteRate = hourlyRate / 60
  const timeInMinutes = Math.abs(amount) / minuteRate

  const hours = Math.floor(timeInMinutes / 60)
  const minutes = Math.round(timeInMinutes % 60)

  const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

  const calculationDetails = `
    Calculation:
    • Monthly Earning: ${userProfile.currency} ${userProfile.monthlyEarning.toLocaleString()}
    • Working Hours/Day: ${userProfile.workingHoursPerDay}
    • Working Days/Month: ${userProfile.workingDaysPerMonth}
    • Hourly Rate: ${userProfile.currency} ${hourlyRate.toFixed(2)}
    • Per Minute: ${userProfile.currency} ${minuteRate.toFixed(2)}
    • Time for ${userProfile.currency} ${Math.abs(amount)}: ${timeText}
  `

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-help">
            {children}
            <HelpCircle className="w-3 h-3 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="font-medium">Time Equivalent: {timeText}</span>
            </div>
            <div className="text-xs opacity-90">
              <pre className="whitespace-pre-wrap font-mono text-xs">{calculationDetails.trim()}</pre>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
