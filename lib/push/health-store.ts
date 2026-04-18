import { getRedis } from "./redis"

const LAST_PUSH_JOB_KEY = "mywallet:push:last_job"

export type PushJobHealthRecord = {
  at: string
  result: unknown
}

export async function saveLastPushJobResult(result: unknown): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  const record: PushJobHealthRecord = {
    at: new Date().toISOString(),
    result,
  }
  await redis.set(LAST_PUSH_JOB_KEY, JSON.stringify(record))
}

export async function readLastPushJobResult(): Promise<PushJobHealthRecord | null> {
  const redis = getRedis()
  if (!redis) return null
  const raw = await redis.get(LAST_PUSH_JOB_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw as string) as PushJobHealthRecord
  } catch {
    return null
  }
}

