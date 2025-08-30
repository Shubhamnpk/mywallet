// Secure PIN Manager for wallet authentication
// Manages PIN operations with PBKDF2, salt, and secure storage

import { SecureWallet } from "./security"
import { SecureKeyManager } from "./key-manager"

export interface PinSecurityConfig {
  minLength: number
  maxLength: number
  maxAttempts: number
  lockoutDuration: number // in milliseconds
  iterations: number
}

export interface PinAttemptResult {
  success: boolean
  attemptsRemaining: number
  isLocked: boolean
  lockoutTimeRemaining?: number
}

export class SecurePinManager {
  private static readonly PIN_HASH_KEY = "wallet_pin_hash"
  private static readonly PIN_SALT_KEY = "wallet_pin_salt"
  private static readonly PIN_ATTEMPTS_KEY = "wallet_pin_attempts"
  private static readonly PIN_LOCKOUT_KEY = "wallet_pin_lockout"
  private static readonly PIN_CONFIG_KEY = "wallet_pin_config"

  private static readonly DEFAULT_CONFIG: PinSecurityConfig = {
    minLength: 6,
    maxLength: 12,
    maxAttempts: 5,
    lockoutDuration: 5 * 60 * 1000, // 5 minutes
    iterations: 100000,
  }

  // Initialize PIN security configuration
  static initializeConfig(config?: Partial<PinSecurityConfig>): void {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config }
    localStorage.setItem(this.PIN_CONFIG_KEY, JSON.stringify(finalConfig))
    console.log("[v0] PIN security configuration initialized")
  }

  // Get current security configuration
  static getConfig(): PinSecurityConfig {
    const stored = localStorage.getItem(this.PIN_CONFIG_KEY)
    if (stored) {
      try {
        return { ...this.DEFAULT_CONFIG, ...JSON.parse(stored) }
      } catch (error) {
        console.error("[v0] Failed to parse PIN config, using defaults:", error)
      }
    }
    return this.DEFAULT_CONFIG
  }

  // Set up initial PIN
  static async setupPin(pin: string): Promise<boolean> {
    try {
      const config = this.getConfig()

      // Validate PIN length
      if (pin.length < config.minLength || pin.length > config.maxLength) {
        throw new Error(`PIN must be between ${config.minLength} and ${config.maxLength} characters`)
      }

      // Validate PIN contains only digits
      if (!/^\d+$/.test(pin)) {
        throw new Error("PIN must contain only numbers")
      }

      // Generate salt and hash PIN
      const salt = SecureWallet.generateSalt()
      const { hash } = await SecureWallet.hashPin(pin, salt)

      // Store securely
      localStorage.setItem(this.PIN_HASH_KEY, hash)
      localStorage.setItem(this.PIN_SALT_KEY, btoa(String.fromCharCode(...salt)))

      // Create master key for wallet encryption
      await SecureKeyManager.createMasterKey(pin)

      // Reset attempt counters
      this.resetAttempts()

      console.log("[v0] PIN setup completed successfully")
      return true
    } catch (error) {
      console.error("[v0] Failed to setup PIN:", error)
      return false
    }
  }

  // Validate PIN with security measures
  static async validatePin(pin: string): Promise<PinAttemptResult> {
    try {
      const config = this.getConfig()
      const attempts = this.getAttempts()
      const lockoutTime = this.getLockoutTime()

      // Check if currently locked out
      if (lockoutTime > Date.now()) {
        return {
          success: false,
          attemptsRemaining: 0,
          isLocked: true,
          lockoutTimeRemaining: lockoutTime - Date.now(),
        }
      }

      // Check if max attempts exceeded
      if (attempts >= config.maxAttempts) {
        this.setLockout()
        return {
          success: false,
          attemptsRemaining: 0,
          isLocked: true,
          lockoutTimeRemaining: config.lockoutDuration,
        }
      }

      // Retrieve stored hash and salt
      const storedHash = localStorage.getItem(this.PIN_HASH_KEY)
      const storedSalt = localStorage.getItem(this.PIN_SALT_KEY)

      if (!storedHash || !storedSalt) {
        console.error("[v0] No PIN credentials found")
        return {
          success: false,
          attemptsRemaining: config.maxAttempts - attempts - 1,
          isLocked: false,
        }
      }

      // Validate PIN
      const isValid = await SecureWallet.validatePin(pin, storedHash, storedSalt)

      if (isValid) {
        // Success - reset attempts and return master key
        this.resetAttempts()
        console.log("[v0] PIN validation successful")
        return {
          success: true,
          attemptsRemaining: config.maxAttempts,
          isLocked: false,
        }
      } else {
        // Failed - increment attempts
        const newAttempts = attempts + 1
        this.setAttempts(newAttempts)

        if (newAttempts >= config.maxAttempts) {
          this.setLockout()
          return {
            success: false,
            attemptsRemaining: 0,
            isLocked: true,
            lockoutTimeRemaining: config.lockoutDuration,
          }
        }

        console.log("[v0] PIN validation failed, attempts:", newAttempts)
        return {
          success: false,
          attemptsRemaining: config.maxAttempts - newAttempts,
          isLocked: false,
        }
      }
    } catch (error) {
      console.error("[v0] PIN validation error:", error)
      return {
        success: false,
        attemptsRemaining: 0,
        isLocked: true,
      }
    }
  }

  // Change PIN securely
  static async changePin(oldPin: string, newPin: string): Promise<boolean> {
    try {
      // First validate old PIN
      const validation = await this.validatePin(oldPin)
      if (!validation.success) {
        console.error("[v0] Old PIN validation failed")
        return false
      }

      // Setup new PIN
      const success = await this.setupPin(newPin)
      if (success) {
        console.log("[v0] PIN changed successfully")
      }
      return success
    } catch (error) {
      console.error("[v0] Failed to change PIN:", error)
      return false
    }
  }

  // Check if PIN is set up
  static hasPin(): boolean {
    return localStorage.getItem(this.PIN_HASH_KEY) !== null &&
           localStorage.getItem(this.PIN_SALT_KEY) !== null
  }

  // Check if PIN credentials exist
  static hasPinCredentials(): boolean {
    return this.hasPin()
  }

  // Get authentication status
  static getAuthStatus(): {
    hasPin: boolean
    isLocked: boolean
    attemptsRemaining: number
    lockoutTimeRemaining?: number
  } {
    const hasPin = this.hasPin()
    const config = this.getConfig()
    const attempts = this.getAttempts()
    const lockoutTime = this.getLockoutTime()

    if (lockoutTime > Date.now()) {
      return {
        hasPin,
        isLocked: true,
        attemptsRemaining: 0,
        lockoutTimeRemaining: lockoutTime - Date.now(),
      }
    }

    return {
      hasPin,
      isLocked: false,
      attemptsRemaining: config.maxAttempts - attempts,
    }
  }

  // Reset PIN (for security/emergency)
  static resetPin(): void {
    localStorage.removeItem(this.PIN_HASH_KEY)
    localStorage.removeItem(this.PIN_SALT_KEY)
    this.resetAttempts()
    SecureKeyManager.clearAllKeys()
    console.log("[v0] PIN and keys reset")
  }

  // Private helper methods
  private static getAttempts(): number {
    const stored = localStorage.getItem(this.PIN_ATTEMPTS_KEY)
    return stored ? parseInt(stored, 10) : 0
  }

  private static setAttempts(attempts: number): void {
    localStorage.setItem(this.PIN_ATTEMPTS_KEY, attempts.toString())
  }

  private static resetAttempts(): void {
    localStorage.removeItem(this.PIN_ATTEMPTS_KEY)
    localStorage.removeItem(this.PIN_LOCKOUT_KEY)
  }

  private static getLockoutTime(): number {
    const stored = localStorage.getItem(this.PIN_LOCKOUT_KEY)
    return stored ? parseInt(stored, 10) : 0
  }

  private static setLockout(): void {
    const lockoutTime = Date.now() + this.getConfig().lockoutDuration
    localStorage.setItem(this.PIN_LOCKOUT_KEY, lockoutTime.toString())
    console.log("[v0] PIN lockout activated")
  }
}