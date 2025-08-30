"use client"

import { useState } from "react"
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
import { Shield, Lock, Key } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface SecuritySettingsProps {
  onLock?: () => void
}

export function SecuritySettings({ onLock }: SecuritySettingsProps) {
  const { userProfile, updateUserProfile } = useWalletData()
  const { isAuthenticated, hasPin, lockApp } = useAuthentication()

  const [pinEnabled, setPinEnabled] = useState(!!userProfile?.pin)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [step, setStep] = useState<"current" | "new" | "confirm">("current")
  const [isProcessing, setIsProcessing] = useState(false)

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
            // Disabling PIN - clear all security data
            SecureKeyManager.clearAllKeys()
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
              description: "Your PIN and all security keys have been removed.",
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
          // Create secure PIN hash and master key
          const { hash, salt } = await SecureWallet.hashPin(newPin)
          await SecureKeyManager.createMasterKey(newPin)

          updateUserProfile({
            ...userProfile,
            pin: hash,
            pinSalt: salt,
            securityEnabled: true,
          })
          setPinEnabled(true)
          setShowPinDialog(false)
          resetPinDialog()
          toast({
            title: "PIN Set Successfully",
            description: "Your PIN has been secured with military-grade encryption.",
          })
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
