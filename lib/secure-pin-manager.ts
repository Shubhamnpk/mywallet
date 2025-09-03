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

export interface ProgressiveLevelConfig {
  attempts: number
  timeout: number // in milliseconds
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

  // Emergency PIN keys
  private static readonly EMERGENCY_PIN_HASH_KEY = "wallet_emergency_pin_hash"
  private static readonly EMERGENCY_PIN_SALT_KEY = "wallet_emergency_pin_salt"
  private static readonly EMERGENCY_PIN_ATTEMPTS_KEY = "wallet_emergency_pin_attempts"
  private static readonly EMERGENCY_PIN_LOCKOUT_KEY = "wallet_emergency_pin_lockout"

  // Progressive security level keys
  private static readonly SECURITY_LEVEL_KEY = "wallet_security_level"
  private static readonly EMERGENCY_SECURITY_LEVEL_KEY = "wallet_emergency_security_level"

  // Debug method to check all localStorage keys
  private static debugLocalStorage(): void {
    console.log(`[Progressive] All localStorage keys:`)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      const value = localStorage.getItem(key!)
      console.log(`  ${key}: ${value}`)
    }
  }

  
  // Progressive security levels configuration
  private static readonly PROGRESSIVE_LEVELS: ProgressiveLevelConfig[] = [
    { attempts: 3, timeout: 0 },
    { attempts: 3, timeout: 1 * 60 * 1000 },
    { attempts: 1, timeout: 1 * 60 * 1000 },
    { attempts: 1, timeout: 5 * 60 * 1000 },
  ]

  // Initialize PIN security configuration
  static initializeConfig(config?: Partial<PinSecurityConfig>): void {
    const defaultConfig = {
      minLength: 6,
      maxLength: 12,
      maxAttempts: 5,
      lockoutDuration: 5 * 60 * 1000,
      iterations: 100000,
    }
    const finalConfig = { ...defaultConfig, ...config }
    localStorage.setItem(this.PIN_CONFIG_KEY, JSON.stringify(finalConfig))
  }

  // Get current security configuration
  static getConfig(): PinSecurityConfig {
    const stored = localStorage.getItem(this.PIN_CONFIG_KEY)
    if (stored) {
      try {
        const defaultConfig = {
          minLength: 6,
          maxLength: 12,
          maxAttempts: 5,
          lockoutDuration: 5 * 60 * 1000,
          iterations: 100000,
        }
        return { ...defaultConfig, ...JSON.parse(stored) }
      } catch (error) {
      }
    }
    return {
      minLength: 6,
      maxLength: 12,
      maxAttempts: 5,
      lockoutDuration: 5 * 60 * 1000,
      iterations: 100000,
    }
  }

  // Set up initial PIN
  static async setupPin(pin: string): Promise<boolean> {
    try {
      console.log(`[Progressive] Setting up new PIN`)
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
      console.log(`[Progressive] Setup PIN - calling resetAttempts()`)
      this.resetAttempts()

      return true
    } catch (error) {
      console.log(`[Progressive] Setup PIN failed:`, error)
      return false
    }
  }

  // Set up emergency PIN
  static async setupEmergencyPin(pin: string): Promise<boolean> {
    try {
      const config = this.getConfig()

      // Validate PIN length
      if (pin.length < config.minLength || pin.length > config.maxLength) {
        throw new Error(`Emergency PIN must be between ${config.minLength} and ${config.maxLength} characters`)
      }

      // Validate PIN contains only digits
      if (!/^\d+$/.test(pin)) {
        throw new Error("Emergency PIN must contain only numbers")
      }

      // Generate salt and hash PIN
      const salt = SecureWallet.generateSalt()
      const { hash } = await SecureWallet.hashPin(pin, salt)

      // Store securely
      localStorage.setItem(this.EMERGENCY_PIN_HASH_KEY, hash)
      localStorage.setItem(this.EMERGENCY_PIN_SALT_KEY, btoa(String.fromCharCode(...salt)))

      // Reset emergency attempt counters
      this.resetEmergencyAttempts()

      return true
    } catch (error) {
      return false
    }
  }

  // Validate PIN with progressive security measures
  static async validatePin(pin: string): Promise<PinAttemptResult> {
    try {
      const securityLevel = this.getSecurityLevel()
      const levelConfig = this.getCurrentLevelConfig(securityLevel)
      const attempts = this.getAttempts()
      const lockoutTime = this.getLockoutTime()

      console.log(`[Progressive] Validating PIN - Level: ${securityLevel}, Attempts: ${attempts}, Lockout: ${lockoutTime}`)

      // Check if currently locked out
      if (lockoutTime > Date.now()) {
        return {
          success: false,
          attemptsRemaining: 0,
          isLocked: true,
          lockoutTimeRemaining: lockoutTime - Date.now(),
        }
      }

      // If lockout period has expired, give user attempts based on current level
      if (lockoutTime > 0 && lockoutTime <= Date.now()) {
        this.resetAttemptsOnly() // Preserve security level
        return {
          success: false,
          attemptsRemaining: levelConfig.attempts,
          isLocked: false,
        }
      }

      // Check if max attempts for current level exceeded
      if (attempts >= levelConfig.attempts) {
        // Increment security level and set lockout
        const newLevel = securityLevel + 1
        console.log(`[Progressive] Escalating from level ${securityLevel} to level ${newLevel}`)
        this.setSecurityLevel(newLevel)
        const newLevelConfig = this.getCurrentLevelConfig(newLevel)
        this.setProgressiveLockout(newLevelConfig.timeout)

        return {
          success: false,
          attemptsRemaining: 0,
          isLocked: true,
          lockoutTimeRemaining: newLevelConfig.timeout,
        }
      }

      // Retrieve stored hash and salt
      const storedHash = localStorage.getItem(this.PIN_HASH_KEY)
      const storedSalt = localStorage.getItem(this.PIN_SALT_KEY)

      if (!storedHash || !storedSalt) {
        return {
          success: false,
          attemptsRemaining: levelConfig.attempts - attempts - 1,
          isLocked: false,
        }
      }

      // Validate PIN
      const isValid = await SecureWallet.validatePin(pin, storedHash, storedSalt)

      if (isValid) {
        // Success - reset attempts and security level
        this.resetAttempts()
        console.log("[Progressive] PIN validation successful - reset to level 0")
        return {
          success: true,
          attemptsRemaining: this.PROGRESSIVE_LEVELS[0].attempts,
          isLocked: false,
        }
      } else {
        // Failed - increment attempts
        const newAttempts = attempts + 1
        this.setAttempts(newAttempts)

        if (newAttempts >= levelConfig.attempts) {
          // Escalate security level
          const newLevel = securityLevel + 1
          this.setSecurityLevel(newLevel)
          const newLevelConfig = this.getCurrentLevelConfig(newLevel)
          this.setProgressiveLockout(newLevelConfig.timeout)

          return {
            success: false,
            attemptsRemaining: 0,
            isLocked: true,
            lockoutTimeRemaining: newLevelConfig.timeout,
          }
        }

        return {
          success: false,
          attemptsRemaining: levelConfig.attempts - newAttempts,
          isLocked: false,
        }
      }
    } catch (error) {
      return {
        success: false,
        attemptsRemaining: 0,
        isLocked: true,
      }
    }
  }

  // Validate emergency PIN with progressive security measures
  static async validateEmergencyPin(pin: string): Promise<PinAttemptResult> {
    try {
      const securityLevel = this.getEmergencySecurityLevel()
      const levelConfig = this.getEmergencyLevelConfig(securityLevel)
      const attempts = this.getEmergencyAttempts()
      const lockoutTime = this.getEmergencyLockoutTime()

      // Check if currently locked out
      if (lockoutTime > Date.now()) {
        return {
          success: false,
          attemptsRemaining: 0,
          isLocked: true,
          lockoutTimeRemaining: lockoutTime - Date.now(),
        }
      }

      // If lockout period has expired, give user attempts based on current level
      if (lockoutTime > 0 && lockoutTime <= Date.now()) {
        this.resetEmergencyAttemptsOnly() // Preserve emergency security level
        return {
          success: false,
          attemptsRemaining: levelConfig.attempts,
          isLocked: false,
        }
      }

      // Check if max attempts for current level exceeded
      if (attempts >= levelConfig.attempts) {
        // Increment emergency security level and set lockout
        const newLevel = securityLevel + 1
        this.setEmergencySecurityLevel(newLevel)
        const newLevelConfig = this.getEmergencyLevelConfig(newLevel)
        this.setEmergencyProgressiveLockout(newLevelConfig.timeout)

        return {
          success: false,
          attemptsRemaining: 0,
          isLocked: true,
          lockoutTimeRemaining: newLevelConfig.timeout,
        }
      }

      // Retrieve stored hash and salt
      const storedHash = localStorage.getItem(this.EMERGENCY_PIN_HASH_KEY)
      const storedSalt = localStorage.getItem(this.EMERGENCY_PIN_SALT_KEY)

      if (!storedHash || !storedSalt) {
        return {
          success: false,
          attemptsRemaining: levelConfig.attempts - attempts - 1,
          isLocked: false,
        }
      }

      // Validate emergency PIN
      const isValid = await SecureWallet.validatePin(pin, storedHash, storedSalt)

      if (isValid) {
        // Success - reset attempts and security level
        this.resetEmergencyAttempts()
        console.log("[Progressive] Emergency PIN validation successful - reset to level 0")
        return {
          success: true,
          attemptsRemaining: 3, // Emergency always starts with 3 attempts
          isLocked: false,
        }
      } else {
        // Failed - increment attempts
        const newAttempts = attempts + 1
        this.setEmergencyAttempts(newAttempts)

        if (newAttempts >= levelConfig.attempts) {
          // Escalate emergency security level
          const newLevel = securityLevel + 1
          this.setEmergencySecurityLevel(newLevel)
          const newLevelConfig = this.getEmergencyLevelConfig(newLevel)
          this.setEmergencyProgressiveLockout(newLevelConfig.timeout)

          return {
            success: false,
            attemptsRemaining: 0,
            isLocked: true,
            lockoutTimeRemaining: newLevelConfig.timeout,
          }
        }

        return {
          success: false,
          attemptsRemaining: levelConfig.attempts - newAttempts,
          isLocked: false,
        }
      }
    } catch (error) {
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
      console.log(`[Progressive] Starting PIN change process`)
      // First validate old PIN
      const validation = await this.validatePin(oldPin)
      if (!validation.success) {
        console.log(`[Progressive] PIN change failed - old PIN validation failed`)
        return false
      }

      console.log(`[Progressive] PIN change - old PIN validated, setting up new PIN`)
      // Setup new PIN
      const success = await this.setupPin(newPin)
      if (success) {
        console.log(`[Progressive] PIN change successful`)
      } else {
        console.log(`[Progressive] PIN change failed - new PIN setup failed`)
      }
      return success
    } catch (error) {
      console.log(`[Progressive] PIN change error:`, error)
      return false
    }
  }

  // Update PIN without clearing security data (for emergency PIN recovery)
  static async updatePinForRecovery(newPin: string): Promise<boolean> {
    try {
      console.log(`[Progressive] Starting PIN recovery update process`)
      const config = this.getConfig()

      // Validate PIN length
      if (newPin.length < config.minLength || newPin.length > config.maxLength) {
        throw new Error(`PIN must be between ${config.minLength} and ${config.maxLength} characters`)
      }

      // Validate PIN contains only digits
      if (!/^\d+$/.test(newPin)) {
        throw new Error("PIN must contain only numbers")
      }

      // Generate salt and hash PIN
      const salt = SecureWallet.generateSalt()
      const { hash } = await SecureWallet.hashPin(newPin, salt)

      // Store securely (without creating new master key)
      localStorage.setItem(this.PIN_HASH_KEY, hash)
      localStorage.setItem(this.PIN_SALT_KEY, btoa(String.fromCharCode(...salt)))

      // Reset attempt counters only
      console.log(`[Progressive] PIN recovery update - resetting attempts only`)
      this.resetAttemptsOnly()

      console.log(`[Progressive] PIN recovery update successful`)
      return true
    } catch (error) {
      console.log(`[Progressive] PIN recovery update failed:`, error)
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

  // Check if emergency PIN is set up
  static hasEmergencyPin(): boolean {
    return localStorage.getItem(this.EMERGENCY_PIN_HASH_KEY) !== null &&
           localStorage.getItem(this.EMERGENCY_PIN_SALT_KEY) !== null
  }

  // Get emergency authentication status with progressive levels
  static getEmergencyAuthStatus(): {
    hasEmergencyPin: boolean
    isLocked: boolean
    attemptsRemaining: number
    lockoutTimeRemaining?: number
    securityLevel: number
  } {
    const hasEmergencyPin = this.hasEmergencyPin()
    const securityLevel = this.getEmergencySecurityLevel()
    const levelConfig = this.getEmergencyLevelConfig(securityLevel)
    const attempts = this.getEmergencyAttempts()
    const lockoutTime = this.getEmergencyLockoutTime()

    if (lockoutTime > Date.now()) {
      return {
        hasEmergencyPin,
        isLocked: true,
        attemptsRemaining: 0,
        lockoutTimeRemaining: lockoutTime - Date.now(),
        securityLevel,
      }
    }

    // If lockout period has expired, give user attempts based on current level
    if (lockoutTime > 0 && lockoutTime <= Date.now()) {
      this.resetEmergencyAttemptsOnly() // Don't reset emergency security level
      const levelConfig = this.getEmergencyLevelConfig(securityLevel)
      return {
        hasEmergencyPin,
        isLocked: false,
        attemptsRemaining: levelConfig.attempts,
        securityLevel,
      }
    }

    return {
      hasEmergencyPin,
      isLocked: false,
      attemptsRemaining: levelConfig.attempts - attempts,
      securityLevel,
    }
  }

  // Get authentication status with progressive levels
  static getAuthStatus(): {
    hasPin: boolean
    isLocked: boolean
    attemptsRemaining: number
    lockoutTimeRemaining?: number
    securityLevel: number
  } {
    const hasPin = this.hasPin()
    const securityLevel = this.getSecurityLevel()
    const levelConfig = this.getCurrentLevelConfig(securityLevel)
    const attempts = this.getAttempts()
    const lockoutTime = this.getLockoutTime()

    if (lockoutTime > Date.now()) {
      return {
        hasPin,
        isLocked: true,
        attemptsRemaining: 0,
        lockoutTimeRemaining: lockoutTime - Date.now(),
        securityLevel,
      }
    }

    // If lockout period has expired, give user attempts based on current level
    if (lockoutTime > 0 && lockoutTime <= Date.now()) {
      console.log(`[Progressive] Lockout expired in getAuthStatus(), resetting attempts only`)
      this.resetAttemptsOnly() // Don't reset security level
      const levelConfig = this.getCurrentLevelConfig(securityLevel)
      return {
        hasPin,
        isLocked: false,
        attemptsRemaining: levelConfig.attempts,
        securityLevel,
      }
    }

    return {
      hasPin,
      isLocked: false,
      attemptsRemaining: levelConfig.attempts - attempts,
      securityLevel,
    }
  }

  // Reset PIN (for security/emergency)
  static resetPin(): void {
    localStorage.removeItem(this.PIN_HASH_KEY)
    localStorage.removeItem(this.PIN_SALT_KEY)
    this.resetAttempts()
    SecureKeyManager.clearAllKeys()
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
    this.resetSecurityLevel() // Reset security level on successful auth
  }

  private static resetAttemptsOnly(): void {
    console.log(`[Progressive] Resetting attempts only (keeping security level: ${this.getSecurityLevel()})`)
    localStorage.removeItem(this.PIN_ATTEMPTS_KEY)
    localStorage.removeItem(this.PIN_LOCKOUT_KEY)
    // Don't reset security level - keep current level
  }

  private static getLockoutTime(): number {
    const stored = localStorage.getItem(this.PIN_LOCKOUT_KEY)
    return stored ? parseInt(stored, 10) : 0
  }


  private static setProgressiveLockout(timeoutMs: number): void {
    const lockoutTime = Date.now() + timeoutMs
    localStorage.setItem(this.PIN_LOCKOUT_KEY, lockoutTime.toString())
  }

  // Emergency PIN helper methods
  private static getEmergencyAttempts(): number {
    const stored = localStorage.getItem(this.EMERGENCY_PIN_ATTEMPTS_KEY)
    return stored ? parseInt(stored, 10) : 0
  }

  private static setEmergencyAttempts(attempts: number): void {
    localStorage.setItem(this.EMERGENCY_PIN_ATTEMPTS_KEY, attempts.toString())
  }

  private static resetEmergencyAttempts(): void {
    localStorage.removeItem(this.EMERGENCY_PIN_ATTEMPTS_KEY)
    localStorage.removeItem(this.EMERGENCY_PIN_LOCKOUT_KEY)
    this.resetEmergencySecurityLevel() // Reset emergency security level on successful auth
  }

  private static resetEmergencyAttemptsOnly(): void {
    localStorage.removeItem(this.EMERGENCY_PIN_ATTEMPTS_KEY)
    localStorage.removeItem(this.EMERGENCY_PIN_LOCKOUT_KEY)
    // Don't reset emergency security level - keep current level
  }

  private static getEmergencyLockoutTime(): number {
    const stored = localStorage.getItem(this.EMERGENCY_PIN_LOCKOUT_KEY)
    return stored ? parseInt(stored, 10) : 0
  }


  private static setEmergencyProgressiveLockout(timeoutMs: number): void {
    const lockoutTime = Date.now() + timeoutMs
    localStorage.setItem(this.EMERGENCY_PIN_LOCKOUT_KEY, lockoutTime.toString())
  }

  // Complete security data cleanup for PIN disable/reset
  static clearAllSecurityData(): void {
    // Clear PIN-related data
    localStorage.removeItem(this.PIN_HASH_KEY)
    localStorage.removeItem(this.PIN_SALT_KEY)
    localStorage.removeItem(this.PIN_ATTEMPTS_KEY)
    localStorage.removeItem(this.PIN_LOCKOUT_KEY)
    localStorage.removeItem(this.SECURITY_LEVEL_KEY)

    // Clear emergency PIN data
    localStorage.removeItem(this.EMERGENCY_PIN_HASH_KEY)
    localStorage.removeItem(this.EMERGENCY_PIN_SALT_KEY)
    localStorage.removeItem(this.EMERGENCY_PIN_ATTEMPTS_KEY)
    localStorage.removeItem(this.EMERGENCY_PIN_LOCKOUT_KEY)
    localStorage.removeItem(this.EMERGENCY_SECURITY_LEVEL_KEY)

    // Clear biometric data
    localStorage.removeItem('wallet_biometric_credential_id')
    localStorage.removeItem('wallet_biometric_enabled')
    localStorage.removeItem('wallet_biometric_user_id')

    // Clear session data
    localStorage.removeItem('wallet_session')

    // Clear authentication timestamp
    localStorage.removeItem('wallet_last_auth')

    console.log('[SecurePinManager] All security data cleared completely')
  }

  // Progressive security level helper methods
  private static getSecurityLevel(): number {
    const stored = localStorage.getItem(this.SECURITY_LEVEL_KEY)
    const level = stored ? parseInt(stored, 10) : 0
    console.log(`[Progressive] Retrieved security level: ${level} (stored: ${stored})`)
    console.log(`[Progressive] localStorage length: ${localStorage.length}`)

    // If stored is null, debug the localStorage
    if (stored === null) {
      this.debugLocalStorage()
    }

    return level
  }

  private static setSecurityLevel(level: number): void {
    console.log(`[Progressive] Setting security level to: ${level} (key: ${this.SECURITY_LEVEL_KEY})`)
    localStorage.setItem(this.SECURITY_LEVEL_KEY, level.toString())
    // Verify it was stored
    const stored = localStorage.getItem(this.SECURITY_LEVEL_KEY)
    console.log(`[Progressive] Verification - stored value: ${stored}`)
  }

  private static resetSecurityLevel(): void {
    console.log(`[Progressive] Resetting security level to 0`)
    localStorage.removeItem(this.SECURITY_LEVEL_KEY)
  }

  private static getEmergencySecurityLevel(): number {
    const stored = localStorage.getItem(this.EMERGENCY_SECURITY_LEVEL_KEY)
    return stored ? parseInt(stored, 10) : 0
  }

  private static setEmergencySecurityLevel(level: number): void {
    localStorage.setItem(this.EMERGENCY_SECURITY_LEVEL_KEY, level.toString())
  }

  private static resetEmergencySecurityLevel(): void {
    localStorage.removeItem(this.EMERGENCY_SECURITY_LEVEL_KEY)
  }

  private static getCurrentLevelConfig(level: number): ProgressiveLevelConfig {
    const clampedLevel = Math.min(level, this.PROGRESSIVE_LEVELS.length - 1)
    return this.PROGRESSIVE_LEVELS[clampedLevel]
  }

  private static getEmergencyLevelConfig(level: number): ProgressiveLevelConfig {
    // Emergency PIN uses simpler logic: always 3 attempts, but with progressive timeouts
    const baseConfig = { attempts: 3, timeout: 1 * 60 * 1000 } // 1 minute
    if (level >= 2) {
      return { attempts: 1, timeout: 5 * 60 * 1000 } // 5 minutes for escalated
    }
    return baseConfig
  }
}