"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { SecurePinManager } from "@/lib/secure-pin-manager"
import { SecureKeyManager } from "@/lib/key-manager"
import { Wallet, Lock, AlertCircle, Shield } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useAccessibility } from "@/hooks/use-accessibility"

interface PinLockScreenProps {
  onUnlock: () => void
}

export function PinLockScreen({ onUnlock }: PinLockScreenProps) {
  const { playSound } = useAccessibility()
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [authStatus, setAuthStatus] = useState(SecurePinManager.getAuthStatus())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSetupMode, setIsSetupMode] = useState(false)

  // Update status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const status = SecurePinManager.getAuthStatus()
      setAuthStatus(status)
      setIsSetupMode(!status.hasPin)
    }, 1000)

    // Initial check
    const initialStatus = SecurePinManager.getAuthStatus()
    setAuthStatus(initialStatus)
    setIsSetupMode(!initialStatus.hasPin)

    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async () => {
    if (isSubmitting) return

    if (isSetupMode) {
      // Setup mode
      if (pin.length !== 6 || confirmPin.length !== 6) return

      if (pin !== confirmPin) {
        toast({
          title: "PIN Mismatch",
          description: "PINs do not match. Please try again.",
          variant: "destructive",
        })
        setConfirmPin("")
        return
      }

      setIsSubmitting(true)

      try {
        const success = await SecurePinManager.setupPin(pin)

        if (success) {
          onUnlock()
          toast({
            title: "PIN Setup Complete",
            description: "Your wallet is now secured with PIN authentication.",
          })
        } else {
          toast({
            title: "Setup Failed",
            description: "Failed to setup PIN. Please try again.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("[v0] PIN setup error:", error)
        toast({
          title: "Setup Error",
          description: "An error occurred during PIN setup.",
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false)
      }
    } else {
      // Validation mode
      if (pin.length !== 6) return

      setIsSubmitting(true)

      try {
        const result = await SecurePinManager.validatePin(pin)

        if (result.success) {
           // Cache the master key for auto-authentication
           await SecureKeyManager.getMasterKey(pin)
           onUnlock()
           toast({
             title: "Welcome Back!",
             description: "PIN verified successfully.",
           })
           playSound("pin-success")
         } else {
          setPin("")
          setAuthStatus(SecurePinManager.getAuthStatus())

          if (result.isLocked) {
            toast({
              title: "Account Locked",
              description: `Too many failed attempts. Please wait ${Math.ceil((result.lockoutTimeRemaining || 0) / 60000)} minutes.`,
              variant: "destructive",
            })
          } else {
            toast({
              title: "Incorrect PIN",
              description: `${result.attemptsRemaining} attempts remaining.`,
              variant: "destructive",
            })
          }
          playSound("pin-failed")
        }
      } catch (error) {
        console.error("[v0] PIN validation error:", error)
        toast({
          title: "Authentication Error",
          description: "An error occurred during authentication.",
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false)
      }
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
            {isSetupMode ? (
              <>
                <Wallet className="w-5 h-5" />
                Setup PIN
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                MyWallet Locked
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isSetupMode
              ? "Create a 6-digit PIN to secure your wallet"
              : "Enter your PIN to access your wallet"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
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
            {isSetupMode && (
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={confirmPin}
                  onChange={setConfirmPin}
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
            )}
          </div>

          {!isSetupMode && authStatus.attemptsRemaining < 5 && !authStatus.isLocked && (
            <div className="flex items-center gap-2 text-destructive text-sm justify-center">
              <AlertCircle className="w-4 h-4" />
              <span>{authStatus.attemptsRemaining} attempts remaining</span>
            </div>
          )}

          {!isSetupMode && authStatus.isLocked && (
            <div className="flex items-center gap-2 text-destructive text-sm justify-center">
              <AlertCircle className="w-4 h-4" />
              <span>
                Account locked. Please wait {Math.ceil((authStatus.lockoutTimeRemaining || 0) / 60000)} minutes.
              </span>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={
              isSetupMode
                ? pin.length !== 6 || confirmPin.length !== 6 || isSubmitting
                : pin.length !== 6 || authStatus.isLocked || isSubmitting
            }
            className="w-full"
          >
            {isSubmitting
              ? (isSetupMode ? "Setting up..." : "Verifying...")
              : authStatus.isLocked
                ? "Locked"
                : isSetupMode
                  ? "Setup PIN"
                  : "Unlock Wallet"
            }
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            {isSetupMode
              ? "Your PIN will be encrypted and stored securely"
              : "Your data is protected with PBKDF2 encryption and secure key management"
            }
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
