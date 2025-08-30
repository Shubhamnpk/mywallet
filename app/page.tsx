"use client"

import { useState, useEffect } from "react"
import OnboardingFlow from "@/components/onboarding/onboarding-flow"
import { WalletDashboard } from "@/components/dashboard/wallet-dashboard"
import { PinLockScreen } from "@/components/security/pin-lock-screen"
import { useWalletData } from "@/contexts/wallet-data-context"
import { SecurePinManager } from "@/lib/secure-pin-manager"

export default function MyWallet() {
  const { userProfile, isFirstTime, showOnboarding, setShowOnboarding, handleOnboardingComplete } = useWalletData()
  const [isUnlocked, setIsUnlocked] = useState(false)

  useEffect(() => {
    console.log("[DEBUG] PIN Lock Check - userProfile:", {
      pin: userProfile?.pin,
      securityEnabled: userProfile?.securityEnabled,
      exists: !!userProfile
    })

    const authStatus = SecurePinManager.getAuthStatus()
    const hasPinCredentials = SecurePinManager.hasPinCredentials()

    if (hasPinCredentials) {
      // Check if user was recently authenticated (within 5 minutes)
      const lastAuth = localStorage.getItem("wallet_last_auth")
      const now = Date.now()
      const fiveMinutes = 5 * 60 * 1000

      console.log("[DEBUG] Last Auth Check:", {
        lastAuth,
        now,
        timeDiff: lastAuth ? now - Number.parseInt(lastAuth) : 'no lastAuth',
        fiveMinutes,
        shouldLock: !lastAuth || now - Number.parseInt(lastAuth) > fiveMinutes
      })
      // If account is locked, always show lock screen
      if (authStatus.isLocked) {
        setIsUnlocked(false)
        console.log("[DEBUG] Account is locked - setting isUnlocked to false")
      } else if (!lastAuth || now - Number.parseInt(lastAuth) > fiveMinutes) {
        setIsUnlocked(false)
        console.log("[DEBUG] No recent auth or expired - setting isUnlocked to false")
      } else {
        setIsUnlocked(true)
        console.log("[DEBUG] Recent auth found - setting isUnlocked to true")
      }
    } else {
      setIsUnlocked(true)
      console.log("[DEBUG] No PIN credentials - setting isUnlocked to true")
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

  const hasPinCredentials = SecurePinManager.hasPinCredentials()
  const authStatus = SecurePinManager.getAuthStatus()

  console.log("[DEBUG] Render Decision:", {
    hasPinCredentials,
    isLocked: authStatus.isLocked,
    isUnlocked,
    shouldShowLockScreen: hasPinCredentials && (!isUnlocked || authStatus.isLocked)
  })

  if (hasPinCredentials && (!isUnlocked || authStatus.isLocked)) {
    console.log("[DEBUG] Rendering PinLockScreen")
    return <PinLockScreen onUnlock={handleUnlock} />
  }

  console.log("[DEBUG] Rendering WalletDashboard")
  return <WalletDashboard userProfile={userProfile} />
}
