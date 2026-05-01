"use client"

import { useMemo } from "react"
import { useWalletData } from "@/contexts/wallet-data-context"

export function useSecurityData() {
  const wallet = useWalletData()

  return useMemo(
    () => ({
      userProfile: wallet.userProfile,
      isAuthenticated: wallet.isAuthenticated,
      isLoaded: wallet.isLoaded,
      updateUserProfile: wallet.updateUserProfile,
    }),
    [wallet.userProfile, wallet.isAuthenticated, wallet.isLoaded, wallet.updateUserProfile],
  )
}
