"use client"

import { useMemo } from "react"
import { Bell, BellRing, RefreshCw, Send, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useWalletData } from "@/contexts/wallet-data-context"
import {
  getDefaultNotificationSettings,
  isBrowserNotificationSupported,
  normalizeNotificationSettings,
  requestBrowserNotificationPermission,
  REMINDER_CACHE_KEY,
  showAppNotification,
} from "@/lib/notifications"
import { toast } from "@/hooks/use-toast"
import type { NotificationSettings } from "@/types/wallet"

export function NotificationSettings() {
  const { userProfile, updateUserProfile } = useWalletData()

  const settings = useMemo(
    () => normalizeNotificationSettings(userProfile?.notificationSettings),
    [userProfile?.notificationSettings],
  )

  const permission =
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied"
  const browserSupported = isBrowserNotificationSupported()

  const updateSettings = (updates: Partial<NotificationSettings>) => {
    if (!userProfile) return

    updateUserProfile({
      notificationSettings: {
        ...settings,
        ...updates,
      },
    })
  }

  const handleRequestPermission = async () => {
    const result = await requestBrowserNotificationPermission()
    if (result === "granted") {
      toast({
        title: "Notifications Enabled",
        description: "Browser notifications are now enabled for MyWallet.",
      })
      updateSettings({ browserNotifications: true })
      return
    }

    toast({
      title: "Permission Not Granted",
      description: "Please allow notifications from browser site settings.",
      variant: "destructive",
    })
  }

  const handleTestNotification = async () => {
    const shown = await showAppNotification({
      title: "MyWallet reminder test",
      body: "Notifications are active and ready.",
      tag: "mywallet-test-notification",
      url: "/settings?tab=notifications",
    })

    if (!shown) {
      toast({
        title: "Test Failed",
        description: "Notification permission is not granted yet.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Test Sent",
      description: "Check your system tray or browser notifications.",
    })
  }

  const resetReminderCooldowns = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(REMINDER_CACHE_KEY)
    }
    toast({
      title: "Reminder Cooldowns Reset",
      description: "MyWallet can send reminders again immediately.",
    })
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading notification settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Control
          </CardTitle>
          <CardDescription>Manage reminder channels and categories from one place.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="notif-enabled">Enable All Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Master switch for budget, goal, and IPO reminders.
              </p>
            </div>
            <Switch
              id="notif-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSettings({ enabled: checked })}
            />
          </div>

          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">
              Browser permission:{" "}
              <span className="capitalize">{browserSupported ? permission : "unsupported"}</span>
            </p>
            {!browserSupported && (
              <p className="text-muted-foreground mt-1">
                This browser does not support notifications.
              </p>
            )}
            {browserSupported && permission !== "granted" && (
              <p className="text-muted-foreground mt-1">
                Enable permission to receive push-style alerts when app is in background.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleRequestPermission}
              disabled={!browserSupported || permission === "granted"}
            >
              <BellRing className="w-4 h-4 mr-2" />
              Enable Browser Notifications
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleTestNotification}
              disabled={!browserSupported || permission !== "granted"}
            >
              <Send className="w-4 h-4 mr-2" />
              Send Test Notification
            </Button>
            <Button type="button" variant="outline" onClick={resetReminderCooldowns}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Reminder Cooldowns
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            Delivery Options
          </CardTitle>
          <CardDescription>Choose where alerts should appear.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingToggle
            id="notif-toast"
            label="In-app toasts"
            description="Show reminder popups while using the app."
            checked={settings.inAppToasts}
            onCheckedChange={(checked) => updateSettings({ inAppToasts: checked })}
            disabled={!settings.enabled}
          />
          <SettingToggle
            id="notif-browser"
            label="Browser notifications"
            description="Send system notifications through service worker."
            checked={settings.browserNotifications}
            onCheckedChange={(checked) => updateSettings({ browserNotifications: checked })}
            disabled={!settings.enabled}
          />
          <SettingToggle
            id="notif-nudges"
            label="Permission nudges"
            description="Ask weekly to enable browser notifications if still pending."
            checked={settings.permissionNudges}
            onCheckedChange={(checked) => updateSettings({ permissionNudges: checked })}
            disabled={!settings.enabled || !settings.browserNotifications}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reminder Categories</CardTitle>
          <CardDescription>Enable only the reminders you want.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingToggle
            id="notif-budget"
            label="Budget reminders"
            description="Usage alerts at 80%, 90%, and over-budget thresholds."
            checked={settings.budgetReminders}
            onCheckedChange={(checked) => updateSettings({ budgetReminders: checked })}
            disabled={!settings.enabled}
          />
          <SettingToggle
            id="notif-goal"
            label="Goal reminders"
            description="Deadline reminders for upcoming and overdue goals."
            checked={settings.goalReminders}
            onCheckedChange={(checked) => updateSettings({ goalReminders: checked })}
            disabled={!settings.enabled}
          />
          <SettingToggle
            id="notif-ipo"
            label="IPO reminders"
            description="Upcoming/open/closing reminders for MeroShare IPO windows."
            checked={settings.ipoReminders}
            onCheckedChange={(checked) => updateSettings({ ipoReminders: checked })}
            disabled={!settings.enabled}
          />
          <div className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => updateUserProfile({ notificationSettings: getDefaultNotificationSettings() })}
            >
              Reset Notification Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

type SettingToggleProps = {
  id: string
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

function SettingToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}
