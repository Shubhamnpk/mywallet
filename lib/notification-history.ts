export const NOTIFICATION_HISTORY_KEY = "wallet_notification_history_v1"
export const NOTIFICATION_HISTORY_EVENT = "wallet-notification-history"

export type NotificationHistorySource =
  | "budget"
  | "goal"
  | "ipo"
  | "sip"
  | "bill"
  | "nudge"
  | "push"

export type NotificationHistoryChannel = "toast" | "browser" | "push"

export type NotificationHistoryItem = {
  id: string
  dedupeKey: string
  title: string
  body: string
  source: NotificationHistorySource
  channel: NotificationHistoryChannel
  at: number
}

const MAX_ITEMS = 100
/** Ignore rapid duplicate log lines (same key within this window). */
const INGEST_DEDUPE_MS = 90 * 1000

function safeRead(): NotificationHistoryItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(NOTIFICATION_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function dispatchUpdated() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(NOTIFICATION_HISTORY_EVENT))
}

export function readNotificationHistory(): NotificationHistoryItem[] {
  return safeRead()
}

export function recordNotificationDelivery(params: {
  dedupeKey: string
  title: string
  body: string
  source: NotificationHistorySource
  channel: NotificationHistoryChannel
}): void {
  if (typeof window === "undefined") return
  const list = safeRead()
  const newest = list[0]
  if (
    newest &&
    newest.dedupeKey === params.dedupeKey &&
    Date.now() - newest.at < INGEST_DEDUPE_MS
  ) {
    return
  }

  const item: NotificationHistoryItem = {
    id: crypto.randomUUID(),
    dedupeKey: params.dedupeKey,
    title: params.title,
    body: params.body,
    source: params.source,
    channel: params.channel,
    at: Date.now(),
  }

  try {
    localStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify([item, ...list].slice(0, MAX_ITEMS)))
  } catch {
  }
  dispatchUpdated()
}

export function clearNotificationHistory(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(NOTIFICATION_HISTORY_KEY)
  } catch {
  }
  dispatchUpdated()
}
