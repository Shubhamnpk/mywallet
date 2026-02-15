import type { NotificationSettings } from "@/types/wallet"

const DEFAULT_NOTIFICATION_ICON = "/image.png"
export const REMINDER_CACHE_KEY = "wallet_reminder_cache_v1"

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  inAppToasts: true,
  browserNotifications: true,
  permissionNudges: true,
  budgetReminders: true,
  goalReminders: true,
  ipoReminders: true,
}

export type AppNotificationInput = {
  title: string
  body: string
  tag?: string
  url?: string
}

export const isBrowserNotificationSupported = () =>
  typeof window !== "undefined" && "Notification" in window

export const getDefaultNotificationSettings = (): NotificationSettings => ({
  ...DEFAULT_NOTIFICATION_SETTINGS,
})

export const normalizeNotificationSettings = (
  settings?: Partial<NotificationSettings> | null,
): NotificationSettings => ({
  ...DEFAULT_NOTIFICATION_SETTINGS,
  ...(settings || {}),
})

export const requestBrowserNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isBrowserNotificationSupported()) return "denied"
  try {
    return await Notification.requestPermission()
  } catch {
    return "denied"
  }
}

export const showAppNotification = async ({
  title,
  body,
  tag,
  url = "/",
}: AppNotificationInput): Promise<boolean> => {
  if (!isBrowserNotificationSupported() || Notification.permission !== "granted") {
    return false
  }

  const options: NotificationOptions = {
    body,
    tag,
    icon: DEFAULT_NOTIFICATION_ICON,
    badge: DEFAULT_NOTIFICATION_ICON,
    data: { url },
  }

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, options)
      return true
    }
  } catch {
  }

  try {
    const notification = new Notification(title, options)
    notification.onclick = () => {
      try {
        window.focus()
        if (url) window.location.href = url
      } catch {
      }
    }
    return true
  } catch {
    return false
  }
}
