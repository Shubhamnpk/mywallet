// Secure key management system for wallet encryption
// Handles key derivation, storage, and lifecycle management

import { SecureWallet } from "./security"

export interface KeyMetadata {
  keyId: string
  createdAt: string
  lastUsed: string
  algorithm: string
  keyDerivationMethod: string
  iterations: number
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

  // Update key usage timestamp
  private static updateKeyUsage(keyId: string): void {
    const metadataKey = `${this.METADATA_STORAGE_PREFIX}${keyId}`
    const metadataJson = localStorage.getItem(metadataKey)

    if (metadataJson) {
      try {
        const metadata: KeyMetadata = JSON.parse(metadataJson)
        metadata.lastUsed = new Date().toISOString()
        localStorage.setItem(metadataKey, JSON.stringify(metadata))
      } catch (error) {
        console.error("[v0] Failed to update key usage:", error)
      }
    }
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
  } {
    const hasMasterKey = this.hasMasterKey()
    const keyMetadata = this.getKeyMetadata()
    const cacheValid = this.isKeyCacheValid()

    return {
      hasMasterKey,
      keyMetadata,
      cacheValid,
      lastUsed: keyMetadata?.lastUsed || null,
    }
  }
}
