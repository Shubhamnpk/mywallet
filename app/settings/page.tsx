"use client"

export const dynamic = 'force-dynamic'

import dynamicImport from 'next/dynamic'
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"
import { useWalletData } from "@/contexts/wallet-data-context"
import { useEffect, useState } from "react"
import { SessionManager } from "@/lib/session-manager"
import { useIsMobile } from "@/hooks/use-mobile"

// Dynamically import components to avoid SSR issues
const UserProfileSettings = dynamicImport(() => import("@/components/settings/user-settings").then(mod => mod.UserProfileSettings), { ssr: false })
const SecuritySettings = dynamicImport(() => import("@/components/settings/security-settings").then(mod => mod.SecuritySettings), { ssr: false })
const ThemeSettings = dynamicImport(() => import("@/components/settings/theme-settings").then(mod => mod.ThemeSettings), { ssr: false })
const DataSettings = dynamicImport(() => import("@/components/settings/data-settings").then(mod => mod.DataSettings), { ssr: false })
const AccessibilitySettings = dynamicImport(() => import("@/components/settings/accessibility-settings").then(mod => mod.AccessibilitySettings), { ssr: false })
const AboutSettings = dynamicImport(() => import("@/components/settings/about-settings").then(mod => mod.AboutSettings), { ssr: false })
const MobileSettingsPage = dynamicImport(() => import("@/components/settings/mobile-settings-page").then(mod => mod.MobileSettingsPage), { ssr: false })

export default function SettingsPage() {
  const router = useRouter()
  const { userProfile, showOnboarding } = useWalletData()
  const isMobile = useIsMobile()
  const [showMobileSettings, setShowMobileSettings] = useState(false)

  // Redirect to home if no user profile or onboarding is needed
  useEffect(() => {
    if (!userProfile || showOnboarding) {
      router.push('/')
      return
    }

    // Validate session on page load
    if (!SessionManager.isSessionValid()) {
      console.log('[SettingsPage] Session invalid on page load, dispatching expiry event')
      const event = new CustomEvent('wallet-session-expired')
      window.dispatchEvent(event)
    }
  }, [userProfile, showOnboarding, router])

  // Show mobile settings on mobile devices
  useEffect(() => {
    if (isMobile && userProfile && !showOnboarding) {
      setShowMobileSettings(true)
    }
  }, [isMobile, userProfile, showOnboarding])

  // Show loading while redirecting
  if (!userProfile || showOnboarding) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show mobile settings page
  if (showMobileSettings) {
    return <MobileSettingsPage onClose={() => router.push('/')} />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your account, security, and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="accessibility">A11y</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <UserProfileSettings />
          </TabsContent>

          <TabsContent value="security">
            <SecuritySettings />
          </TabsContent>

          <TabsContent value="theme">
            <ThemeSettings />
          </TabsContent>

          <TabsContent value="data">
            <DataSettings />
          </TabsContent>

          <TabsContent value="accessibility">
            <AccessibilitySettings />
          </TabsContent>

          <TabsContent value="about">
            <AboutSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
