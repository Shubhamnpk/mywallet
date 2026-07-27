"use client"

import { useMemo } from "react"
import { useWalletData } from "@/contexts/wallet-data-context"

export function useNepseData() {
  const wallet = useWalletData()

  return useMemo(
    () => ({
      upcomingIPOs: wallet.upcomingIPOs,
      isIPOsLoading: wallet.isIPOsLoading,
      topStocks: wallet.topStocks,
      marketStatus: wallet.marketStatus,
      marketSummary: wallet.marketSummary,
      marketSummaryHistory: wallet.marketSummaryHistory,
      marketIndices: wallet.marketIndices,
      marketIndexGraph: wallet.marketIndexGraph,
      noticesBundle: wallet.noticesBundle,
      disclosures: wallet.disclosures,
      exchangeMessages: wallet.exchangeMessages,
      scripNamesMap: wallet.scripNamesMap,
      sectorsMap: wallet.sectorsMap,
      refreshMarketData: wallet.refreshMarketData,
      applyMeroShareIPO: wallet.applyMeroShareIPO,
      checkIPOAllotment: wallet.checkIPOAllotment,
    }),
    [
      wallet.upcomingIPOs,
      wallet.isIPOsLoading,
      wallet.topStocks,
      wallet.marketStatus,
      wallet.marketSummary,
      wallet.marketSummaryHistory,
      wallet.marketIndices,
      wallet.marketIndexGraph,
      wallet.noticesBundle,
      wallet.disclosures,
      wallet.exchangeMessages,
      wallet.scripNamesMap,
      wallet.sectorsMap,
      wallet.refreshMarketData,
      wallet.applyMeroShareIPO,
      wallet.checkIPOAllotment,
    ],
  )
}
