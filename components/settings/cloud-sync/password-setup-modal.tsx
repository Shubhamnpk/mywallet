"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Cloud } from "lucide-react"

interface PasswordSetupModalProps {
  isOpen: boolean
  onClose: () => void
  isPasswordVerified: boolean
  syncPassword: string
  onSyncPasswordChange: (password: string) => void
  newPassword: string
  onNewPasswordChange: (password: string) => void
  confirmPassword: string
  onConfirmPasswordChange: (password: string) => void
  passwordError: string
  onSetupPassword: () => void
  onChangePassword: () => void
}

export function PasswordSetupModal({
  isOpen,
  onClose,
  isPasswordVerified,
  syncPassword,
  onSyncPasswordChange,
  newPassword,
  onNewPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  passwordError,
  onSetupPassword,
  onChangePassword
}: PasswordSetupModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-background border border-border p-6 rounded-lg max-w-md w-full mx-4 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Cloud className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {isPasswordVerified ? 'Change Sync Password' : 'Setup Sync Password'}
          </h3>
        </div>

        <div className="space-y-4">
          {isPasswordVerified && (
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Enter current password"
                value={syncPassword}
                onChange={(e) => onSyncPasswordChange(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Enter new password (min 6 chars)"
              value={newPassword}
              onChange={(e) => onNewPasswordChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
            />
          </div>

          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}

          <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 p-3 rounded">
            <p className="font-medium mb-1 text-primary">Password Requirements:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>At least 6 characters long</li>
              <li>Contains at least one number</li>
              <li>Contains at least one letter</li>
            </ul>
          </div>
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
            onClick={isPasswordVerified ? onChangePassword : onSetupPassword}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isPasswordVerified ? 'Change Password' : 'Setup Password'}
          </Button>
        </div>
      </div>
    </div>
  )
}