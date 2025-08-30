"use client"

// Authentication hook for secure PIN-based wallet access
// Provides React interface to SecurePinManager with state management

import { useState, useEffect, useCallback } from "react"
import { SecurePinManager, PinAttemptResult } from "@/lib/secure-pin-manager"
import { SecureKeyManager } from "@/lib/key-manager"
import { toast } from "@/hooks/use-toast"

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  hasPin: boolean
  isLocked: boolean
  attemptsRemaining: number
  lockoutTimeRemaining?: number
  masterKey?: CryptoKey | null
}

export interface AuthActions {
  setupPin: (pin: string) => Promise<boolean>
  validatePin: (pin: string) => Promise<PinAttemptResult>
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
    isLocked: false,
    attemptsRemaining: 0,
  })

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const status = SecurePinManager.getAuthStatus()
        const lastAuth = localStorage.getItem("wallet_last_auth")
        const now = Date.now()
        const fiveMinutes = 5 * 60 * 1000
        const isRecentAuth = lastAuth && (now - Number.parseInt(lastAuth)) <= fiveMinutes
        const hasMasterKey = SecureKeyManager.hasMasterKey()

        setAuthState({
          isAuthenticated: false, // Always start unauthenticated for security
          isLoading: false,
          hasPin: status.hasPin,
          isLocked: status.isLocked,
          attemptsRemaining: status.attemptsRemaining,
          lockoutTimeRemaining: status.lockoutTimeRemaining,
        })
        if (!status.hasPin) {
          setAuthState(prev => ({ ...prev, isAuthenticated: true }))
        }

        // If we have a cached key and PIN is set up, try to authenticate automatically
        if (hasMasterKey && status.hasPin && !status.isLocked && isRecentAuth) {
          const cachedKey = SecureKeyManager.isKeyCacheValid()
          if (cachedKey) {
            const masterKey = await SecureKeyManager.getMasterKey("") // Empty PIN for cached retrieval
            if (masterKey) {
              setAuthState(prev => ({
                ...prev,
                isAuthenticated: true,
                masterKey: masterKey || undefined,
              }))
            } else {
            }
          } else {
          }
        } else {
        }
      } catch (error) {
        setAuthState(prev => ({ ...prev, isLoading: false }))
      }
    }

    initializeAuth()
  }, [])

  // Setup PIN for first time
  const setupPin = useCallback(async (pin: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }))

    try {
      const success = await SecurePinManager.setupPin(pin)

      if (success) {
        const masterKey = await SecureKeyManager.getMasterKey(pin)
        const status = SecurePinManager.getAuthStatus()

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          hasPin: true,
          isLocked: false,
          attemptsRemaining: status.attemptsRemaining,
          masterKey,
        })

        toast({
          title: "PIN Setup Complete",
          description: "Your wallet is now secured with PIN authentication.",
        })

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
      console.error("[v0] PIN setup error:", error)
      setAuthState(prev => ({ ...prev, isLoading: false }))
      toast({
        title: "Setup Error",
        description: "An error occurred during PIN setup.",
        variant: "destructive",
      })
      return false
    }
  }, [])

  // Validate PIN for authentication
  const validatePin = useCallback(async (pin: string): Promise<PinAttemptResult> => {
    setAuthState(prev => ({ ...prev, isLoading: true }))

    try {
      const result = await SecurePinManager.validatePin(pin)

      if (result.success) {
        // Get master key after successful validation
        const masterKey = await SecureKeyManager.getMasterKey(pin)

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          hasPin: true,
          isLocked: false,
          attemptsRemaining: result.attemptsRemaining,
          masterKey,
        })

        toast({
          title: "Authentication Successful",
          description: "Welcome back to your wallet!",
        })
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
    SecurePinManager.resetPin()

    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      hasPin: false,
      isLocked: false,
      attemptsRemaining: 0,
      masterKey: undefined,
    })

    toast({
      title: "PIN Reset",
      description: "PIN and encryption keys have been reset.",
      variant: "destructive",
    })
  }, [])

  return {
    ...authState,
    setupPin,
    validatePin,
    changePin,
    logout,
    lockApp,
    resetPin,
  }
}