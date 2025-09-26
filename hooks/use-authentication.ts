"use client"

// Authentication hook for secure PIN-based wallet access
// Provides React interface to SecurePinManager with state management

import { useState, useEffect, useCallback } from "react"
import { SecurePinManager, PinAttemptResult } from "@/lib/secure-pin-manager"
import { SecureKeyManager } from "@/lib/key-manager"
import { SessionManager } from "@/lib/session-manager"
import { toast } from "@/hooks/use-toast"

// Sound generation utilities
const generateTone = (frequency: number, duration: number, type: OscillatorType = "sine") => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
  oscillator.type = type

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + duration)
}

const PRESET_SOUNDS = {
  "gentle-chime": { name: "Gentle Chime", generator: () => generateTone(800, 0.3) },
  "soft-click": { name: "Soft Click", generator: () => generateTone(1000, 0.1, "square") },
  "success-tone": {
    name: "Success Tone",
    generator: () => {
      generateTone(523, 0.2)
      setTimeout(() => generateTone(659, 0.2), 100)
    },
  },
  notification: { name: "Notification", generator: () => generateTone(440, 0.4) },
  none: { name: "No Sound", generator: () => {} },
}

const playAuthSuccessSound = () => {
  const soundEffectsEnabled = localStorage.getItem("wallet_sound_effects") !== "false"
  if (!soundEffectsEnabled) return

  const pinSuccessEnabled = localStorage.getItem("wallet_pin_success_enabled")
  const enabled = pinSuccessEnabled === null ? true : pinSuccessEnabled === "true"
  if (!enabled) return

  const pinSuccessSelectedSound = localStorage.getItem("wallet_pin_success_selected_sound") || "success-tone"
  const pinSuccessCustomUrl = localStorage.getItem("wallet_pin_success_custom_url") || ""

  if (pinSuccessSelectedSound === "custom" && pinSuccessCustomUrl) {
    const audio = new Audio(pinSuccessCustomUrl)
    audio.play().catch(console.error)
  } else if (pinSuccessSelectedSound !== "none") {
    const soundConfig = PRESET_SOUNDS[pinSuccessSelectedSound as keyof typeof PRESET_SOUNDS]
    if (soundConfig?.generator) {
      soundConfig.generator()
    }
  }
}

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  hasPin: boolean
  hasEmergencyPin: boolean
  isLocked: boolean
  attemptsRemaining: number
  lockoutTimeRemaining?: number
  masterKey?: CryptoKey | null
}

export interface AuthActions {
  setupPin: (pin: string) => Promise<boolean>
  setupEmergencyPin: (pin: string) => Promise<boolean>
  validatePin: (pin: string) => Promise<PinAttemptResult>
  validateEmergencyPin: (pin: string) => Promise<PinAttemptResult>
  changePin: (oldPin: string, newPin: string) => Promise<boolean>
  logout: () => void
  lockApp: () => void
  resetPin: () => void
}

export function useAuthentication(): AuthState & AuthActions {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    hasPin: false,
    hasEmergencyPin: false,
    isLocked: false,
    attemptsRemaining: 0,
  })

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if user has completed onboarding
        const userProfile = localStorage.getItem('userProfile')
        const isFirstTime = localStorage.getItem('isFirstTime')

        const status = SecurePinManager.getAuthStatus()

        setAuthState({
          isAuthenticated: false, // Always start unauthenticated for security
          isLoading: false,
          hasPin: status.hasPin,
          hasEmergencyPin: SecurePinManager.hasEmergencyPin(),
          isLocked: status.isLocked,
          attemptsRemaining: status.attemptsRemaining,
          lockoutTimeRemaining: status.lockoutTimeRemaining,
        })

        // If user hasn't completed onboarding yet, allow access (no auth required)
        if (!userProfile || isFirstTime === 'true') {
          setAuthState(prev => ({ ...prev, isAuthenticated: true }))
          return
        }

        // If no PIN is set up but user has completed onboarding, allow access
        if (!status.hasPin) {
          setAuthState(prev => ({ ...prev, isAuthenticated: true }))
        } else {
          // If PIN is set up, ALWAYS require PIN authentication
          // Sessions are only used for extending authenticated sessions, not bypassing PIN
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: false,
          }))
        }
      } catch (error) {
        setAuthState(prev => ({ ...prev, isLoading: false }))
      }
    }

    // Listen for session expiry events
    const handleSessionExpiry = () => {
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        masterKey: undefined,
      }))
    }

    // Listen for onboarding completion events to re-initialize auth state
    const handleOnboardingComplete = () => {
      initializeAuth()
    }

    window.addEventListener('wallet-session-expired', handleSessionExpiry)
    window.addEventListener('wallet-onboarding-complete', handleOnboardingComplete)

    initializeAuth()

    return () => {
      window.removeEventListener('wallet-session-expired', handleSessionExpiry)
      window.removeEventListener('wallet-onboarding-complete', handleOnboardingComplete)
    }
  }, [])

  // Setup PIN for first time
  const setupPin = useCallback(async (pin: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }))

    try {
      const success = await SecurePinManager.setupPin(pin)

      if (success) {
        const masterKey = await SecureKeyManager.getMasterKey(pin)
        const status = SecurePinManager.getAuthStatus()

        // Create session after successful PIN setup for consistency
        SessionManager.createSession()

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          hasPin: true,
          hasEmergencyPin: SecurePinManager.hasEmergencyPin(),
          isLocked: false,
          attemptsRemaining: status.attemptsRemaining,
          masterKey,
        })

        toast({
          title: "PIN Setup Complete",
          description: "Your wallet is now secured with PIN authentication and session-based locking.",
        })

        // Note: Success sound is played in the session-guard component to avoid duplication

        return true
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }))
        toast({
          title: "Setup Failed",
          description: "Failed to setup PIN. Please try again.",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }))
      toast({
        title: "Setup Error",
        description: "An error occurred during PIN setup.",
        variant: "destructive",
      })
      return false
    }
  }, [])

  // Setup emergency PIN
  const setupEmergencyPin = useCallback(async (pin: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }))

    try {
      const success = await SecurePinManager.setupEmergencyPin(pin)

      if (success) {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          hasEmergencyPin: true,
        }))

        toast({
          title: "Emergency PIN Setup Complete",
          description: "Your emergency PIN has been configured.",
        })

        return true
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }))
        toast({
          title: "Emergency PIN Setup Failed",
          description: "Failed to setup emergency PIN. Please try again.",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }))
      toast({
        title: "Emergency PIN Setup Error",
        description: "An error occurred during emergency PIN setup.",
        variant: "destructive",
      })
      return false
    }
  }, [])

  // Validate emergency PIN
  const validateEmergencyPin = useCallback(async (pin: string): Promise<PinAttemptResult> => {
    setAuthState(prev => ({ ...prev, isLoading: true }))

    try {
      const result = await SecurePinManager.validateEmergencyPin(pin)

      if (result.success) {
        // Get master key after successful validation
        const masterKey = await SecureKeyManager.getMasterKey("") // Use cached key for emergency

        // Create session after successful authentication
        SessionManager.createSession()

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          hasPin: true,
          hasEmergencyPin: true,
          isLocked: false,
          attemptsRemaining: result.attemptsRemaining,
          masterKey,
        })

        toast({
          title: "Emergency Authentication Successful",
          description: "Welcome back to your wallet!",
        })

        // Note: Success sound is played in the session-guard component to avoid duplication
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          isLocked: result.isLocked,
          attemptsRemaining: result.attemptsRemaining,
          lockoutTimeRemaining: result.lockoutTimeRemaining,
        }))

        if (result.isLocked) {
          toast({
            title: "Emergency Account Locked",
            description: `Too many failed emergency attempts. Try again in ${Math.ceil((result.lockoutTimeRemaining || 0) / 60000)} minutes.`,
            variant: "destructive",
          })
        } else {
          toast({
            title: "Invalid Emergency PIN",
            description: `${result.attemptsRemaining} emergency attempts remaining.`,
            variant: "destructive",
          })
        }
      }

      return result
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }))
      toast({
        title: "Emergency Authentication Error",
        description: "An error occurred during emergency authentication.",
        variant: "destructive",
      })
      return {
        success: false,
        attemptsRemaining: 0,
        isLocked: true,
      }
    }
  }, [])

  // Validate PIN for authentication (also handles biometric auth with empty PIN)
  const validatePin = useCallback(async (pin: string): Promise<PinAttemptResult> => {
    setAuthState(prev => ({ ...prev, isLoading: true }))

    try {
      // Handle biometric authentication (empty PIN)
      if (pin === "") {
        // For biometric auth, we don't validate PIN but create session directly
        // This assumes biometric validation has already happened

        // Load master key for biometric authentication
        const masterKey = await SecureKeyManager.getMasterKey("")

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          hasPin: true,
          hasEmergencyPin: SecurePinManager.hasEmergencyPin(),
          isLocked: false,
          attemptsRemaining: 5, // Reset attempts for biometric
          masterKey: masterKey, // Load cached master key
        })

        // Create session for biometric auth
        SessionManager.createSession()

        toast({
          title: "Authentication Successful",
          description: "Welcome back to your wallet!",
        })

        // Note: Success sound is played in the session-guard component to avoid duplication

        return {
          success: true,
          attemptsRemaining: 5,
          isLocked: false,
        }
      }

      // Regular PIN validation
      const result = await SecurePinManager.validatePin(pin)

      if (result.success) {
        // Get master key after successful validation
        const masterKey = await SecureKeyManager.getMasterKey(pin)

        // Create session after successful authentication
        SessionManager.createSession()

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          hasPin: true,
          hasEmergencyPin: SecurePinManager.hasEmergencyPin(),
          isLocked: false,
          attemptsRemaining: result.attemptsRemaining,
          masterKey,
        })

        toast({
          title: "Authentication Successful",
          description: "Welcome back to your wallet!",
        })

        // Note: Success sound is played in the session-guard component to avoid duplication
      } else {
        const status = SecurePinManager.getAuthStatus()

        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          isLocked: result.isLocked,
          attemptsRemaining: result.attemptsRemaining,
          lockoutTimeRemaining: result.lockoutTimeRemaining,
        }))

        if (result.isLocked) {
          toast({
            title: "Account Locked",
            description: `Too many failed attempts. Try again in ${Math.ceil((result.lockoutTimeRemaining || 0) / 60000)} minutes.`,
            variant: "destructive",
          })
        } else {
          toast({
            title: "Invalid PIN",
            description: `${result.attemptsRemaining} attempts remaining.`,
            variant: "destructive",
          })
        }
      }

      return result
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }))
      toast({
        title: "Authentication Error",
        description: "An error occurred during authentication.",
        variant: "destructive",
      })
      return {
        success: false,
        attemptsRemaining: 0,
        isLocked: true,
      }
    }
  }, [])

  // Change PIN
  const changePin = useCallback(async (oldPin: string, newPin: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }))

    try {
      const success = await SecurePinManager.changePin(oldPin, newPin)

      if (success) {
        // Get new master key
        const masterKey = await SecureKeyManager.getMasterKey(newPin)

        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          masterKey,
        }))

        toast({
          title: "PIN Changed",
          description: "Your PIN has been successfully updated.",
        })

        return true
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }))
        toast({
          title: "PIN Change Failed",
          description: "Failed to change PIN. Please verify your current PIN.",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }))
      toast({
        title: "Change Error",
        description: "An error occurred while changing PIN.",
        variant: "destructive",
      })
      return false
    }
  }, [])

  // Logout
  const logout = useCallback(() => {
    // Clear cached keys
    SecureKeyManager.expireKeyCache()

    setAuthState(prev => ({
      ...prev,
      isAuthenticated: false,
      masterKey: undefined,
    }))

    toast({
      title: "Logged Out",
      description: "You have been securely logged out.",
    })
  }, [])

  // Lock App - manually lock and return to PIN screen
  const lockApp = useCallback(() => {
    // Clear session
    SessionManager.clearSession()

    // Clear cached keys
    SecureKeyManager.expireKeyCache()

    // Remove authentication timestamp to force lock screen
    localStorage.removeItem("wallet_last_auth")

    setAuthState(prev => ({
      ...prev,
      isAuthenticated: false,
      masterKey: undefined,
    }))

    toast({
      title: "App Locked",
      description: "The app has been locked. Please enter your PIN to continue.",
    })
  }, [])

  // Reset PIN (emergency/security reset)
  const resetPin = useCallback(() => {
    SecureKeyManager.clearAllKeys() // Clear all encryption keys
    SecurePinManager.clearAllSecurityData() // Comprehensive security data cleanup

    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      hasPin: false,
      hasEmergencyPin: false,
      isLocked: false,
      attemptsRemaining: 0,
      masterKey: undefined,
    })

    toast({
      title: "PIN Reset",
      description: "PIN, biometric data, encryption keys, and session data have been completely removed. The app is now unlocked.",
      variant: "destructive",
    })
  }, [])

  return {
    ...authState,
    setupPin,
    setupEmergencyPin,
    validatePin,
    validateEmergencyPin,
    changePin,
    logout,
    lockApp,
    resetPin,
  }
}
