/**
 * Browser-only helpers for Web Push subscription (used with Vercel API routes).
 */

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = typeof window !== "undefined" ? window.atob(base64) : ""
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function getWebPushServerStatus(): Promise<{ vapid: boolean; ready: boolean }> {
  const res = await fetch("/api/push/status", { cache: "no-store" })
  if (!res.ok) return { vapid: false, ready: false }
  return res.json() as Promise<{ vapid: boolean; ready: boolean }>
}

export async function fetchVapidPublicKey(): Promise<string | null> {
  const res = await fetch("/api/push/public-key", { cache: "no-store" })
  if (!res.ok) return null
  const data = (await res.json()) as { publicKey?: string }
  return data.publicKey ?? null
}

/**
 * Subscribe this device for server-sent IPO (and future) pushes. Requires notification permission and an active service worker (production build).
 */
export async function subscribeDeviceToWebPush(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { ok: false, error: "Service workers not supported." }
  }
  if (!("PushManager" in window)) {
    return { ok: false, error: "Push messaging is not supported in this browser." }
  }

  const status = await getWebPushServerStatus()
  if (!status.ready) {
    return { ok: false, error: "Server is not configured for Web Push yet." }
  }

  const publicKey = await fetchVapidPublicKey()
  if (!publicKey) {
    return { ok: false, error: "Could not load push configuration." }
  }

  const registration = await navigator.serviceWorker.ready
  const key = urlBase64ToUint8Array(publicKey)

  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    await existing.unsubscribe().catch(() => {})
  }

  const applicationServerKey = key.buffer.slice(
    key.byteOffset,
    key.byteOffset + key.byteLength,
  ) as ArrayBuffer

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  })

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.auth || !json.keys?.p256dh) {
    return { ok: false, error: "Invalid subscription from browser." }
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = (err as { error?: { message?: string } })?.error?.message
    return { ok: false, error: msg || `Subscribe failed (${res.status})` }
  }

  return { ok: true }
}

export async function unsubscribeDeviceFromWebPush(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { ok: false, error: "Not available." }
  }

  const registration = await navigator.serviceWorker.ready
  const sub = await registration.pushManager.getSubscription()
  if (!sub) {
    return { ok: true }
  }

  const endpoint = sub.endpoint
  await sub.unsubscribe().catch(() => {})

  const res = await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  })

  if (!res.ok) {
    return { ok: false, error: "Server could not remove subscription." }
  }
  return { ok: true }
}

export async function getBrowserPushSubscriptionActive(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false
  try {
    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.getSubscription()
    return Boolean(sub)
  } catch {
    return false
  }
}
