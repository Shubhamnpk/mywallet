"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Fingerprint, Shield, X, Smartphone } from "lucide-react"
import { getBiometricCredentialId } from "@/lib/biometric-key"

const BIOMETRIC_CROSS_DEVICE_PROMPT_DISMISSED_KEY = "wallet_biometric_cross_device_prompt_dismissed"

interface BiometricCrossDevicePromptProps {
  userProfile: {
    pin?: string
    biometricEnabledOnAnyDevice?: boolean
  } | null
  onUpdateProfile: (profile: { biometricEnabledOnAnyDevice?: boolean }) => void
  onEnableBiometric: () => void
}

export function BiometricCrossDevicePrompt({
  userProfile,
  onUpdateProfile,
  onEnableBiometric
}: BiometricCrossDevicePromptProps) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [isCompatible, setIsCompatible] = useState(false)

  useEffect(() => {
    const checkBiometricStatus = async () => {
      // Only check if user has PIN set up
      if (!userProfile?.pin) {
        setIsChecking(false)
        return
      }

      // Check if already enrolled on this device
      const hasCredential = getBiometricCredentialId()
      if (hasCredential) {
        // Already set up on this device - update the flag if needed
        if (!userProfile.biometricEnabledOnAnyDevice) {
          onUpdateProfile({ biometricEnabledOnAnyDevice: true })
        }
        setIsChecking(false)
        return
      }

      // Check if biometric was enabled on another device
      const wasEnabledElsewhere = userProfile.biometricEnabledOnAnyDevice
      if (!wasEnabledElsewhere) {
        setIsChecking(false)
        return
      }

      const wasDismissed = localStorage.getItem(BIOMETRIC_CROSS_DEVICE_PROMPT_DISMISSED_KEY) === "true"
      if (wasDismissed) {
        setIsChecking(false)
        return
      }

      // Check if this device supports biometric
      const isSecureContext = window.location.protocol === 'https:' || window.location.hostname === 'localhost'
      if (!isSecureContext) {
        setIsChecking(false)
        return
      }

      if (!window.PublicKeyCredential) {
        setIsChecking(false)
        return
      }

      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        if (available) {
          setIsCompatible(true)
          setShowPrompt(true)
        }
      } catch {
        // Biometric check failed
      }

      setIsChecking(false)
    }

    // Delay check to not interfere with app startup
    const timer = setTimeout(checkBiometricStatus, 2000)
    return () => clearTimeout(timer)
  }, [userProfile, onUpdateProfile])

  const handleDismiss = () => {
    localStorage.setItem(BIOMETRIC_CROSS_DEVICE_PROMPT_DISMISSED_KEY, "true")
    setShowPrompt(false)
  }

  const handleEnable = () => {
    localStorage.removeItem(BIOMETRIC_CROSS_DEVICE_PROMPT_DISMISSED_KEY)
    setShowPrompt(false)
    onEnableBiometric()
  }

  if (isChecking || !showPrompt) return null

  return (
    <Dialog
      open={showPrompt}
      onOpenChange={(open) => {
        if (!open) {
          handleDismiss()
          return
        }
        setShowPrompt(true)
      }}
    >
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Fingerprint className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Enable Biometric?</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            We noticed you use biometric authentication on another device. 
            This device supports it too!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Smartphone className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Quick & Secure Access</p>
              <p className="text-muted-foreground">Use your fingerprint or face recognition to unlock</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Device-Specific</p>
              <p className="text-muted-foreground">Each device needs separate enrollment for security</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="flex-1 rounded-xl"
          >
            <X className="w-4 h-4 mr-2" />
            Not Now
          </Button>
          <Button
            onClick={handleEnable}
            className="flex-1 rounded-xl"
          >
            <Fingerprint className="w-4 h-4 mr-2" />
            Enable
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          You can always enable this later in Security Settings
        </p>
      </DialogContent>
    </Dialog>
  )
}
