"use client"

import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserProfileSettings } from "@/components/settings/user-settings"
import { SecuritySettings } from "@/components/settings/security-settings"
import { ThemeSettings } from "@/components/settings/theme-settings"
import { DataSettings } from "@/components/settings/data-settings"
import { AccessibilitySettings } from "@/components/settings/accessibility-settings"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="accessibility">A11y</TabsTrigger>
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
        </Tabs>
      </div>
    </div>
  )
}
