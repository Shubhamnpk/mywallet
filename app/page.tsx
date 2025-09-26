"use client"

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { WalletDashboard } from "@/components/dashboard/wallet-dashboard"
import { useWalletData } from "@/contexts/wallet-data-context"
import { useConvexAuth } from "@/hooks/use-convex-auth"

export default function MyWallet() {
  const router = useRouter()
  const pathname = usePathname()
  const { userProfile, showOnboarding, isLoaded } = useWalletData()
  const { isAuthenticated, lastAuthMode } = useConvexAuth()

  // Simplified redirect logic for onboarding and authentication
  useEffect(() => {
    if (!isLoaded) return

    const isOnDashboard = pathname === '/'
    const isOnOnboarding = pathname === '/onboarding'

    // For authenticated users, check localStorage for onboarding completion
    if (isAuthenticated) {
      const storedUserProfile = localStorage.getItem('userProfile')
      const storedIsFirstTime = localStorage.getItem('isFirstTime')
      const hasCompletedOnboarding = storedUserProfile && storedIsFirstTime === 'false'

    }

    // Redirect to onboarding for new users
    if (showOnboarding && !userProfile && isOnDashboard) {
      router.push('/onboarding')
    }
  }, [isLoaded, isAuthenticated, showOnboarding, userProfile, router, pathname])

  // Show loading while redirecting or loading user profile
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If onboarding should be shown and user is not authenticated, show loading while redirecting
  if (showOnboarding && !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If user is authenticated but no local profile, show loading (will be handled by sync)
  if (isAuthenticated && !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading your wallet...</p>
        </div>
      </div>
    )
  }

  return <WalletDashboard userProfile={userProfile!} />
}
