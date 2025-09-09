"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Cloud } from "lucide-react"

interface DeviceConnectModalProps {
  isOpen: boolean
  onClose: () => void
  enteredDeviceCode: string
  onDeviceCodeChange: (code: string) => void
  enteredDevicePin: string
  onDevicePinChange: (pin: string) => void
  isConnectingDevice: boolean
  onConnectDevice: () => void
}

export function DeviceConnectModal({
  isOpen,
  onClose,
  enteredDeviceCode,
  onDeviceCodeChange,
  enteredDevicePin,
  onDevicePinChange,
  isConnectingDevice,
  onConnectDevice
}: DeviceConnectModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-background border border-border p-6 rounded-lg max-w-md w-full mx-4 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Cloud className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Connect Existing Account
          </h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="device-code">Device Code</Label>
            <Input
              id="device-code"
              placeholder="Enter code from primary device (e.g., A1B2C3)"
              value={enteredDeviceCode}
              onChange={(e) => onDeviceCodeChange(e.target.value.toUpperCase())}
              maxLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="device-pin">Account Password</Label>
            <Input
              id="device-pin"
              type="password"
              placeholder="Enter your account password"
              value={enteredDevicePin}
              onChange={(e) => onDevicePinChange(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Get the device code from your primary device in Cloud Sync settings.
          </p>
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConnectDevice}
            disabled={isConnectingDevice || !enteredDeviceCode || !enteredDevicePin}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isConnectingDevice ? "Connecting..." : "Connect Device"}
          </Button>
        </div>
      </div>
    </div>
  )
}