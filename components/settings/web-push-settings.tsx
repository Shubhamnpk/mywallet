"use client"

import { useCallback, useEffect, useState } from "react"
import { Radio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { useWalletData } from "@/contexts/wallet-data-context"
import {
  getBrowserPushSubscriptionActive,
  getWebPushServerStatus,
  subscribeDeviceToWebPush,
  unsubscribeDeviceFromWebPush,
} from "@/lib/push-client"
import { requestBrowserNotificationPermission } from "@/lib/notifications"

export function WebPushSettings() {
  const { userProfile } = useWalletData()
  const [serverReady, setServerReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [statusMessage, setStatusMessage] = useState("Checking server...")
  const [autoEnableAttempted, setAutoEnableAttempted] = useState(false)
  const shareFeaturesEnabled = Boolean(userProfile?.meroShare?.shareFeaturesEnabled)
  const shareNotificationsEnabled = Boolean(userProfile?.meroShare?.shareNotificationsEnabled)
  const shouldAutoEnable = shareFeaturesEnabled && shareNotificationsEnabled

  const refresh = useCallback(async () => {
    setChecking(true)
    setStatusMessage("Checking server...")
    try {
      const status = await getWebPushServerStatus()
      setServerReady(status.ready)
      if (status.ready) {
        setStatusMessage("Checking device subscription...")
        setSubscribed(await getBrowserPushSubscriptionActive())
      } else {
        setSubscribed(false)
      }
    } catch {
      setServerReady(false)
      setSubscribed(false)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!shouldAutoEnable || checking || busy || !serverReady || subscribed || autoEnableAttempted) return
    if (typeof window === "undefined" || !("Notification" in window)) return
    if (Notification.permission !== "granted") return

    setAutoEnableAttempted(true)
    setBusy(true)
    setStatusMessage("Auto-enabling remote alerts...")
    void (async () => {
      try {
        const result = await subscribeDeviceToWebPush()
        if (!result.ok) return
        setSubscribed(await getBrowserPushSubscriptionActive())
      } finally {
        setBusy(false)
      }
    })()
  }, [shouldAutoEnable, checking, busy, serverReady, subscribed, autoEnableAttempted])

  const handleEnable = async () => {
    setBusy(true)
    setStatusMessage("Connecting remote alerts...")
    try {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted") {
        const p = await requestBrowserNotificationPermission()
        if (p !== "granted") {
          toast({
            title: "Permission needed",
            description: "Allow notifications so IPO alerts can be delivered when MyWallet is closed.",
            variant: "destructive",
          })
          return
        }
      }

      const result = await subscribeDeviceToWebPush()
      if (!result.ok) {
        toast({
          title: "Could not enable remote alerts",
          description:
            result.error ||
            "Use the installed app or production HTTPS. Push needs an active service worker.",
          variant: "destructive",
        })
        return
      }
      setSubscribed(await getBrowserPushSubscriptionActive())
      toast({
        title: "Remote IPO alerts on",
        description: "We will notify this device when a new IPO window opens (from the server).",
      })
    } finally {
      setBusy(false)
    }
  }

  const handleDisable = async () => {
    setBusy(true)
    setStatusMessage("Disconnecting remote alerts...")
    try {
      await unsubscribeDeviceFromWebPush()
      setSubscribed(await getBrowserPushSubscriptionActive())
      toast({
        title: "Remote alerts off",
        description: "This device will no longer receive server IPO pushes.",
      })
    } finally {
      setBusy(false)
    }
  }

  if (checking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="w-5 h-5" />
            Remote alerts
          </CardTitle>
          <CardDescription>{statusMessage}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!serverReady) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5" />
            Remote IPO alerts
          </CardTitle>
          <CardDescription>
            Server-side Web Push is not configured for this deployment. Add VAPID keys and Upstash Redis env vars on
            Vercel, then redeploy.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="w-5 h-5" />
          Remote IPO alerts
        </CardTitle>
        <CardDescription>
          Get notified when a new IPO subscription window opens, even if MyWallet is not open. Requires notification
          permission and the production PWA (service worker).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        {shouldAutoEnable && (
          <p className="w-full text-xs text-muted-foreground">
            Share features are enabled, so remote alerts auto-enable when notification permission is granted.
          </p>
        )}
        <p className="w-full text-xs text-muted-foreground">
          Status: {subscribed ? "Enabled on this device" : "Disabled on this device"}
        </p>
        {!subscribed ? (
          <Button type="button" variant="default" disabled={busy || checking} onClick={() => void handleEnable()}>
            {busy ? "Connecting..." : "Enable remote IPO alerts on this device"}
          </Button>
        ) : (
          <Button type="button" variant="outline" disabled={busy || checking} onClick={() => void handleDisable()}>
            {busy ? "Disconnecting..." : "Disable remote alerts on this device"}
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" disabled={busy || checking} onClick={() => void refresh()}>
          Refresh status
        </Button>
      </CardContent>
    </Card>
  )
}
