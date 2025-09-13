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
  const { isAuthenticated } = useConvexAuth()

  console.log('[MyWallet] Page state:', {
    isLoaded,
    showOnboarding,
    hasUserProfile: !!userProfile,
    isAuthenticated,
    pathname
  })

  // Redirect logic for onboarding and authentication
  useEffect(() => {
    if (!isLoaded) return

    console.log('[MyWallet] Redirect logic - Convex authenticated:', isAuthenticated, 'showOnboarding:', showOnboarding, 'hasUserProfile:', !!userProfile, 'pathname:', pathname)

    // If user is authenticated with Convex, always go to dashboard (skip onboarding)
    if (isAuthenticated) {
      if (pathname === '/onboarding') {
        console.log('[MyWallet] Convex authenticated user on onboarding page, redirecting to dashboard')
        router.push('/')
      }
      return
    }

    // User is not authenticated with Convex
    // If they have local wallet data, show dashboard
    if (userProfile && !showOnboarding) {
      if (pathname !== '/') {
        console.log('[MyWallet] User has wallet data, redirecting to dashboard')
        router.push('/')
      }
      return
    }

    // User is not authenticated and has no local data, show onboarding
    if (showOnboarding && pathname !== '/onboarding') {
      console.log('[MyWallet] No authentication or data, redirecting to onboarding')
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

  // If onboarding should be shown and user is not authenticated, redirect to onboarding
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
