import { DataIntegrityManager } from "@/lib/data-integrity"

export async function loadFromLocalStorage(keys: string[]) {
  const result: Record<string, any> = {}
  for (const key of keys) {
    const value = localStorage.getItem(key)
    if (value !== null) {
      try {
        result[key] = JSON.parse(value)
      } catch (e) {
        // fallback to raw string for numbers like emergencyFund
        result[key] = value
      }
    } else {
      result[key] = null
    }
  }
  return result
}

export async function saveToLocalStorage(key: string, data: any) {
  localStorage.setItem(key, typeof data === "string" ? data : JSON.stringify(data))
}

export async function saveDataWithIntegrity(allData: any) {
  try {
    await DataIntegrityManager.updateIntegrityRecord(allData)
    return true
  } catch (e) {
    console.error("[v0] Failed to save integrity record:", e)
    return false
  }
}
