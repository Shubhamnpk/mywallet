const CACHE_PREFIX = "ltp_history_v1_"
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

type CacheEntry = {
  data: Array<{ date: string; ltp: number }>
  ts: number
}

export function getLtpCache(key: string): Array<{ date: string; ltp: number }> | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

export function setLtpCache(key: string, data: Array<{ date: string; ltp: number }>) {
  try {
    const entry: CacheEntry = { data, ts: Date.now() }
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // localStorage full or unavailable
  }
}
