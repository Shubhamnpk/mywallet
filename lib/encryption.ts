// Encryption utilities for wallet data security
export class WalletEncryption {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12

  /**
   * Get the crypto API (works in both browser and Node.js)
   */
  private static getCrypto(): Crypto {
    if (typeof window !== 'undefined' && window.crypto) {
      return window.crypto
    }
    if (typeof globalThis !== 'undefined' && globalThis.crypto) {
      return globalThis.crypto
    }
    // Fallback for Node.js environment
    try {
      const { webcrypto } = require('crypto')
      return webcrypto as Crypto
    } catch {
      throw new Error('Crypto API not available')
    }
  }

  /**
   * Generate a new encryption key from user password
   */
  static async generateKeyFromPassword(password: string, salt?: Uint8Array): Promise<CryptoKey> {
    const crypto = this.getCrypto()

    if (!salt) {
      salt = crypto.getRandomValues(new Uint8Array(16))
    }

    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Encrypt data using AES-GCM
   */
  static async encrypt(data: string, key: CryptoKey): Promise<string> {
    try {
      const crypto = this.getCrypto()
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(data)
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))

      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        dataBuffer
      )

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encrypted), iv.length)

      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combined))
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypt data using AES-GCM
   */
  static async decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
    try {
      const crypto = this.getCrypto()

      // Validate input
      if (!encryptedData || typeof encryptedData !== 'string') {
        throw new Error('Invalid encrypted data format')
      }

      // Check if data looks like valid base64 (more lenient validation)
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encryptedData) || encryptedData.length % 4 !== 0) {
        throw new Error('Data does not appear to be valid base64')
      }

      // Convert from base64 with additional error handling
      let combined: Uint8Array
      try {
        combined = new Uint8Array(
          atob(encryptedData).split('').map(char => char.charCodeAt(0))
        )
      } catch (base64Error) {
        console.error('Base64 decoding failed:', base64Error)
        throw new Error('Invalid base64 data format')
      }

      // Validate data length (encrypted data should be at least IV + 1 byte)
      if (combined.length < this.IV_LENGTH + 1) {
        throw new Error('Encrypted data too short')
      }

      // Extract IV and encrypted data
      const iv = combined.slice(0, this.IV_LENGTH)
      const encrypted = combined.slice(this.IV_LENGTH)

      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        encrypted
      )

      const decoder = new TextDecoder()
      return decoder.decode(decrypted)
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error(`Failed to decrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate a secure random key for encryption
   */
  static async generateRandomKey(): Promise<CryptoKey> {
    const crypto = this.getCrypto()

    return crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      true,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Export key for storage (only for random keys, not password-derived)
   */
  static async exportKey(key: CryptoKey): Promise<string> {
    const crypto = this.getCrypto()
    const exported = await crypto.subtle.exportKey('raw', key)
    return btoa(String.fromCharCode(...new Uint8Array(exported)))
  }

  /**
   * Import key from storage
   */
  static async importKey(keyData: string): Promise<CryptoKey> {
    const crypto = this.getCrypto()
    const keyBuffer = new Uint8Array(
      atob(keyData).split('').map(char => char.charCodeAt(0))
    )

    return crypto.subtle.importKey(
      'raw',
      keyBuffer,
      this.ALGORITHM,
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Hash data for integrity checking
   */
  static async hashData(data: string): Promise<string> {
    const crypto = this.getCrypto()
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = new Uint8Array(hashBuffer)

    return Array.from(hashArray)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * Verify data integrity using hash
   */
  static async verifyIntegrity(data: string, expectedHash: string): Promise<boolean> {
    try {
      const actualHash = await this.hashData(data)
      return actualHash === expectedHash
    } catch (error) {
      console.error('Integrity verification failed:', error)
      return false
    }
  }
}

// Key management for different data types
export class KeyManager {
  private static readonly STORAGE_PREFIX = 'wallet_key_'

  /**
   * Store encryption key securely
   */
  static async storeKey(keyId: string, key: CryptoKey): Promise<void> {
    try {
      const exportedKey = await WalletEncryption.exportKey(key)
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`${this.STORAGE_PREFIX}${keyId}`, exportedKey)
      }
    } catch (error) {
      console.error('Failed to store key:', error)
      throw new Error('Failed to store encryption key')
    }
  }

  /**
   * Retrieve encryption key
   */
  static async getKey(keyId: string): Promise<CryptoKey | null> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return null
      }

      const storedKey = localStorage.getItem(`${this.STORAGE_PREFIX}${keyId}`)
      if (!storedKey) {
        return null
      }

      return await WalletEncryption.importKey(storedKey)
    } catch (error) {
      console.error('Failed to retrieve key:', error)
      return null
    }
  }

  /**
   * Generate and store a new key
   */
  static async generateAndStoreKey(keyId: string): Promise<CryptoKey> {
    try {
      const key = await WalletEncryption.generateRandomKey()
      await this.storeKey(keyId, key)
      return key
    } catch (error) {
      console.error('Failed to generate and store key:', error)
      throw new Error('Failed to create encryption key')
    }
  }

  /**
   * Delete stored key
   */
  static deleteKey(keyId: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(`${this.STORAGE_PREFIX}${keyId}`)
      }
    } catch (error) {
      console.error('Failed to delete key:', error)
    }
  }

  /**
   * Clear all stored keys
   */
  static clearAllKeys(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keys = Object.keys(localStorage).filter(key =>
          key.startsWith(this.STORAGE_PREFIX)
        )
        keys.forEach(key => localStorage.removeItem(key))
      }
    } catch (error) {
      console.error('Failed to clear keys:', error)
    }
  }
}

// Main encryption service for wallet data
export class WalletDataEncryption {
  private static readonly WALLET_KEY_ID = 'wallet_master'
  private static encryptionKey: CryptoKey | null = null

  /**
   * Initialize encryption with user password
   */
  static async initializeWithPassword(password: string): Promise<void> {
    try {
      this.encryptionKey = await WalletEncryption.generateKeyFromPassword(password)
    } catch (error) {
      console.error('Failed to initialize encryption:', error)
      throw new Error('Failed to initialize data encryption')
    }
  }

  /**
   * Initialize with stored key
   */
  static async initializeWithStoredKey(): Promise<boolean> {
    try {
      this.encryptionKey = await KeyManager.getKey(this.WALLET_KEY_ID)
      return this.encryptionKey !== null
    } catch (error) {
      console.error('Failed to initialize with stored key:', error)
      return false
    }
  }

  /**
   * Generate and store a new encryption key
   */
  static async generateNewKey(): Promise<void> {
    try {
      this.encryptionKey = await KeyManager.generateAndStoreKey(this.WALLET_KEY_ID)
    } catch (error) {
      console.error('Failed to generate new key:', error)
      throw new Error('Failed to create encryption key')
    }
  }

  /**
   * Encrypt wallet data
   */
  static async encryptData(data: any): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption not initialized')
    }

    try {
      const jsonData = JSON.stringify(data)
      const encrypted = await WalletEncryption.encrypt(jsonData, this.encryptionKey)
      return encrypted
    } catch (error) {
      console.error('Failed to encrypt data:', error)
      throw new Error('Failed to encrypt wallet data')
    }
  }

  /**
   * Decrypt wallet data
   */
  static async decryptData(encryptedData: string): Promise<any> {
    if (!this.encryptionKey) {
      throw new Error('Encryption not initialized')
    }

    try {
      const decryptedJson = await WalletEncryption.decrypt(encryptedData, this.encryptionKey)
      return JSON.parse(decryptedJson)
    } catch (error) {
      console.error('Failed to decrypt data:', error)
      throw new Error('Failed to decrypt wallet data')
    }
  }

  /**
   * Encrypt and hash data for storage
   */
  static async encryptDataWithIntegrity(data: any): Promise<{ encrypted: string; hash: string }> {
    const jsonData = JSON.stringify(data)
    const encrypted = await this.encryptData(data)
    const hash = await WalletEncryption.hashData(jsonData)

    return { encrypted, hash }
  }

  /**
   * Decrypt and verify data integrity
   */
  static async decryptDataWithIntegrity(encryptedData: string, expectedHash: string): Promise<any> {
    const decryptedData = await this.decryptData(encryptedData)
    const jsonData = JSON.stringify(decryptedData)

    const isValid = await WalletEncryption.verifyIntegrity(jsonData, expectedHash)
    if (!isValid) {
      throw new Error('Data integrity check failed')
    }

    return decryptedData
  }

  /**
   * Check if encryption is ready
   */
  static isInitialized(): boolean {
    return this.encryptionKey !== null
  }

  /**
   * Clear encryption state
   */
  static clear(): void {
    this.encryptionKey = null
    KeyManager.deleteKey(this.WALLET_KEY_ID)
  }
}
