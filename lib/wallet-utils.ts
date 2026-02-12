import type { UserProfile, Category, Transaction } from "@/types/wallet"
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, getCategoryColor, getCategoryIcon } from "./categories"
import { getCurrencySymbol } from "./currency"

export function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function calculateBalance(transactions: Transaction[]) {
  return transactions.reduce((sum, transaction) => {
    return sum + (transaction.type === "income" ? transaction.amount : -transaction.amount)
  }, 0)
}

export const initializeDefaultCategories = (): Category[] => {
  const defaultCats: Category[] = []

  DEFAULT_EXPENSE_CATEGORIES.forEach((category, index) => {
    defaultCats.push({
      id: `expense_${Date.now()}_${index}`,
      name: category.name,
      type: "expense",
      isDefault: true,
      color: category.color,
      icon: category.icon,
      createdAt: new Date().toISOString(),
      totalSpent: 0,
      transactionCount: 0,
    })
  })

  DEFAULT_INCOME_CATEGORIES.forEach((category, index) => {
    defaultCats.push({
      id: `income_${Date.now()}_${index}`,
      name: category.name,
      type: "income",
      isDefault: true,
      color: category.color,
      icon: category.icon,
      createdAt: new Date().toISOString(),
      totalSpent: 0,
      transactionCount: 0,
    })
  })

  return defaultCats
}

export function calculateTimeEquivalent(amount: number, profile: UserProfile): number {
  const hourlyRate = profile.monthlyEarning / (profile.workingDaysPerMonth * profile.workingHoursPerDay)
  return amount / hourlyRate
}

export interface TimeEquivalentBreakdown {
  years: number
  months: number
  weeks: number
  days: number
  hours: number
  minutes: number
  seconds: number
  formatted: {
    short: string
    long: string
    detailed: string
    userFriendly: string
  }
}

export function getTimeEquivalentBreakdown(amount: number, profile: UserProfile): TimeEquivalentBreakdown | null {
  if (!profile || !profile.monthlyEarning || !profile.workingDaysPerMonth || !profile.workingHoursPerDay) {
    return null
  }

  const hourlyRate = profile.monthlyEarning / (profile.workingDaysPerMonth * profile.workingHoursPerDay)
  const totalHours = amount / hourlyRate

  if (totalHours <= 0) return null

  // Calculate time units more accurately
  const totalMinutes = totalHours * 60
  const totalSeconds = totalMinutes * 60

  // Use standard time conversions
  const years = Math.floor(totalHours / (profile.workingDaysPerMonth * profile.workingHoursPerDay * 12))
  const remainingHoursAfterYears = totalHours % (profile.workingDaysPerMonth * profile.workingHoursPerDay * 12)

  const months = Math.floor(remainingHoursAfterYears / (profile.workingDaysPerMonth * profile.workingHoursPerDay))
  const remainingHoursAfterMonths = remainingHoursAfterYears % (profile.workingDaysPerMonth * profile.workingHoursPerDay)

  const weeks = Math.floor(remainingHoursAfterMonths / (profile.workingDaysPerMonth * profile.workingHoursPerDay / 4.333))
  const remainingHoursAfterWeeks = remainingHoursAfterMonths % (profile.workingDaysPerMonth * profile.workingHoursPerDay / 4.333)

  const days = Math.floor(remainingHoursAfterWeeks / profile.workingHoursPerDay)
  const remainingHoursAfterDays = remainingHoursAfterWeeks % profile.workingHoursPerDay

  const hours = Math.floor(remainingHoursAfterDays)
  const minutes = Math.floor((remainingHoursAfterDays - hours) * 60)
  const seconds = Math.floor(((remainingHoursAfterDays - hours) * 60 - minutes) * 60)

  // User-friendly format function
  const formatUserFriendly = (): string => {
    const parts: string[] = []

    if (years > 0) parts.push(`${years}y`)
    if (months > 0) parts.push(`${months}mo`)
    if (weeks > 0) parts.push(`${weeks}w`)
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    if (seconds > 0 && parts.length === 0) parts.push(`${seconds}s`) // Only show seconds if no larger units

    return parts.slice(0, 2).join(' ') || '0m' // Show max 2 units, fallback to 0m
  }

  // Legacy format helpers for backward compatibility
  const formatTime = (h: number, m: number): string => {
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  const formatDetailed = (h: number, m: number): string => {
    const timeStr = formatTime(h, m)
    if (days >= 1) {
      return `${timeStr} (${days.toFixed(1)} work days)`
    }
    if (weeks >= 1) {
      return `${timeStr} (${weeks.toFixed(1)} weeks)`
    }
    if (months >= 1) {
      return `${timeStr} (${months.toFixed(1)} months)`
    }
    return timeStr
  }

  return {
    years,
    months,
    weeks,
    days,
    hours: totalHours,
    minutes,
    seconds,
    formatted: {
      short: formatTime(hours, minutes),
      long: formatDetailed(hours, minutes),
      detailed: `${formatTime(hours, minutes)} • ${days.toFixed(1)} work days • ${weeks.toFixed(1)} weeks`,
      userFriendly: formatUserFriendly()
    }
  }
}

export function formatTimeEquivalent(amount: number, profile: UserProfile): string {
  const breakdown = getTimeEquivalentBreakdown(amount, profile)
  return breakdown ? breakdown.formatted.short : ""
}

export function getTimeEquivalentTooltip(amount: number, profile: UserProfile): string {
  if (!profile || !profile.monthlyEarning) return ""

  const breakdown = getTimeEquivalentBreakdown(amount, profile)
  if (!breakdown) return ""

  const hourlyRate = profile.monthlyEarning / (profile.workingDaysPerMonth * profile.workingHoursPerDay)
  const currencySymbol = getCurrencySymbol(profile.currency || "USD", (profile as any)?.customCurrency)

  return `
Time Equivalent Breakdown:
• Amount: ${currencySymbol}${amount.toLocaleString()}
• Hourly Rate: ${currencySymbol}${hourlyRate.toFixed(2)}
• Total Hours: ${breakdown.hours.toFixed(2)}h
• Work Days: ${breakdown.days.toFixed(1)}
• Work Weeks: ${breakdown.weeks.toFixed(1)}
• Work Months: ${breakdown.months.toFixed(1)}
  `.trim()
}

// Backup and restore helpers
import { createEncryptedBackup, restoreEncryptedBackup } from "./backup"
import { DataIntegrityManager } from "./data-integrity"
import { saveToLocalStorage } from "./storage"

/**
 * Create an encrypted backup string for all wallet data using a user-provided PIN.
 * The caller is responsible for offering the string to the user for download or copying.
 */
export async function createWalletBackup(allData: any, pin: string) {
  // validate data before backup
  const validation = await DataIntegrityManager.validateAllData(allData)
  if (!validation.isValid) {
  }

  const backup = await createEncryptedBackup(allData, pin)
  return backup
}

/**
 * Restore wallet data from an encrypted backup string using PIN.
 * If overwriteExisting is true, this will replace current localStorage entries for known keys.
 */
export async function restoreWalletBackup(backupJson: string, pin: string, overwriteExisting = false) {
  const data = await restoreEncryptedBackup(backupJson, pin)

  // verify data integrity inside the restored package
  const integrity = await DataIntegrityManager.verifyDataIntegrity(data)
  if (!integrity.isValid) {
    throw new Error(`Restored data failed integrity check: ${integrity.issues.join("; ")}`)
  }

  // Optionally overwrite known keys
  if (overwriteExisting && typeof data === "object") {
    for (const [k, v] of Object.entries(data)) {
      try {
        await saveToLocalStorage(k, v)
      } catch (e) {
      }
    }
    // update integrity record after write
    await DataIntegrityManager.updateIntegrityRecord(data)
  }

  return data
}
