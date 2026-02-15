// Data integrity verification system for wallet data
// Ensures data hasn't been tampered with and maintains consistency

import { SecureWallet } from "./security"
import { SecureKeyManager } from "./key-manager"

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

      if (issues.length > 0) {
      }

      return {
        isValid,
        issues,
        lastVerified: storedIntegrity.timestamp,
      }
    } catch (error) {
      issues.push("Failed to verify data integrity")
      return { isValid: false, issues, lastVerified: null }
    }
  }

  // Update integrity record after data changes
  static async updateIntegrityRecord(data: any): Promise<void> {
    try {
      await this.createIntegrityRecord(data)
    } catch (error) {
    }
  }

  // Clear integrity records (for data reset)
  static clearIntegrityRecords(): void {
    localStorage.removeItem(this.INTEGRITY_KEY)
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

  // PIN-protected integrity verification using master key
  static async createSecureIntegrityRecord(data: any): Promise<void> {
    try {
      const masterKey = await SecureKeyManager.getMasterKey("")
      if (!masterKey) {
        throw new Error("No master key available for secure integrity")
      }

      // Create integrity hash
      const dataHash = await this.generateDataHash(data)

      // Encrypt the hash with master key for additional protection
      const encryptedHash = await SecureWallet.encryptData(dataHash, masterKey)

      const timestamp = new Date().toISOString()
      const checksum = await SecureWallet.generateIntegrityHash(`${encryptedHash}${timestamp}${this.VERSION}`)

      const secureIntegrityInfo = {
        encryptedHash,
        timestamp,
        version: this.VERSION,
        checksum,
        keyId: SecureKeyManager.getKeyMetadata()?.keyId || "unknown",
      }

      localStorage.setItem(`${this.INTEGRITY_KEY}_secure`, JSON.stringify(secureIntegrityInfo))
    } catch (error) {
      throw error
    }
  }

  // Verify PIN-protected integrity
  static async verifySecureIntegrity(data: any): Promise<{
    isValid: boolean
    issues: string[]
    lastVerified: string | null
    keyValid: boolean
  }> {
    const issues: string[] = []
    let isValid = true
    let keyValid = true

    try {
      const secureIntegrityJson = localStorage.getItem(`${this.INTEGRITY_KEY}_secure`)
      if (!secureIntegrityJson) {
        issues.push("No secure integrity record found")
        return { isValid: false, issues, lastVerified: null, keyValid: false }
      }

      const secureIntegrity = JSON.parse(secureIntegrityJson)

      // Verify master key is still valid
      const masterKey = await SecureKeyManager.getMasterKey("")
      if (!masterKey) {
        issues.push("Master key not available for integrity verification")
        keyValid = false
        isValid = false
      } else {
        // Decrypt and verify the hash
        try {
          const decryptedHash = await SecureWallet.decryptData(secureIntegrity.encryptedHash, masterKey)
          const currentDataHash = await this.generateDataHash(data)

          if (decryptedHash !== currentDataHash) {
            issues.push("Secure data integrity compromised")
            isValid = false
          }
        } catch (decryptError) {
          issues.push("Failed to decrypt integrity hash")
          isValid = false
        }
      }

      // Verify checksum
      const expectedChecksum = await SecureWallet.generateIntegrityHash(
        `${secureIntegrity.encryptedHash}${secureIntegrity.timestamp}${secureIntegrity.version}`,
      )

      if (secureIntegrity.checksum !== expectedChecksum) {
        issues.push("Secure integrity record has been tampered with")
        isValid = false
      }

      // Check version compatibility
      if (secureIntegrity.version !== this.VERSION) {
        issues.push(`Version mismatch: expected ${this.VERSION}, found ${secureIntegrity.version}`)
      }

      if (issues.length > 0) {
      }

      return {
        isValid,
        issues,
        lastVerified: secureIntegrity.timestamp,
        keyValid,
      }
    } catch (error) {
      issues.push("Failed to verify secure data integrity")
      return { isValid: false, issues, lastVerified: null, keyValid: false }
    }
  }

  // Enhanced integrity check combining both methods
  static async performComprehensiveIntegrityCheck(data: any): Promise<{
    basicIntegrity: {
      isValid: boolean
      issues: string[]
      lastVerified: string | null
    }
    secureIntegrity: {
      isValid: boolean
      issues: string[]
      lastVerified: string | null
      keyValid: boolean
    }
    overallValid: boolean
    recommendations: string[]
  }> {
    const basicIntegrity = await this.verifyDataIntegrity(data)
    const secureIntegrity = await this.verifySecureIntegrity(data)

    const overallValid = basicIntegrity.isValid && secureIntegrity.isValid
    const recommendations: string[] = []

    if (!basicIntegrity.isValid) {
      recommendations.push("Basic integrity check failed - data may be corrupted")
    }

    if (!secureIntegrity.isValid) {
      recommendations.push("Secure integrity check failed - investigate potential security breach")
    }

    if (!secureIntegrity.keyValid) {
      recommendations.push("Master key validation failed - re-authenticate to restore security")
    }

    return {
      basicIntegrity,
      secureIntegrity,
      overallValid,
      recommendations,
    }
  }
}
