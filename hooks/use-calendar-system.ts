"use client"
import { useWalletData } from "@/contexts/wallet-data-context"
import { getCalendarSystem, type CalendarSystem } from "@/lib/app-calendar"

export function useCalendarSystem(): CalendarSystem {
  const { userProfile } = useWalletData()
  return getCalendarSystem(userProfile?.calendarSystem)
}
