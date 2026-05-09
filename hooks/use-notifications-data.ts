"use client"

import { useMemo } from "react"
import { useWalletData } from "@/contexts/wallet-data-context"

export function useNotificationsData() {
  const wallet = useWalletData()

  return useMemo(
    () => ({
      userProfile: wallet.userProfile,
      updateUserProfile: wallet.updateUserProfile,
      upcomingIPOs: wallet.upcomingIPOs,
      budgets: wallet.budgets,
      goals: wallet.goals,
    }),
    [wallet.userProfile, wallet.updateUserProfile, wallet.upcomingIPOs, wallet.budgets, wallet.goals],
  )
}
