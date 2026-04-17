import { Redis } from "@upstash/redis"
import { isUpstashConfigured } from "./env"

let client: Redis | null = null

export function getRedis(): Redis | null {
  if (!isUpstashConfigured()) return null
  if (!client) {
    client = Redis.fromEnv()
  }
  return client
}
