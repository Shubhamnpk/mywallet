"use client"
import { useMemo } from "react"
import { useWalletData } from "@/contexts/wallet-data-context"
import { getCurrencySymbol } from "@/lib/currency"

export function useCurrencySymbol(): string {
  const { userProfile } = useWalletData()
  return useMemo(
    () => getCurrencySymbol(userProfile?.currency || "USD", (userProfile as any)?.customCurrency),
    [userProfile?.currency, (userProfile as any)?.customCurrency],
  )
}
