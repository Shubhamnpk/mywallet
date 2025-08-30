import type { UserProfile, Category, Transaction } from "@/types/wallet"

export function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function calculateBalance(transactions: Transaction[]) {
  return transactions.reduce((sum, transaction) => {
    return sum + (transaction.type === "income" ? transaction.amount : -transaction.amount)
  }, 0)
}

export const initializeDefaultCategories = (): Category[] => {
  const expenseCategories = [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Bills & Utilities",
    "Healthcare",
    "Education",
    "Travel",
    "Groceries",
    "Housing",
    "Insurance",
    "Other",
  ]

  const incomeCategories = [
    "Salary",
    "Freelance",
    "Business",
    "Investment",
    "Gift",
    "Bonus",
    "Side Hustle",
    "Rental Income",
    "Refund",
    "Other",
  ]

  const defaultCats: Category[] = []

  expenseCategories.forEach((name, index) => {
    defaultCats.push({
      id: `expense_${Date.now()}_${index}`,
      name,
      type: "expense",
      isDefault: true,
      createdAt: new Date().toISOString(),
      totalSpent: 0,
      transactionCount: 0,
    })
  })

  incomeCategories.forEach((name, index) => {
    defaultCats.push({
      id: `income_${Date.now()}_${index}`,
      name,
      type: "income",
      isDefault: true,
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
  hours: number
  minutes: number
  days: number
  weeks: number
  months: number
  formatted: {
    short: string
    long: string
    detailed: string
  }
}

export function getTimeEquivalentBreakdown(amount: number, profile: UserProfile): TimeEquivalentBreakdown | null {
  if (!profile || !profile.monthlyEarning || !profile.workingDaysPerMonth || !profile.workingHoursPerDay) {
    return null
  }

  const hourlyRate = profile.monthlyEarning / (profile.workingDaysPerMonth * profile.workingHoursPerDay)
  const totalHours = amount / hourlyRate

  if (totalHours <= 0) return null

  const hours = Math.floor(totalHours)
  const minutes = Math.round((totalHours - hours) * 60)

  const dailyHours = profile.workingHoursPerDay
  const weeklyHours = profile.workingDaysPerMonth * profile.workingHoursPerDay / 4.33 // Average weeks per month
  const monthlyHours = profile.workingDaysPerMonth * profile.workingHoursPerDay

  const days = totalHours / dailyHours
  const weeks = totalHours / weeklyHours
  const months = totalHours / monthlyHours

  // Format helpers
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
    hours: totalHours,
    minutes: minutes,
    days: days,
    weeks: weeks,
    months: months,
    formatted: {
      short: formatTime(hours, minutes),
      long: formatDetailed(hours, minutes),
      detailed: `${formatTime(hours, minutes)} • ${days.toFixed(1)} work days • ${weeks.toFixed(1)} weeks`
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
  const currencySymbol = profile.currency === "USD" ? "$" : profile.currency === "EUR" ? "€" : profile.currency === "GBP" ? "£" : profile.currency === "JPY" ? "¥" : profile.currency === "CAD" ? "C$" : profile.currency === "AUD" ? "A$" : profile.currency === "INR" ? "₹" : "$"

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

/**
 * Create an encrypted backup string for all wallet data using a user-provided PIN.
 * The caller is responsible for offering the string to the user for download or copying.
 */
export async function createWalletBackup(allData: any, pin: string) {
  // validate data before backup
  const validation = await DataIntegrityManager.validateAllData(allData)
  if (!validation.isValid) {
    console.warn("[v0] Creating backup despite validation issues:", validation.issues)
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
        localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v))
      } catch (e) {
        console.error("[v0] Failed to write restored key:", k, e)
      }
    }
    // update integrity record after write
    await DataIntegrityManager.updateIntegrityRecord(data)
  }

  return data
}
