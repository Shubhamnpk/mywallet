// Advanced encryption utilities for secure wallet data protection
// Uses Web Crypto API for production-grade security

export class SecureWallet {
  private static readonly ALGORITHM = "AES-GCM"
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12
  private static readonly TAG_LENGTH = 16
  private static readonly PBKDF2_ITERATIONS = 100000

  // Generate a cryptographically secure key from PIN using PBKDF2
  static async deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const pinBuffer = encoder.encode(pin)

    // Import PIN as raw key material
    const keyMaterial = await crypto.subtle.importKey("raw", pinBuffer, "PBKDF2", false, ["deriveKey"])

    // Derive AES key using PBKDF2
    return await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        // Web Crypto expects a BufferSource (ArrayBuffer or ArrayBufferView).
        // Coerce the Uint8Array to ArrayBuffer to satisfy TypeScript's lib.dom typing.
        salt: (salt as unknown) as ArrayBuffer,
        iterations: this.PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      false,
      ["encrypt", "decrypt"],
    )
  }

  // Generate cryptographically secure salt
  static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32))
  }

  // Generate cryptographically secure IV
  static generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
  }

  // Encrypt data using AES-256-GCM
  static async encryptData(data: string, key: CryptoKey): Promise<string> {
    try {
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(data)
      const iv = this.generateIV()

      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          // Coerce iv to ArrayBuffer for typings
          iv: (iv as unknown) as ArrayBuffer,
        },
        key,
        dataBuffer,
      )

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encryptedBuffer), iv.length)

      // Return base64 encoded result
      return btoa(String.fromCharCode(...combined))
    } catch (error) {
      throw new Error("Encryption failed: " + (error as Error).message)
    }
  }

  // Decrypt data using AES-256-GCM
  static async decryptData(encryptedData: string, key: CryptoKey): Promise<string> {
    try {
      // Decode base64
      const combined = new Uint8Array(
        atob(encryptedData)
          .split("")
          .map((char) => char.charCodeAt(0)),
      )

      // Extract IV and encrypted data
      const iv = combined.slice(0, this.IV_LENGTH)
      const encrypted = combined.slice(this.IV_LENGTH)

      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        encrypted,
      )

      const decoder = new TextDecoder()
      return decoder.decode(decryptedBuffer)
    } catch (error) {
      throw new Error("Decryption failed: " + (error as Error).message)
    }
  }

  // Hash PIN using PBKDF2 with salt
  static async hashPin(pin: string, salt?: Uint8Array): Promise<{ hash: string; salt: string }> {
    const pinSalt = salt || this.generateSalt()

    const encoder = new TextEncoder()
    const pinBuffer = encoder.encode(pin)

    const keyMaterial = await crypto.subtle.importKey("raw", pinBuffer, "PBKDF2", false, ["deriveBits"])

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        // Coerce salt to ArrayBuffer for typings
        salt: (pinSalt as unknown) as ArrayBuffer,
        iterations: this.PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      256,
    )

    const hashArray = new Uint8Array(hashBuffer)
    const hashBase64 = btoa(String.fromCharCode(...hashArray))
    const saltBase64 = btoa(String.fromCharCode(...pinSalt))

    return {
      hash: hashBase64,
      salt: saltBase64,
    }
  }

  // Validate PIN against stored hash
  static async validatePin(inputPin: string, storedHash: string, storedSalt: string): Promise<boolean> {
    try {
      const salt = new Uint8Array(
        atob(storedSalt)
          .split("")
          .map((char) => char.charCodeAt(0)),
      )

      const { hash } = await this.hashPin(inputPin, salt)
      return hash === storedHash
    } catch (error) {
      console.error("PIN validation error:", error)
      return false
    }
  }

  // Generate data integrity hash
  static async generateIntegrityHash(data: string): Promise<string> {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)

    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer)
    const hashArray = new Uint8Array(hashBuffer)

    return btoa(String.fromCharCode(...hashArray))
  }

  // Verify data integrity
  static async verifyIntegrity(data: string, expectedHash: string): Promise<boolean> {
    try {
      const actualHash = await this.generateIntegrityHash(data)
      return actualHash === expectedHash
    } catch (error) {
      console.error("Integrity verification error:", error)
      return false
    }
  }
}

// Legacy functions for backward compatibility (deprecated)
export function encryptData(data: string, key: string): string {
  console.warn("Using deprecated encryptData function. Use SecureWallet.encryptData instead.")
  let encrypted = ""
  for (let i = 0; i < data.length; i++) {
    encrypted += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return btoa(encrypted)
}

export function decryptData(encryptedData: string, key: string): string {
  console.warn("Using deprecated decryptData function. Use SecureWallet.decryptData instead.")
  try {
    const data = atob(encryptedData)
    let decrypted = ""
    for (let i = 0; i < data.length; i++) {
      decrypted += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return decrypted
  } catch {
    throw new Error("Failed to decrypt data")
  }
}

export function hashPin(pin: string): string {
  console.warn("Using deprecated hashPin function. Use SecureWallet.hashPin instead.")
  let hash = 0
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash.toString()
}

export function validatePin(inputPin: string, hashedPin: string): boolean {
  console.warn("Using deprecated validatePin function. Use SecureWallet.validatePin instead.")
  return hashPin(inputPin) === hashedPin
}
