const DEFAULT_NOTIFICATION_ICON = "/image.png"

export type AppNotificationInput = {
  title: string
  body: string
  tag?: string
  url?: string
}

export const isBrowserNotificationSupported = () =>
  typeof window !== "undefined" && "Notification" in window

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
