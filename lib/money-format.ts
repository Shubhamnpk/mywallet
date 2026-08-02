import type { CalendarSystem } from "@/lib/app-calendar"

/**
 * Compact Nepali rupee formatting, matching the broker leaderboard scale:
 * BS → kharab (10^11) / arab (10^9) / cr (10^7) / lakh (10^5)
 * AD → T / B / M / K
 * Small values below the smallest unit fall back to plain en-IN grouping.
 */
export function compactAmount(
  n: number | null | undefined,
  calendarSystem: CalendarSystem = "AD",
): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "रु —"
  const abs = Math.abs(n)
  if (calendarSystem === "BS") {
    if (abs >= 1e11) return `रु ${(n / 1e11).toFixed(1)} kharab`
    if (abs >= 1e9) return `रु ${(n / 1e9).toFixed(1)} arab`
    if (abs >= 1e7) return `रु ${(n / 1e7).toFixed(1)} cr`
    if (abs >= 1e5) return `रु ${(n / 1e5).toFixed(1)} lakh`
    return `रु ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
  }
  if (abs >= 1e12) return `रु ${(n / 1e12).toFixed(1)}T`
  if (abs >= 1e9) return `रु ${(n / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `रु ${(n / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `रु ${(n / 1e3).toFixed(1)}K`
  return `रु ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

/** Always uses Nepali units (kharab / arab / cr / lakh), ignoring the AD/BS toggle. */
export function compactNepaliAmount(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "रु —"
  const abs = Math.abs(n)
  if (abs >= 1e11) return `रु ${(n / 1e11).toFixed(1)} kharab`
  if (abs >= 1e9) return `रु ${(n / 1e9).toFixed(1)} arab`
  if (abs >= 1e7) return `रु ${(n / 1e7).toFixed(1)} cr`
  if (abs >= 1e5) return `रु ${(n / 1e5).toFixed(1)} lakh`
  return `रु ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}
