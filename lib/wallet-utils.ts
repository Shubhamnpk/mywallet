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
