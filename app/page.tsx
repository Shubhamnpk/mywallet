"use client"

import OnboardingFlow from "@/components/onboarding/onboarding-flow"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { CombinedBalanceCard } from "@/components/dashboard/balance-card"
import { FloatingAddButton } from "@/components/dashboard/floating-add-button"
import { MainTabs } from "@/components/dashboard/main-tabs"
import { useWalletData } from "@/contexts/wallet-data-context"

export default function MyWallet() {
  const walletData = useWalletData()
  const { userProfile, showOnboarding, handleOnboardingComplete } = walletData

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }



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
    </div>
  )
}
