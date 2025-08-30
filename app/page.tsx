"use client"

import { useState, useEffect } from "react"
import OnboardingFlow from "@/components/onboarding/onboarding-flow"
import { WalletDashboard } from "@/components/dashboard/wallet-dashboard"
import { PinLockScreen } from "@/components/security/pin-lock-screen"
import { useWalletData } from "@/hooks/use-wallet-data"

export default function MyWallet() {
  const { userProfile, isFirstTime, showOnboarding, setShowOnboarding, handleOnboardingComplete } = useWalletData()
  const [isUnlocked, setIsUnlocked] = useState(false)

  useEffect(() => {
    if (userProfile?.pin && userProfile.securityEnabled) {
      // Check if user was recently authenticated (within 5 minutes)
      const lastAuth = localStorage.getItem("wallet_last_auth")
      const now = Date.now()
      const fiveMinutes = 5 * 60 * 1000

      if (!lastAuth || now - Number.parseInt(lastAuth) > fiveMinutes) {
        setIsUnlocked(false)
      } else {
        setIsUnlocked(true)
      }
    } else {
      setIsUnlocked(true)
    }
  }, [userProfile])

  const handleUnlock = () => {
    setIsUnlocked(true)
    // Store authentication timestamp
    localStorage.setItem("wallet_last_auth", Date.now().toString())
  }

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

  if (userProfile.pin && userProfile.securityEnabled && !isUnlocked) {
    return <PinLockScreen hashedPin={userProfile.pin} onUnlock={handleUnlock} />
  }

  return <WalletDashboard userProfile={userProfile} />
}
