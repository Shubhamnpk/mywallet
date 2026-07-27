import { loadFromLocalStorage, saveToLocalStorage } from "./storage"

export const TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export type TombstoneRecord = { id: string; deletedAt: string }

export async function recordDeletion(tombstoneKey: string, ids: string[]) {
  if (ids.length === 0) return
  try {
    const stored = await loadFromLocalStorage([tombstoneKey])
    const existing = Array.isArray(stored[tombstoneKey]) ? stored[tombstoneKey] as TombstoneRecord[] : []
    const now = new Date().toISOString()
    const cutoff = Date.now() - TOMBSTONE_RETENTION_MS
    const retained = existing.filter((entry) => Date.parse(entry.deletedAt || "") >= cutoff)
    const next = [...retained.filter((entry) => !ids.includes(entry.id))]
    ids.forEach((id) => {
      next.push({ id, deletedAt: now })
    })
    await saveToLocalStorage(tombstoneKey, next, true)
  } catch {
  }
}
