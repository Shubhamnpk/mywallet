import { createHash } from "node:crypto"
import { getRedis } from "./redis"

const INDEX_KEY = "mywallet:push:index"

/** Shape expected by `web-push` (from `subscription.toJSON()` in the browser). */
export type StoredPushSubscription = {
  endpoint: string
  expirationTime?: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

export function subscriptionIdFromEndpoint(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex")
}

function subscriptionKey(id: string): string {
  return `mywallet:push:s:${id}`
}

export async function savePushSubscription(sub: StoredPushSubscription): Promise<void> {
  const redis = getRedis()
  if (!redis) throw new Error("Redis not configured")
  const id = subscriptionIdFromEndpoint(sub.endpoint)
  await redis.set(subscriptionKey(id), JSON.stringify(sub))
  await redis.sadd(INDEX_KEY, id)
}

export async function removePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  const id = subscriptionIdFromEndpoint(endpoint)
  await redis.del(subscriptionKey(id))
  await redis.srem(INDEX_KEY, id)
}

export async function listPushSubscriptions(): Promise<StoredPushSubscription[]> {
  const redis = getRedis()
  if (!redis) return []
  const ids = (await redis.smembers(INDEX_KEY)) as string[]
  if (!ids?.length) return []
  const keys = ids.map(subscriptionKey)
  const values = await redis.mget<(string | null)[]>(...keys)
  const out: StoredPushSubscription[] = []
  for (const raw of values) {
    if (!raw) continue
    try {
      out.push(JSON.parse(raw) as StoredPushSubscription)
    } catch {
      // skip corrupt
    }
  }
  return out
}
