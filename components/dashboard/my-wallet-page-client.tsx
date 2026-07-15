"use client"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { CombinedBalanceCard } from "@/components/dashboard/balance-card"
import { FloatingAddButton } from "@/components/dashboard/floating-add-button"
import { MainTabs } from "@/components/dashboard/main-tabs"
import { BiometricCrossDevicePrompt } from "@/components/security/biometric-cross-device-prompt"
import { useWalletData } from "@/contexts/wallet-data-context"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FullPageSpinner } from "@/components/ui/full-page-spinner"
export function MyWalletPageClient() {
  const router = useRouter()
  const walletData = useWalletData()
  const { userProfile, showOnboarding, updateUserProfile } = walletData
  const [mobileFullscreenTab, setMobileFullscreenTab] = useState<string | null>(null)
  useEffect(() => {
    if (!userProfile && showOnboarding) {
      router.replace("/welcome")
    }
  }, [userProfile, showOnboarding, router])

  if (!userProfile) {
    return <FullPageSpinner />
  }

  const isFullscreen = !!mobileFullscreenTab

  return (
    <div className="min-h-screen bg-background">
      {!isFullscreen && <DashboardHeader />}

      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${isFullscreen ? "" : "py-6 space-y-6"}`}>
        {!isFullscreen && <CombinedBalanceCard />}
        {!isFullscreen && <FloatingAddButton />}
        <MainTabs
          mobileFullscreenTab={mobileFullscreenTab}
          onMobileFullscreenChange={setMobileFullscreenTab}
        />
      </div>

      {/* Biometric Cross-Device Prompt */}
      <BiometricCrossDevicePrompt
        userProfile={userProfile}
        onUpdateProfile={(updates) => {
          if (userProfile) {
            void updateUserProfile({ ...userProfile, ...updates })
          }
        }}
        onEnableBiometric={() => {
          // Navigate to security settings for biometric enrollment
          router.push("/settings?tab=security&biometric=true")
        }}
      />
    </div>
  )
}
