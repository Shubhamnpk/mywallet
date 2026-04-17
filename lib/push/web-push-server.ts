import * as webpush from "web-push"
import { getVapidPrivateKey, getVapidPublicKey, getVapidSubject, isVapidConfigured } from "./env"
import { removePushSubscriptionByEndpoint, type StoredPushSubscription } from "./subscription-store"

let configured = false

function ensureConfigured(): void {
  if (configured) return
  if (!isVapidConfigured()) {
    throw new Error("VAPID keys not configured")
  }
  webpush.setVapidDetails(getVapidSubject(), getVapidPublicKey(), getVapidPrivateKey())
  configured = true
}

export type PushPayload = {
  title?: string
  body?: string
  tag?: string
  url?: string
}

export async function sendPushToSubscription(
  sub: StoredPushSubscription,
  payload: PushPayload,
): Promise<{ statusCode?: number }> {
  ensureConfigured()
  const body = JSON.stringify({
    title: payload.title ?? "MyWallet",
    body: payload.body ?? "",
    tag: payload.tag ?? "mywallet-push",
    url: payload.url ?? "/",
  })
  const result = await webpush.sendNotification(sub, body, {
    TTL: 60 * 60,
    urgency: "normal",
  })
  return { statusCode: result.statusCode }
}

export async function sendPushToMany(
  subs: StoredPushSubscription[],
  payload: PushPayload,
): Promise<{ sent: number; removed: number; errors: string[] }> {
  let sent = 0
  let removed = 0
  const errors: string[] = []
  for (const sub of subs) {
    try {
      const { statusCode } = await sendPushToSubscription(sub, payload)
      if (statusCode && statusCode >= 200 && statusCode < 300) {
        sent += 1
      }
    } catch (e: unknown) {
      const err = e as { statusCode?: number; body?: string; message?: string }
      if (err.statusCode === 404 || err.statusCode === 410) {
        await removePushSubscriptionByEndpoint(sub.endpoint)
        removed += 1
        continue
      }
      errors.push(err.message || String(e))
    }
  }

  return { sent, removed, errors }
}
