"use client"

import OnboardingFlow from "@/components/onboarding/onboarding-flow"
import { WalletDashboard } from "@/components/dashboard/wallet-dashboard"
import { useWalletData } from "@/contexts/wallet-data-context"

export default function MyWallet() {
  const { userProfile, isFirstTime, showOnboarding, setShowOnboarding, handleOnboardingComplete } = useWalletData()



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



  return <WalletDashboard userProfile={userProfile} />
}
