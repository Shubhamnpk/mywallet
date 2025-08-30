"use client"

import type { UserProfile } from "@/types/wallet"
import { DashboardHeader } from "./dashboard-header"
import { CombinedBalanceCard } from "./balance-card"
import { FloatingAddButton } from "./floating-add-button"
import { MainTabs } from "./main-tabs"
import { useWalletData } from "@/contexts/wallet-data-context"
import { useEffect } from "react"
import { Toaster } from "@/components/ui/sonner"

interface WalletDashboardProps {
  userProfile: UserProfile
}

export function WalletDashboard({ userProfile }: WalletDashboardProps) {
  const walletData = useWalletData()

  console.log(
    "[v0] WalletDashboard render - balance:",
    walletData.balance,
    "transactions:",
    walletData.transactions?.length,
  )

  useEffect(() => {
    console.log("[v0] WalletDashboard - transactions changed, count:", walletData.transactions?.length)
  }, [walletData.transactions])

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userProfile={userProfile} />

      <div className="container mx-auto px-4 py-6 space-y-6">
        <CombinedBalanceCard />

        <FloatingAddButton />

        <MainTabs
          transactions={walletData.transactions}
          budgets={walletData.budgets}
          goals={walletData.goals}
          categories={walletData.categories}
          userProfile={userProfile}
          balance={walletData.balance}
          onExportData={walletData.exportData}
          calculateTimeEquivalent={walletData.calculateTimeEquivalent}
          onDeleteTransaction={walletData.deleteTransaction}
          onAddBudget={walletData.addBudget}
          onDeleteBudget={walletData.deleteBudget}
          onUpdateBudget={walletData.updateBudget}
          onAddCategory={walletData.addCategory}
          onUpdateCategory={walletData.updateCategory}
          onDeleteCategory={walletData.deleteCategory}
          onUpdateCategoryStats={walletData.updateCategoryStats}
        />
      </div>
      <Toaster />
    </div>
  )
}
