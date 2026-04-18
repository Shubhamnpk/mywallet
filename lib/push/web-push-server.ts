import * as webpush from "web-push"
import { getVapidPrivateKey, getVapidPublicKey, getVapidSubject, isVapidConfigured } from "./env"
import { removePushSubscriptionByEndpoint, type StoredPushSubscription } from "./subscription-store"

let configured = false
const MAX_ATTEMPTS = 2
const DEFAULT_CONCURRENCY = 12
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

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

function getPushConcurrency(): number {
  const raw = Number(process.env.PUSH_SEND_CONCURRENCY ?? DEFAULT_CONCURRENCY)
  if (!Number.isFinite(raw)) return DEFAULT_CONCURRENCY
  return Math.min(30, Math.max(1, Math.floor(raw)))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldRetry(statusCode?: number): boolean {
  if (!statusCode) return true
  return RETRYABLE_STATUS.has(statusCode)
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
  let lastError: unknown = null
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await webpush.sendNotification(sub, body, {
        TTL: 60 * 60,
        urgency: "normal",
      })
      return { statusCode: result.statusCode }
    } catch (e) {
      lastError = e
      const err = e as { statusCode?: number }
      if (attempt >= MAX_ATTEMPTS || !shouldRetry(err.statusCode)) {
        throw e
      }
      await sleep(150 * attempt)
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unknown push send error")
}

export async function sendPushToMany(
  subs: StoredPushSubscription[],
  payload: PushPayload,
): Promise<{ sent: number; removed: number; errors: string[] }> {
  let sent = 0
  let removed = 0
  const errors: string[] = []
  if (subs.length === 0) return { sent, removed, errors }

  const concurrency = getPushConcurrency()
  let cursor = 0

  async function worker(): Promise<void> {
    while (true) {
      const i = cursor
      cursor += 1
      if (i >= subs.length) return
      const sub = subs[i]
      try {
        const { statusCode } = await sendPushToSubscription(sub, payload)
        if (statusCode && statusCode >= 200 && statusCode < 300) {
          sent += 1
        } else {
          errors.push(`Push returned non-success status: ${String(statusCode ?? "unknown")}`)
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
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, subs.length) }, () => worker()))

  return { sent, removed, errors }
}
