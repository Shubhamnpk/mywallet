"use client"

import type { UserProfile } from "@/types/wallet"
import { DashboardHeader } from "./dashboard-header"
import { CombinedBalanceCard } from "./balance-card"
import { FloatingAddButton } from "./floating-add-button"
import { MainTabs } from "./main-tabs"
import { useWalletData } from "@/contexts/wallet-data-context"
import { useEffect } from "react"
import { Toaster } from "@/components/ui/sonner"
import { QuickActionsWidget } from "../ui/quick-actions-widget"

interface WalletDashboardProps {
  userProfile: UserProfile
}

export function WalletDashboard({ userProfile }: WalletDashboardProps) {
  const walletData = useWalletData()

  useEffect(() => {
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
          debtAccounts={walletData.debtAccounts}
          onExportData={walletData.exportData}
          calculateTimeEquivalent={walletData.calculateTimeEquivalent}
          onDeleteTransaction={walletData.deleteTransaction}
          onAddBudget={walletData.addBudget}
          onAddGoal={walletData.addGoal}
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
