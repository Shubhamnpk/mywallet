"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserProfileSettings } from "./user-settings"
import { SecuritySettings } from "./security-settings"
import { ThemeSettings } from "./theme-settings"
import { DataSettings } from "./data-settings"
import { AccessibilitySettings } from "./accessibility-settings"
import { User, Shield, Palette, Database, Accessibility } from "lucide-react"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState("profile")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-5">
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
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
