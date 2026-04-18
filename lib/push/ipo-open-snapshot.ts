import type { UpcomingIPO } from "@/types/wallet"
import { getRedis } from "./redis"
import { listPushSubscriptions } from "./subscription-store"
import { sendPushToMany } from "./web-push-server"

const SNAPSHOT_KEY = "mywallet:ipo:open_snapshot"

const UPCOMING_URL = "https://shubhamnpk.github.io/yonepse/data/upcoming_ipo.json"

export async function fetchUpcomingIpos(): Promise<UpcomingIPO[] | null> {
  try {
    const res = await fetch(UPCOMING_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data) ? (data as UpcomingIPO[]) : null
  } catch {
    return null
  }
}

export function openIpoKey(ipo: UpcomingIPO): string {
  const c = (ipo.company || "").trim().toLowerCase().replace(/\s+/g, " ")
  const u = (ipo.url || "").trim()
  return `${c}|${u}`
}

const MAX_PUSHES_PER_RUN = 8

/**
 * Compares current open IPOs with the last snapshot; sends a Web Push for each newly open IPO.
 * First successful run only stores the baseline (no notifications) to avoid spamming on deploy.
 */
export async function runOpenIpoPushJob(): Promise<{
  ok: boolean
  baseline?: boolean
  newOpens: number
  pushesAttempted: number
  subscriptionCount: number
  removedSubscriptions?: number
  errorCount?: number
  message?: string
}> {
  const redis = getRedis()
  if (!redis) {
    return { ok: false, newOpens: 0, pushesAttempted: 0, subscriptionCount: 0, message: "Redis not configured" }
  }

  const list = await fetchUpcomingIpos()
  if (!list) {
    return { ok: false, newOpens: 0, pushesAttempted: 0, subscriptionCount: 0, message: "IPO fetch failed" }
  }

  const openList = list.filter((i) => i.status === "open")
  const currentKeys = openList.map(openIpoKey)

  const rawPrev = await redis.get(SNAPSHOT_KEY)

  if (!rawPrev) {
    await redis.set(SNAPSHOT_KEY, JSON.stringify(currentKeys))
    return {
      ok: true,
      baseline: true,
      newOpens: 0,
      pushesAttempted: 0,
      subscriptionCount: (await listPushSubscriptions()).length,
      message: "Baseline snapshot saved; no pushes on first run.",
    }
  }

  let prevKeys: string[] = []
  try {
    prevKeys = JSON.parse(rawPrev as string) as string[]
  } catch {
    prevKeys = []
  }
  const prev = new Set(prevKeys)

  const newlyOpen = openList.filter((ipo) => !prev.has(openIpoKey(ipo))).slice(0, MAX_PUSHES_PER_RUN)

  const subs = await listPushSubscriptions()
  if (subs.length === 0 || newlyOpen.length === 0) {
    await redis.set(SNAPSHOT_KEY, JSON.stringify(currentKeys))
    return {
      ok: true,
      newOpens: newlyOpen.length,
      pushesAttempted: 0,
      subscriptionCount: subs.length,
    }
  }

  const names = newlyOpen.map((i) => i.company || "IPO").join(", ")
  const body =
    newlyOpen.length === 1
      ? `${names} - subscription window is open. Tap to open MyWallet.`
      : `${newlyOpen.length} IPOs just opened: ${names}. Tap to open MyWallet.`

  const result = await sendPushToMany(subs, {
    title: newlyOpen.length === 1 ? "IPO is open" : "New IPO windows",
    body,
    tag: `ipo-open-batch-${Date.now()}`,
    url: "/portfolio?tab=overview",
  })

  // If every delivery failed, keep previous snapshot so the next run can retry.
  const shouldAdvanceSnapshot = result.sent > 0 || result.errors.length === 0
  if (shouldAdvanceSnapshot) {
    await redis.set(SNAPSHOT_KEY, JSON.stringify(currentKeys))
  }

  return {
    ok: true,
    newOpens: newlyOpen.length,
    pushesAttempted: result.sent,
    subscriptionCount: subs.length,
    removedSubscriptions: result.removed,
    errorCount: result.errors.length,
    message: shouldAdvanceSnapshot
      ? undefined
      : "Push delivery failed for all subscriptions; snapshot retained for retry.",
  }
}
