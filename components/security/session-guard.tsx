"use client"

import { useState, useEffect } from "react"
import { SessionManager } from "@/lib/session-manager"
import { useAuthentication } from "@/hooks/use-authentication"
import { SecurePinManager } from "@/lib/secure-pin-manager"
import { SecureKeyManager } from "@/lib/key-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Wallet, Lock, AlertCircle, Shield, Fingerprint, CheckCircle2, Clock, Smartphone } from "lucide-react"
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
  onUnlock: (pin: string) => Promise<void>
}

function SessionPinScreen({ onUnlock }: SessionPinScreenProps) {
  const [pin, setPin] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authStatus, setAuthStatus] = useState(SecurePinManager.getAuthStatus())
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricSupported, setBiometricSupported] = useState(false)
  const [isBiometricAuthenticating, setIsBiometricAuthenticating] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(false)

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
      await onUnlock(pin)
    } catch (error) {
    } finally {
      setIsSubmitting(false)
    }
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
            MyWallet Locked
          </CardTitle>
          <CardDescription>
            Choose your preferred authentication method
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
                  disabled={isBiometricAuthenticating || authStatus.isLocked}
                  className="w-full flex items-center justify-center gap-3 h-12"
                  variant="outline"
                >
                  <Fingerprint className="w-5 h-5" />
                  <span>Use Biometric</span>
                </Button>
              </div>
            )}

            {/* PIN Input - Always Available */}
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">Enter your 6-digit PIN</p>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={pin}
                  onChange={setPin}
                  disabled={isSubmitting}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={pin.length !== 6 || authStatus.isLocked || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? "Verifying..." : authStatus.isLocked ? "Locked" : "Unlock Wallet"}
              </Button>
            </div>
          </div>

          {/* Error Messages */}
          {!authStatus.isLocked && authStatus.attemptsRemaining < 5 && (
            <div className="flex items-center gap-2 text-destructive text-sm justify-center">
              <AlertCircle className="w-4 h-4" />
              <span>{authStatus.attemptsRemaining} attempts remaining</span>
            </div>
          )}

          {authStatus.isLocked && (
            <div className="flex items-center gap-2 text-destructive text-sm justify-center">
              <AlertCircle className="w-4 h-4" />
              <span>
                Account locked. Please wait {Math.ceil((authStatus.lockoutTimeRemaining || 0) / 60000)} minutes.
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
  const { isAuthenticated, hasPin, validatePin } = useAuthentication()
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
      onUnlock={async (pin: string) => {
        const result = await validatePin(pin)
        if (result.success) {
          // Play success sound for PIN authentication
          playSound("pin-success")
          setShowPinScreen(false)
        } else {
          // Play failed sound for PIN authentication
          playSound("pin-failed")
        }
      }}
    />
  )
}