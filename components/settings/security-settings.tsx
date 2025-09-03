"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useWalletData } from "@/contexts/wallet-data-context"
import { useAuthentication } from "@/hooks/use-authentication"
import { SecureWallet } from "@/lib/security"
import { SecureKeyManager } from "@/lib/key-manager"
import { SecurePinManager } from "@/lib/secure-pin-manager"
import { SessionManager } from "@/lib/session-manager"
import { BiometricAuth } from "../security/biometric-auth"
import { Shield, Lock, Key, Volume2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface SecuritySettingsProps {
  onLock?: () => void
}

export function SecuritySettings({ onLock }: SecuritySettingsProps) {
  const { userProfile, updateUserProfile } = useWalletData()
  const { isAuthenticated, hasPin, lockApp } = useAuthentication()

  const [pinEnabled, setPinEnabled] = useState(!!userProfile?.securityEnabled && !!userProfile?.pin)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [step, setStep] = useState<"current" | "new" | "confirm">("current")
  const [isProcessing, setIsProcessing] = useState(false)

  // Emergency PIN states
  const [emergencyPinEnabled, setEmergencyPinEnabled] = useState(SecurePinManager.hasEmergencyPin())
  const [showEmergencyPinDialog, setShowEmergencyPinDialog] = useState(false)
  const [showEmergencyWarningModal, setShowEmergencyWarningModal] = useState(false)
  const [emergencyCurrentPin, setEmergencyCurrentPin] = useState("")
  const [emergencyNewPin, setEmergencyNewPin] = useState("")
  const [emergencyConfirmPin, setEmergencyConfirmPin] = useState("")
  const [emergencyStep, setEmergencyStep] = useState<"current" | "new" | "confirm">("new")
  const [isEmergencyProcessing, setIsEmergencyProcessing] = useState(false)

  // Update pinEnabled state when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setPinEnabled(!!userProfile.securityEnabled && !!userProfile.pin)
    }
  }, [userProfile])

  // Update emergency PIN status
  useEffect(() => {
    const updateEmergencyStatus = () => {
      setEmergencyPinEnabled(SecurePinManager.hasEmergencyPin())
    }

    updateEmergencyStatus()

    // Update when dialog opens
    if (showEmergencyPinDialog) {
      updateEmergencyStatus()
    }
  }, [showEmergencyPinDialog])

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading security settings...</p>
      </div>
    )
  }

  const securityStatus = SecureKeyManager.getSecurityStatus()

  const handleTogglePin = () => {
    if (pinEnabled) {
      // Disable PIN
      setShowPinDialog(true)
      setStep("current")
    } else {
      // Enable PIN
      setShowPinDialog(true)
      setStep("new")
    }
  }

  const handlePinSubmit = async () => {
    setIsProcessing(true)

    try {
      if (step === "current") {
        let isValid = false

        if (userProfile.pin && userProfile.pinSalt) {
          // Use new secure validation
          isValid = await SecureWallet.validatePin(currentPin, userProfile.pin, userProfile.pinSalt)
        } else if (userProfile.pin) {
          // Legacy validation for backward compatibility
          const { validatePin } = await import("@/lib/security")
          isValid = validatePin(currentPin, userProfile.pin)
        } else {
          isValid = true // No PIN set
        }

        if (isValid) {
          if (pinEnabled) {
            // Disabling PIN - clear ALL security data completely
            SecureKeyManager.clearAllKeys()
            SecurePinManager.clearAllSecurityData() // Comprehensive security data cleanup

            updateUserProfile({
              ...userProfile,
              pin: undefined,
              pinSalt: undefined,
              securityEnabled: false,
            })
            setPinEnabled(false)
            setShowPinDialog(false)

            toast({
              title: "PIN Disabled",
              description: "Your PIN, biometric data, security keys, and session data have been completely removed. The app is now unlocked.",
            })
          } else {
            setStep("new")
          }
        } else {
          toast({
            title: "Invalid PIN",
            description: "The current PIN you entered is incorrect.",
            variant: "destructive",
          })
        }
      } else if (step === "new") {
        if (newPin.length === 6) {
          setStep("confirm")
        }
      } else if (step === "confirm") {
        if (newPin === confirmPin) {
          // Use SecurePinManager.setupPin() for consistent behavior with onboarding
          const pinSetupSuccess = await SecurePinManager.setupPin(newPin)

          if (pinSetupSuccess) {
            // Get the PIN data from localStorage (set by SecurePinManager)
            const pinHash = localStorage.getItem('wallet_pin_hash')
            const pinSalt = localStorage.getItem('wallet_pin_salt')

            updateUserProfile({
              ...userProfile,
              pin: pinHash || undefined,
              pinSalt: pinSalt || undefined,
              securityEnabled: true,
            })
            setPinEnabled(true)
            setShowPinDialog(false)
            resetPinDialog()

            // Create session for consistent behavior with onboarding
            SessionManager.createSession()

            toast({
              title: "PIN Set Successfully",
              description: "Your PIN has been secured with military-grade encryption and session-based locking enabled.",
            })
          } else {
            toast({
              title: "PIN Setup Failed",
              description: "Failed to set up PIN. Please try again.",
              variant: "destructive",
            })
          }
        } else {
          toast({
            title: "PINs Don't Match",
            description: "Please make sure both PINs are identical.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("[v0] PIN operation failed:", error)
      toast({
        title: "Security Error",
        description: "Failed to process PIN. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetPinDialog = () => {
    setCurrentPin("")
    setNewPin("")
    setConfirmPin("")
    setStep("current")
  }

  const handleDialogClose = () => {
    setShowPinDialog(false)
    resetPinDialog()
  }

  // Emergency PIN handlers
  const handleEmergencyPinSubmit = async () => {
    setIsEmergencyProcessing(true)

    try {
      if (emergencyStep === "current") {
        // Validate current emergency PIN before disabling
        const isValid = await SecurePinManager.validateEmergencyPin(emergencyCurrentPin)
        if (isValid.success) {
          // Clear emergency PIN data
          localStorage.removeItem('wallet_emergency_pin_hash')
          localStorage.removeItem('wallet_emergency_pin_salt')
          localStorage.removeItem('wallet_emergency_pin_attempts')
          localStorage.removeItem('wallet_emergency_pin_lockout')
          localStorage.removeItem('wallet_emergency_security_level')

          setEmergencyPinEnabled(false)
          setShowEmergencyPinDialog(false)
          resetEmergencyPinDialog()

          toast({
            title: "Emergency PIN Disabled",
            description: "Your emergency PIN has been completely removed.",
          })
        } else {
          toast({
            title: "Invalid Emergency PIN",
            description: "The emergency PIN you entered is incorrect.",
            variant: "destructive",
          })
        }
      } else if (emergencyStep === "new") {
        if (emergencyNewPin.length === 6) {
          setEmergencyStep("confirm")
        }
      } else if (emergencyStep === "confirm") {
        if (emergencyNewPin === emergencyConfirmPin) {
          // Setup emergency PIN
          const success = await SecurePinManager.setupEmergencyPin(emergencyNewPin)

          if (success) {
            setEmergencyPinEnabled(true)
            setShowEmergencyPinDialog(false)
            resetEmergencyPinDialog()

            toast({
              title: "Emergency PIN Set Successfully",
              description: "Your emergency PIN is now configured for backup access.",
            })
          } else {
            toast({
              title: "Emergency PIN Setup Failed",
              description: "Failed to set up emergency PIN. Please try again.",
              variant: "destructive",
            })
          }
        } else {
          toast({
            title: "Emergency PINs Don't Match",
            description: "Please make sure both emergency PINs are identical.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("[Emergency PIN] Setup failed:", error)
      toast({
        title: "Emergency PIN Error",
        description: "Failed to process emergency PIN. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsEmergencyProcessing(false)
    }
  }

  const resetEmergencyPinDialog = () => {
    setEmergencyCurrentPin("")
    setEmergencyNewPin("")
    setEmergencyConfirmPin("")
    setEmergencyStep(emergencyPinEnabled ? "current" : "new")
  }

  const handleEmergencyDialogClose = () => {
    setShowEmergencyPinDialog(false)
    resetEmergencyPinDialog()
  }

  return (
    <div className="space-y-6">
      {/* PIN Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            PIN Security
          </CardTitle>
          <CardDescription>
            Protect your wallet with a 6-digit PIN using AES-256 encryption and PBKDF2 key derivation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="pin-toggle">Enable PIN Protection</Label>
              <p className="text-sm text-muted-foreground">
                {pinEnabled ? "PIN protection is active" : "PIN protection is disabled"}
              </p>
            </div>
            <Switch id="pin-toggle" checked={pinEnabled} onCheckedChange={handleTogglePin} />
          </div>

          {pinEnabled && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium">Security Active</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                Your wallet is protected with military-grade encryption
              </p>
            </div>
          )}

          {securityStatus.hasMasterKey && (
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
                  <Key className="w-4 h-4" />
                  <span className="text-sm font-medium">Encryption Status</span>
                </div>
                <div className="space-y-1 text-xs text-blue-600 dark:text-blue-500">
                  <p>• AES-256-GCM encryption active</p>
                  <p>• PBKDF2 key derivation (100,000 iterations)</p>
                  <p>• Master key cached: {securityStatus.cacheValid ? "Yes" : "No"}</p>
                  {securityStatus.lastUsed && <p>• Last used: {new Date(securityStatus.lastUsed).toLocaleString()}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          <Dialog open={showPinDialog} onOpenChange={handleDialogClose}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {step === "current"
                    ? pinEnabled
                      ? "Disable PIN"
                      : "Enter Current PIN"
                    : step === "new"
                      ? "Set New PIN"
                      : "Confirm New PIN"}
                </DialogTitle>
                <DialogDescription>
                  {step === "current"
                    ? pinEnabled
                      ? "Enter your current PIN to disable security"
                      : "Enter your current PIN to continue"
                    : step === "new"
                      ? "Enter a 6-digit PIN to secure your wallet with AES-256 encryption"
                      : "Re-enter your PIN to confirm and create encryption keys"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={step === "current" ? currentPin : step === "new" ? newPin : confirmPin}
                    onChange={step === "current" ? setCurrentPin : step === "new" ? setNewPin : setConfirmPin}
                    disabled={isProcessing}
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

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDialogClose}
                    className="flex-1 bg-transparent"
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePinSubmit}
                    className="flex-1"
                    disabled={
                      isProcessing ||
                      (step === "current" && currentPin.length !== 6) ||
                      (step === "new" && newPin.length !== 6) ||
                      (step === "confirm" && confirmPin.length !== 6)
                    }
                  >
                    {isProcessing
                      ? "Processing..."
                      : step === "current"
                        ? pinEnabled
                          ? "Disable"
                          : "Continue"
                        : step === "new"
                          ? "Continue"
                          : "Set PIN"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Emergency PIN */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Emergency PIN
          </CardTitle>
          <CardDescription>
            Set up a backup PIN for emergency access when your regular PIN is forgotten or unavailable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="emergency-pin-toggle">Emergency PIN Protection</Label>
              <p className="text-sm text-muted-foreground">
                {emergencyPinEnabled ? "Emergency PIN is set up" : "Emergency PIN is not configured"}
              </p>
            </div>
            <Switch
              id="emergency-pin-toggle"
              checked={emergencyPinEnabled}
              onCheckedChange={() => {
                if (!emergencyPinEnabled) {
                  // Show warning modal before setting up emergency PIN
                  setShowEmergencyWarningModal(true)
                } else {
                  // Directly show disable dialog for existing emergency PIN
                  setShowEmergencyPinDialog(true)
                }
              }}
            />
          </div>

          {emergencyPinEnabled && (
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Emergency Access Ready</span>
              </div>
              <p className="text-sm text-orange-600 dark:text-orange-500 mt-1">
                Your emergency PIN is configured and ready for use when needed.
              </p>
            </div>
          )}

          <Dialog open={showEmergencyPinDialog} onOpenChange={handleEmergencyDialogClose}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {emergencyStep === "current"
                    ? "Disable Emergency PIN"
                    : emergencyStep === "new"
                      ? "Set Emergency PIN"
                      : "Confirm Emergency PIN"}
                </DialogTitle>
                <DialogDescription>
                  {emergencyStep === "current"
                    ? "Enter your current emergency PIN to disable it"
                    : emergencyStep === "new"
                      ? "Enter a 6-digit emergency PIN for backup access"
                      : "Re-enter your emergency PIN to confirm"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={
                      emergencyStep === "current"
                        ? emergencyCurrentPin
                        : emergencyStep === "new"
                          ? emergencyNewPin
                          : emergencyConfirmPin
                    }
                    onChange={
                      emergencyStep === "current"
                        ? setEmergencyCurrentPin
                        : emergencyStep === "new"
                          ? setEmergencyNewPin
                          : setEmergencyConfirmPin
                    }
                    disabled={isEmergencyProcessing}
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

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowEmergencyPinDialog(false)}
                    className="flex-1 bg-transparent"
                    disabled={isEmergencyProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEmergencyPinSubmit}
                    className="flex-1"
                    disabled={
                      isEmergencyProcessing ||
                      (emergencyStep === "current" && emergencyCurrentPin.length !== 6) ||
                      (emergencyStep === "new" && emergencyNewPin.length !== 6) ||
                      (emergencyStep === "confirm" && emergencyConfirmPin.length !== 6)
                    }
                  >
                    {isEmergencyProcessing
                      ? "Processing..."
                      : emergencyStep === "current"
                        ? "Disable"
                        : emergencyStep === "new"
                          ? "Continue"
                          : "Set Emergency PIN"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Emergency PIN Warning Modal */}
          <Dialog open={showEmergencyWarningModal} onOpenChange={setShowEmergencyWarningModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-500" />
                  Important Security Warning
                </DialogTitle>
                <DialogDescription>
                  Before setting up your emergency PIN, please read this important information.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <h4 className="font-medium text-orange-800 dark:text-orange-200">Emergency PIN Security</h4>
                      <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                        <li>• Your emergency PIN provides backup access to your wallet</li>
                        <li>• It bypasses your regular PIN security measures</li>
                        <li>• Store it in a secure location separate from your device</li>
                        <li>• Never share it with anyone or store it digitally</li>
                        <li>• Write it down and keep it in a safe place</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-800 dark:text-red-200">Critical Warning</h4>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        If you forget both your regular PIN and emergency PIN, you will permanently lose access to your wallet and all funds. There is no recovery option.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowEmergencyWarningModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEmergencyWarningModal(false)
                      setShowEmergencyPinDialog(true)
                    }}
                    className="flex-1"
                  >
                    I Understand - Continue
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Biometric Authentication */}
      <BiometricAuth pinEnabled={pinEnabled} />

      {/* Audio Feedback for Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Authentication Sounds
          </CardTitle>
          <CardDescription>Sound feedback for PIN and biometric authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
              <Volume2 className="w-4 h-4" />
              <span className="text-sm font-medium">Sound Settings</span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-500">
              Authentication sounds are configured in Accessibility Settings. Both PIN and biometric authentication use the same success and failure sound settings.
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-500 mt-2">
              Go to Settings → Accessibility → Audio Feedback to customize sounds for Auth success, Auth failure, and other activities.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lock App */}
      {isAuthenticated && hasPin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              App Lock
            </CardTitle>
            <CardDescription>
              Manually lock the app and return to the PIN lock screen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                lockApp()
                onLock?.()
              }}
              variant="outline"
              className="w-full"
            >
              <Lock className="w-4 h-4 mr-2" />
              Lock App Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Security Tips</CardTitle>
          <CardDescription>Best practices to keep your wallet secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">Use a PIN that's not easily guessable (avoid birthdays, simple patterns)</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">Your data is encrypted with AES-256 and stored locally only</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">PIN is hashed with PBKDF2 (100,000 iterations) for maximum security</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">Don't share your PIN with anyone</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">Keep your browser and device updated for security</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
