"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UserProfileSettings } from "./user-settings"
import { SecuritySettings } from "./security-settings"
import { ThemeSettings } from "./theme-settings"
import { DataSettings } from "./data-settings/data-settings"
import { AccessibilitySettings } from "./accessibility-settings"
import { AboutSettings } from "./about-settings"
import { User, Shield, Palette, Database, Accessibility, Info, ArrowLeft } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState("profile")
  const isMobile = useIsMobile()
  const [currentView, setCurrentView] = useState<"main" | string>("main")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-hidden ${isMobile ? 'w-full h-full max-w-none max-h-none' : ''}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentView !== "main" && isMobile && (
              <Button variant="ghost" size="sm" onClick={() => setCurrentView("main")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <User className="w-4 h-4 text-accent-foreground" />
            </div>
            Settings
          </DialogTitle>
        </DialogHeader>

        {isMobile && currentView === "main" && (
          <div className="mb-4">
            <Input placeholder="Search settings..." />
          </div>
        )}

        {currentView === "main" ? (
          <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); if (isMobile) setCurrentView(value); }} className="flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger value="theme" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">Theme</span>
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                <span className="hidden sm:inline">Data</span>
              </TabsTrigger>
              <TabsTrigger value="accessibility" className="flex items-center gap-2">
                <Accessibility className="w-4 h-4" />
                <span className="hidden sm:inline">A11y</span>
              </TabsTrigger>
              <TabsTrigger value="about" className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span className="hidden sm:inline">About</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-6 overflow-y-auto max-h-[60vh]">
              <TabsContent value="profile" className="space-y-6">
                <UserProfileSettings />
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <SecuritySettings onLock={() => onOpenChange(false)} />
              </TabsContent>

              <TabsContent value="theme" className="space-y-6">
                <ThemeSettings />
              </TabsContent>

              <TabsContent value="data" className="space-y-6">
                <DataSettings />
              </TabsContent>

              <TabsContent value="accessibility" className="space-y-6">
                <AccessibilitySettings />
              </TabsContent>

              <TabsContent value="about" className="space-y-6">
                <AboutSettings />
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {currentView === "profile" && <UserProfileSettings />}
            {currentView === "security" && <SecuritySettings onLock={() => onOpenChange(false)} />}
            {currentView === "theme" && <ThemeSettings />}
            {currentView === "data" && <DataSettings />}
            {currentView === "accessibility" && <AccessibilitySettings />}
            {currentView === "about" && <AboutSettings />}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
