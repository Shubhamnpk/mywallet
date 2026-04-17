/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

interface NotificationPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
}

// Original push notification logic
self.addEventListener("push", (event) => {
  let payload: NotificationPayload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : "" }
  }

  const title = payload.title || "MyWallet"
  const bodyText = payload.body || "You have a new update."
  const tag = payload.tag || "mywallet-notification"
  const options = {
    body: bodyText,
    icon: payload.icon || "/image.png",
    badge: payload.badge || "/image.png",
    tag,
    data: {
      url: payload.url || "/",
    },
  }

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      for (const client of clients) {
        client.postMessage({
          type: "PUSH_NOTIFICATION_SHOWN",
          title,
          body: bodyText,
          tag,
        })
      }
      await self.registration.showNotification(title, options)
    })(),
  )
})

self.addEventListener("message", (event) => {
  const data = event.data || {}
  if (data.type !== "SHOW_NOTIFICATION") return

  const payload: NotificationPayload = data.payload || {}
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
      ? (event.notification.data.url as string)
      : "/"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          (client as any).postMessage({ type: "NOTIFICATION_CLICKED", url: targetUrl })
          if ((client as any).url === targetUrl) {
            return (client as any).focus()
          }
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }

      return undefined
    }),
  )
})

serwist.addEventListeners();
