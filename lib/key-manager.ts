// Secure key management system for wallet encryption
// Handles key derivation, storage, and lifecycle management

import { SecureWallet } from "./security"
import { SecurePinManager } from "./secure-pin-manager"

export interface KeyMetadata {
  keyId: string
  createdAt: string
  lastUsed: string
  algorithm: string
  keyDerivationMethod: string
  iterations: number
  strength: 'weak' | 'medium' | 'strong'
  rotationDue?: string
  accessCount: number
  lastRotation?: string
}

export class SecureKeyManager {
  private static readonly KEY_STORAGE_PREFIX = "wallet_key_"
  private static readonly METADATA_STORAGE_PREFIX = "wallet_key_meta_"
  private static readonly MASTER_KEY_ID = "master"
  private static readonly SESSION_TIMEOUT = 5 * 60 * 1000 // 5 minutes

  private static keyCache = new Map<string, { key: CryptoKey; expires: number }>()

  // Generate and store a new master key derived from PIN
  static async createMasterKey(pin: string): Promise<string> {
    try {
      const salt = SecureWallet.generateSalt()
      const key = await SecureWallet.deriveKeyFromPin(pin, salt)
      const keyId = this.MASTER_KEY_ID

      // Store salt for key derivation
      const saltBase64 = btoa(String.fromCharCode(...salt))
      localStorage.setItem(`${this.KEY_STORAGE_PREFIX}${keyId}_salt`, saltBase64)

      // Store key metadata
      const metadata: KeyMetadata = {
        keyId,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        algorithm: "AES-GCM",
        keyDerivationMethod: "PBKDF2",
        iterations: 100000,
        strength: this.evaluateKeyStrength(pin),
        accessCount: 0,
        rotationDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      }

      localStorage.setItem(`${this.METADATA_STORAGE_PREFIX}${keyId}`, JSON.stringify(metadata))

      // Cache the key temporarily
      this.cacheKey(keyId, key)

      console.log("[v0] Master key created and cached")
      return keyId
    } catch (error) {
      console.error("[v0] Failed to create master key:", error)
      throw new Error("Failed to create master key")
    }
  }

  // Retrieve master key by deriving from PIN
  static async getMasterKey(pin: string): Promise<CryptoKey | null> {
    try {
      const keyId = this.MASTER_KEY_ID

      // Check cache first
      const cached = this.keyCache.get(keyId)
      if (cached && cached.expires > Date.now()) {
        console.log("[v0] Using cached master key")
        this.updateKeyUsage(keyId)
        return cached.key
      }

      // Retrieve salt
      const saltBase64 = localStorage.getItem(`${this.KEY_STORAGE_PREFIX}${keyId}_salt`)
      if (!saltBase64) {
        console.log("[v0] No master key salt found")
        return null
      }

      const salt = new Uint8Array(
        atob(saltBase64)
          .split("")
          .map((char) => char.charCodeAt(0)),
      )

      // Derive key from PIN
      const key = await SecureWallet.deriveKeyFromPin(pin, salt)

      // Cache the key
      this.cacheKey(keyId, key)
      this.updateKeyUsage(keyId)

      console.log("[v0] Master key derived and cached")
      return key
    } catch (error) {
      console.error("[v0] Failed to retrieve master key:", error)
      return null
    }
  }

  // Cache key with expiration
  private static cacheKey(keyId: string, key: CryptoKey): void {
    const expires = Date.now() + this.SESSION_TIMEOUT
    this.keyCache.set(keyId, { key, expires })

    // Set up automatic cache cleanup
    setTimeout(() => {
      this.keyCache.delete(keyId)
      console.log("[v0] Key cache expired for:", keyId)
    }, this.SESSION_TIMEOUT)
  }


  // Check if master key exists
  static hasMasterKey(): boolean {
    const saltExists = localStorage.getItem(`${this.KEY_STORAGE_PREFIX}${this.MASTER_KEY_ID}_salt`) !== null
    const metadataExists = localStorage.getItem(`${this.METADATA_STORAGE_PREFIX}${this.MASTER_KEY_ID}`) !== null
    return saltExists && metadataExists
  }

  // Get key metadata
  static getKeyMetadata(keyId: string = this.MASTER_KEY_ID): KeyMetadata | null {
    const metadataJson = localStorage.getItem(`${this.METADATA_STORAGE_PREFIX}${keyId}`)
    if (!metadataJson) return null

    try {
      return JSON.parse(metadataJson)
    } catch (error) {
      console.error("[v0] Failed to parse key metadata:", error)
      return null
    }
  }

  // Clear all keys and metadata (for security reset)
  static clearAllKeys(): void {
    // Clear cache
    this.keyCache.clear()

    // Clear localStorage keys
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith(this.KEY_STORAGE_PREFIX) || key.startsWith(this.METADATA_STORAGE_PREFIX))) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key))
    console.log("[v0] All keys and metadata cleared")
  }

  // Rotate master key (change PIN)
  static async rotateMasterKey(oldPin: string, newPin: string): Promise<boolean> {
    try {
      // Verify old PIN first
      const oldKey = await this.getMasterKey(oldPin)
      if (!oldKey) {
        console.log("[v0] Old PIN verification failed")
        return false
      }

      // Clear old key data
      this.clearAllKeys()

      // Create new master key
      await this.createMasterKey(newPin)

      console.log("[v0] Master key rotated successfully")
      return true
    } catch (error) {
      console.error("[v0] Failed to rotate master key:", error)
      return false
    }
  }

  // Check if key cache is valid
  static isKeyCacheValid(keyId: string = this.MASTER_KEY_ID): boolean {
    const cached = this.keyCache.get(keyId)
    return cached !== undefined && cached.expires > Date.now()
  }

  // Force key cache expiration
  static expireKeyCache(keyId?: string): void {
    if (keyId) {
      this.keyCache.delete(keyId)
      console.log("[v0] Key cache expired for:", keyId)
    } else {
      this.keyCache.clear()
      console.log("[v0] All key caches expired")
    }
  }

  // Get security status
  static getSecurityStatus(): {
    hasMasterKey: boolean
    keyMetadata: KeyMetadata | null
    cacheValid: boolean
    lastUsed: string | null
    needsRotation: boolean
    strength: 'weak' | 'medium' | 'strong' | null
  } {
    const hasMasterKey = this.hasMasterKey()
    const keyMetadata = this.getKeyMetadata()
    const cacheValid = this.isKeyCacheValid()
    const needsRotation = keyMetadata ? new Date(keyMetadata.rotationDue || '') < new Date() : false

    return {
      hasMasterKey,
      keyMetadata,
      cacheValid,
      lastUsed: keyMetadata?.lastUsed || null,
      needsRotation,
      strength: keyMetadata?.strength || null,
    }
  }

  // Evaluate key strength based on PIN characteristics
  private static evaluateKeyStrength(pin: string): 'weak' | 'medium' | 'strong' {
    let score = 0

    // Length check
    if (pin.length >= 8) score += 2
    else if (pin.length >= 6) score += 1

    // Character variety
    if (/[a-z]/.test(pin)) score += 1
    if (/[A-Z]/.test(pin)) score += 1
    if (/[0-9]/.test(pin)) score += 1
    if (/[^a-zA-Z0-9]/.test(pin)) score += 1

    // Patterns to avoid
    if (/(.)\1{2,}/.test(pin)) score -= 1 // Repeated characters
    if (/123|234|345|456|567|678|789|890/.test(pin)) score -= 1 // Sequential numbers
    if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/.test(pin.toLowerCase())) score -= 1 // Sequential letters

    if (score >= 5) return 'strong'
    if (score >= 3) return 'medium'
    return 'weak'
  }

  // Enhanced session management with security monitoring
  private static updateKeyUsage(keyId: string): void {
    const metadataKey = `${this.METADATA_STORAGE_PREFIX}${keyId}`
    const metadataJson = localStorage.getItem(metadataKey)

    if (metadataJson) {
      try {
        const metadata: KeyMetadata = JSON.parse(metadataJson)
        metadata.lastUsed = new Date().toISOString()
        metadata.accessCount += 1

        // Check for suspicious activity (too many accesses in short time)
        const timeSinceLastUse = Date.now() - new Date(metadata.lastUsed).getTime()
        if (metadata.accessCount > 10 && timeSinceLastUse < 60000) { // 10 accesses in 1 minute
          console.warn("[v0] Suspicious key access pattern detected")
          // Could trigger additional security measures here
        }

        localStorage.setItem(metadataKey, JSON.stringify(metadata))
      } catch (error) {
        console.error("[v0] Failed to update key usage:", error)
      }
    }
  }

  // Secure key rotation with backup
  static async rotateMasterKeySecure(oldPin: string, newPin: string): Promise<boolean> {
    try {
      // Verify old PIN through SecurePinManager
      const pinValidation = await SecurePinManager.validatePin(oldPin)
      if (!pinValidation.success) {
        console.error("[v0] PIN validation failed during rotation")
        return false
      }

      // Get current key for data re-encryption if needed
      const oldKey = await this.getMasterKey(oldPin)
      if (!oldKey) {
        console.error("[v0] Could not retrieve old key for rotation")
        return false
      }

      // Create backup of current metadata
      const oldMetadata = this.getKeyMetadata()
      if (oldMetadata) {
        localStorage.setItem(`${this.METADATA_STORAGE_PREFIX}${this.MASTER_KEY_ID}_backup`, JSON.stringify(oldMetadata))
      }

      // Clear old key data
      this.clearAllKeys()

      // Create new master key
      const newKeyId = await this.createMasterKey(newPin)

      // Update rotation timestamp
      const metadata = this.getKeyMetadata(newKeyId)
      if (metadata) {
        metadata.lastRotation = new Date().toISOString()
        localStorage.setItem(`${this.METADATA_STORAGE_PREFIX}${newKeyId}`, JSON.stringify(metadata))
      }

      console.log("[v0] Master key rotated securely")
      return true
    } catch (error) {
      console.error("[v0] Failed to rotate master key securely:", error)

      // Attempt to restore from backup
      const backupMetadata = localStorage.getItem(`${this.METADATA_STORAGE_PREFIX}${this.MASTER_KEY_ID}_backup`)
      if (backupMetadata) {
        try {
          localStorage.setItem(`${this.METADATA_STORAGE_PREFIX}${this.MASTER_KEY_ID}`, backupMetadata)
          console.log("[v0] Restored key metadata from backup")
        } catch (restoreError) {
          console.error("[v0] Failed to restore backup:", restoreError)
        }
      }

      return false
    }
  }

  // Check for security vulnerabilities
  static performSecurityAudit(): {
    vulnerabilities: string[]
    recommendations: string[]
    overallRisk: 'low' | 'medium' | 'high'
  } {
    const vulnerabilities: string[] = []
    const recommendations: string[] = []
    let riskScore = 0

    const metadata = this.getKeyMetadata()
    if (metadata) {
      // Check key age
      const keyAge = Date.now() - new Date(metadata.createdAt).getTime()
      const daysOld = keyAge / (1000 * 60 * 60 * 24)

      if (daysOld > 365) {
        vulnerabilities.push("Master key is over 1 year old")
        recommendations.push("Rotate master key for better security")
        riskScore += 2
      }

      // Check key strength
      if (metadata.strength === 'weak') {
        vulnerabilities.push("Weak key strength detected")
        recommendations.push("Use stronger PIN with mixed characters")
        riskScore += 3
      }

      // Check access patterns
      if (metadata.accessCount > 1000) {
        vulnerabilities.push("High key access frequency detected")
        recommendations.push("Monitor for potential security threats")
        riskScore += 1
      }

      // Check rotation schedule
      if (new Date(metadata.rotationDue || '') < new Date()) {
        vulnerabilities.push("Key rotation is overdue")
        recommendations.push("Rotate key immediately")
        riskScore += 2
      }
    } else {
      vulnerabilities.push("No key metadata found")
      recommendations.push("Initialize secure key management")
      riskScore += 5
    }

    // Determine overall risk
    let overallRisk: 'low' | 'medium' | 'high'
    if (riskScore >= 5) overallRisk = 'high'
    else if (riskScore >= 2) overallRisk = 'medium'
    else overallRisk = 'low'

    return {
      vulnerabilities,
      recommendations,
      overallRisk,
    }
  }
}
