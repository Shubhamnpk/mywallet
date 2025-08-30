// Migration utilities for upgrading wallet data to new security standards
// Handles transition from old security methods to new PBKDF2-based system

import { SecurePinManager } from "./secure-pin-manager"
import { SecureKeyManager } from "./key-manager"
import { DataIntegrityManager } from "./data-integrity"
import { SecureWallet } from "./security"

export interface MigrationResult {
  success: boolean
  migratedItems: string[]
  errors: string[]
  warnings: string[]
}

export interface MigrationStatus {
  needsMigration: boolean
  currentVersion: string
  targetVersion: string
  estimatedTime: number
  riskLevel: 'low' | 'medium' | 'high'
}

export class MigrationManager {
  private static readonly MIGRATION_VERSION = "2.0"
  private static readonly MIGRATION_STATUS_KEY = "wallet_migration_status"

  // Check if migration is needed
  static checkMigrationStatus(): MigrationStatus {
    const storedVersion = localStorage.getItem("wallet_version") || "1.0"
    const needsMigration = storedVersion !== this.MIGRATION_VERSION

    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    let estimatedTime = 1000 // 1 second

    if (needsMigration) {
      // Check for old security data
      const hasOldPin = localStorage.getItem("user_pin") !== null
      const hasOldData = localStorage.getItem("wallet_data") !== null

      if (hasOldPin && hasOldData) {
        riskLevel = 'medium'
        estimatedTime = 3000 // 3 seconds
      }

      if (storedVersion === "1.0") {
        riskLevel = 'high'
        estimatedTime = 5000 // 5 seconds
      }
    }

    return {
      needsMigration,
      currentVersion: storedVersion,
      targetVersion: this.MIGRATION_VERSION,
      estimatedTime,
      riskLevel,
    }
  }

  // Perform complete migration
  static async performMigration(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedItems: [],
      errors: [],
      warnings: [],
    }

    try {
      console.log("[v0] Starting wallet migration to version", this.MIGRATION_VERSION)

      // Phase 1: Migrate PIN security
      await this.migratePinSecurity(result)

      // Phase 2: Migrate wallet data
      await this.migrateWalletData(result)

      // Phase 3: Update integrity records
      await this.migrateIntegrityRecords(result)

      // Phase 4: Clean up old data
      await this.cleanupOldData(result)

      // Phase 5: Update version
      localStorage.setItem("wallet_version", this.MIGRATION_VERSION)
      localStorage.setItem(this.MIGRATION_STATUS_KEY, JSON.stringify({
        version: this.MIGRATION_VERSION,
        migratedAt: new Date().toISOString(),
        success: result.success,
      }))

      console.log("[v0] Migration completed:", result.success ? "SUCCESS" : "FAILED")

    } catch (error) {
      console.error("[v0] Migration failed:", error)
      result.success = false
      result.errors.push(`Migration failed: ${error}`)
    }

    return result
  }

  // Migrate PIN from old hash to new PBKDF2 system
  private static async migratePinSecurity(result: MigrationResult): Promise<void> {
    try {
      const oldPin = localStorage.getItem("user_pin")
      const oldHashedPin = localStorage.getItem("user_pin_hash")

      if (oldPin && oldHashedPin) {
        // Validate old PIN format
        if (!/^\d{4,6}$/.test(oldPin)) {
          result.warnings.push("Old PIN format may not be compatible with new security standards")
        }

        // Check if new PIN system is already initialized
        if (!SecurePinManager.hasPin()) {
          // Migrate to new system
          const setupSuccess = await SecurePinManager.setupPin(oldPin)
          if (setupSuccess) {
            result.migratedItems.push("PIN security system")
            console.log("[v0] PIN security migrated successfully")
          } else {
            result.errors.push("Failed to migrate PIN security")
          }
        } else {
          result.warnings.push("New PIN system already exists, skipping PIN migration")
        }
      } else {
        result.warnings.push("No old PIN data found to migrate")
      }
    } catch (error) {
      result.errors.push(`PIN migration error: ${error}`)
    }
  }

  // Migrate wallet data with new encryption
  private static async migrateWalletData(result: MigrationResult): Promise<void> {
    try {
      const oldDataKeys = [
        "wallet_data",
        "user_profile",
        "transactions",
        "budgets",
        "goals",
        "categories"
      ]

      for (const key of oldDataKeys) {
        const oldData = localStorage.getItem(key)
        if (oldData) {
          try {
            const parsedData = JSON.parse(oldData)

            // Store with new secure method
            if (SecureKeyManager.hasMasterKey()) {
              // Use secure storage for sensitive data
              const secureKeys = ["user_profile", "transactions"]
              const shouldEncrypt = secureKeys.includes(key)

              // Import the save function dynamically to avoid circular dependency
              const { saveToLocalStorage } = await import("./storage")
              await saveToLocalStorage(`${key}_v2`, parsedData, shouldEncrypt)

              result.migratedItems.push(`${key} data`)
            } else {
              // Fallback to regular storage
              localStorage.setItem(`${key}_v2`, oldData)
              result.migratedItems.push(`${key} data (unencrypted)`)
              result.warnings.push(`${key} stored unencrypted - PIN setup required for encryption`)
            }
          } catch (parseError) {
            result.errors.push(`Failed to parse ${key} data: ${parseError}`)
          }
        }
      }
    } catch (error) {
      result.errors.push(`Data migration error: ${error}`)
    }
  }

  // Migrate integrity records
  private static async migrateIntegrityRecords(result: MigrationResult): Promise<void> {
    try {
      const oldIntegrity = localStorage.getItem("wallet_data_integrity")
      if (oldIntegrity) {
        // Create new integrity record
        const allData = this.collectAllWalletData()
        await DataIntegrityManager.createIntegrityRecord(allData)

        if (SecureKeyManager.hasMasterKey()) {
          await DataIntegrityManager.createSecureIntegrityRecord(allData)
          result.migratedItems.push("Secure integrity records")
        } else {
          result.migratedItems.push("Basic integrity records")
        }

        console.log("[v0] Integrity records migrated")
      }
    } catch (error) {
      result.errors.push(`Integrity migration error: ${error}`)
    }
  }

  // Clean up old data after successful migration
  private static async cleanupOldData(result: MigrationResult): Promise<void> {
    try {
      const oldKeys = [
        "user_pin",
        "user_pin_hash",
        "wallet_data_integrity",
        "wallet_data",
        "user_profile",
        "transactions",
        "budgets",
        "goals",
        "categories"
      ]

      let cleanedCount = 0
      for (const key of oldKeys) {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key)
          cleanedCount++
        }
      }

      if (cleanedCount > 0) {
        result.migratedItems.push(`Cleaned up ${cleanedCount} old data entries`)
        console.log("[v0] Old data cleaned up:", cleanedCount, "entries")
      }
    } catch (error) {
      result.errors.push(`Cleanup error: ${error}`)
    }
  }

  // Collect all current wallet data for integrity checks
  private static collectAllWalletData(): any {
    const dataKeys = [
      "user_profile_v2",
      "transactions_v2",
      "budgets_v2",
      "goals_v2",
      "categories_v2"
    ]

    const allData: any = {}
    for (const key of dataKeys) {
      const data = localStorage.getItem(key)
      if (data) {
        try {
          allData[key] = JSON.parse(data)
        } catch {
          allData[key] = data
        }
      }
    }

    return allData
  }

  // Rollback migration in case of failure
  static async rollbackMigration(): Promise<boolean> {
    try {
      console.log("[v0] Rolling back migration...")

      // Remove new data
      const newKeys = [
        "user_profile_v2",
        "transactions_v2",
        "budgets_v2",
        "goals_v2",
        "categories_v2",
        "wallet_data_integrity",
        "wallet_data_integrity_secure"
      ]

      for (const key of newKeys) {
        localStorage.removeItem(key)
      }

      // Reset version
      localStorage.setItem("wallet_version", "1.0")
      localStorage.removeItem(this.MIGRATION_STATUS_KEY)

      // Clear security data
      SecurePinManager.resetPin()

      console.log("[v0] Migration rollback completed")
      return true
    } catch (error) {
      console.error("[v0] Migration rollback failed:", error)
      return false
    }
  }

  // Get migration status
  static getMigrationStatus(): {
    version: string
    migratedAt?: string
    success?: boolean
  } | null {
    const status = localStorage.getItem(this.MIGRATION_STATUS_KEY)
    if (status) {
      try {
        return JSON.parse(status)
      } catch {
        return null
      }
    }
    return null
  }
}