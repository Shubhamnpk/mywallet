"use client"

import { useMemo, useRef, useState } from "react"
import { Bell, Info, RotateCcw, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useNotificationsData } from "@/hooks/use-notifications-data"
import {
  getDefaultNotificationSettings,
  normalizeNotificationSettings,
} from "@/lib/notifications"
import type { NotificationSettings } from "@/types/wallet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { WebPushSettings } from "@/components/settings/web-push-settings"

export function NotificationSettings() {
  const { userProfile, updateUserProfile } = useNotificationsData()

  const settings = useMemo(
    () => normalizeNotificationSettings(userProfile?.notificationSettings),
    [userProfile?.notificationSettings],
  )

  const updateSettings = (updates: Partial<NotificationSettings>) => {
    if (!userProfile) return

    updateUserProfile({
      notificationSettings: {
        ...settings,
        ...updates,
      },
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
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => updateUserProfile({ notificationSettings: getDefaultNotificationSettings() })}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Label htmlFor="notif-enabled">Enable Notifications</Label>
            </div>
            <Switch
              id="notif-enabled"
              checked={settings.enabled}
              onCheckedChange={async (checked) => {
                updateSettings({ enabled: checked })
                if (checked && typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted") {
                  await Notification.requestPermission()
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      <WebPushSettings />

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
            id="notif-bill"
            label="Bill reminders"
            description="Alerts for overdue bills, due today, and bills inside your reminder window."
            checked={settings.billReminders}
            onCheckedChange={(checked) => updateSettings({ billReminders: checked })}
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
          <SettingToggle
            id="notif-sip"
            label="SIP reminders"
            description="Installment reminders for upcoming, due-today, and recently missed SIP plans."
            checked={settings.sipReminders}
            onCheckedChange={(checked) => updateSettings({ sipReminders: checked })}
            disabled={!settings.enabled}
          />
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
  const [isOpen, setIsOpen] = useState(false)
  const hoverTimeout = useRef<ReturnType<typeof setTimeout>>()

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <Label htmlFor={id}>{label}</Label>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full p-1 hover:bg-muted transition-colors"
              onMouseEnter={() => {
                clearTimeout(hoverTimeout.current)
                setIsOpen(true)
              }}
              onMouseLeave={() => {
                hoverTimeout.current = setTimeout(() => setIsOpen(false), 200)
              }}
            >
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            className="w-72 text-sm"
            onMouseEnter={() => clearTimeout(hoverTimeout.current)}
            onMouseLeave={() => setIsOpen(false)}
          >
            {description}
          </PopoverContent>
        </Popover>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}
