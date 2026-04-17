"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { REMINDER_CACHE_KEY, requestBrowserNotificationPermission, showAppNotification } from "@/lib/notifications"
import { SessionManager } from "@/lib/session-manager"

type SessionStatus = {
  isValid: boolean
  timeRemaining: number
  lastActivity: number
} | null

type SectionKey = "session" | "notifications" | "ui" | "state"

export function DeveloperMenu() {
  const [open, setOpen] = useState(false)
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(null)
  const [viewport, setViewport] = useState("0 x 0")
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  )
  const [sectionsOpen, setSectionsOpen] = useState<Record<SectionKey, boolean>>({
    session: true,
    notifications: true,
    ui: true,
    state: false,
  })
  const [localStorageState, setLocalStorageState] = useState<Record<string, string>>({})

  useEffect(() => {
    const updateStatus = () => {
      setSessionStatus(SessionManager.getSessionStatus())
    }
    updateStatus()
    const timer = setInterval(updateStatus, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", onShortcut)
    return () => window.removeEventListener("keydown", onShortcut)
  }, [])

  useEffect(() => {
    const watchedKeys = [
      "wallet_last_auth",
      "transaction-dialog-form",
      REMINDER_CACHE_KEY,
      "wallet_security_onboarding_done",
      "wallet_data_backup",
    ]

    const readState = () => {
      const nextState: Record<string, string> = {}
      watchedKeys.forEach((key) => {
        const value = localStorage.getItem(key)
        nextState[key] = value ?? "(empty)"
      })
      setLocalStorageState(nextState)
    }

    readState()
    const timer = setInterval(readState, 1200)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const updateViewport = () => {
      setViewport(`${window.innerWidth} x ${window.innerHeight}`)
    }

    const updateNotificationPermission = () => {
      if (typeof window !== "undefined" && "Notification" in window) {
        setNotificationPermission(Notification.permission)
      } else {
        setNotificationPermission("unsupported")
      }
    }

    updateViewport()
    updateNotificationPermission()

    window.addEventListener("resize", updateViewport)
    return () => {
      window.removeEventListener("resize", updateViewport)
    }
  }, [])

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const forceSessionExpire = () => {
    SessionManager.clearSession()
    window.dispatchEvent(new CustomEvent("wallet-session-expired"))
  }

  const createSession = () => {
    SessionManager.createSession()
  }

  const clearAuthStamp = () => {
    localStorage.removeItem("wallet_last_auth")
  }

  const clearTxDraft = () => {
    localStorage.removeItem("transaction-dialog-form")
  }

  const requestNotificationPermission = async () => {
    const result = await requestBrowserNotificationPermission()
    setNotificationPermission(result)
    toast({
      title: result === "granted" ? "Permission Granted" : "Permission Not Granted",
      description:
        result === "granted"
          ? "Browser notifications enabled for local testing."
          : "Notification permission denied or unavailable in this browser.",
      variant: result === "granted" ? "default" : "destructive",
    })
  }

  const sendBrowserNotificationTest = async () => {
    const shown = await showAppNotification({
      title: "MyWallet Dev Notification",
      body: "This is a developer test notification.",
      tag: "mywallet-dev-test",
      url: "/settings?tab=notifications",
    })

    toast({
      title: shown ? "Notification Sent" : "Notification Failed",
      description: shown
        ? "Check your system/browser notification tray."
        : "Permission is likely not granted yet.",
      variant: shown ? "default" : "destructive",
    })
  }

  const resetReminderCooldown = () => {
    localStorage.removeItem(REMINDER_CACHE_KEY)
    toast({
      title: "Reminder Cooldown Reset",
      description: "Reminder cache has been cleared for re-testing.",
    })
  }

  const showSuccessToast = () => {
    toast({
      title: "Success Toast",
      description: "This is a standard success/information toast preview.",
    })
  }

  const showErrorToast = () => {
    toast({
      title: "Error Toast",
      description: "This is a destructive toast preview for error states.",
      variant: "destructive",
    })
  }

  const testConfirmDialog = () => {
    const result = window.confirm("Developer test: confirm action?")
    toast({
      title: result ? "Confirm: OK" : "Confirm: Cancel",
      description: "Native confirm dialog flow validated.",
    })
  }

  const copyDebugText = async () => {
    try {
      await navigator.clipboard.writeText("MyWallet Dev Menu clipboard test")
      toast({
        title: "Clipboard Copy OK",
        description: "Clipboard permission and copy action succeeded.",
      })
    } catch {
      toast({
        title: "Clipboard Copy Failed",
        description: "Clipboard API may be blocked on this page/browser.",
        variant: "destructive",
      })
    }
  }

  const vibrateDevice = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([100, 60, 100])
      toast({
        title: "Vibration Triggered",
        description: "Haptic vibration test fired (if supported by device/browser).",
      })
      return
    }
    toast({
      title: "Vibration Unsupported",
      description: "This browser/device does not support vibration API.",
      variant: "destructive",
    })
  }

  const toggleSection = (section: SectionKey) => {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const truncate = (value: string, max = 72) => {
    if (value.length <= max) return value
    return `${value.slice(0, max)}...`
  }

  return (
    open ? (
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-[60]">
        <Card className="w-[22rem] max-h-[85vh] overflow-y-auto shadow-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Developer Menu</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border p-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>Viewport</span>
                <span className="font-mono">{viewport}</span>
              </div>
            </div>

            <div className="rounded-md border p-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>Session</span>
                <Badge variant={sessionStatus?.isValid ? "default" : "destructive"}>
                  {sessionStatus?.isValid ? "Active" : "Missing/Expired"}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Time left: {sessionStatus ? formatTime(sessionStatus.timeRemaining) : "--:--"}
              </div>
            </div>

            <div className="rounded-md border p-2 space-y-2">
              <button
                type="button"
                className="w-full flex items-center justify-between text-[11px] font-medium text-muted-foreground uppercase tracking-wide"
                onClick={() => toggleSection("session")}
              >
                <span>Session Tools</span>
                <span>{sectionsOpen.session ? "Hide" : "Show"}</span>
              </button>
              {sectionsOpen.session && (
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" onClick={createSession}>
                    Create Session
                  </Button>
                  <Button size="sm" variant="destructive" onClick={forceSessionExpire}>
                    Expire Session
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearAuthStamp}>
                    Clear Auth Stamp
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearTxDraft}>
                    Clear Tx Draft
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-md border p-2 space-y-2">
              <button
                type="button"
                className="w-full flex items-center justify-between text-[11px] font-medium text-muted-foreground uppercase tracking-wide"
                onClick={() => toggleSection("notifications")}
              >
                <span>Notification Tools</span>
                <span>{sectionsOpen.notifications ? "Hide" : "Show"}</span>
              </button>
              {sectionsOpen.notifications && (
                <>
                  <div className="rounded-md border p-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>Permission</span>
                      <Badge variant={notificationPermission === "granted" ? "default" : "secondary"}>
                        {notificationPermission}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" onClick={requestNotificationPermission}>
                      Ask Permission
                    </Button>
                    <Button size="sm" variant="outline" onClick={sendBrowserNotificationTest}>
                      Test Notification
                    </Button>
                    <Button size="sm" variant="outline" onClick={showSuccessToast}>
                      Test Toast
                    </Button>
                    <Button size="sm" variant="outline" onClick={showErrorToast}>
                      Error Toast
                    </Button>
                    <Button size="sm" variant="outline" onClick={resetReminderCooldown} className="col-span-2">
                      Reset Reminder Cooldown
                    </Button>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-md border p-2 space-y-2">
              <button
                type="button"
                className="w-full flex items-center justify-between text-[11px] font-medium text-muted-foreground uppercase tracking-wide"
                onClick={() => toggleSection("ui")}
              >
                <span>UI Interaction Tools</span>
                <span>{sectionsOpen.ui ? "Hide" : "Show"}</span>
              </button>
              {sectionsOpen.ui && (
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" onClick={testConfirmDialog}>
                    Test Confirm
                  </Button>
                  <Button size="sm" variant="outline" onClick={copyDebugText}>
                    Test Clipboard
                  </Button>
                  <Button size="sm" variant="outline" onClick={vibrateDevice}>
                    Test Vibration
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                    Reload Page
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-md border p-2 space-y-2">
              <button
                type="button"
                className="w-full flex items-center justify-between text-[11px] font-medium text-muted-foreground uppercase tracking-wide"
                onClick={() => toggleSection("state")}
              >
                <span>State Inspector</span>
                <span>{sectionsOpen.state ? "Hide" : "Show"}</span>
              </button>
              {sectionsOpen.state && (
                <div className="space-y-1">
                  {Object.entries(localStorageState).map(([key, value]) => (
                    <div key={key} className="rounded border p-2">
                      <div className="text-[10px] text-muted-foreground">{key}</div>
                      <div className="text-xs font-mono break-all">{truncate(value)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    ) : null
  )
}
