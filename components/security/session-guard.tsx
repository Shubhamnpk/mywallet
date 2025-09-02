"use client"

import { useState, useEffect } from "react"
import { SessionManager } from "@/lib/session-manager"
import { useAuthentication } from "@/hooks/use-authentication"
import { SecurePinManager } from "@/lib/secure-pin-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Badge } from "@/components/ui/badge"
import { Lock, AlertCircle, Shield, Fingerprint } from "lucide-react"
import { toast } from "@/hooks/use-toast"

// Sound generation functions
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

const playSound = (activity: string) => {
  const soundEffectsEnabled = localStorage.getItem("wallet_sound_effects") === "true"

  if (!soundEffectsEnabled) return

  let enabled = false
  let selected = "success-tone"
  let customUrl = ""

  switch (activity) {
    case "pin-success":
      enabled = localStorage.getItem("wallet_pin_success_enabled") !== "false"
      selected = localStorage.getItem("wallet_pin_success_selected_sound") || "success-tone"
      customUrl = localStorage.getItem("wallet_pin_success_custom_url") || ""
      break
    case "pin-failed":
      enabled = localStorage.getItem("wallet_pin_failed_enabled") !== "false"
      selected = localStorage.getItem("wallet_pin_failed_selected_sound") || "notification"
      customUrl = localStorage.getItem("wallet_pin_failed_custom_url") || ""
      break
    default:
      return
  }

  if (!enabled) return

  try {
    if (selected === "custom" && customUrl) {
      const audio = new Audio(customUrl)
      audio.play().catch(console.error)
    } else if (selected !== "none") {
      // Use preset sounds
      switch (selected) {
        case "success-tone":
          generateTone(523, 0.2)
          setTimeout(() => generateTone(659, 0.2), 100)
          break
        case "notification":
          generateTone(440, 0.4)
          break
        case "gentle-chime":
          generateTone(800, 0.3)
          break
        case "soft-click":
          generateTone(1000, 0.1, "square")
          break
        default:
          generateTone(523, 0.2)
      }
    }
  } catch (error) {
    console.error("Error playing sound:", error)
  }
}

interface SessionGuardProps {
  children: React.ReactNode
}

interface SessionPinScreenProps {
  onUnlock: (pin: string, emergencyMode?: boolean) => Promise<void>
  onError?: () => void
}

function SessionPinScreen({ onUnlock, onError }: SessionPinScreenProps) {
  const [pin, setPin] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authStatus, setAuthStatus] = useState(SecurePinManager.getAuthStatus())
  const [emergencyAuthStatus, setEmergencyAuthStatus] = useState(SecurePinManager.getEmergencyAuthStatus())
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricSupported, setBiometricSupported] = useState(false)
  const [isBiometricAuthenticating, setIsBiometricAuthenticating] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(false)
  const [emergencyMode, setEmergencyMode] = useState(false)
  const [hasEmergencyPin, setHasEmergencyPin] = useState(SecurePinManager.hasEmergencyPin())
  const [pinError, setPinError] = useState(false)

  // Get current auth status based on mode
  const getCurrentAuthStatus = () => {
    if (emergencyMode) {
      const emergencyStatus = SecurePinManager.getEmergencyAuthStatus()
      return {
        isLocked: emergencyStatus.isLocked,
        attemptsRemaining: emergencyStatus.attemptsRemaining,
        lockoutTimeRemaining: emergencyStatus.lockoutTimeRemaining,
        securityLevel: emergencyStatus.securityLevel,
      }
    }
    return authStatus
  }

  const currentAuthStatus = getCurrentAuthStatus()

  // Format time remaining in MM:SS format
  const formatTimeRemaining = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000)
    const seconds = Math.floor((milliseconds % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Real-time updates for emergency mode status
  useEffect(() => {
    if (emergencyMode) {
      const updateEmergencyAuthStatus = () => {
        // Force re-render by updating a dummy state
        setAuthStatus(prev => ({ ...prev }))
      }

      const interval = setInterval(updateEmergencyAuthStatus, 1000)
      return () => clearInterval(interval)
    }
  }, [emergencyMode])

  useEffect(() => {
    // Check if biometrics are enabled
    const biometricCredentialId = localStorage.getItem('wallet_biometric_credential_id')
    const biometricEnabledFlag = localStorage.getItem('wallet_biometric_enabled')
    setBiometricEnabled(!!biometricCredentialId && biometricEnabledFlag === 'true')

    // Check biometric support
    const checkBiometricSupport = async () => {
      const isSecureContext = window.location.protocol === 'https:' || window.location.hostname === 'localhost'
      if (!isSecureContext || !window.PublicKeyCredential) {
        setBiometricSupported(false)
        return
      }

      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        setBiometricSupported(available)
      } catch (error) {
        setBiometricSupported(false)
      }
    }

    checkBiometricSupport()
  }, [])

  // Real-time updates for auth status (every 1 second)
  useEffect(() => {
    const updateAuthStatus = () => {
      setAuthStatus(SecurePinManager.getAuthStatus())
      setEmergencyAuthStatus(SecurePinManager.getEmergencyAuthStatus())
    }

    // Update immediately
    updateAuthStatus()

    // Update every second for real-time timer
    const interval = setInterval(updateAuthStatus, 1000)

    return () => clearInterval(interval)
  }, [])

  // Real-time updates for emergency PIN status
  useEffect(() => {
    const updateEmergencyStatus = () => {
      setHasEmergencyPin(SecurePinManager.hasEmergencyPin())
    }

    // Update immediately
    updateEmergencyStatus()

    // Update every 2 seconds for emergency PIN status
    const interval = setInterval(updateEmergencyStatus, 2000)

    return () => clearInterval(interval)
  }, [])

  const handleBiometricAuth = async () => {
    if (!biometricEnabled || !biometricSupported) return

    setIsBiometricAuthenticating(true)

    try {
      const credentialId = localStorage.getItem('wallet_biometric_credential_id')
      if (!credentialId) {
        throw new Error('Biometric credentials not found')
      }

      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      const credentialIdBytes = Uint8Array.from(atob(credentialId), c => c.charCodeAt(0))

      const requestCredentialOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [{
          id: credentialIdBytes,
          type: 'public-key',
          transports: ['internal']
        }],
        timeout: 60000,
        userVerification: 'required'
      }

      const assertion = await navigator.credentials.get({
        publicKey: requestCredentialOptions
      }) as PublicKeyCredential

      if (assertion) {
        await onUnlock("")
        // Set authentication timestamp to prevent duplicate PIN screen
        localStorage.setItem("wallet_last_auth", Date.now().toString())
        // Play success sound for biometric authentication
        playSound("pin-success")
      }
    } catch (error) {
      // Play failed sound for biometric authentication
      playSound("pin-failed")
      toast({
        title: "Biometric Authentication Failed",
        description: "Please use your PIN to unlock the wallet.",
        variant: "destructive",
      })
    } finally {
      setIsBiometricAuthenticating(false)
    }
  }

  const handleSubmit = async () => {
    if (isSubmitting || pin.length !== 6) return

    setIsSubmitting(true)
    try {
      await onUnlock(pin, emergencyMode)
    } catch (error) {
      // Trigger error animation on failed validation
      triggerErrorAnimation()
      if (onError) onError()
    } finally {
      setIsSubmitting(false)
    }
  }

  // Function to trigger error animation
  const triggerErrorAnimation = () => {
    setPinError(true)
    setPin("") // Clear the PIN input

    // Remove error state after animation completes
    setTimeout(() => {
      setPinError(false)
    }, 600) // Match animation duration
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-accent-foreground" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Lock className="w-5 h-5" />
            {emergencyMode ? "Emergency Access" : "MyWallet Locked"}
          </CardTitle>
          <CardDescription>
            {emergencyMode ? "Enter your emergency PIN" : "Choose your preferred authentication method"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Authentication Methods */}
          <div className="space-y-4">
            {/* Biometric Option - Optional */}
            {biometricEnabled && biometricSupported && (
              <div className="space-y-3">
                <Button
                  onClick={handleBiometricAuth}
                  disabled={isBiometricAuthenticating || currentAuthStatus.isLocked || emergencyMode}
                  className="w-full flex items-center justify-center gap-3 h-12"
                  variant="outline"
                >
                  <Fingerprint className="w-5 h-5" />
                  <span>Use Biometric</span>
                </Button>
              </div>
            )}

            {/* Emergency PIN Toggle */}
            {hasEmergencyPin && !emergencyMode && (
              <div className="space-y-3">
                <Button
                  onClick={() => setEmergencyMode(true)}
                  className="w-full flex items-center justify-center gap-3 h-12"
                  variant="outline"
                >
                  <AlertCircle className="w-5 h-5" />
                  <span>Use Emergency PIN</span>
                </Button>
              </div>
            )}

            {/* PIN Input - Always Available */}
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  {emergencyMode ? "Enter your 6-digit emergency PIN" : "Enter your 6-digit PIN"}
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={pin}
                  onChange={setPin}
                  disabled={isSubmitting}
                  className={pinError ? "animate-shake" : ""}
                >
                  <InputOTPGroup className={pinError ? "border-red-500 bg-red-50" : ""}>
                    <InputOTPSlot
                      index={0}
                      className={pinError ? "border-red-500 bg-red-50 text-red-600" : ""}
                    />
                    <InputOTPSlot
                      index={1}
                      className={pinError ? "border-red-500 bg-red-50 text-red-600" : ""}
                    />
                    <InputOTPSlot
                      index={2}
                      className={pinError ? "border-red-500 bg-red-50 text-red-600" : ""}
                    />
                    <InputOTPSlot
                      index={3}
                      className={pinError ? "border-red-500 bg-red-50 text-red-600" : ""}
                    />
                    <InputOTPSlot
                      index={4}
                      className={pinError ? "border-red-500 bg-red-50 text-red-600" : ""}
                    />
                    <InputOTPSlot
                      index={5}
                      className={pinError ? "border-red-500 bg-red-50 text-red-600" : ""}
                    />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleSubmit}
                  disabled={pin.length !== 6 || currentAuthStatus.isLocked || isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? "Verifying..." : currentAuthStatus.isLocked ? "Locked" : emergencyMode ? "Unlock with Emergency PIN" : "Unlock Wallet"}
                </Button>

                {emergencyMode && (
                  <Button
                    onClick={() => setEmergencyMode(false)}
                    variant="ghost"
                    className="w-full"
                  >
                    Back to Regular PIN
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {!currentAuthStatus.isLocked && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
              <div className="flex items-center gap-2 justify-center">
                <span>{currentAuthStatus.attemptsRemaining} {emergencyMode ? "emergency" : ""} attempts remaining</span>
              </div>
              {/* Security Level Display */}
              {'securityLevel' in currentAuthStatus && (
                <div className="flex items-center gap-2">
                  <Badge variant={currentAuthStatus.securityLevel > 0 ? "destructive" : "secondary"} className="text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Level {currentAuthStatus.securityLevel}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {currentAuthStatus.isLocked && (
            <div className="flex items-center gap-2 text-destructive text-sm justify-center">
              <AlertCircle className="w-4 h-4" />
              <span>
                {emergencyMode ? "Emergency" : "Account"} locked. Please wait {formatTimeRemaining(currentAuthStatus.lockoutTimeRemaining || 0)}.
              </span>
            </div>
          )}

          {/* Security Footer */}
          <div className="text-center text-xs text-muted-foreground">
            Your data is protected with PBKDF2 encryption and secure key management
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function SessionGuard({ children }: SessionGuardProps) {
  const { isAuthenticated, hasPin, validatePin, validateEmergencyPin } = useAuthentication()
  const [showPinScreen, setShowPinScreen] = useState(false)

  useEffect(() => {

    // If no PIN is set up, allow access
    if (!hasPin) {
      setShowPinScreen(false)
      return
    }

    // If PIN is set up, check authentication status
    if (isAuthenticated) {
      setShowPinScreen(false)
    } else {
      setShowPinScreen(true)
    }

    // Listen for session expiry events
    const handleSessionExpiry = () => {
      setShowPinScreen(true)
    }

    // Listen for window focus events to validate session
    const handleWindowFocus = () => {
      if (hasPin && !SessionManager.isSessionValid()) {
        console.log('[SessionGuard] Session invalid on window focus, showing PIN screen')
        setShowPinScreen(true)
      }
    }

    window.addEventListener('wallet-session-expired', handleSessionExpiry)
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      window.removeEventListener('wallet-session-expired', handleSessionExpiry)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [isAuthenticated, hasPin])

  // If no PIN is required or user is authenticated with valid session, show children
  if (!hasPin || (isAuthenticated && !showPinScreen)) {
    return <>{children}</>
  }

  // Show PIN screen when no active session or not authenticated
  return (
    <SessionPinScreen
      onUnlock={async (pin: string, emergencyMode?: boolean) => {
        const result = emergencyMode ? await validateEmergencyPin(pin) : await validatePin(pin)
        if (result.success) {
          // Play success sound for PIN authentication
          playSound("pin-success")
          setShowPinScreen(false)
        } else {
          // Play failed sound for PIN authentication
          playSound("pin-failed")
        }
      }}
      onError={() => {
        // This will be called when PIN validation fails
        // The error animation is handled in SessionPinScreen component
      }}
    />
  )
}