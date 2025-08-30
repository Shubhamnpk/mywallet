// Data integrity verification system for wallet data
// Ensures data hasn't been tampered with and maintains consistency

import { SecureWallet } from "./security"

export interface DataIntegrityInfo {
  hash: string
  timestamp: string
  version: string
  checksum: string
}

export class DataIntegrityManager {
  private static readonly INTEGRITY_KEY = "wallet_data_integrity"
  private static readonly VERSION = "1.0"

  // Generate integrity hash for data
  static async generateDataHash(data: any): Promise<string> {
    const dataString = JSON.stringify(data, Object.keys(data).sort())
    return await SecureWallet.generateIntegrityHash(dataString)
  }

  // Create integrity record for stored data
  static async createIntegrityRecord(data: any): Promise<DataIntegrityInfo> {
    const hash = await this.generateDataHash(data)
    const timestamp = new Date().toISOString()
    const checksum = await SecureWallet.generateIntegrityHash(`${hash}${timestamp}${this.VERSION}`)

    const integrityInfo: DataIntegrityInfo = {
      hash,
      timestamp,
      version: this.VERSION,
      checksum,
    }

    localStorage.setItem(this.INTEGRITY_KEY, JSON.stringify(integrityInfo))
    console.log("[v0] Data integrity record created")
    return integrityInfo
  }

  // Verify data integrity
  static async verifyDataIntegrity(data: any): Promise<{
    isValid: boolean
    issues: string[]
    lastVerified: string | null
  }> {
    const issues: string[] = []
    let isValid = true

    try {
      const storedIntegrityJson = localStorage.getItem(this.INTEGRITY_KEY)
      if (!storedIntegrityJson) {
        issues.push("No integrity record found")
        return { isValid: false, issues, lastVerified: null }
      }

      const storedIntegrity: DataIntegrityInfo = JSON.parse(storedIntegrityJson)

      // Verify checksum first
      const expectedChecksum = await SecureWallet.generateIntegrityHash(
        `${storedIntegrity.hash}${storedIntegrity.timestamp}${storedIntegrity.version}`,
      )

      if (storedIntegrity.checksum !== expectedChecksum) {
        issues.push("Integrity record has been tampered with")
        isValid = false
      }

      // Verify data hash
      const currentDataHash = await this.generateDataHash(data)
      if (storedIntegrity.hash !== currentDataHash) {
        issues.push("Data has been modified outside the application")
        isValid = false
      }

      // Check version compatibility
      if (storedIntegrity.version !== this.VERSION) {
        issues.push(`Version mismatch: expected ${this.VERSION}, found ${storedIntegrity.version}`)
        // This might not be a critical issue, just a warning
      }

      console.log("[v0] Data integrity verification completed:", isValid ? "PASSED" : "FAILED")
      if (issues.length > 0) {
        console.log("[v0] Integrity issues found:", issues)
      }

      return {
        isValid,
        issues,
        lastVerified: storedIntegrity.timestamp,
      }
    } catch (error) {
      console.error("[v0] Data integrity verification error:", error)
      issues.push("Failed to verify data integrity")
      return { isValid: false, issues, lastVerified: null }
    }
  }

  // Update integrity record after data changes
  static async updateIntegrityRecord(data: any): Promise<void> {
    try {
      await this.createIntegrityRecord(data)
      console.log("[v0] Data integrity record updated")
    } catch (error) {
      console.error("[v0] Failed to update integrity record:", error)
    }
  }

  // Clear integrity records (for data reset)
  static clearIntegrityRecords(): void {
    localStorage.removeItem(this.INTEGRITY_KEY)
    console.log("[v0] Data integrity records cleared")
  }

  // Get integrity status
  static async getIntegrityStatus(): Promise<{
    hasIntegrityRecord: boolean
    lastVerified: string | null
    version: string | null
  }> {
    const storedIntegrityJson = localStorage.getItem(this.INTEGRITY_KEY)

    if (!storedIntegrityJson) {
      return {
        hasIntegrityRecord: false,
        lastVerified: null,
        version: null,
      }
    }

    try {
      const storedIntegrity: DataIntegrityInfo = JSON.parse(storedIntegrityJson)
      return {
        hasIntegrityRecord: true,
        lastVerified: storedIntegrity.timestamp,
        version: storedIntegrity.version,
      }
    } catch (error) {
      console.error("[v0] Failed to parse integrity record:", error)
      return {
        hasIntegrityRecord: false,
        lastVerified: null,
        version: null,
      }
    }
  }

  // Validate specific data types
  static validateTransactionData(transactions: any[]): string[] {
    const issues: string[] = []

    transactions.forEach((transaction, index) => {
      if (!transaction.id || typeof transaction.id !== "string") {
        issues.push(`Transaction ${index}: Invalid or missing ID`)
      }

      if (!transaction.type || !["income", "expense"].includes(transaction.type)) {
        issues.push(`Transaction ${index}: Invalid transaction type`)
      }

      if (typeof transaction.amount !== "number" || transaction.amount < 0) {
        issues.push(`Transaction ${index}: Invalid amount`)
      }

      if (!transaction.date || isNaN(Date.parse(transaction.date))) {
        issues.push(`Transaction ${index}: Invalid date`)
      }
    })

    return issues
  }

  static validateUserProfile(profile: any): string[] {
    const issues: string[] = []

    if (!profile.name || typeof profile.name !== "string") {
      issues.push("User profile: Invalid or missing name")
    }

    if (typeof profile.monthlyEarning !== "number" || profile.monthlyEarning < 0) {
      issues.push("User profile: Invalid monthly earning")
    }

    if (typeof profile.workingHoursPerDay !== "number" || profile.workingHoursPerDay <= 0) {
      issues.push("User profile: Invalid working hours per day")
    }

    return issues
  }

  // Comprehensive data validation
  static async validateAllData(data: {
    userProfile: any
    transactions: any[]
    budgets: any[]
    goals: any[]
    categories: any[]
  }): Promise<{
    isValid: boolean
    issues: string[]
    integrityCheck: {
      isValid: boolean
      issues: string[]
      lastVerified: string | null
    }
  }> {
    const issues: string[] = []

    // Validate individual data types
    if (data.userProfile) {
      issues.push(...this.validateUserProfile(data.userProfile))
    }

    if (data.transactions) {
      issues.push(...this.validateTransactionData(data.transactions))
    }

    // Check data integrity
    const integrityCheck = await this.verifyDataIntegrity(data)

    return {
      isValid: issues.length === 0 && integrityCheck.isValid,
      issues,
      integrityCheck,
    }
  }
}
