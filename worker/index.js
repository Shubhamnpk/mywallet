self.addEventListener("push", (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : "" }
  }

  const title = payload.title || "MyWallet"
  const options = {
    body: payload.body || "You have a new update.",
    icon: payload.icon || "/image.png",
    badge: payload.badge || "/image.png",
    tag: payload.tag || "mywallet-notification",
    data: {
      url: payload.url || "/",
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("message", (event) => {
  const data = event.data || {}
  if (data.type !== "SHOW_NOTIFICATION") return

  const payload = data.payload || {}
  const title = payload.title || "MyWallet"
  const options = {
    body: payload.body || "You have a new reminder.",
    icon: payload.icon || "/image.png",
    badge: payload.badge || "/image.png",
    tag: payload.tag || "mywallet-notification",
    data: {
      url: payload.url || "/",
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl =
    event.notification && event.notification.data && event.notification.data.url
      ? event.notification.data.url
      : "/"

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.postMessage({ type: "NOTIFICATION_CLICKED", url: targetUrl })
          if (client.url === targetUrl) {
            return client.focus()
          }
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }

      return undefined
    }),
  )
})
